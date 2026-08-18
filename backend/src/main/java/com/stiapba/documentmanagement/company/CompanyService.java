package com.stiapba.documentmanagement.company;

import com.stiapba.documentmanagement.company.CompanyDtos.CompanyRequest;
import com.stiapba.documentmanagement.company.CompanyDtos.CompanyResponse;
import com.stiapba.documentmanagement.company.entity.Company;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class CompanyService {
    private final CompanyRepository companyRepository;

    public CompanyService(CompanyRepository companyRepository) {
        this.companyRepository = companyRepository;
    }

    public List<CompanyResponse> list(String search, Boolean active, boolean admin) {
        Specification<Company> specification = (root, query, builder) -> builder.conjunction();
        if (!admin || active != null && active) {
            specification = specification.and((root, query, builder) -> builder.isTrue(root.get("active")));
        } else if (active != null) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("active"), false));
        }
        if (search != null && !search.isBlank()) {
            String value = search.trim().toLowerCase();
            specification = specification.and((root, query, builder) ->
                    builder.like(builder.lower(root.get("nombre")), "%" + value + "%"));
        }
        return companyRepository.findAll(specification, Sort.by("nombre").ascending()).stream().map(this::toResponse).toList();
    }

    @Transactional
    public CompanyResponse create(CompanyRequest request) {
        return toResponse(companyRepository.save(new Company(request.nombre().trim())));
    }

    @Transactional
    public CompanyResponse update(UUID id, CompanyRequest request) {
        Company company = findById(id);
        company.updateNombre(request.nombre().trim());
        return toResponse(companyRepository.save(company));
    }

    @Transactional
    public void activate(UUID id) {
        findById(id).activate();
    }

    @Transactional
    public void deactivate(UUID id) {
        findById(id).deactivate();
    }

    private Company findById(UUID id) {
        return companyRepository.findById(id).orElseThrow(() ->
                new CompanyException(404, "COMPANY_NOT_FOUND", "No encontramos la empresa solicitada."));
    }

    private CompanyResponse toResponse(Company company) {
        return new CompanyResponse(company.getId(), company.getNombre(), company.isActive(), company.getCreatedAt(), company.getUpdatedAt());
    }
}
