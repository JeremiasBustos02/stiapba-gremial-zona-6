package com.stiapba.documentmanagement.document;

import jakarta.validation.Valid;
import com.stiapba.documentmanagement.document.DocumentHistoryDtos.DocumentHistoryPageResponse;
import com.stiapba.documentmanagement.document.DocumentHistoryDtos.SendDocumentEmailRequest;
import com.stiapba.documentmanagement.document.DocumentHistoryDtos.SendDocumentEmailResponse;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.template.entity.DocumentType;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {
    private final DocumentGenerationService documentGenerationService;
    private final DocumentHistoryService documentHistoryService;
    private final DocumentEmailService documentEmailService;

    public DocumentController(DocumentGenerationService documentGenerationService, DocumentHistoryService documentHistoryService,
                              DocumentEmailService documentEmailService) {
        this.documentGenerationService = documentGenerationService;
        this.documentHistoryService = documentHistoryService;
        this.documentEmailService = documentEmailService;
    }

    @PostMapping(value = "/permiso-gremial/generate", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> generatePermisoGremial(@Valid @RequestBody PermisoGremialRequest request,
                                                          @AuthenticationPrincipal UserPrincipal principal) {
        DocumentGenerationService.GeneratedDocument document = documentGenerationService.generatePermisoGremial(request, principal);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(document.filename()).build().toString())
                .header("X-Document-Id", document.recordId().toString())
                .header("X-Public-Number", document.publicNumber())
                .body(document.content());
    }

    @GetMapping("/permiso-gremial/variants/{variantId}/manual-fields")
    public List<DocumentGenerationService.ManualFieldResponse> manualFields(@PathVariable UUID variantId) {
        return documentGenerationService.manualFields(variantId);
    }

    @GetMapping("/history")
    public DocumentHistoryPageResponse history(@AuthenticationPrincipal UserPrincipal principal,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "20") int size,
                                                 @RequestParam(required = false) String q,
                                                 @RequestParam(required = false) DocumentType documentType,
                                                 @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate issueDateFrom,
                                                 @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate issueDateTo,
                                                 @RequestParam(required = false) String createdBy,
                                                 @RequestParam(defaultValue = "newest") String order) {
        return documentHistoryService.list(principal, page, size, q, documentType, issueDateFrom, issueDateTo, createdBy, order);
    }

    @GetMapping(value = "/history/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> regenerate(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        DocumentGenerationService.GeneratedDocument document = documentGenerationService.regenerate(id, principal);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(document.filename()).build().toString())
                .header("X-Document-Id", document.recordId().toString())
                .header("X-Public-Number", document.publicNumber())
                .body(document.content());
    }

    @PostMapping("/history/{id}/email")
    public SendDocumentEmailResponse sendByEmail(@PathVariable UUID id, @Valid @RequestBody SendDocumentEmailRequest request,
                                                 @AuthenticationPrincipal UserPrincipal principal) {
        documentEmailService.send(id, request.recipients().stream().map(String::trim).distinct().toList(),
                request.subject().trim(), request.message() == null ? "" : request.message(), principal);
        return new SendDocumentEmailResponse("Correo enviado correctamente.");
    }
}
