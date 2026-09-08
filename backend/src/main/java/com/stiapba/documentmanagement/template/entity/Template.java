package com.stiapba.documentmanagement.template.entity;

import com.stiapba.documentmanagement.common.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(name = "templates", indexes = {
        @Index(name = "idx_templates_active", columnList = "active")
})
public class Template extends AuditableEntity {

    @Column(nullable = false, length = 200)
    private String nombre;

    @Column(nullable = false, length = 500)
    private String descripcion;

    @Column(nullable = false)
    private boolean active = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 50)
    private DocumentType documentType = DocumentType.PERMISO_GREMIAL;

    protected Template() {
    }

    public Template(String nombre, String descripcion) {
        this(nombre, descripcion, DocumentType.PERMISO_GREMIAL);
    }

    public Template(String nombre, String descripcion, DocumentType documentType) {
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.documentType = documentType;
    }

    public String getNombre() {
        return nombre;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public boolean isActive() {
        return active;
    }

    public DocumentType getDocumentType() {
        return documentType;
    }

    public void update(String nombre, String descripcion, DocumentType documentType) {
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.documentType = documentType;
    }

    public void activate() {
        this.active = true;
    }

    public void deactivate() {
        this.active = false;
    }
}
