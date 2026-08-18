package com.stiapba.documentmanagement.province.repository;

import com.stiapba.documentmanagement.province.entity.Province;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProvinceRepository extends JpaRepository<Province, UUID> {

    List<Province> findByActiveTrueOrderByNameAsc();
}
