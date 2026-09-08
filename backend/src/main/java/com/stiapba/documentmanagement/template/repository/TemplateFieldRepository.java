package com.stiapba.documentmanagement.template.repository;

import com.stiapba.documentmanagement.template.entity.TemplateField;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.List;

public interface TemplateFieldRepository extends JpaRepository<TemplateField, UUID> {
    List<TemplateField> findByTemplateVariant_IdOrderByDisplayOrderAsc(UUID variantId);
}
