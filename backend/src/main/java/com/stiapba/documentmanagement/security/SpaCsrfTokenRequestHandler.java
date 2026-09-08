package com.stiapba.documentmanagement.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;

import java.util.function.Supplier;

public final class SpaCsrfTokenRequestHandler extends CsrfTokenRequestAttributeHandler {

    public static final String RAW_CSRF_TOKEN_ATTRIBUTE = "csrfToken";
    private static final String HEALTH_PATH = "/api/v1/health";

    private final XorCsrfTokenRequestAttributeHandler xor = new XorCsrfTokenRequestAttributeHandler();

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, Supplier<CsrfToken> deferredCsrfToken) {
        if ("GET".equals(request.getMethod()) && HEALTH_PATH.equals(request.getRequestURI())) {
            return;
        }
        xor.handle(request, response, deferredCsrfToken);
        CsrfToken csrfToken = deferredCsrfToken.get();
        request.setAttribute(RAW_CSRF_TOKEN_ATTRIBUTE, csrfToken);
    }

    @Override
    public String resolveCsrfTokenValue(HttpServletRequest request, CsrfToken csrfToken) {
        String headerValue = request.getHeader(csrfToken.getHeaderName());
        return headerValue != null && !headerValue.isBlank()
                ? super.resolveCsrfTokenValue(request, csrfToken)
                : xor.resolveCsrfTokenValue(request, csrfToken);
    }
}
