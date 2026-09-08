package com.stiapba.documentmanagement.template.repository;

import com.stiapba.documentmanagement.template.entity.FieldDefinition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FieldDefinitionRepository extends JpaRepository<FieldDefinition, UUID> {
    Optional<FieldDefinition> findByKey(String key);
}
