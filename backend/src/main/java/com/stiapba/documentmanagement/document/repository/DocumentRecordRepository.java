package com.stiapba.documentmanagement.document.repository;

import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DocumentRecordRepository extends JpaRepository<DocumentRecord, UUID> {
    Page<DocumentRecord> findByCreatedByUserId(UUID createdByUserId, Pageable pageable);
}
