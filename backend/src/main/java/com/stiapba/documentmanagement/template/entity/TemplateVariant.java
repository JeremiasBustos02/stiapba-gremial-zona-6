package com.stiapba.documentmanagement.template.entity;

import com.stiapba.documentmanagement.common.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "template_variants", indexes = {
        @Index(name = "idx_template_variants_template_id", columnList = "template_id"),
        @Index(name = "idx_template_variants_active", columnList = "active")
})
public class TemplateVariant extends AuditableEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", nullable = false)
    private Template template;

    @Column(nullable = false, length = 200)
    private String nombre;

    @Column(name = "file_key", nullable = false, length = 255)
    private String fileKey;

    @Column(nullable = false)
    private boolean active = true;

    protected TemplateVariant() {
    }

    public TemplateVariant(Template template, String nombre, String fileKey) {
        this.template = template;
        this.nombre = nombre;
        this.fileKey = fileKey;
    }

    public Template getTemplate() {
        return template;
    }

    public String getNombre() {
        return nombre;
    }

    public String getFileKey() {
        return fileKey;
    }

    public boolean isActive() {
        return active;
    }
}
