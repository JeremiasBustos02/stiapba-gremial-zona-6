package com.stiapba.documentmanagement.template;

import com.stiapba.documentmanagement.template.TemplateDtos.TemplateVariantResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/templates/{templateId}/variants")
public class TemplateVariantController {
    private final TemplateVariantService variantService;

    public TemplateVariantController(TemplateVariantService variantService) {
        this.variantService = variantService;
    }

    @GetMapping
    public List<TemplateVariantResponse> list(Authentication authentication, @PathVariable UUID templateId,
                                              @RequestParam(required = false) String search,
                                              @RequestParam(required = false) Boolean active) {
        return variantService.list(templateId, search, active, isAdmin(authentication));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TemplateVariantResponse> create(@PathVariable UUID templateId,
                                                           @RequestParam("nombre") String nombre,
                                                           @RequestPart("archivoPdf") MultipartFile file) {
        return ResponseEntity.status(201).body(variantService.create(templateId, nombre, file));
    }

    @PutMapping("/{variantId}")
    public TemplateVariantResponse update(@PathVariable UUID templateId, @PathVariable UUID variantId,
                                          @Valid @org.springframework.web.bind.annotation.RequestBody VariantNameRequest request) {
        return variantService.update(templateId, variantId, request.nombre());
    }

    @PutMapping(value = "/{variantId}/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TemplateVariantResponse replaceFile(@PathVariable UUID templateId, @PathVariable UUID variantId,
                                                @RequestPart("archivoPdf") MultipartFile file) {
        return variantService.replaceFile(templateId, variantId, file);
    }

    @GetMapping(value = "/{variantId}/file", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> file(@PathVariable UUID templateId, @PathVariable UUID variantId) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).body(variantService.loadFile(templateId, variantId));
    }

    @PatchMapping("/{variantId}/activate")
    public ResponseEntity<Void> activate(@PathVariable UUID templateId, @PathVariable UUID variantId) {
        variantService.activate(templateId, variantId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{variantId}/deactivate")
    public ResponseEntity<Void> deactivate(@PathVariable UUID templateId, @PathVariable UUID variantId) {
        variantService.deactivate(templateId, variantId);
        return ResponseEntity.noContent().build();
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream().anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
    }

    public record VariantNameRequest(
            @NotBlank(message = "El nombre es obligatorio.")
            @Size(max = 200, message = "El nombre es demasiado largo.") String nombre
    ) {
    }
}
