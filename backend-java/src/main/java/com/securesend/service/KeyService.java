package com.securesend.service;

import com.securesend.dto.ApiResponse;
import com.securesend.dto.KeyRequests.*;
import com.securesend.exception.ApiException;
import com.securesend.model.Key;
import com.securesend.model.User;
import com.securesend.repository.KeyRepository;
import com.securesend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class KeyService {

    private final KeyRepository keyRepository;
    private final UserRepository userRepository;

    public KeyService(KeyRepository keyRepository, UserRepository userRepository) {
        this.keyRepository = keyRepository;
        this.userRepository = userRepository;
    }

    public ApiResponse<Key> registerKey(String userId, String publicKey) {
        if (publicKey == null || publicKey.isBlank()) {
            throw new ApiException("Public key is required", HttpStatus.BAD_REQUEST);
        }

        var userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new ApiException("User not found", HttpStatus.NOT_FOUND);
        }

        User user = userOpt.get();
        user.setPublicKey(publicKey);
        userRepository.save(user);

        Key key = keyRepository.findByUserId(userId)
                .orElseGet(() -> Key.builder().userId(userId).build());
        key.setPublicKey(publicKey);
        Key savedKey = keyRepository.save(key);

        return ApiResponse.<Key>builder()
                .success(true)
                .message("Key registered for " + user.getEmail())
                .data(savedKey)
                .build();
    }

    public ApiResponse<Key> getUserKey(String userId) {
        var keyOpt = keyRepository.findByUserId(userId);
        if (keyOpt.isEmpty()) {
            throw new ApiException("Key not found", HttpStatus.NOT_FOUND);
        }
        return ApiResponse.ok(keyOpt.get());
    }

    public ApiResponse<MyKeyData> getMyPublicKey(String userId) {
        var userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new ApiException("User not found", HttpStatus.NOT_FOUND);
        }

        User user = userOpt.get();
        boolean hasKey = user.getPublicKey() != null && !user.getPublicKey().isBlank();

        MyKeyData data = MyKeyData.builder()
                .email(user.getEmail())
                .hasPublicKey(hasKey)
                .publicKey(user.getPublicKey())
                .build();

        return ApiResponse.ok(data);
    }

    public ApiResponse<Object> deleteUserKey(String userId) {
        keyRepository.deleteByUserId(userId);

        var userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setPublicKey(null);
            userRepository.save(user);
            return ApiResponse.builder()
                    .success(true)
                    .message("Public key deleted. Generate a new one.")
                    .data(java.util.Map.of("userEmail", user.getEmail()))
                    .build();
        }

        return ApiResponse.okMessage("Public key deleted.");
    }
}
