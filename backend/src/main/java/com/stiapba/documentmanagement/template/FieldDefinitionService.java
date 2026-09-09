package com.stiapba.documentmanagement.template;

import com.stiapba.documentmanagement.template.entity.FieldDefinition;
import com.stiapba.documentmanagement.template.entity.FieldSourceType;
import com.stiapba.documentmanagement.template.entity.FieldType;
import com.stiapba.documentmanagement.template.repository.FieldDefinitionRepository;
import org.springframework.stereotype.Service;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.UUID;

@Service
public class FieldDefinitionService {
    private final FieldDefinitionRepository repository;

    public FieldDefinitionService(FieldDefinitionRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<FieldDefinitionResponse> list(boolean activeOnly) {
        List<FieldDefinition> definitions = activeOnly ? repository.findByActiveTrueOrderByLabelAsc() : repository.findAll();
        return definitions.stream().map(this::response).toList();
    }

    @Transactional
    public FieldDefinitionResponse create(FieldDefinitionRequest request) {
        String label = normalizeLabel(request.label());
        if (request.type() == null || request.sourceType() == null) {
            throw new TemplateException(400, "FIELD_DEFINITION_INVALID", "El tipo y el origen del dato son obligatorios.");
        }
        for (int attempt = 0; attempt < 100; attempt++) {
            String key = nextKey(label);
            try {
                FieldDefinition definition = repository.saveAndFlush(new FieldDefinition(key, label, request.type(), request.sourceType(), request.required()));
                return response(definition);
            } catch (DataIntegrityViolationException exception) {
                if (!repository.existsByKey(key)) throw exception;
            }
        }
        throw new TemplateException(409, "FIELD_DEFINITION_KEY_CONFLICT", "No pudimos generar una clave interna única para el dato.");
    }

    private String normalizeLabel(String label) {
        if (label == null || label.isBlank()) {
            throw new TemplateException(400, "FIELD_DEFINITION_INVALID", "El nombre del dato es obligatorio.");
        }
        String value = label.trim();
        if (value.length() > 200) {
            throw new TemplateException(400, "FIELD_DEFINITION_INVALID", "El nombre del dato es demasiado largo.");
        }
        return value;
    }

    private String nextKey(String label) {
        String normalized = Normalizer.normalize(label, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase().replaceAll("[^a-z0-9]+", "_").replaceAll("(^_+|_+$)", "");
        String base = normalized.isBlank() ? "dato" : normalized;
        if (base.length() > 90) base = base.substring(0, 90).replaceAll("_+$", "");
        String candidate = base;
        int suffix = 2;
        while (repository.existsByKey(candidate)) {
            candidate = base + "_" + suffix++;
        }
        return candidate;
    }

    private FieldDefinitionResponse response(FieldDefinition definition) {
        return new FieldDefinitionResponse(definition.getId(), definition.getKey(), definition.getLabel(), definition.getType(),
                definition.getSourceType(), definition.isRequired(), definition.isActive());
    }

    public record FieldDefinitionRequest(String label, FieldType type, FieldSourceType sourceType, boolean required) {
    }

    public record FieldDefinitionResponse(UUID id, String key, String label, FieldType type, FieldSourceType sourceType,
                                          boolean required, boolean active) {
    }
}
