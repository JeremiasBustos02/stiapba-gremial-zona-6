package com.stiapba.documentmanagement.user.repository;

import com.stiapba.documentmanagement.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;
import java.util.List;
import java.util.Optional;
import com.stiapba.documentmanagement.user.entity.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {

    Optional<User> findByDni(String dni);

    boolean existsByRole(Role role);

    List<User> findByRoleAndActiveTrueOrderByApellidoAscNombreAsc(Role role);

}
