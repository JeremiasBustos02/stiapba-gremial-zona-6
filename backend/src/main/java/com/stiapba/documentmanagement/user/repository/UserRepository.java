package com.stiapba.documentmanagement.user.repository;

import com.stiapba.documentmanagement.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByDni(String dni);

    boolean existsByRole(com.stiapba.documentmanagement.user.entity.Role role);
}
