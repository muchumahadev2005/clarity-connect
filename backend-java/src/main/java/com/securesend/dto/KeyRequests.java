package com.securesend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class KeyRequests {

    @Data
    public static class RegisterKeyRequest {
        private String publicKey;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MyKeyData {
        private String email;
        private boolean hasPublicKey;
        private String publicKey;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSearchItem {
        private String email;
        private String publicKey;
    }
}
