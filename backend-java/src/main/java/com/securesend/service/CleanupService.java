package com.securesend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class CleanupService {

    private static final Logger log = LoggerFactory.getLogger(CleanupService.class);

    private final MessageService messageService;

    public CleanupService(MessageService messageService) {
        this.messageService = messageService;
    }

    // Run once a day at midnight
    @Scheduled(cron = "0 0 0 * * ?")
    public void scheduleDailyCleanup() {
        log.info("[DAILY CLEANUP] Executing scheduled expired messages cleanup...");
        try {
            messageService.purgeExpiredMessages();
            log.info("[DAILY CLEANUP] Expired messages cleanup completed successfully.");
        } catch (Exception e) {
            log.error("[DAILY CLEANUP] Error executing scheduled cleanup", e);
        }
    }
}
