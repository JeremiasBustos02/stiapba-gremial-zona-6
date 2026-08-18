package com.stiapba.documentmanagement.user.entity;

import com.stiapba.documentmanagement.common.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_users_active", columnList = "active"),
        @Index(name = "idx_users_role", columnList = "role")
})
public class User extends AuditableEntity {

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, length = 100)
    private String apellido;

    @Column(nullable = false, unique = true, length = 20)
    private String dni;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "first_login", nullable = false)
    private boolean firstLogin = true;

    protected User() {
    }

    public User(String nombre, String apellido, String dni, String passwordHash, Role role) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.dni = dni;
        this.passwordHash = passwordHash;
        this.role = role;
    }

    public String getNombre() {
        return nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public String getDni() {
        return dni;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Role getRole() {
        return role;
    }

    public boolean isActive() {
        return active;
    }

    public boolean isFirstLogin() {
        return firstLogin;
    }
}
