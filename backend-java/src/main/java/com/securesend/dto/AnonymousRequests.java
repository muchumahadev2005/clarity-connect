package com.securesend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

public class AnonymousRequests {

    @Data
    public static class GenerateAliasRequest {
        private Boolean force;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AliasResponseData {
        private String alias;
        private Instant createdAt;
        private Instant expiresAt;
    }

    @Data
    public static class AttachmentDto {
        private String filename;
        private String content; // base64 string
    }

    @Data
    public static class SendAnonymousRequest {
        private String to;
        private String subject;
        private String message;
        private String alias;
        private List<AttachmentDto> attachments;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnonymousMessageResponseDto {
        @JsonProperty("_id")
        private String id;
        private String to;
        private String subject;
        private String message;
        private String senderAlias;
        private Boolean unread;
        private Instant createdAt;
        private Instant updatedAt;

        @JsonProperty("isSent")
        private boolean sent;
    }

    @Data
    public static class CustomMailRequest {
        private String to;
        private String subject;
        private String message;
    }
}
