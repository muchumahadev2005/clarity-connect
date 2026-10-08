package com.securesend.service;

import com.securesend.dto.ApiResponse;
import com.securesend.dto.AnonymousRequests.SendAnonymousRequest;
import com.securesend.model.AnonymousMessage;
import com.securesend.repository.AliasRepository;
import com.securesend.repository.AnonymousMessageRepository;
import com.securesend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnonymousServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AliasRepository aliasRepository;

    @Mock
    private AnonymousMessageRepository anonymousMessageRepository;

    @Mock
    private AliasService aliasService;

    @Mock
    private MailService mailService;

    @InjectMocks
    private AnonymousService anonymousService;

    @BeforeEach
    void setUp() {
        when(aliasService.validateAlias(anyString())).thenReturn(new AliasService.AliasValidationResult(true, null, "real@test.com", java.time.Instant.now().plusSeconds(3600)));
    }

    @Test
    void testSendAnonymousTo1400Recipients() {
        List<String> recipients = new ArrayList<>();
        for (int i = 1; i <= 1400; i++) {
            recipients.add("member" + i + "@example.com");
        }

        SendAnonymousRequest req = new SendAnonymousRequest();
        req.setRecipients(recipients);
        req.setSubject("Confidential Announcement");
        req.setMessage("Hello team, this is an anonymous notice.");
        req.setAlias("whistleblower");

        when(mailService.sendAnonymousEmail(anyList(), anyString(), anyString(), anyString(), any()))
                .thenReturn(Map.of("provider", "resend", "batchCount", 14, "totalRecipients", 1400));

        ApiResponse<Object> response = anonymousService.sendAnonymous(req);

        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).contains("1400 recipients");

        // Verify mailService received 1400 recipients
        ArgumentCaptor<List<String>> listCaptor = ArgumentCaptor.forClass(List.class);
        verify(mailService).sendAnonymousEmail(listCaptor.capture(), eq("Confidential Announcement"), eq("Hello team, this is an anonymous notice."), eq("whistleblower"), isNull());
        assertThat(listCaptor.getValue()).hasSize(1400);

        // Verify anonymousMessageRepository.saveAll received 1400 messages
        ArgumentCaptor<Iterable<AnonymousMessage>> saveAllCaptor = ArgumentCaptor.forClass(Iterable.class);
        verify(anonymousMessageRepository).saveAll(saveAllCaptor.capture());
        List<AnonymousMessage> savedList = new ArrayList<>();
        saveAllCaptor.getValue().forEach(savedList::add);
        assertThat(savedList).hasSize(1400);
        assertThat(savedList.get(0).getSenderAlias()).isEqualTo("whistleblower@securesend.co.in");
    }

    @Test
    void testSendAnonymousWithCommaSeparatedEmails() {
        SendAnonymousRequest req = new SendAnonymousRequest();
        req.setTo("alice@example.com, bob@example.com\ncharlie@example.com");
        req.setSubject("Update");
        req.setMessage("Testing multi-line/comma input");
        req.setAlias("sender123");

        when(mailService.sendAnonymousEmail(anyList(), anyString(), anyString(), anyString(), any()))
                .thenReturn(Map.of("provider", "resend", "batchCount", 1, "totalRecipients", 3));

        ApiResponse<Object> response = anonymousService.sendAnonymous(req);

        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).contains("3 recipients");

        ArgumentCaptor<List<String>> listCaptor = ArgumentCaptor.forClass(List.class);
        verify(mailService).sendAnonymousEmail(listCaptor.capture(), eq("Update"), eq("Testing multi-line/comma input"), eq("sender123"), isNull());
        assertThat(listCaptor.getValue()).containsExactlyInAnyOrder("alice@example.com", "bob@example.com", "charlie@example.com");
    }
}
