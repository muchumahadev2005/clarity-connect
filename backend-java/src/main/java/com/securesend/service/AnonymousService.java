package com.securesend.service;

import com.securesend.dto.ApiResponse;
import com.securesend.dto.AnonymousRequests.*;
import com.securesend.exception.ApiException;
import com.securesend.model.Alias;
import com.securesend.model.AnonymousMessage;
import com.securesend.model.User;
import com.securesend.repository.AliasRepository;
import com.securesend.repository.AnonymousMessageRepository;
import com.securesend.repository.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AnonymousService {

    private final UserRepository userRepository;
    private final AliasRepository aliasRepository;
    private final AnonymousMessageRepository anonymousMessageRepository;
    private final AliasService aliasService;
    private final MailService mailService;

    public AnonymousService(UserRepository userRepository,
                            AliasRepository aliasRepository,
                            AnonymousMessageRepository anonymousMessageRepository,
                            AliasService aliasService,
                            MailService mailService) {
        this.userRepository = userRepository;
        this.aliasRepository = aliasRepository;
        this.anonymousMessageRepository = anonymousMessageRepository;
        this.aliasService = aliasService;
        this.mailService = mailService;
    }

    public ApiResponse<AliasResponseData> generateOrGetAlias(String userId, Boolean force) {
        var userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new ApiException("User not found.", HttpStatus.NOT_FOUND);
        }

        String realEmail = userOpt.get().getEmail().toLowerCase().trim();
        Instant now = Instant.now();

        var existingAlias = aliasRepository.findByRealEmailIgnoreCaseAndIsActiveTrueAndExpiresAtGreaterThan(realEmail, now);
        if (existingAlias.isPresent() && !Boolean.TRUE.equals(force)) {
            Alias a = existingAlias.get();
            return ApiResponse.ok(new AliasResponseData(a.getAlias(), a.getCreatedAt(), a.getExpiresAt()));
        }

        List<Alias> activeAliases = aliasRepository.findByRealEmailIgnoreCaseAndIsActiveTrue(realEmail);
        for (Alias a : activeAliases) {
            a.setIsActive(false);
            aliasRepository.save(a);
        }

        Alias newAlias = aliasService.generateAlias(realEmail);

        return ApiResponse.<AliasResponseData>builder()
                .success(true)
                .message("Alias generated successfully.")
                .data(new AliasResponseData(newAlias.getAlias(), newAlias.getCreatedAt(), newAlias.getExpiresAt()))
                .build();
    }

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AnonymousService.class);

    public ApiResponse<Object> sendAnonymous(SendAnonymousRequest req) {
        if (req == null || req.getSubject() == null || req.getMessage() == null || req.getAlias() == null) {
            throw new ApiException("Please provide all required fields: subject, message, alias, and at least one recipient.", HttpStatus.BAD_REQUEST);
        }

        // Collect all recipients from either `recipients` list or `to` string (supports comma, semicolon, newline)
        Set<String> uniqueRecipients = new LinkedHashSet<>();
        if (req.getRecipients() != null) {
            for (String r : req.getRecipients()) {
                if (r != null && !r.trim().isEmpty()) {
                    uniqueRecipients.add(r.trim().toLowerCase());
                }
            }
        }
        if (req.getTo() != null && !req.getTo().isBlank()) {
            String[] parts = req.getTo().split("[,;\\r\\n]+");
            for (String part : parts) {
                String trimmed = part.trim().toLowerCase();
                if (!trimmed.isEmpty()) {
                    uniqueRecipients.add(trimmed);
                }
            }
        }

        if (uniqueRecipients.isEmpty()) {
            throw new ApiException("Please provide at least one recipient email address.", HttpStatus.BAD_REQUEST);
        }

        if (uniqueRecipients.size() > 2000) {
            throw new ApiException("Recipient limit exceeded. Maximum 2000 recipients allowed per request.", HttpStatus.BAD_REQUEST);
        }

        String cleanAlias = req.getAlias().trim().toLowerCase();
        String fullSenderAlias = cleanAlias.contains("@") ? cleanAlias : cleanAlias + "@securesend.co.in";

        AliasService.AliasValidationResult validation = aliasService.validateAlias(fullSenderAlias);
        if (!validation.isValid) {
            throw new ApiException(validation.reason != null ? validation.reason : "Invalid or expired sender alias.", HttpStatus.BAD_REQUEST);
        }

        Pattern emailPattern = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
        List<String> aliasRecipients = new ArrayList<>();
        List<String> normalRecipients = new ArrayList<>();
        List<String> invalidRecipients = new ArrayList<>();

        for (String email : uniqueRecipients) {
            if (email.endsWith("@securesend.co.in")) {
                aliasRecipients.add(email);
            } else if (emailPattern.matcher(email).matches()) {
                normalRecipients.add(email);
            } else {
                invalidRecipients.add(email);
            }
        }

        if (uniqueRecipients.size() == 1 && !invalidRecipients.isEmpty()) {
            throw new ApiException("Please provide a valid recipient email address.", HttpStatus.BAD_REQUEST);
        }

        Map<String, String> aliasToRealEmail = new HashMap<>();
        if (!aliasRecipients.isEmpty()) {
            List<Alias> activeAliases = aliasRepository.findByAliasInAndIsActiveTrueAndExpiresAtGreaterThan(aliasRecipients, Instant.now());
            for (Alias a : activeAliases) {
                aliasToRealEmail.put(a.getAlias().toLowerCase(), a.getRealEmail());
            }
        }

        List<String> deliveryRecipients = new ArrayList<>();
        List<String> savedTargetEmails = new ArrayList<>();

        for (String email : normalRecipients) {
            deliveryRecipients.add(email);
            savedTargetEmails.add(email);
        }

        for (String aliasEmail : aliasRecipients) {
            String realEmail = aliasToRealEmail.get(aliasEmail);
            if (realEmail != null && !realEmail.isBlank()) {
                deliveryRecipients.add(realEmail);
                savedTargetEmails.add(aliasEmail);
            } else {
                log.warn("Alias recipient is invalid, inactive, or expired: {}", aliasEmail);
                if (uniqueRecipients.size() == 1) {
                    throw new ApiException("Recipient alias is invalid, inactive, or expired.", HttpStatus.BAD_REQUEST);
                }
            }
        }

        if (deliveryRecipients.isEmpty()) {
            throw new ApiException("No valid recipient email addresses available to send.", HttpStatus.BAD_REQUEST);
        }

        String prefixAlias = cleanAlias.split("@")[0];
        Map<String, Object> mailResult = mailService.sendAnonymousEmail(
                deliveryRecipients,
                req.getSubject().trim(),
                req.getMessage().trim(),
                prefixAlias,
                req.getAttachments()
        );

        Instant now = Instant.now();
        String trimmedSubject = req.getSubject().trim();
        String trimmedMessage = req.getMessage().trim();
        List<AnonymousMessage> messagesToSave = new ArrayList<>(savedTargetEmails.size());
        for (String targetEmail : savedTargetEmails) {
            messagesToSave.add(AnonymousMessage.builder()
                    .to(targetEmail)
                    .subject(trimmedSubject)
                    .message(trimmedMessage)
                    .senderAlias(fullSenderAlias)
                    .unread(true)
                    .createdAt(now)
                    .build());
        }

        anonymousMessageRepository.saveAll(messagesToSave);

        String successMessage = deliveryRecipients.size() == 1
                ? "Anonymous message sent successfully."
                : String.format("Anonymous message sent successfully to %d recipients.", deliveryRecipients.size());

        return ApiResponse.builder()
                .success(true)
                .message(successMessage)
                .provider((String) mailResult.get("provider"))
                .data(Map.of(
                        "totalRecipients", deliveryRecipients.size(),
                        "batchesProcessed", mailResult.getOrDefault("batchCount", 1),
                        "provider", mailResult.getOrDefault("provider", "resend"),
                        "invalidRecipientsCount", invalidRecipients.size()
                ))
                .build();
    }

    public ApiResponse<List<AnonymousMessageResponseDto>> getInbox(String userId) {
        var userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new ApiException("User not found.", HttpStatus.NOT_FOUND);
        }

        String realEmail = userOpt.get().getEmail().toLowerCase().trim();

        List<Alias> userAliases = aliasRepository.findByRealEmailIgnoreCase(realEmail);
        Set<String> aliasEmails = userAliases.stream()
                .map(a -> a.getAlias().toLowerCase())
                .collect(Collectors.toSet());

        Set<String> recipientEmails = new HashSet<>(aliasEmails);
        recipientEmails.add(realEmail);

        List<AnonymousMessage> messages = anonymousMessageRepository.findInboxMessages(
                recipientEmails,
                aliasEmails,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        List<AnonymousMessageResponseDto> processed = messages.stream().map(m -> {
            boolean isSent = aliasEmails.contains(m.getSenderAlias().toLowerCase());
            return AnonymousMessageResponseDto.builder()
                    .id(m.getId())
                    .to(m.getTo())
                    .subject(m.getSubject())
                    .message(m.getMessage())
                    .senderAlias(m.getSenderAlias())
                    .unread(m.getUnread())
                    .createdAt(m.getCreatedAt())
                    .updatedAt(m.getUpdatedAt())
                    .sent(isSent)
                    .build();
        }).collect(Collectors.toList());

        return ApiResponse.ok(processed);
    }

    public ApiResponse<Void> markRead(String userId, String messageId) {
        var userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new ApiException("User not found.", HttpStatus.NOT_FOUND);
        }

        String realEmail = userOpt.get().getEmail().toLowerCase().trim();
        List<Alias> userAliases = aliasRepository.findByRealEmailIgnoreCase(realEmail);
        Set<String> aliasEmails = userAliases.stream()
                .map(a -> a.getAlias().toLowerCase())
                .collect(Collectors.toSet());

        var msgOpt = anonymousMessageRepository.findById(messageId);
        if (msgOpt.isEmpty()) {
            throw new ApiException("Message not found.", HttpStatus.NOT_FOUND);
        }

        AnonymousMessage message = msgOpt.get();

        boolean isRecipient = message.getTo().equalsIgnoreCase(realEmail) || aliasEmails.contains(message.getTo().toLowerCase());
        boolean isSender = aliasEmails.contains(message.getSenderAlias().toLowerCase());

        if (!isRecipient && !isSender) {
            throw new ApiException("Access denied.", HttpStatus.FORBIDDEN);
        }

        message.setUnread(false);
        anonymousMessageRepository.save(message);

        return ApiResponse.okMessage("Message marked as read.");
    }
}
