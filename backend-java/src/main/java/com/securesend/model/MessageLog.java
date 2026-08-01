package com.securesend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageLog {
    @Builder.Default
    private Instant viewedAt = Instant.now();
    private String ip;
    private String device;
    private String userId; // User ID of viewer
}
