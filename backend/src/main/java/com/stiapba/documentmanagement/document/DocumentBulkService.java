package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class DocumentBulkService {
    private final DocumentGenerationService documentGenerationService;
    private final UserRepository userRepository;

    public DocumentBulkService(DocumentGenerationService documentGenerationService, UserRepository userRepository) {
        this.documentGenerationService = documentGenerationService;
        this.userRepository = userRepository;
    }

    public DocumentBulkDtos.BatchResponse generate(PermisoGremialBatchRequest request, UserPrincipal principal) {
        validateDistinct(request.delegateIds());
        List<DocumentBulkDtos.BatchItemResponse> items = new ArrayList<>();
        for (UUID delegateId : request.delegateIds()) {
            String delegateName = delegateName(delegateId);
            try {
                DocumentGenerationService.GeneratedDocument document = documentGenerationService.generatePermisoGremial(
                        new PermisoGremialRequest(request.provinceId(), request.issueDate(), request.companyId(), delegateId,
                                request.permitDay(), request.agreementId(), request.variantId(), request.manualValues()), principal);
                items.add(DocumentBulkDtos.BatchItemResponse.success(delegateId, delegateName, document));
            } catch (DocumentException exception) {
                items.add(DocumentBulkDtos.BatchItemResponse.failure(delegateId, delegateName, exception.getCode(), exception.getMessage()));
            } catch (RuntimeException exception) {
                items.add(DocumentBulkDtos.BatchItemResponse.failure(delegateId, delegateName, "DOCUMENT_GENERATION_FAILED", "No pudimos generar el permiso para este delegado."));
            }
        }
        int successful = (int) items.stream().filter(item -> item.status().equals("SUCCESS")).count();
        return new DocumentBulkDtos.BatchResponse(items.size(), successful, items.size() - successful, List.copyOf(items));
    }

    public DocumentBulkDtos.ZipArchive zip(DocumentBulkDtos.ZipRequest request, UserPrincipal principal) {
        validateDistinct(request.documentIds());
        try (ByteArrayOutputStream output = new ByteArrayOutputStream(); ZipOutputStream zip = new ZipOutputStream(output)) {
            for (UUID documentId : request.documentIds()) {
                DocumentGenerationService.GeneratedDocument document = documentGenerationService.regenerate(documentId, principal);
                zip.putNextEntry(new ZipEntry(document.filename()));
                zip.write(document.content());
                zip.closeEntry();
            }
            zip.finish();
            return new DocumentBulkDtos.ZipArchive(output.toByteArray(), zipFilename(LocalDate.now()));
        } catch (DocumentException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new DocumentException(500, "DOCUMENT_ZIP_FAILED", "No pudimos preparar la descarga de los permisos.");
        }
    }

    private String delegateName(UUID delegateId) {
        return userRepository.findById(delegateId).map(this::fullName).orElse("Delegado no disponible");
    }

    private String fullName(User user) {
        return user.getNombre() + " " + user.getApellido();
    }

    private void validateDistinct(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) throw new DocumentException(400, "BATCH_ITEMS_REQUIRED", "Seleccioná al menos un elemento.");
        if (new HashSet<>(ids).size() != ids.size()) throw new DocumentException(400, "BATCH_DUPLICATE_ITEMS", "No podés repetir delegados o documentos en la misma solicitud.");
    }

    private String zipFilename(LocalDate date) {
        return "permisos-" + date + ".zip";
    }
}
