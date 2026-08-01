package com.securesend.controller;

import com.securesend.dto.ApiResponse;
import com.securesend.dto.MessageRequests.*;
import com.securesend.model.Message;
import com.securesend.security.UserPrincipal;
import com.securesend.service.MessageService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Message>> sendMessage(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody SendMessageRequest req) {

        return ResponseEntity.status(201).body(messageService.sendMessage(userPrincipal.getId(), req));
    }

    @GetMapping("/inbox")
    public ResponseEntity<ApiResponse<List<MessageResponseDto>>> getInbox(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        return ResponseEntity.ok(messageService.getInbox(userPrincipal.getId()));
    }

    @GetMapping("/outbox")
    public ResponseEntity<ApiResponse<List<MessageResponseDto>>> getOutbox(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        return ResponseEntity.ok(messageService.getOutbox(userPrincipal.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MessageResponseDto>> getMessageById(@PathVariable String id) {
        return ResponseEntity.ok(messageService.getMessageById(id));
    }

    @PostMapping("/{id}/view")
    public ResponseEntity<ApiResponse<MarkViewedResponseDto>> markViewed(
            @PathVariable String id,
            HttpServletRequest httpRequest) {

        String userAgent = httpRequest.getHeader("User-Agent");
        String authHeader = httpRequest.getHeader("Authorization");
        String clientIp = httpRequest.getRemoteAddr();

        return ResponseEntity.ok(messageService.markViewed(id, userAgent, authHeader, clientIp));
    }

    @DeleteMapping("/expired")
    public ResponseEntity<ApiResponse<Object>> purgeExpiredMessages() {
        return ResponseEntity.ok(messageService.purgeExpiredMessages());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMessage(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable String id) {

        return ResponseEntity.ok(messageService.deleteMessage(id, userPrincipal.getId()));
    }
}
