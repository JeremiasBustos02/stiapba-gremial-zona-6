package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.document.repository.DocumentRecordRepository;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.template.entity.DocumentType;
import com.stiapba.documentmanagement.template.entity.FieldType;
import com.stiapba.documentmanagement.user.entity.Role;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class DocumentGenerationService {
    private final DocumentRecordRepository documentRecordRepository;
    private final Map<DocumentType, DocumentTypeHandler> handlers;

    public DocumentGenerationService(DocumentRecordRepository documentRecordRepository, List<DocumentTypeHandler> handlers) {
        this.documentRecordRepository = documentRecordRepository;
        this.handlers = handlers.stream().collect(java.util.stream.Collectors.toMap(DocumentTypeHandler::documentType, handler -> handler,
                (first, second) -> { throw new IllegalStateException("Duplicate document type handler"); }, LinkedHashMap::new));
    }

    public GeneratedDocument generate(DocumentGenerationRequest request, UserPrincipal principal) {
        return handler(request.documentType()).generate(request, principal);
    }

    public GeneratedDocument generatePermisoGremial(PermisoGremialRequest request, UserPrincipal principal) {
        Map<String, String> baseValues = new LinkedHashMap<>();
        baseValues.put("provinceId", request.provinceId().toString()); baseValues.put("issueDate", request.issueDate().toString());
        baseValues.put("companyId", request.companyId().toString()); baseValues.put("delegateId", request.delegateId().toString());
        baseValues.put("permitDay", request.permitDay().toString()); baseValues.put("agreementId", request.agreementId().toString());
        return generate(new DocumentGenerationRequest(DocumentType.PERMISO_GREMIAL, request.variantId(), baseValues, request.manualValues()), principal);
    }

    public GeneratedDocument regenerate(UUID recordId, UserPrincipal principal) {
        DocumentRecord record = documentRecordRepository.findById(recordId)
                .orElseThrow(() -> new DocumentException(404, "DOCUMENT_RECORD_NOT_FOUND", "No encontramos el documento solicitado."));
        if (principal.role() != Role.ADMIN && !record.getCreatedByUserId().equals(principal.id())) {
            throw new DocumentException(403, "DOCUMENT_RECORD_FORBIDDEN", "No tenés permisos para acceder a este documento.");
        }
        return handler(record.getDocumentType()).regenerate(record);
    }

    public List<ManualFieldResponse> manualFields(UUID variantId) {
        return manualFields(DocumentType.PERMISO_GREMIAL, variantId);
    }

    public List<ManualFieldResponse> manualFields(DocumentType documentType, UUID variantId) {
        return handler(documentType).manualFields(variantId);
    }

    static String filename(String publicNumber, String delegateName) { return PermisoGremialDocumentTypeHandler.filename(publicNumber, delegateName); }

    private DocumentTypeHandler handler(DocumentType type) {
        DocumentTypeHandler handler = handlers.get(type);
        if (handler == null) throw new DocumentException(422, "DOCUMENT_TYPE_UNSUPPORTED", "El tipo de documento no está disponible.");
        return handler;
    }

    public record GeneratedDocument(byte[] content, UUID recordId, String publicNumber, String filename) { }

    public record ManualFieldResponse(UUID id, String label, FieldType type, boolean required) { }
}
