package com.stiapba.documentmanagement.company.entity;

import com.stiapba.documentmanagement.agreement.entity.Agreement;
import com.stiapba.documentmanagement.common.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agreement_id")
    private Agreement agreement;

    protected Company() {
    }

    public Company(String nombre) {
        this.nombre = nombre;
    }

    public Company(String nombre, Agreement agreement) {
        this.nombre = nombre;
        this.agreement = agreement;
    }

    public String getNombre() {
        return nombre;
    }

    public boolean isActive() {
        return active;
    }

    public Agreement getAgreement() {
        return agreement;
    }

    public void updateNombre(String nombre) {
        this.nombre = nombre;
    }

    public void assignAgreement(Agreement agreement) {
        this.agreement = agreement;
    }

    public void activate() {
        this.active = true;
    }

    public void deactivate() {
        this.active = false;
    }
}
