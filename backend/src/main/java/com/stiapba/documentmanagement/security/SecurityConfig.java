package com.stiapba.documentmanagement.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stiapba.documentmanagement.common.api.ApiError;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.function.Supplier;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final FirstLoginRestrictionFilter firstLoginRestrictionFilter;
    private final ObjectMapper objectMapper;
    private final String frontendUrl;
    private final boolean secureCookies;
    private final String sameSite;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            FirstLoginRestrictionFilter firstLoginRestrictionFilter,
            ObjectMapper objectMapper,
            @Value("${frontend.url}") String frontendUrl,
            @Value("${app.security.cookie.secure}") boolean secureCookies,
            @Value("${app.security.cookie.same-site}") String sameSite
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.firstLoginRestrictionFilter = firstLoginRestrictionFilter;
        this.objectMapper = objectMapper;
        this.frontendUrl = frontendUrl;
        this.secureCookies = secureCookies;
        this.sameSite = sameSite;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        CookieCsrfTokenRepository csrfRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfRepository.setCookieCustomizer(cookie -> cookie.path("/").secure(secureCookies).sameSite(sameSite));

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfRepository)
                        .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler())
                        .ignoringRequestMatchers("/api/v1/auth/login"))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) -> writeError(response, 401,
                                "SESSION_INVALID", "La sesión no es válida o expiró."))
                        .accessDeniedHandler((request, response, exception) -> writeError(response, 403,
                                "ACCESS_DENIED", "No tenés permisos para realizar esta acción.")))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/v1/auth/login").permitAll()
                        .requestMatchers("/api/v1/users/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/auth/**").authenticated()
                        .requestMatchers("/api/v1/**").authenticated()
                        .anyRequest().denyAll())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(firstLoginRestrictionFilter, JwtAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService userDetailsService() {
        return username -> {
            throw new UsernameNotFoundException("La autenticación se realiza mediante JWT.");
        };
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(frontendUrl));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of(HttpHeaders.CONTENT_TYPE, "X-XSRF-TOKEN"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    private void writeError(HttpServletResponse response, int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), new ApiError(status, code, message, null, OffsetDateTime.now()));
    }

    private static final class SpaCsrfTokenRequestHandler extends CsrfTokenRequestAttributeHandler {
        private final XorCsrfTokenRequestAttributeHandler xor = new XorCsrfTokenRequestAttributeHandler();

        @Override
        public void handle(jakarta.servlet.http.HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response,
                           Supplier<org.springframework.security.web.csrf.CsrfToken> deferredCsrfToken) {
            xor.handle(request, response, deferredCsrfToken);
            deferredCsrfToken.get();
        }

        @Override
        public String resolveCsrfTokenValue(jakarta.servlet.http.HttpServletRequest request,
                                            org.springframework.security.web.csrf.CsrfToken csrfToken) {
            String headerValue = request.getHeader(csrfToken.getHeaderName());
            return headerValue != null && !headerValue.isBlank()
                    ? super.resolveCsrfTokenValue(request, csrfToken)
                    : xor.resolveCsrfTokenValue(request, csrfToken);
        }
    }
}
