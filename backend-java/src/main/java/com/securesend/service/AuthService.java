package com.securesend.service;

import com.securesend.dto.ApiResponse;
import com.securesend.dto.AuthRequests.*;
import com.securesend.exception.ApiException;
import com.securesend.model.Otp;
import com.securesend.model.User;
import com.securesend.repository.OtpRepository;
import com.securesend.repository.UserRepository;
import com.securesend.security.JwtTokenProvider;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final OtpRepository otpRepository;
    private final MailService mailService;
    private final JwtTokenProvider tokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final Random random = new Random();

    public AuthService(UserRepository userRepository,
                       OtpRepository otpRepository,
                       MailService mailService,
                       JwtTokenProvider tokenProvider,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.otpRepository = otpRepository;
        this.mailService = mailService;
        this.tokenProvider = tokenProvider;
        this.passwordEncoder = passwordEncoder;
    }

    private String generateOtp() {
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }

    public List<String> getPasswordMissingList(String password) {
        if (password == null) password = "";
        List<String> missing = new ArrayList<>();

        if (password.length() < 12) missing.add("Minimum 12 characters");
        if (!password.matches(".*[A-Z].*")) missing.add("Uppercase letter (A-Z)");
        if (!password.matches(".*[a-z].*")) missing.add("Lowercase letter (a-z)");
        if (!password.matches(".*[0-9].*")) missing.add("Number (0-9)");
        if (!password.matches(".*[@#$%].*")) missing.add("Symbol (@ # $ %)");

        return missing;
    }

    public ApiResponse<Void> requestSignupOtp(String email) {
        if (email == null || email.isBlank()) {
            throw new ApiException("Email is required", HttpStatus.BAD_REQUEST);
        }
        String cleanEmail = email.toLowerCase().trim();

        if (userRepository.existsByEmailIgnoreCase(cleanEmail)) {
            throw new ApiException("User already exists", HttpStatus.BAD_REQUEST);
        }

        String otpCode = generateOtp();

        otpRepository.deleteByEmailIgnoreCase(cleanEmail);

        Otp otpRecord = Otp.builder()
                .email(cleanEmail)
                .otp(otpCode)
                .createdAt(Instant.now())
                .build();
        otpRepository.save(otpRecord);

        mailService.sendOtpEmail(cleanEmail, otpCode);

        return ApiResponse.okMessage("OTP sent to email");
    }

    public ApiResponse<Void> verifyOtp(String email, String otp) {
        if (email == null || otp == null) {
            throw new ApiException("Email and OTP are required", HttpStatus.BAD_REQUEST);
        }
        String cleanEmail = email.toLowerCase().trim();
        String cleanOtp = otp.trim();

        var otpOpt = otpRepository.findByEmailIgnoreCaseAndOtp(cleanEmail, cleanOtp);
        if (otpOpt.isEmpty()) {
            throw new ApiException("Invalid or expired OTP", HttpStatus.BAD_REQUEST);
        }

        return ApiResponse.okMessage("OTP verified");
    }

    public ApiResponse<Object> signup(String email, String password) {
        if (email == null || password == null) {
            throw new ApiException("Email and password are required", HttpStatus.BAD_REQUEST);
        }
        String cleanEmail = email.toLowerCase().trim();

        if (userRepository.existsByEmailIgnoreCase(cleanEmail)) {
            throw new ApiException("User already exists", HttpStatus.BAD_REQUEST);
        }

        List<String> missing = getPasswordMissingList(password);
        if (!missing.isEmpty()) {
            throw new ApiException("Password is missing: " + String.join(", ", missing), HttpStatus.BAD_REQUEST);
        }

        User newUser = User.builder()
                .email(cleanEmail)
                .passwordHash(passwordEncoder.encode(password))
                .build();
        User savedUser = userRepository.save(newUser);

        otpRepository.deleteByEmailIgnoreCase(cleanEmail);

        String token = tokenProvider.generateToken(savedUser.getId());

        UserDto userDto = new UserDto();
        userDto.setEmail(savedUser.getEmail());

        return ApiResponse.builder()
                .success(true)
                .token(token)
                .user(userDto)
                .build();
    }

    public ApiResponse<Object> login(String email, String password) {
        if (email == null || password == null) {
            throw new ApiException("Invalid credentials", HttpStatus.UNAUTHORIZED);
        }
        String cleanEmail = email.toLowerCase().trim();

        var userOpt = userRepository.findByEmailIgnoreCase(cleanEmail);
        if (userOpt.isEmpty() || !passwordEncoder.matches(password, userOpt.get().getPasswordHash())) {
            throw new ApiException("Invalid credentials", HttpStatus.UNAUTHORIZED);
        }

        User user = userOpt.get();
        String token = tokenProvider.generateToken(user.getId());

        UserDto userDto = new UserDto();
        userDto.setEmail(user.getEmail());

        return ApiResponse.builder()
                .success(true)
                .token(token)
                .user(userDto)
                .build();
    }

    public ApiResponse<Void> requestPasswordResetOtp(String email) {
        if (email == null || email.isBlank()) {
            throw new ApiException("Email is required", HttpStatus.BAD_REQUEST);
        }
        String cleanEmail = email.toLowerCase().trim();

        var userOpt = userRepository.findByEmailIgnoreCase(cleanEmail);
        if (userOpt.isEmpty()) {
            throw new ApiException("User with this email does not exist", HttpStatus.NOT_FOUND);
        }

        String otpCode = generateOtp();

        otpRepository.deleteByEmailIgnoreCase(cleanEmail);

        Otp otpRecord = Otp.builder()
                .email(cleanEmail)
                .otp(otpCode)
                .createdAt(Instant.now())
                .build();
        otpRepository.save(otpRecord);

        mailService.sendOtpEmail(cleanEmail, otpCode);

        return ApiResponse.okMessage("Password reset code sent to email");
    }

    public ApiResponse<Void> resetPassword(String email, String otp, String newPassword) {
        if (email == null || otp == null || newPassword == null) {
            throw new ApiException("Email, OTP and newPassword are required", HttpStatus.BAD_REQUEST);
        }
        String cleanEmail = email.toLowerCase().trim();

        List<String> missing = getPasswordMissingList(newPassword);
        if (!missing.isEmpty()) {
            throw new ApiException("Password is missing: " + String.join(", ", missing), HttpStatus.BAD_REQUEST);
        }

        var otpOpt = otpRepository.findByEmailIgnoreCaseAndOtp(cleanEmail, otp.trim());
        if (otpOpt.isEmpty()) {
            throw new ApiException("Invalid or expired OTP", HttpStatus.BAD_REQUEST);
        }

        var userOpt = userRepository.findByEmailIgnoreCase(cleanEmail);
        if (userOpt.isEmpty()) {
            throw new ApiException("User not found", HttpStatus.NOT_FOUND);
        }

        User user = userOpt.get();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        otpRepository.deleteByEmailIgnoreCase(cleanEmail);

        return ApiResponse.okMessage("Password reset successfully");
    }

    public ApiResponse<Object> getMe(String userId) {
        var userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new ApiException("User not found", HttpStatus.NOT_FOUND);
        }
        User user = userOpt.get();
        UserDto userDto = new UserDto();
        userDto.setEmail(user.getEmail());

        return ApiResponse.builder()
                .success(true)
                .user(userDto)
                .build();
    }
}
