package com.stiapba.documentmanagement.agreement.entity;

import com.stiapba.documentmanagement.common.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(name = "agreements", indexes = {
        @Index(name = "idx_agreements_active", columnList = "active")
})
public class Agreement extends AuditableEntity {

    @Column(length = 50)
    private String codigo;

    @Column(nullable = false, length = 500)
    private String descripcion;

    @Column(nullable = false)
    private boolean active = true;

    protected Agreement() {
    }

    public Agreement(String codigo, String descripcion) {
        this.codigo = codigo;
        this.descripcion = descripcion;
    }

    public String getCodigo() {
        return codigo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public boolean isActive() {
        return active;
    }

    public void update(String codigo, String descripcion) {
        this.codigo = codigo;
        this.descripcion = descripcion;
    }

    public void activate() {
        this.active = true;
    }

    public void deactivate() {
        this.active = false;
    }
}
