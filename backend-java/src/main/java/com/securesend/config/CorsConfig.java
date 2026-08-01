package com.securesend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        configuration.setAllowedOriginPatterns(List.of(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "https://clarity-connect.onrender.com",
                "https://clarity-connect-1.onrender.com",
                "https://*.onrender.com",
                "https://clarity-connect-gray.vercel.app",
                "https://clarity-connect.pages.dev",
                "https://clarity-connect.mahadevmuchu1.workers.dev",
                "https://securesend.co.in",
                "https://www.securesend.co.in",
                "https://message.securesend.co.in",
                "https://www.message.securesend.co.in",
                "https://*.vercel.app",
                "https://*.pages.dev",
                "https://*.workers.dev"
        ));
        
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Cache-Control", "Content-Type", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
