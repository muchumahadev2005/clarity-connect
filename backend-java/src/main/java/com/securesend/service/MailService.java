package com.securesend.service;

import com.securesend.dto.AnonymousRequests.AttachmentDto;
import com.securesend.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import jakarta.mail.internet.MimeMessage;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    @Value("${securesend.resend.api-key:}")
    private String resendApiKey;

    @Value("${securesend.resend.from:SecureSend <noreply@securesend.co.in>}")
    private String resendFrom;

    @Value("${securesend.email.auth-provider:resend}")
    private String authProvider;

    @Value("${securesend.email.anon-provider:resend}")
    private String anonProvider;

    private final JavaMailSender javaMailSender;
    private final RestTemplate restTemplate;

    public MailService(JavaMailSender javaMailSender) {
        this.javaMailSender = javaMailSender;
        this.restTemplate = new RestTemplate();
    }

    public void sendOtpEmail(String email, String otp) {
        if ("smtp".equalsIgnoreCase(authProvider)) {
            sendOtpEmailViaSmtp(email, otp);
        } else {
            sendOtpEmailViaResend(email, otp);
        }
    }

    private void sendOtpEmailViaResend(String email, String otp) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            throw new ApiException("RESEND_API_KEY is missing from environment variables.", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        String htmlContent = String.format("""
            <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #6366f1; text-align: center;">SecureSend</h2>
              <p>Hello,</p>
              <p>Your verification code is:</p>
              <div style="background: #f4f4f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333; border-radius: 8px;">
                %s
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 20px;">
                This code will expire in 10 minutes. If you didn't request this, please ignore this email.
              </p>
            </div>
            """, escapeHtml(otp));

        Map<String, Object> body = new HashMap<>();
        body.put("from", resendFrom);
        body.put("to", List.of(email.trim()));
        body.put("subject", "Your SecureSend Verification Code");
        body.put("text", "Your SecureSend verification code is " + otp + ". This code will expire in 10 minutes.");
        body.put("html", htmlContent);

        sendViaResendHttp(body);
    }

    private void sendOtpEmailViaSmtp(String email, String otp) {
        try {
            MimeMessage mimeMessage = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(resendFrom);
            helper.setTo(email);
            helper.setSubject("Your SecureSend Verification Code");
            helper.setText("Your SecureSend verification code is " + otp + ". This code will expire in 10 minutes.", true);
            javaMailSender.send(mimeMessage);
        } catch (Exception e) {
            log.error("Failed to send OTP via SMTP", e);
            throw new ApiException("Failed to send verification email via SMTP.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public Map<String, Object> sendAnonymousEmail(String to, String subject, String content, String alias, List<AttachmentDto> attachments) {
        return sendAnonymousEmail(List.of(to), subject, content, alias, attachments);
    }

    public Map<String, Object> sendAnonymousEmail(List<String> recipients, String subject, String content, String alias, List<AttachmentDto> attachments) {
        if (recipients == null || recipients.isEmpty()) {
            throw new ApiException("No recipient email addresses provided.", HttpStatus.BAD_REQUEST);
        }

        String safeSubject = subject != null ? subject.trim() : "New Message";
        String safeContent = content != null ? content.trim() : "";
        String safeAlias = alias != null ? alias.trim() : "anonymous";

        String customDisplayName = "SecureSend";
        String cleanContent = safeContent;

        Pattern fromPattern = Pattern.compile("^\\[From:\\s*([^\\]]+)\\]", Pattern.CASE_INSENSITIVE);
        Matcher matcher = fromPattern.matcher(safeContent);
        if (matcher.find()) {
            customDisplayName = matcher.group(1).trim();
            cleanContent = safeContent.replaceAll("^\\[From:\\s*[^\\]]+\\]\\s*", "");
        }

        if ("smtp".equalsIgnoreCase(anonProvider) || resendApiKey == null || resendApiKey.isBlank()) {
            return sendAnonymousEmailViaSmtp(recipients, safeSubject, cleanContent, safeAlias, customDisplayName, attachments);
        }
        return sendAnonymousEmailViaResend(recipients, safeSubject, cleanContent, safeAlias, customDisplayName, attachments);
    }

    private Map<String, Object> sendAnonymousEmailViaResend(List<String> recipients, String subject, String content, String alias, String displayName, List<AttachmentDto> attachments) {
        String replyTo = alias + "@securesend.co.in";
        String emailOnly = resendFrom;
        if (resendFrom.contains("<") && resendFrom.contains(">")) {
            emailOnly = resendFrom.substring(resendFrom.indexOf("<") + 1, resendFrom.indexOf(">"));
        }
        String fromHeader = String.format("\"%s\" <%s>", displayName, emailOnly);

        String safeHtml = escapeHtml(content).replace("\n", "<br />");
        String htmlContent = String.format("""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #222; max-width: 600px;">
              <div style="margin-bottom: 24px;">
                %s
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0 16px 0;" />
              <div style="font-size: 11px; color: #888;">
                Sent securely via <strong>SecureSend</strong>. You can reply directly to: <code>%s</code>
              </div>
            </div>
            """, safeHtml, replyTo);

        List<Map<String, String>> resendAtts = null;
        if (attachments != null && !attachments.isEmpty()) {
            resendAtts = new ArrayList<>();
            for (AttachmentDto att : attachments) {
                Map<String, String> a = new HashMap<>();
                a.put("filename", att.getFilename());
                a.put("content", att.getContent()); // Base64 content
                resendAtts.add(a);
            }
        }

        // Single recipient - use direct standard endpoint
        if (recipients.size() == 1) {
            Map<String, Object> body = new HashMap<>();
            body.put("from", fromHeader);
            body.put("to", List.of(recipients.get(0).trim()));
            body.put("subject", subject != null && !subject.isBlank() ? subject : "New Message");
            body.put("reply_to", replyTo);
            body.put("text", content);
            body.put("html", htmlContent);
            if (resendAtts != null) {
                body.put("attachments", resendAtts);
            }

            Map<String, Object> responseData = sendViaResendHttp(body);
            Map<String, Object> result = new HashMap<>();
            result.put("provider", "resend");
            result.put("totalRecipients", 1);
            result.put("batchCount", 1);
            result.put("data", responseData);
            return result;
        }

        // Multi-recipient batch send (up to 100 per Resend Batch API call)
        final int BATCH_SIZE = 100;
        int totalBatches = (recipients.size() + BATCH_SIZE - 1) / BATCH_SIZE;
        log.info("[sendAnonymousEmailViaResend] Starting batch send for {} recipients in {} batches", recipients.size(), totalBatches);

        List<Object> allResponses = new ArrayList<>();
        for (int i = 0; i < recipients.size(); i += BATCH_SIZE) {
            int end = Math.min(i + BATCH_SIZE, recipients.size());
            List<String> chunk = recipients.subList(i, end);

            List<Map<String, Object>> batchPayload = new ArrayList<>();
            for (String rec : chunk) {
                Map<String, Object> item = new HashMap<>();
                item.put("from", fromHeader);
                item.put("to", List.of(rec.trim()));
                item.put("subject", subject != null && !subject.isBlank() ? subject : "New Message");
                item.put("reply_to", replyTo);
                item.put("text", content);
                item.put("html", htmlContent);
                if (resendAtts != null) {
                    item.put("attachments", resendAtts);
                }
                batchPayload.add(item);
            }

            int currentBatchNum = (i / BATCH_SIZE) + 1;
            log.info("[sendAnonymousEmailViaResend] Sending batch {}/{} ({} emails)", currentBatchNum, totalBatches, batchPayload.size());
            List<Map<String, Object>> batchResp = sendViaResendBatchHttp(batchPayload);
            if (batchResp != null) {
                allResponses.addAll(batchResp);
            }

            // Respect Resend rate limits with a small breather between batch calls
            if (end < recipients.size()) {
                try {
                    Thread.sleep(150);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("provider", "resend");
        result.put("totalRecipients", recipients.size());
        result.put("batchCount", totalBatches);
        result.put("data", Map.of(
                "status", "sent",
                "totalRecipients", recipients.size(),
                "batchCount", totalBatches,
                "batchResponsesCount", allResponses.size()
        ));
        return result;
    }

    private Map<String, Object> sendAnonymousEmailViaSmtp(List<String> recipients, String subject, String content, String alias, String displayName, List<AttachmentDto> attachments) {
        try {
            String replyTo = alias + "@securesend.co.in";
            int sentCount = 0;
            for (String to : recipients) {
                MimeMessage mimeMessage = javaMailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
                helper.setFrom(resendFrom, displayName);
                helper.setReplyTo(replyTo);
                helper.setTo(to.trim());
                helper.setSubject(subject != null && !subject.isBlank() ? subject : "New Message");
                helper.setText(content, true);

                javaMailSender.send(mimeMessage);
                sentCount++;
            }

            Map<String, Object> result = new HashMap<>();
            result.put("provider", "smtp");
            result.put("totalRecipients", recipients.size());
            result.put("sentCount", sentCount);
            result.put("data", Map.of("status", "sent", "count", sentCount));
            return result;
        } catch (Exception e) {
            log.error("SMTP anonymous mail send failed", e);
            throw new ApiException("Failed to send anonymous email via SMTP: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private Map<String, Object> sendViaResendHttp(Map<String, Object> payload) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(resendApiKey);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<Map> response = restTemplate.exchange("https://api.resend.com/emails", HttpMethod.POST, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return (Map<String, Object>) response.getBody();
            }
            throw new ApiException("Resend returned status: " + response.getStatusCode(), HttpStatus.BAD_GATEWAY);
        } catch (Exception e) {
            log.error("Resend API request failed", e);
            throw new ApiException("Failed to send email via Resend: " + e.getMessage(), HttpStatus.BAD_GATEWAY);
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> sendViaResendBatchHttp(List<Map<String, Object>> batchPayload) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(resendApiKey);

            HttpEntity<List<Map<String, Object>>> entity = new HttpEntity<>(batchPayload, headers);
            ResponseEntity<Map> response = restTemplate.exchange("https://api.resend.com/emails/batch", HttpMethod.POST, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object dataObj = response.getBody().get("data");
                if (dataObj instanceof List) {
                    return (List<Map<String, Object>>) dataObj;
                }
                return List.of(response.getBody());
            }
            throw new ApiException("Resend batch returned status: " + response.getStatusCode(), HttpStatus.BAD_GATEWAY);
        } catch (Exception e) {
            log.error("Resend Batch API request failed", e);
            throw new ApiException("Failed to send batch emails via Resend: " + e.getMessage(), HttpStatus.BAD_GATEWAY);
        }
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
