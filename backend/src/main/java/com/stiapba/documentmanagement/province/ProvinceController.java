package com.stiapba.documentmanagement.province;

import com.stiapba.documentmanagement.province.ProvinceDtos.ProvinceResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/provinces")
public class ProvinceController {
    private final ProvinceService provinceService;

    public ProvinceController(ProvinceService provinceService) {
        this.provinceService = provinceService;
    }

    @GetMapping
    public List<ProvinceResponse> listActive() {
        return provinceService.listActive();
    }
}
