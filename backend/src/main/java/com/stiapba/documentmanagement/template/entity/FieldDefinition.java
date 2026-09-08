package com.stiapba.documentmanagement.template.entity;

import com.stiapba.documentmanagement.common.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "field_definitions")
public class FieldDefinition extends AuditableEntity {

    @Column(name = "field_key", nullable = false, unique = true, length = 100)
    private String key;

    protected FieldDefinition() {
    }

    public FieldDefinition(String key) {
        this.key = key;
    }

    public String getKey() {
        return key;
    }
}
