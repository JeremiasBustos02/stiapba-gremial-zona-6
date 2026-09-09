package com.stiapba.documentmanagement.security;

import jakarta.servlet.FilterChain;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockCookie;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class JwtAuthenticationFilterTest {

    @Test
    void doesNotReadUserRepositoryForHealthRequest() throws Exception {
        JwtService jwtService = mock(JwtService.class);
        var userRepository = mock(com.stiapba.documentmanagement.user.repository.UserRepository.class);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, userRepository);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/health");
        request.setCookies(new MockCookie(JwtAuthenticationFilter.AUTH_COOKIE, "token"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        verifyNoInteractions(jwtService, userRepository);
        verify(chain).doFilter(request, response);
    }

    @Test
    void doesNotParseMalformedTokenOrReadUserRepositoryForHeadHealthRequest() throws Exception {
        JwtService jwtService = mock(JwtService.class);
        var userRepository = mock(com.stiapba.documentmanagement.user.repository.UserRepository.class);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, userRepository);
        MockHttpServletRequest request = new MockHttpServletRequest("HEAD", "/api/v1/health");
        request.setCookies(new MockCookie(JwtAuthenticationFilter.AUTH_COOKIE, "malformed-token"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        verifyNoInteractions(jwtService, userRepository);
        verify(chain).doFilter(request, response);
    }

    @Test
    void treatsMissingAuthCookieAsUnauthenticatedWithoutParsingAToken() throws Exception {
        JwtService jwtService = mock(JwtService.class);
        var userRepository = mock(com.stiapba.documentmanagement.user.repository.UserRepository.class);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, userRepository);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/templates");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        verifyNoInteractions(jwtService, userRepository);
        verify(chain).doFilter(request, response);
    }

    @Test
    void treatsInvalidAuthCookieAsUnauthenticatedWithoutLookingUpAUser() throws Exception {
        JwtService jwtService = mock(JwtService.class);
        var userRepository = mock(com.stiapba.documentmanagement.user.repository.UserRepository.class);
        when(jwtService.parseToken("invalid-token")).thenThrow(new JwtException("invalid"));
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, userRepository);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/templates");
        request.setCookies(new MockCookie(JwtAuthenticationFilter.AUTH_COOKIE, "invalid-token"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        verify(jwtService).parseToken("invalid-token");
        verifyNoInteractions(userRepository);
        verify(chain).doFilter(request, response);
    }
}
