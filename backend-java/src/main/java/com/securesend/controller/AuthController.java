package com.securesend.controller;

import com.securesend.dto.ApiResponse;
import com.securesend.dto.AuthRequests.*;
import com.securesend.security.UserPrincipal;
import com.securesend.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/request-otp")
    public ResponseEntity<ApiResponse<Void>> requestSignupOtp(@RequestBody RequestOtpRequest req) {
        return ResponseEntity.ok(authService.requestSignupOtp(req.getEmail()));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<Void>> verifyOtp(@RequestBody VerifyOtpRequest req) {
        return ResponseEntity.ok(authService.verifyOtp(req.getEmail(), req.getOtp()));
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<Object>> signup(@RequestBody SignupRequest req) {
        return ResponseEntity.status(201).body(authService.signup(req.getEmail(), req.getPassword()));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Object>> login(@RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req.getEmail(), req.getPassword()));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> requestPasswordResetOtp(@RequestBody RequestResetOtpRequest req) {
        return ResponseEntity.ok(authService.requestPasswordResetOtp(req.getEmail()));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@RequestBody ResetPasswordRequest req) {
        return ResponseEntity.ok(authService.resetPassword(req.getEmail(), req.getOtp(), req.getNewPassword()));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Object>> getMe(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(authService.getMe(userPrincipal.getId()));
    }
}
