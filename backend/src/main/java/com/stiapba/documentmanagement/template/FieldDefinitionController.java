package com.stiapba.documentmanagement.template;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/v1/field-definitions")
public class FieldDefinitionController {
    private final TemplateFieldService service;
    public FieldDefinitionController(TemplateFieldService service) { this.service = service; }
    @GetMapping public List<TemplateFieldService.FieldDefinitionResponse> list() { return service.definitions(); }
}
