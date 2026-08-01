package com.securesend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SecuresendApplication {

    public static void main(String[] args) {
        SpringApplication.run(SecuresendApplication.class, args);
    }
}
