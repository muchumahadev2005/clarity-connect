package com.securesend.controller;

import com.securesend.dto.ApiResponse;
import com.securesend.dto.KeyRequests.UserSearchItem;
import com.securesend.security.UserPrincipal;
import com.securesend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<UserSearchItem>>> searchUsers(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String protection) {

        return ResponseEntity.ok(userService.searchUsers(q, protection, userPrincipal.getId()));
    }
}
