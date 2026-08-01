package com.securesend.service;

import com.securesend.exception.ApiException;
import com.securesend.model.Alias;
import com.securesend.repository.AliasRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

@Service
public class AliasService {

    private static final Logger log = LoggerFactory.getLogger(AliasService.class);

    private static final String ALIAS_DOMAIN = "securesend.co.in";
    private static final long ALIAS_EXPIRY_MS = 24 * 60 * 60 * 1000L; // 24 hours
    private static final int MAX_GENERATION_ATTEMPTS = 5;

    private static final List<String> COMPANY_NAMES = Arrays.asList(
            "tcs", "wipro", "infosys", "hcl", "techmahindra", "accenture", "cognizant", "capgemini", "mindtree", "persistent",
            "ltimindtree", "tataconsultancy", "ibm", "oracle", "microsoft", "google", "amazon", "adobe", "nvidia", "intel",
            "salesforce", "servicenow", "sap", "zoom", "slack", "github", "apple", "meta", "netflix", "spotify"
    );

    private final AliasRepository aliasRepository;
    private final Random random = new Random();

    public AliasService(AliasRepository aliasRepository) {
        this.aliasRepository = aliasRepository;
    }

    public Alias generateAlias(String realEmail) {
        return generateAlias(realEmail, ALIAS_EXPIRY_MS);
    }

    public Alias generateAlias(String realEmail, long expiryMs) {
        if (realEmail == null || realEmail.isBlank()) {
            throw new ApiException("Real email is required.", HttpStatus.BAD_REQUEST);
        }

        String normalizedEmail = realEmail.toLowerCase().trim();

        String generatedAlias = null;
        boolean isUnique = false;
        int attempts = 0;

        Instant now = Instant.now();

        while (!isUnique && attempts < MAX_GENERATION_ATTEMPTS) {
            String baseName = COMPANY_NAMES.get(random.nextInt(COMPANY_NAMES.size()));
            int num = 100 + random.nextInt(900); // 3 digit number (100-999)
            generatedAlias = String.format("%s%d@%s", baseName, num, ALIAS_DOMAIN).toLowerCase();

            var existing = aliasRepository.findByAliasIgnoreCaseAndIsActiveTrueAndExpiresAtGreaterThan(generatedAlias, now);
            if (existing.isEmpty()) {
                isUnique = true;
            } else {
                attempts++;
            }
        }

        if (!isUnique) {
            log.error("Unable to generate unique alias for {} after {} attempts", normalizedEmail, MAX_GENERATION_ATTEMPTS);
            throw new ApiException("Unable to generate a unique alias after multiple attempts. Please try again.", HttpStatus.SERVICE_UNAVAILABLE);
        }

        Instant expiresAt = now.plus(Duration.ofMillis(expiryMs));

        Alias aliasDoc = Alias.builder()
                .alias(generatedAlias)
                .realEmail(normalizedEmail)
                .isActive(true)
                .expiresAt(expiresAt)
                .createdAt(now)
                .build();

        return aliasRepository.save(aliasDoc);
    }

    public static class AliasValidationResult {
        public final boolean isValid;
        public final String reason;
        public final String realEmail;
        public final Instant expiresAt;

        public AliasValidationResult(boolean isValid, String reason, String realEmail, Instant expiresAt) {
            this.isValid = isValid;
            this.reason = reason;
            this.realEmail = realEmail;
            this.expiresAt = expiresAt;
        }
    }

    public AliasValidationResult validateAlias(String alias) {
        if (alias == null || alias.isBlank()) {
            return new AliasValidationResult(false, "Alias is missing or invalid format.", null, null);
        }

        String normalizedAlias = alias.toLowerCase().trim();
        var aliasOptional = aliasRepository.findByAliasIgnoreCase(normalizedAlias);

        if (aliasOptional.isEmpty()) {
            return new AliasValidationResult(false, "Alias not found.", null, null);
        }

        Alias aliasDoc = aliasOptional.get();

        if (!Boolean.TRUE.equals(aliasDoc.getIsActive())) {
            return new AliasValidationResult(false, "Alias is no longer active.", null, null);
        }

        if (Instant.now().isAfter(aliasDoc.getExpiresAt())) {
            aliasDoc.setIsActive(false);
            aliasRepository.save(aliasDoc);
            return new AliasValidationResult(false, "Alias has expired.", null, null);
        }

        return new AliasValidationResult(true, null, aliasDoc.getRealEmail(), aliasDoc.getExpiresAt());
    }

    public String getEmailByAlias(String alias) {
        if (alias == null || alias.isBlank()) return null;
        return aliasRepository.findByAliasIgnoreCase(alias.toLowerCase().trim())
                .map(Alias::getRealEmail)
                .orElse(null);
    }

    public boolean deactivateAlias(String alias) {
        if (alias == null || alias.isBlank()) return false;
        var aliasOptional = aliasRepository.findByAliasIgnoreCase(alias.toLowerCase().trim());
        if (aliasOptional.isPresent()) {
            Alias aliasDoc = aliasOptional.get();
            aliasDoc.setIsActive(false);
            aliasRepository.save(aliasDoc);
            return true;
        }
        return false;
    }
}
