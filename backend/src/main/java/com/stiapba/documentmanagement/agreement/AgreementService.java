package com.stiapba.documentmanagement.agreement;

import com.stiapba.documentmanagement.agreement.AgreementDtos.AgreementRequest;
import com.stiapba.documentmanagement.agreement.AgreementDtos.AgreementResponse;
import com.stiapba.documentmanagement.agreement.entity.Agreement;
import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AgreementService {
    private final AgreementRepository agreementRepository;

    public AgreementService(AgreementRepository agreementRepository) {
        this.agreementRepository = agreementRepository;
    }

    public List<AgreementResponse> list(String search, Boolean active, boolean admin) {
        Specification<Agreement> specification = (root, query, builder) -> builder.conjunction();
        if (!admin || active != null && active) {
            specification = specification.and((root, query, builder) -> builder.isTrue(root.get("active")));
        } else if (active != null) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("active"), false));
        }
        if (search != null && !search.isBlank()) {
            String value = search.trim().toLowerCase();
            specification = specification.and((root, query, builder) -> builder.or(
                    builder.like(builder.lower(root.get("descripcion")), "%" + value + "%"),
                    builder.like(builder.lower(root.get("codigo")), "%" + value + "%")));
        }
        return agreementRepository.findAll(specification, Sort.by("descripcion").ascending()).stream().map(this::toResponse).toList();
    }

    @Transactional
    public AgreementResponse create(AgreementRequest request) {
        return toResponse(agreementRepository.save(new Agreement(normalizeCodigo(request.codigo()), request.descripcion().trim())));
    }

    @Transactional
    public AgreementResponse update(UUID id, AgreementRequest request) {
        Agreement agreement = findById(id);
        agreement.update(normalizeCodigo(request.codigo()), request.descripcion().trim());
        return toResponse(agreementRepository.save(agreement));
    }

    @Transactional
    public void activate(UUID id) {
        findById(id).activate();
    }

    @Transactional
    public void deactivate(UUID id) {
        findById(id).deactivate();
    }

    private Agreement findById(UUID id) {
        return agreementRepository.findById(id).orElseThrow(() ->
                new AgreementException(404, "AGREEMENT_NOT_FOUND", "No encontramos el convenio solicitado."));
    }

    private String normalizeCodigo(String codigo) {
        return codigo == null || codigo.isBlank() ? null : codigo.trim();
    }

    private AgreementResponse toResponse(Agreement agreement) {
        return new AgreementResponse(agreement.getId(), agreement.getCodigo(), agreement.getDescripcion(), agreement.isActive(),
                agreement.getCreatedAt(), agreement.getUpdatedAt());
    }
}
