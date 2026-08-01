package com.securesend.controller;

import com.securesend.dto.ApiResponse;
import com.securesend.dto.AnonymousRequests.*;
import com.securesend.security.UserPrincipal;
import com.securesend.service.AnonymousService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/anonymous")
public class AnonymousController {

    private final AnonymousService anonymousService;

    public AnonymousController(AnonymousService anonymousService) {
        this.anonymousService = anonymousService;
    }

    @PostMapping("/generate-alias")
    public ResponseEntity<ApiResponse<AliasResponseData>> generateOrGetAlias(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody(required = false) GenerateAliasRequest req) {

        boolean force = req != null && Boolean.TRUE.equals(req.getForce());
        return ResponseEntity.ok(anonymousService.generateOrGetAlias(userPrincipal.getId(), force));
    }

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<Object>> sendAnonymous(@RequestBody SendAnonymousRequest req) {
        return ResponseEntity.ok(anonymousService.sendAnonymous(req));
    }

    @GetMapping("/inbox")
    public ResponseEntity<ApiResponse<List<AnonymousMessageResponseDto>>> getInbox(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        return ResponseEntity.ok(anonymousService.getInbox(userPrincipal.getId()));
    }

    @PostMapping("/mark-read/{id}")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable String id) {

        return ResponseEntity.ok(anonymousService.markRead(userPrincipal.getId(), id));
    }
}
