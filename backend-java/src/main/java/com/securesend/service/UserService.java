package com.securesend.service;

import com.securesend.dto.ApiResponse;
import com.securesend.dto.KeyRequests.UserSearchItem;
import com.securesend.model.Key;
import com.securesend.model.User;
import com.securesend.repository.KeyRepository;
import com.securesend.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final KeyRepository keyRepository;

    public UserService(UserRepository userRepository, KeyRepository keyRepository) {
        this.userRepository = userRepository;
        this.keyRepository = keyRepository;
    }

    public ApiResponse<List<UserSearchItem>> searchUsers(String query, String protection, String currentUserId) {
        if (query == null || query.isBlank()) {
            return ApiResponse.ok(Collections.emptyList());
        }

        String cleanQuery = query.trim();
        List<User> users = userRepository.searchByEmailExcludingUser(cleanQuery, currentUserId, PageRequest.of(0, 8));

        List<UserSearchItem> results = new ArrayList<>();
        for (User u : users) {
            String publicKey = u.getPublicKey();
            if ("hybrid".equalsIgnoreCase(protection) && (publicKey == null || publicKey.isBlank())) {
                var keyOpt = keyRepository.findByUserId(u.getId());
                if (keyOpt.isPresent()) {
                    publicKey = keyOpt.get().getPublicKey();
                }
            }
            results.add(new UserSearchItem(u.getEmail(), publicKey));
        }

        return ApiResponse.ok(results);
    }
}
