package com.stiapba.documentmanagement.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockCookie;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.mockito.Mockito.mock;
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
}
