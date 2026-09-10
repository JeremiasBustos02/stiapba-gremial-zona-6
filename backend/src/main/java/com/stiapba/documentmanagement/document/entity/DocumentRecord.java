package com.stiapba.documentmanagement.document.entity;

import com.stiapba.documentmanagement.common.persistence.AuditableEntity;
import com.stiapba.documentmanagement.template.entity.DocumentType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "document_records")
public class DocumentRecord extends AuditableEntity {

    @Column(name = "public_number", nullable = false, unique = true, length = 40)
    private String publicNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 50)
    private DocumentType documentType;

    @Column(name = "created_by_user_id", nullable = false)
    private UUID createdByUserId;

    @Column(name = "created_by_name", nullable = false, length = 201)
    private String createdByName;

    @Column(name = "template_id", nullable = false)
    private UUID templateId;

    @Column(name = "variant_id", nullable = false)
    private UUID variantId;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "delegate_name", nullable = false, length = 201)
    private String delegateName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "snapshot", nullable = false, columnDefinition = "jsonb")
    private Map<String, String> snapshot = new LinkedHashMap<>();

    protected DocumentRecord() {
    }

    public DocumentRecord(String publicNumber, DocumentType documentType, UUID createdByUserId, String createdByName,
                          UUID templateId, UUID variantId, LocalDate issueDate, String companyName, String delegateName,
                          Map<String, String> snapshot) {
        this.publicNumber = publicNumber;
        this.documentType = documentType;
        this.createdByUserId = createdByUserId;
        this.createdByName = createdByName;
        this.templateId = templateId;
        this.variantId = variantId;
        this.issueDate = issueDate;
        this.companyName = companyName;
        this.delegateName = delegateName;
        this.snapshot = new LinkedHashMap<>(snapshot);
    }

    public String getPublicNumber() { return publicNumber; }
    public DocumentType getDocumentType() { return documentType; }
    public UUID getCreatedByUserId() { return createdByUserId; }
    public String getCreatedByName() { return createdByName; }
    public UUID getTemplateId() { return templateId; }
    public UUID getVariantId() { return variantId; }
    public LocalDate getIssueDate() { return issueDate; }
    public String getCompanyName() { return companyName; }
    public String getDelegateName() { return delegateName; }
    public Map<String, String> getSnapshot() { return Map.copyOf(snapshot); }
}
