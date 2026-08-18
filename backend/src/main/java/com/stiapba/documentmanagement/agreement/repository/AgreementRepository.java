package com.stiapba.documentmanagement.agreement.repository;

import com.stiapba.documentmanagement.agreement.entity.Agreement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface AgreementRepository extends JpaRepository<Agreement, UUID>, JpaSpecificationExecutor<Agreement> {
}
