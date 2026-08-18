package com.stiapba.documentmanagement.template.repository;

import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface TemplateVariantRepository extends JpaRepository<TemplateVariant, UUID>, JpaSpecificationExecutor<TemplateVariant> {
}
