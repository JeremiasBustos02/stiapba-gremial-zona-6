package com.stiapba.documentmanagement.province;

import com.stiapba.documentmanagement.province.ProvinceDtos.ProvinceResponse;
import com.stiapba.documentmanagement.province.entity.Province;
import com.stiapba.documentmanagement.province.repository.ProvinceRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProvinceService {
    private final ProvinceRepository provinceRepository;

    public ProvinceService(ProvinceRepository provinceRepository) {
        this.provinceRepository = provinceRepository;
    }

    public List<ProvinceResponse> listActive() {
        return provinceRepository.findByActiveTrueOrderByNameAsc().stream().map(this::toResponse).toList();
    }

    private ProvinceResponse toResponse(Province province) {
        return new ProvinceResponse(province.getId(), province.getName());
    }
}
