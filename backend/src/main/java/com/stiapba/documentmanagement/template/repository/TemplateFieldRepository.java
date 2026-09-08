package com.stiapba.documentmanagement.template.repository;

import com.stiapba.documentmanagement.template.entity.TemplateField;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.UUID;
import java.util.List;

public interface TemplateFieldRepository extends JpaRepository<TemplateField, UUID> {
    @EntityGraph(attributePaths = "fieldDefinition")
    List<TemplateField> findByTemplateVariant_IdOrderByDisplayOrderAsc(UUID variantId);
    void deleteByTemplateVariant_Id(UUID variantId);
}
