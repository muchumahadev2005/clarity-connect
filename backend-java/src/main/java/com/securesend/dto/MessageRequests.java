package com.securesend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

public class MessageRequests {

    @Data
    public static class SendMessageRequest {
        private String encryptedData;
        private String encryptedAESKey;
        private String iv;
        private String salt;
        private String keyIv;
        private String encryptionMode;
        private String kdf;
        private Integer kdfIterations;
        private String aesAlgorithm;
        private String rsaAlgorithm;
        private String recipientEmail;
        private String type;
        private String protection;
        private String password;
        private Boolean isAnonymous;
        private Boolean viewOnce;
        private String expiresIn;
        private String expiresAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FormattedLogDto {
        private Instant viewedAt;
        private String ip;
        private String device;
        private String viewer;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageResponseDto {
        @JsonProperty("_id")
        private String id;
        private Object senderId;
        private Object receiverId;
        private String type;
        private String protection;
        private Boolean isAnonymous;
        private Boolean viewOnce;
        private Instant expiresAt;
        private Integer views;
        private Instant createdAt;
        private Instant updatedAt;
        private String encryptedData;
        private String encryptedAESKey;
        private String iv;
        private String salt;
        private String keyIv;
        private String encryptionMode;
        private String kdf;
        private Integer kdfIterations;
        private String aesAlgorithm;
        private String rsaAlgorithm;
        private String fileUrl;
        private List<FormattedLogDto> logs;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarkViewedResponseDto {
        private Integer views;
        private List<FormattedLogDto> logs;
    }
}
