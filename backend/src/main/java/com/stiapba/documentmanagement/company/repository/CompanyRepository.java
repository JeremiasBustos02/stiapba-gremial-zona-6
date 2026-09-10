package com.stiapba.documentmanagement.company.repository;

import com.stiapba.documentmanagement.company.entity.Company;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

import java.util.UUID;

public interface CompanyRepository extends JpaRepository<Company, UUID>, JpaSpecificationExecutor<Company> {

    @Override
    @EntityGraph(attributePaths = "agreement")
    List<Company> findAll(Specification<Company> specification, Sort sort);
}
