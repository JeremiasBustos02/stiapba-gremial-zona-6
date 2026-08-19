package com.stiapba.documentmanagement.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey key;
    private final Duration expiration;

    public JwtService(
            @Value("${app.security.jwt.secret}") String secret,
            @Value("${app.security.jwt.expiration-seconds}") long expirationSeconds
    ) {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET debe tener al menos 32 bytes codificados en Base64.");
        }
        if (expirationSeconds <= 0) {
            throw new IllegalStateException("JWT_EXPIRATION_SECONDS debe ser mayor que cero.");
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.expiration = Duration.ofSeconds(expirationSeconds);
    }

    public String createToken(UUID userId, long sessionVersion) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("sessionVersion", sessionVersion)
                .issuedAt(java.util.Date.from(now))
                .expiration(java.util.Date.from(now.plus(expiration)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public TokenClaims parseToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        Number sessionVersion = claims.get("sessionVersion", Number.class);
        return new TokenClaims(UUID.fromString(claims.getSubject()), sessionVersion == null ? 0 : sessionVersion.longValue());
    }

    public Duration expiration() {
        return expiration;
    }

    public record TokenClaims(UUID userId, long sessionVersion) {
    }
}
