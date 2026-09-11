package com.stiapba.documentmanagement.document.repository;

import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface DocumentRecordRepository extends JpaRepository<DocumentRecord, UUID>, JpaSpecificationExecutor<DocumentRecord> {
    Page<DocumentRecord> findByCreatedByUserId(UUID createdByUserId, Pageable pageable);
}
