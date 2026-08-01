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

    public ApiResponse<Object> sendAnonymous(SendAnonymousRequest req) {
        if (req.getTo() == null || req.getSubject() == null || req.getMessage() == null || req.getAlias() == null) {
            throw new ApiException("Please provide all required fields: to, subject, message, alias.", HttpStatus.BAD_REQUEST);
        }

        String normalizedTo = req.getTo().trim().toLowerCase();
        String cleanAlias = req.getAlias().trim().toLowerCase();

        String fullSenderAlias = cleanAlias;
        if (!fullSenderAlias.contains("@")) {
            fullSenderAlias = fullSenderAlias + "@securesend.co.in";
        }

        AliasService.AliasValidationResult validation = aliasService.validateAlias(fullSenderAlias);
        if (!validation.isValid) {
            throw new ApiException(validation.reason != null ? validation.reason : "Invalid or expired sender alias.", HttpStatus.BAD_REQUEST);
        }

        String recipientRealEmail = normalizedTo;
        boolean isRecipientAlias = normalizedTo.endsWith("@securesend.co.in");

        if (isRecipientAlias) {
            var recipientAliasOpt = aliasRepository.findByAliasIgnoreCaseAndIsActiveTrueAndExpiresAtGreaterThan(normalizedTo, Instant.now());
            if (recipientAliasOpt.isEmpty()) {
                throw new ApiException("Recipient alias is invalid, inactive, or expired.", HttpStatus.BAD_REQUEST);
            }
            recipientRealEmail = recipientAliasOpt.get().getRealEmail();
        } else {
            Pattern emailPattern = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
            if (!emailPattern.matcher(normalizedTo).matches()) {
                throw new ApiException("Please provide a valid recipient email address.", HttpStatus.BAD_REQUEST);
            }
        }

        String prefixAlias = cleanAlias.split("@")[0];
        Map<String, Object> mailResult = mailService.sendAnonymousEmail(
                recipientRealEmail,
                req.getSubject().trim(),
                req.getMessage().trim(),
                prefixAlias,
                req.getAttachments()
        );

        AnonymousMessage anonMsg = AnonymousMessage.builder()
                .to(normalizedTo)
                .subject(req.getSubject().trim())
                .message(req.getMessage().trim())
                .senderAlias(fullSenderAlias)
                .unread(true)
                .createdAt(Instant.now())
                .build();

        anonymousMessageRepository.save(anonMsg);

        return ApiResponse.builder()
                .success(true)
                .message("Anonymous message sent successfully.")
                .provider((String) mailResult.get("provider"))
                .data(mailResult.get("data"))
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
