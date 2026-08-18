package com.stiapba.documentmanagement.template.repository;

import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TemplateVariantRepository extends JpaRepository<TemplateVariant, UUID> {
}
