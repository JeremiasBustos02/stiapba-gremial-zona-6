package com.stiapba.documentmanagement.company.entity;

import com.stiapba.documentmanagement.common.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(name = "companies", indexes = {
        @Index(name = "idx_companies_active", columnList = "active")
})
public class Company extends AuditableEntity {

    @Column(nullable = false, length = 200)
    private String nombre;

    @Column(nullable = false)
    private boolean active = true;

    protected Company() {
    }

    public Company(String nombre) {
        this.nombre = nombre;
    }

    public String getNombre() {
        return nombre;
    }

    public boolean isActive() {
        return active;
    }
}
