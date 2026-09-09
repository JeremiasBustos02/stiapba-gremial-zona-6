package com.stiapba.documentmanagement.template.entity;

import com.stiapba.documentmanagement.common.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "field_definitions")
public class FieldDefinition extends AuditableEntity {

    @Column(name = "field_key", nullable = false, unique = true, length = 100)
    private String key;

    @Column(nullable = false, length = 200)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(name = "field_type", nullable = false, length = 20)
    private FieldType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private FieldSourceType sourceType;

    @Column(nullable = false)
    private boolean required;

    @Column(nullable = false)
    private boolean active = true;

    protected FieldDefinition() {
    }

    public FieldDefinition(String key) {
        this.key = key;
        this.label = key;
        this.type = FieldType.TEXT;
        this.sourceType = FieldSourceType.MANUAL;
    }

    public FieldDefinition(String key, String label, FieldType type, FieldSourceType sourceType, boolean required) {
        this.key = key;
        this.label = label;
        this.type = type;
        this.sourceType = sourceType;
        this.required = required;
    }

    public String getKey() {
        return key;
    }

    public String getLabel() {
        return label;
    }

    public FieldType getType() {
        return type;
    }

    public FieldSourceType getSourceType() {
        return sourceType;
    }

    public boolean isRequired() {
        return required;
    }

    public boolean isActive() {
        return active;
    }
}
