package com.stiapba.documentmanagement.template.repository;

import com.stiapba.documentmanagement.template.entity.Template;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TemplateRepository extends JpaRepository<Template, UUID> {
}
