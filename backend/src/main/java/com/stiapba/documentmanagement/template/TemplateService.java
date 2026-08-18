package com.stiapba.documentmanagement.template;

import com.stiapba.documentmanagement.template.TemplateDtos.TemplateRequest;
import com.stiapba.documentmanagement.template.TemplateDtos.TemplateResponse;
import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.repository.TemplateRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class TemplateService {
    private final TemplateRepository templateRepository;

    public TemplateService(TemplateRepository templateRepository) {
        this.templateRepository = templateRepository;
    }

    public List<TemplateResponse> list(String search, Boolean active, boolean admin) {
        Specification<Template> specification = (root, query, builder) -> builder.conjunction();
        if (!admin || Boolean.TRUE.equals(active)) {
            specification = specification.and((root, query, builder) -> builder.isTrue(root.get("active")));
        } else if (Boolean.FALSE.equals(active)) {
            specification = specification.and((root, query, builder) -> builder.isFalse(root.get("active")));
        }
        if (search != null && !search.isBlank()) {
            String value = search.trim().toLowerCase();
            specification = specification.and((root, query, builder) -> builder.or(
                    builder.like(builder.lower(root.get("nombre")), "%" + value + "%"),
                    builder.like(builder.lower(root.get("descripcion")), "%" + value + "%")));
        }
        return templateRepository.findAll(specification, Sort.by("nombre").ascending()).stream().map(this::toResponse).toList();
    }

    public TemplateResponse get(UUID id, boolean admin) {
        Template template = findById(id);
        if (!admin && !template.isActive()) {
            throw notFound();
        }
        return toResponse(template);
    }

    @Transactional
    public TemplateResponse create(TemplateRequest request) {
        return toResponse(templateRepository.save(new Template(request.nombre().trim(), request.descripcion().trim())));
    }

    @Transactional
    public TemplateResponse update(UUID id, TemplateRequest request) {
        Template template = findById(id);
        template.update(request.nombre().trim(), request.descripcion().trim());
        return toResponse(templateRepository.save(template));
    }

    @Transactional
    public void activate(UUID id) {
        findById(id).activate();
    }

    @Transactional
    public void deactivate(UUID id) {
        findById(id).deactivate();
    }

    Template findById(UUID id) {
        return templateRepository.findById(id).orElseThrow(this::notFound);
    }

    TemplateResponse toResponse(Template template) {
        return new TemplateResponse(template.getId(), template.getNombre(), template.getDescripcion(), template.isActive(),
                template.getCreatedAt(), template.getUpdatedAt());
    }

    private TemplateException notFound() {
        return new TemplateException(404, "TEMPLATE_NOT_FOUND", "No encontramos la plantilla solicitada.");
    }
}
