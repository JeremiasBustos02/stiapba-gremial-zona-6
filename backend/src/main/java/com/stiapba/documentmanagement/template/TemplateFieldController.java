package com.stiapba.documentmanagement.template;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/templates/{templateId}/variants/{variantId}/fields")
public class TemplateFieldController {
    private final TemplateFieldService service;
    public TemplateFieldController(TemplateFieldService service) { this.service = service; }
    @GetMapping public List<TemplateFieldService.TemplateFieldResponse> list(@PathVariable UUID templateId, @PathVariable UUID variantId) { return service.list(templateId, variantId); }
    @GetMapping("/acroform") public List<TemplateFieldService.AcroformFieldResponse> acroformFields(@PathVariable UUID templateId, @PathVariable UUID variantId) { return service.acroformFields(templateId, variantId); }
    @PostMapping public ResponseEntity<TemplateFieldService.TemplateFieldResponse> create(@PathVariable UUID templateId, @PathVariable UUID variantId, @Valid @RequestBody TemplateFieldService.PositionedFieldRequest request) { return ResponseEntity.status(201).body(service.create(templateId, variantId, request)); }
    @PostMapping("/acroform") public ResponseEntity<TemplateFieldService.TemplateFieldResponse> createAcroform(@PathVariable UUID templateId, @PathVariable UUID variantId, @Valid @RequestBody TemplateFieldService.AcroformFieldRequest request) { return ResponseEntity.status(201).body(service.createAcroform(templateId, variantId, request)); }
    @PutMapping("/{fieldId}") public TemplateFieldService.TemplateFieldResponse update(@PathVariable UUID templateId, @PathVariable UUID variantId, @PathVariable UUID fieldId, @Valid @RequestBody TemplateFieldService.PositionedFieldRequest request) { return service.update(templateId, variantId, fieldId, request); }
    @DeleteMapping("/{fieldId}") public ResponseEntity<Void> delete(@PathVariable UUID templateId, @PathVariable UUID variantId, @PathVariable UUID fieldId) { service.delete(templateId, variantId, fieldId); return ResponseEntity.noContent().build(); }
}
