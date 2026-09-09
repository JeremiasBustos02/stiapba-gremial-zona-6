package com.stiapba.documentmanagement.template;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/field-definitions")
public class FieldDefinitionController {
    private final FieldDefinitionService service;
    public FieldDefinitionController(FieldDefinitionService service) { this.service = service; }
    @GetMapping public List<FieldDefinitionService.FieldDefinitionResponse> list(@RequestParam(defaultValue = "true") boolean active) { return service.list(active); }
    @PostMapping public ResponseEntity<FieldDefinitionService.FieldDefinitionResponse> create(@Valid @RequestBody FieldDefinitionService.FieldDefinitionRequest request) {
        return ResponseEntity.status(201).body(service.create(request));
    }
}
