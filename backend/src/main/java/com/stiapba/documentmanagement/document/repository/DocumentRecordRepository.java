package com.stiapba.documentmanagement.document.repository;

import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;
import java.util.List;
import java.time.OffsetDateTime;

public interface DocumentRecordRepository extends JpaRepository<DocumentRecord, UUID>, JpaSpecificationExecutor<DocumentRecord> {
    Page<DocumentRecord> findByCreatedByUserId(UUID createdByUserId, Pageable pageable);

    long countByCreatedAtGreaterThanEqual(OffsetDateTime start);

    long countByCreatedByUserIdAndCreatedAtGreaterThanEqual(UUID createdByUserId, OffsetDateTime start);

    long countByCreatedByUserId(UUID createdByUserId);

    List<DocumentRecord> findTop5ByOrderByCreatedAtDesc();

    List<DocumentRecord> findTop5ByCreatedByUserIdOrderByCreatedAtDesc(UUID createdByUserId);

    @Query(value = """
            SELECT c.id AS id,
                   COUNT(*) AS uses, MAX(dr.created_at) AS last_used
            FROM document_records dr JOIN companies c ON c.id = CASE WHEN dr.snapshot ->> 'companyId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                                      THEN (dr.snapshot ->> 'companyId')::uuid END
            WHERE dr.created_by_user_id = :userId AND dr.document_type = 'PERMISO_GREMIAL' AND c.active = true
            GROUP BY c.id
            """, nativeQuery = true)
    List<SuggestionStat> companySuggestionStats(@Param("userId") UUID userId);

    @Query(value = """
            SELECT u.id AS id,
                   COUNT(*) AS uses, MAX(dr.created_at) AS last_used
            FROM document_records dr JOIN users u ON u.id = CASE WHEN dr.snapshot ->> 'delegateId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                                      THEN (dr.snapshot ->> 'delegateId')::uuid END
            WHERE dr.created_by_user_id = :userId AND dr.document_type = 'PERMISO_GREMIAL' AND u.active = true AND u.role = 'DELEGADO'
            GROUP BY u.id
            """, nativeQuery = true)
    List<SuggestionStat> delegateSuggestionStats(@Param("userId") UUID userId);

    @Query(value = """
            SELECT a.id AS id,
                   COUNT(*) AS uses, MAX(dr.created_at) AS last_used
            FROM document_records dr JOIN agreements a ON a.id = CASE WHEN dr.snapshot ->> 'agreementId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                                      THEN (dr.snapshot ->> 'agreementId')::uuid END
            WHERE dr.created_by_user_id = :userId AND dr.document_type = 'PERMISO_GREMIAL' AND a.active = true
            GROUP BY a.id
            """, nativeQuery = true)
    List<SuggestionStat> agreementSuggestionStats(@Param("userId") UUID userId);

    interface SuggestionStat {
        UUID getId();
        Long getUses();
        java.time.OffsetDateTime getLastUsed();
    }
}
