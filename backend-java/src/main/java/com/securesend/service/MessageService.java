package com.securesend.service;

import com.securesend.dto.ApiResponse;
import com.securesend.dto.MessageRequests.*;
import com.securesend.exception.ApiException;
import com.securesend.model.Message;
import com.securesend.model.MessageLog;
import com.securesend.model.User;
import com.securesend.repository.MessageRepository;
import com.securesend.repository.UserRepository;
import com.securesend.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final PayloadStorageService payloadStorageService;
    private final JwtTokenProvider tokenProvider;

    @Value("${securesend.storage.max-inline-bytes:12582912}")
    private long maxInlinePayloadBytes;

    public MessageService(MessageRepository messageRepository,
                          UserRepository userRepository,
                          PayloadStorageService payloadStorageService,
                          JwtTokenProvider tokenProvider) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.payloadStorageService = payloadStorageService;
        this.tokenProvider = tokenProvider;
    }

    public ApiResponse<Message> sendMessage(String senderId, SendMessageRequest req) {
        if (req.getEncryptedData() == null || req.getEncryptedAESKey() == null || req.getIv() == null) {
            throw new ApiException("Invalid encrypted payload", HttpStatus.BAD_REQUEST);
        }

        if ("voice".equalsIgnoreCase(req.getType())) {
            Instant oneHourAgo = Instant.now().minusSeconds(3600);
            long voiceCount = messageRepository.countBySenderIdAndTypeAndCreatedAtGreaterThanEqual(senderId, "voice", oneHourAgo);
            if (voiceCount >= 10) {
                throw new ApiException("You have reached the hourly limit of 10 voice messages. Please try again later.", HttpStatus.TOO_MANY_REQUESTS);
            }
        }

        String receiverId = null;
        if (req.getRecipientEmail() != null && !req.getRecipientEmail().isBlank()) {
            var recipientOpt = userRepository.findByEmailIgnoreCase(req.getRecipientEmail().trim());
            if (recipientOpt.isPresent()) {
                receiverId = recipientOpt.get().getId();
                if (receiverId.equals(senderId)) {
                    throw new ApiException("You cannot send a secure message to yourself", HttpStatus.BAD_REQUEST);
                }
            }
        }

        Instant expiresAt = null;
        if (req.getExpiresIn() != null && !req.getExpiresIn().isBlank()) {
            try {
                long ms = Long.parseLong(req.getExpiresIn());
                expiresAt = Instant.now().plusMillis(ms);
            } catch (NumberFormatException ignored) {}
        } else if (req.getExpiresAt() != null && !req.getExpiresAt().isBlank()) {
            try {
                expiresAt = Instant.parse(req.getExpiresAt());
            } catch (Exception ignored) {}
        }

        byte[] payloadBytes = req.getEncryptedData().getBytes(StandardCharsets.UTF_8);
        boolean externalPayload = payloadBytes.length > maxInlinePayloadBytes;
        String externalFileName = externalPayload ? String.format("%d-%s-%s.enc", System.currentTimeMillis(), senderId, UUID.randomUUID().toString().substring(0, 6)) : null;

        if (externalFileName != null) {
            payloadStorageService.storeEncryptedPayload(externalFileName, req.getEncryptedData());
        }

        String encryptionMode = req.getEncryptionMode();
        if (encryptionMode == null || encryptionMode.isBlank()) {
            encryptionMode = "HYBRID";
        }

        Message message = Message.builder()
                .encryptedData(externalPayload ? "" : req.getEncryptedData())
                .encryptedAESKey(req.getEncryptedAESKey())
                .iv(req.getIv())
                .salt(req.getSalt())
                .keyIv(req.getKeyIv())
                .encryptionMode(encryptionMode)
                .kdf(req.getKdf())
                .kdfIterations(req.getKdfIterations())
                .aesAlgorithm(req.getAesAlgorithm())
                .rsaAlgorithm(req.getRsaAlgorithm())
                .senderId(senderId)
                .receiverId(receiverId)
                .type(req.getType() != null ? req.getType() : "text")
                .protection(req.getProtection() != null ? req.getProtection() : "quick")
                .password(req.getPassword())
                .isAnonymous(Boolean.TRUE.equals(req.getIsAnonymous()))
                .viewOnce(Boolean.TRUE.equals(req.getViewOnce()))
                .fileUrl(externalFileName)
                .expiresAt(expiresAt)
                .createdAt(Instant.now())
                .build();

        Message saved = messageRepository.save(message);

        return ApiResponse.<Message>builder()
                .success(true)
                .message("Message sent successfully")
                .data(saved)
                .build();
    }

    public ApiResponse<List<MessageResponseDto>> getInbox(String userId) {
        List<Message> messages = messageRepository.findByReceiverId(userId, Sort.by(Sort.Direction.DESC, "createdAt"));
        List<MessageResponseDto> processed = processMessageList(messages);
        return ApiResponse.ok(processed);
    }

    public ApiResponse<List<MessageResponseDto>> getOutbox(String userId) {
        List<Message> messages = messageRepository.findBySenderId(userId, Sort.by(Sort.Direction.DESC, "createdAt"));
        List<MessageResponseDto> processed = processMessageList(messages);
        return ApiResponse.ok(processed);
    }

    public ApiResponse<MessageResponseDto> getMessageById(String id) {
        var msgOpt = messageRepository.findById(id);
        if (msgOpt.isEmpty()) {
            throw new ApiException("Message not found", HttpStatus.NOT_FOUND);
        }

        Message message = msgOpt.get();
        Instant now = Instant.now();
        boolean isExpired = message.getExpiresAt() != null && message.getExpiresAt().isBefore(now);

        if (isExpired) {
            wipeMessagePayload(message);
        }

        String encryptedData = message.getEncryptedData();
        if (!isExpired && (encryptedData == null || encryptedData.isBlank()) && message.getFileUrl() != null) {
            encryptedData = payloadStorageService.loadEncryptedPayload(message.getFileUrl());
        }

        MessageResponseDto dto = MessageResponseDto.builder()
                .id(message.getId())
                .senderId(message.getSenderId())
                .receiverId(message.getReceiverId())
                .type(message.getType())
                .protection(message.getProtection())
                .viewOnce(message.getViewOnce())
                .expiresAt(message.getExpiresAt())
                .views(message.getViews())
                .createdAt(message.getCreatedAt())
                .updatedAt(message.getUpdatedAt())
                .encryptedData(encryptedData)
                .encryptedAESKey(message.getEncryptedAESKey())
                .iv(message.getIv())
                .salt(message.getSalt())
                .keyIv(message.getKeyIv())
                .encryptionMode(message.getEncryptionMode())
                .kdf(message.getKdf())
                .kdfIterations(message.getKdfIterations())
                .aesAlgorithm(message.getAesAlgorithm())
                .rsaAlgorithm(message.getRsaAlgorithm())
                .fileUrl(message.getFileUrl())
                .build();

        return ApiResponse.ok(dto);
    }

    public ApiResponse<MarkViewedResponseDto> markViewed(String id, String userAgent, String authHeader, String clientIp) {
        var msgOpt = messageRepository.findById(id);
        if (msgOpt.isEmpty()) {
            throw new ApiException("Message not found", HttpStatus.NOT_FOUND);
        }

        Message message = msgOpt.get();

        String device = "Desktop";
        if (userAgent != null) {
            if (Pattern.compile("mobile", Pattern.CASE_INSENSITIVE).matcher(userAgent).find()) device = "Mobile";
            if (Pattern.compile("tablet", Pattern.CASE_INSENSITIVE).matcher(userAgent).find()) device = "Tablet";
        }

        String systemInfo = "Unknown OS";
        if (userAgent != null) {
            Matcher sysMatcher = Pattern.compile("\\(([^)]+)\\)").matcher(userAgent);
            if (sysMatcher.find()) {
                systemInfo = sysMatcher.group(1).split(";")[0];
            }
        }

        String browserInfo = "Browser";
        if (userAgent != null) {
            Matcher bMatcher = Pattern.compile("(firefox|msie|chrome|safari|opr|edge)", Pattern.CASE_INSENSITIVE).matcher(userAgent);
            if (bMatcher.find()) {
                browserInfo = bMatcher.group(0);
            }
        }

        String fullDeviceInfo = String.format("%s · %s (%s)", browserInfo, systemInfo, device);

        String viewerId = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (tokenProvider.validateToken(token)) {
                viewerId = tokenProvider.getUserIdFromToken(token);
            }
        }

        boolean isSender = viewerId != null && message.getSenderId() != null && viewerId.equals(message.getSenderId());

        if (!isSender) {
            message.setViews((message.getViews() != null ? message.getViews() : 0) + 1);

            MessageLog logEntry = MessageLog.builder()
                    .viewedAt(Instant.now())
                    .ip(clientIp != null ? clientIp : "127.0.0.1")
                    .device(fullDeviceInfo)
                    .userId(viewerId)
                    .build();

            if (message.getLogs() == null) message.setLogs(new ArrayList<>());
            message.getLogs().add(logEntry);

            messageRepository.save(message);

            if (Boolean.TRUE.equals(message.getViewOnce())) {
                wipeMessagePayload(message);
            }
        }

        List<FormattedLogDto> formattedLogs = formatMessageLogs(message.getLogs());
        MarkViewedResponseDto responseDto = MarkViewedResponseDto.builder()
                .views(message.getViews())
                .logs(formattedLogs)
                .build();

        return ApiResponse.ok(responseDto);
    }

    public ApiResponse<Void> deleteMessage(String id, String userId) {
        var msgOpt = messageRepository.findById(id);
        if (msgOpt.isEmpty()) {
            throw new ApiException("Message not found", HttpStatus.NOT_FOUND);
        }

        Message message = msgOpt.get();
        boolean isSender = message.getSenderId() != null && message.getSenderId().equals(userId);
        boolean isReceiver = message.getReceiverId() != null && message.getReceiverId().equals(userId);

        if (!isSender && !isReceiver) {
            throw new ApiException("Not authorized to delete this message", HttpStatus.FORBIDDEN);
        }

        if (message.getFileUrl() != null) {
            payloadStorageService.deleteEncryptedPayload(message.getFileUrl());
        }

        messageRepository.deleteById(id);
        return ApiResponse.okMessage("Message deleted successfully");
    }

    public ApiResponse<Object> purgeExpiredMessages() {
        Instant now = Instant.now();
        List<Message> expiredMessages = messageRepository.findExpiredMessages(now);

        int filesDeleted = 0;
        for (Message msg : expiredMessages) {
            if (msg.getFileUrl() != null) {
                payloadStorageService.deleteEncryptedPayload(msg.getFileUrl());
                filesDeleted++;
            }
        }

        long count = messageRepository.deleteExpiredMessages(now);
        String msgStr = String.format("Monthly cleanup completed. Purged %d expired messages.", count);

        Map<String, Object> dataMap = Map.of("count", count, "files", filesDeleted);
        return ApiResponse.ok(msgStr, dataMap);
    }

    private void wipeMessagePayload(Message message) {
        if (message.getFileUrl() != null) {
            payloadStorageService.deleteEncryptedPayload(message.getFileUrl());
        }
        message.setEncryptedData("");
        message.setEncryptedAESKey("");
        message.setIv("");
        message.setSalt(null);
        message.setKeyIv(null);
        message.setPassword(null);
        message.setFileUrl(null);
        messageRepository.save(message);
    }

    private List<MessageResponseDto> processMessageList(List<Message> messages) {
        Instant now = Instant.now();
        List<MessageResponseDto> list = new ArrayList<>();

        for (Message m : messages) {
            boolean isExpired = m.getExpiresAt() != null && m.getExpiresAt().isBefore(now);
            if (isExpired && (m.getEncryptedData() != null || m.getFileUrl() != null)) {
                wipeMessagePayload(m);
            }

            String encryptedData = m.getEncryptedData();
            if (!isExpired && (encryptedData == null || encryptedData.isBlank()) && m.getFileUrl() != null) {
                encryptedData = payloadStorageService.loadEncryptedPayload(m.getFileUrl());
            }

            Object senderObj = resolveUserRef(m.getSenderId());
            Object receiverObj = resolveUserRef(m.getReceiverId());

            MessageResponseDto dto = MessageResponseDto.builder()
                    .id(m.getId())
                    .senderId(senderObj)
                    .receiverId(receiverObj)
                    .type(m.getType())
                    .protection(m.getProtection())
                    .isAnonymous(m.getIsAnonymous())
                    .viewOnce(m.getViewOnce())
                    .expiresAt(m.getExpiresAt())
                    .views(m.getViews())
                    .createdAt(m.getCreatedAt())
                    .updatedAt(m.getUpdatedAt())
                    .encryptedData(encryptedData)
                    .encryptedAESKey(m.getEncryptedAESKey())
                    .iv(m.getIv())
                    .salt(m.getSalt())
                    .keyIv(m.getKeyIv())
                    .encryptionMode(m.getEncryptionMode())
                    .kdf(m.getKdf())
                    .kdfIterations(m.getKdfIterations())
                    .aesAlgorithm(m.getAesAlgorithm())
                    .rsaAlgorithm(m.getRsaAlgorithm())
                    .fileUrl(m.getFileUrl())
                    .logs(formatMessageLogs(m.getLogs()))
                    .build();

            list.add(dto);
        }
        return list;
    }

    private Object resolveUserRef(String userId) {
        if (userId == null) return null;
        var userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            return Map.of("_id", userOpt.get().getId(), "email", userOpt.get().getEmail());
        }
        return Map.of("_id", userId);
    }

    private List<FormattedLogDto> formatMessageLogs(List<MessageLog> logs) {
        if (logs == null || logs.isEmpty()) return Collections.emptyList();

        List<FormattedLogDto> formatted = new ArrayList<>();
        for (MessageLog l : logs) {
            String viewer = "Someone (Guest)";
            if (l.getUserId() != null) {
                var userOpt = userRepository.findById(l.getUserId());
                if (userOpt.isPresent()) {
                    viewer = userOpt.get().getEmail();
                }
            }
            formatted.add(FormattedLogDto.builder()
                    .viewedAt(l.getViewedAt())
                    .ip(l.getIp())
                    .device(l.getDevice())
                    .viewer(viewer)
                    .build());
        }
        return formatted;
    }
}
