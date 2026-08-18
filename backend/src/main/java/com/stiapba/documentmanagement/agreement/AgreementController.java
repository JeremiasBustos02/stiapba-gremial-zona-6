package com.stiapba.documentmanagement.agreement;

import com.stiapba.documentmanagement.agreement.AgreementDtos.AgreementRequest;
import com.stiapba.documentmanagement.agreement.AgreementDtos.AgreementResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/agreements")
public class AgreementController {
    private final AgreementService agreementService;

    public AgreementController(AgreementService agreementService) {
        this.agreementService = agreementService;
    }

    @GetMapping
    public List<AgreementResponse> list(Authentication authentication, @RequestParam(required = false) String search,
                                        @RequestParam(required = false) Boolean active) {
        boolean admin = authentication.getAuthorities().stream().anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
        return agreementService.list(search, active, admin);
    }

    @PostMapping
    public ResponseEntity<AgreementResponse> create(@Valid @RequestBody AgreementRequest request) {
        return ResponseEntity.status(201).body(agreementService.create(request));
    }

    @PutMapping("/{id}")
    public AgreementResponse update(@PathVariable UUID id, @Valid @RequestBody AgreementRequest request) {
        return agreementService.update(id, request);
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<Void> activate(@PathVariable UUID id) {
        agreementService.activate(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        agreementService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
