package com.stiapba.documentmanagement.template.repository;

import com.stiapba.documentmanagement.template.entity.Template;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;
import java.util.Optional;

public interface TemplateRepository extends JpaRepository<Template, UUID>, JpaSpecificationExecutor<Template> {
    Optional<Template> findByNombre(String nombre);
}
