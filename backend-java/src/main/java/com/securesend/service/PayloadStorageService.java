package com.securesend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class PayloadStorageService {

    private static final Logger log = LoggerFactory.getLogger(PayloadStorageService.class);

    private final Path payloadDirectory;

    public PayloadStorageService(@Value("${securesend.storage.payload-path:storage/messages}") String payloadPath) {
        this.payloadDirectory = Paths.get(payloadPath).toAbsolutePath().normalize();
        ensureDirectoryExists();
    }

    private void ensureDirectoryExists() {
        try {
            Files.createDirectories(payloadDirectory);
        } catch (IOException e) {
            log.error("Could not create storage directory: {}", payloadDirectory, e);
        }
    }

    public void storeEncryptedPayload(String fileName, String encryptedData) {
        try {
            ensureDirectoryExists();
            Path filePath = payloadDirectory.resolve(Paths.get(fileName).getFileName().toString());
            Files.writeString(filePath, encryptedData, StandardCharsets.UTF_8);
            log.info("Stored encrypted payload file: {}", filePath);
        } catch (IOException e) {
            log.error("Failed to store encrypted payload file {}", fileName, e);
            throw new RuntimeException("Failed to store payload file", e);
        }
    }

    public String loadEncryptedPayload(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "";
        }
        try {
            Path filePath = payloadDirectory.resolve(Paths.get(fileName).getFileName().toString());
            if (Files.exists(filePath)) {
                return Files.readString(filePath, StandardCharsets.UTF_8);
            }
            return "";
        } catch (IOException e) {
            log.error("Failed to read encrypted payload file {}", fileName, e);
            return "";
        }
    }

    public void deleteEncryptedPayload(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return;
        }
        try {
            Path filePath = payloadDirectory.resolve(Paths.get(fileName).getFileName().toString());
            Files.deleteIfExists(filePath);
            log.info("Deleted encrypted payload file: {}", filePath);
        } catch (IOException e) {
            log.warn("Could not delete payload file {}: {}", fileName, e.getMessage());
        }
    }
}
