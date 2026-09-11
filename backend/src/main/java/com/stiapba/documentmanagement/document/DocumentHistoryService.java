package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.document.DocumentHistoryDtos.DocumentHistoryPageResponse;
import com.stiapba.documentmanagement.document.DocumentHistoryDtos.DocumentHistoryResponse;
import com.stiapba.documentmanagement.document.DocumentHistoryDtos.DocumentHistoryDetailResponse;
import com.stiapba.documentmanagement.document.DocumentSuggestionDtos.DocumentSuggestionsResponse;
import com.stiapba.documentmanagement.document.DocumentSuggestionDtos.SuggestionCategory;
import com.stiapba.documentmanagement.document.DocumentSuggestionDtos.SuggestionItem;
import com.stiapba.documentmanagement.agreement.entity.Agreement;
import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.entity.Company;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.document.repository.DocumentRecordRepository;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.template.entity.DocumentType;
import com.stiapba.documentmanagement.user.entity.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Map;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.Comparator;
import java.util.function.Function;

@Service
public class DocumentHistoryService {
    private final DocumentRecordRepository documentRecordRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final AgreementRepository agreementRepository;

    public DocumentHistoryService(DocumentRecordRepository documentRecordRepository, CompanyRepository companyRepository,
                                  UserRepository userRepository, AgreementRepository agreementRepository) {
        this.documentRecordRepository = documentRecordRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.agreementRepository = agreementRepository;
    }

    public DocumentHistoryPageResponse list(UserPrincipal principal, int page, int size) {
        return list(principal, page, size, null, null, null, null, null, "newest");
    }

    public DocumentHistoryPageResponse list(UserPrincipal principal, int page, int size, String query, DocumentType documentType,
                                            LocalDate issueDateFrom, LocalDate issueDateTo, String createdBy, String order) {
        if (page < 0 || size < 1 || size > 100) {
            throw new DocumentException(400, "INVALID_PAGINATION", "Los parámetros de paginación no son válidos.");
        }
        if (issueDateFrom != null && issueDateTo != null && issueDateFrom.isAfter(issueDateTo)) {
            throw new DocumentException(400, "INVALID_DATE_RANGE", "La fecha desde no puede ser posterior a la fecha hasta.");
        }
        Sort sort = switch (order == null ? "newest" : order) {
            case "newest" -> Sort.by("createdAt").descending();
            case "oldest" -> Sort.by("createdAt").ascending();
            default -> throw new DocumentException(400, "INVALID_HISTORY_ORDER", "El orden del historial no es válido.");
        };
        Pageable pageable = PageRequest.of(page, size, sort);
        Specification<DocumentRecord> specification = Specification.allOf(
                principal.role() == Role.ADMIN ? null : (root, ignoredQuery, builder) -> builder.equal(root.get("createdByUserId"), principal.id()),
                documentType == null ? null : (root, ignoredQuery, builder) -> builder.equal(root.get("documentType"), documentType),
                issueDateFrom == null ? null : (root, ignoredQuery, builder) -> builder.greaterThanOrEqualTo(root.get("issueDate"), issueDateFrom),
                issueDateTo == null ? null : (root, ignoredQuery, builder) -> builder.lessThanOrEqualTo(root.get("issueDate"), issueDateTo),
                contains("createdByName", principal.role() == Role.ADMIN ? normalize(createdBy) : null),
                search(normalize(query)));
        Page<DocumentRecord> records = documentRecordRepository.findAll(specification, pageable);
        return new DocumentHistoryPageResponse(records.getContent().stream().map(this::toResponse).toList(),
                records.getNumber(), records.getSize(), records.getTotalElements(), records.getTotalPages());
    }

    public DocumentHistoryDetailResponse detail(UUID id, UserPrincipal principal) {
        DocumentRecord record = documentRecordRepository.findById(id)
                .orElseThrow(() -> new DocumentException(404, "DOCUMENT_RECORD_NOT_FOUND", "No encontramos el documento solicitado."));
        if (principal.role() != Role.ADMIN && !record.getCreatedByUserId().equals(principal.id())) {
            throw new DocumentException(403, "DOCUMENT_RECORD_FORBIDDEN", "No tenés permisos para acceder a este documento.");
        }
        Map<String, String> snapshot = record.getSnapshot();
        return new DocumentHistoryDetailResponse(record.getId(), record.getPublicNumber(), record.getDocumentType(),
                record.getTemplateId(), record.getVariantId(), record.getCreatedAt(), record.getCreatedByName(),
                value(snapshot, "province"), value(snapshot, "companyName", record.getCompanyName()),
                value(snapshot, "delegateName", record.getDelegateName()), value(snapshot, "delegateDni"),
                value(snapshot, "agreementCode", snapshot.get("agreement")), number(snapshot.get("permitDay")),
                date(snapshot.get("issueDate"), record.getIssueDate()), uuid(snapshot.get("provinceId")),
                uuid(snapshot.get("companyId")), uuid(snapshot.get("delegateId")), uuid(snapshot.get("agreementId")),
                manualValues(snapshot));
    }

