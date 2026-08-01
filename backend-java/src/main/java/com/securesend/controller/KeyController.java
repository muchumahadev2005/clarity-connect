package com.securesend.controller;

import com.securesend.dto.ApiResponse;
import com.securesend.dto.KeyRequests.*;
import com.securesend.model.Key;
import com.securesend.security.UserPrincipal;
import com.securesend.service.KeyService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/keys")
public class KeyController {

    private final KeyService keyService;

    public KeyController(KeyService keyService) {
        this.keyService = keyService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Key>> registerKey(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody RegisterKeyRequest req) {

        return ResponseEntity.ok(keyService.registerKey(userPrincipal.getId(), req.getPublicKey()));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<Key>> getUserKey(@PathVariable String userId) {
        return ResponseEntity.ok(keyService.getUserKey(userId));
    }

    @GetMapping("/me/current")
    public ResponseEntity<ApiResponse<MyKeyData>> getMyPublicKey(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(keyService.getMyPublicKey(userPrincipal.getId()));
    }

    @DeleteMapping("/clear")
    public ResponseEntity<ApiResponse<Object>> deleteUserKey(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(keyService.deleteUserKey(userPrincipal.getId()));
    }
}
