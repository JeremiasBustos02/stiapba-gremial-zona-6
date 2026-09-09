package com.stiapba.documentmanagement.template.repository;

import com.stiapba.documentmanagement.template.entity.FieldDefinition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

public interface FieldDefinitionRepository extends JpaRepository<FieldDefinition, UUID> {
    Optional<FieldDefinition> findByKey(String key);
    boolean existsByKey(String key);
    List<FieldDefinition> findByActiveTrueOrderByLabelAsc();
}