    public DocumentSuggestionsResponse suggestions(UserPrincipal principal) {
        UUID userId = principal.id();
        List<DocumentRecordRepository.SuggestionStat> companyStats = documentRecordRepository.companySuggestionStats(userId);
        List<DocumentRecordRepository.SuggestionStat> delegateStats = documentRecordRepository.delegateSuggestionStats(userId);
        List<DocumentRecordRepository.SuggestionStat> agreementStats = documentRecordRepository.agreementSuggestionStats(userId);

        Map<UUID, String> companies = companyRepository.findAllById(companyStats.stream().map(DocumentRecordRepository.SuggestionStat::getId).toList())
                .stream().filter(Company::isActive).collect(java.util.stream.Collectors.toMap(Company::getId, Company::getNombre));
        Map<UUID, String> delegates = userRepository.findAllById(delegateStats.stream().map(DocumentRecordRepository.SuggestionStat::getId).toList())
                .stream().filter(user -> user.isActive() && user.getRole() == Role.DELEGADO)
                .collect(java.util.stream.Collectors.toMap(User::getId, user -> user.getNombre() + " " + user.getApellido()));
        Map<UUID, String> agreements = agreementRepository.findAllById(agreementStats.stream().map(DocumentRecordRepository.SuggestionStat::getId).toList())
                .stream().filter(Agreement::isActive).collect(java.util.stream.Collectors.toMap(Agreement::getId, this::agreementLabel));

        return new DocumentSuggestionsResponse(category(companyStats, companies::get), category(delegateStats, delegates::get),
                category(agreementStats, agreements::get));
    }

    private SuggestionCategory category(List<DocumentRecordRepository.SuggestionStat> stats, Function<UUID, String> label) {
        Comparator<DocumentRecordRepository.SuggestionStat> newest = Comparator.comparing(DocumentRecordRepository.SuggestionStat::getLastUsed,
                Comparator.nullsLast(Comparator.reverseOrder()));
        List<DocumentRecordRepository.SuggestionStat> valid = stats.stream().filter(stat -> stat.getId() != null && label.apply(stat.getId()) != null).toList();
        List<DocumentRecordRepository.SuggestionStat> recent = valid.stream().sorted(newest).limit(5).toList();
        Set<UUID> recentIds = recent.stream().map(DocumentRecordRepository.SuggestionStat::getId).collect(java.util.stream.Collectors.toSet());
        List<DocumentRecordRepository.SuggestionStat> frequent = valid.stream()
                .filter(stat -> !recentIds.contains(stat.getId()))
                .sorted(Comparator.comparing(DocumentRecordRepository.SuggestionStat::getUses, Comparator.nullsLast(Comparator.reverseOrder())).thenComparing(newest))
                .limit(5).toList();
        return new SuggestionCategory(recent.stream().map(stat -> new SuggestionItem(stat.getId(), label.apply(stat.getId()))).toList(),
                frequent.stream().map(stat -> new SuggestionItem(stat.getId(), label.apply(stat.getId()))).toList());
    }

    private String agreementLabel(Agreement agreement) {
        return agreement.getCodigo() == null || agreement.getCodigo().isBlank()
                ? agreement.getDescripcion() : agreement.getCodigo() + " - " + agreement.getDescripcion();
    }

    private String value(Map<String, String> snapshot, String key) { return value(snapshot, key, ""); }

    private String value(Map<String, String> snapshot, String key, String fallback) {
        String value = snapshot.get(key);
        return value == null || value.isBlank() ? fallback : value;
    }

    private Integer number(String value) {
        try { return value == null ? null : Integer.valueOf(value); }
        catch (NumberFormatException ignored) { return null; }
    }

    private UUID uuid(String value) {
        try { return value == null ? null : UUID.fromString(value); }
        catch (IllegalArgumentException ignored) { return null; }
    }

    private LocalDate date(String value, LocalDate fallback) {
        try { return value == null ? fallback : LocalDate.parse(value); }
        catch (RuntimeException ignored) { return fallback; }
    }

    private Map<UUID, String> manualValues(Map<String, String> snapshot) {
        return snapshot.entrySet().stream()
                .filter(entry -> entry.getKey().startsWith("manual:"))
                .flatMap(entry -> {
                    try { return java.util.stream.Stream.of(Map.entry(UUID.fromString(entry.getKey().substring(7)), entry.getValue())); }
                    catch (IllegalArgumentException ignored) { return java.util.stream.Stream.empty(); }
                })
                .collect(java.util.stream.Collectors.toUnmodifiableMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Specification<DocumentRecord> contains(String property, String value) {
        return value == null ? null : (root, ignoredQuery, builder) -> builder.like(builder.lower(root.get(property)), "%" + value.toLowerCase() + "%");
    }

    private Specification<DocumentRecord> search(String value) {
        if (value == null) return null;
        return (root, ignoredQuery, builder) -> {
            String pattern = "%" + value.toLowerCase() + "%";
            return builder.or(builder.like(builder.lower(root.get("publicNumber")), pattern), builder.like(builder.lower(root.get("companyName")), pattern),
                    builder.like(builder.lower(root.get("delegateName")), pattern), builder.like(builder.lower(root.get("createdByName")), pattern));
        };
    }

    private DocumentHistoryResponse toResponse(DocumentRecord record) {
        return new DocumentHistoryResponse(record.getId(), record.getPublicNumber(), record.getDocumentType(), record.getCreatedAt(),
                record.getCreatedByName(), record.getCompanyName(), record.getDelegateName(), record.getIssueDate());
    }
}
