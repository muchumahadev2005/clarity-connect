package com.securesend.controller;

import com.securesend.dto.ApiResponse;
import com.securesend.dto.AnonymousRequests.CustomMailRequest;
import com.securesend.service.MailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class MailController {

    private final MailService mailService;

    public MailController(MailService mailService) {
        this.mailService = mailService;
    }

    @PostMapping({"/send-email", "/api/send-email"})
    public ResponseEntity<ApiResponse<Object>> sendEmail(@RequestBody CustomMailRequest req) {
        Map<String, Object> result = mailService.sendAnonymousEmail(
                req.getTo(),
                req.getSubject(),
                req.getMessage(),
                "noreply",
                null
        );

        return ResponseEntity.ok(ApiResponse.ok(result.get("data")));
    }
}
