package com.securesend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "messages")
public class Message {

    @Id
    private String id;

    @Builder.Default
    private String encryptedData = "";

    @Builder.Default
    private String encryptedAESKey = "";

    @Builder.Default
    private String iv = "";

    private String salt;
    private String keyIv;

    @Builder.Default
    private String encryptionMode = "HYBRID";

    private String kdf;
    private Integer kdfIterations;
    private String aesAlgorithm;
    private String rsaAlgorithm;

    private String senderId;
    private String receiverId;

    private String type; // text, image, voice, file

    @Builder.Default
    private String protection = "quick"; // quick, password, key, hybrid

    private String password;
    private String fileUrl;

    @Builder.Default
    private Boolean isAnonymous = false;

    @Builder.Default
    private Boolean viewOnce = false;

    @Indexed
    private Instant expiresAt;

    @Builder.Default
    private Integer views = 0;

    @Builder.Default
    private List<MessageLog> logs = new ArrayList<>();

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
