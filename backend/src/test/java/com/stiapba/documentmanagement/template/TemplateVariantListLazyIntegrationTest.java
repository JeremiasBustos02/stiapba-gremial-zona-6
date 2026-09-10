package com.stiapba.documentmanagement.template;

import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.repository.TemplateRepository;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "app.security.jwt.secret=dGVzdC1qd3Qtc2VjcmV0LW11c3QtYmUtYXQtbGVhc3QtMzItYnl0ZXMtbG9uZw==",
        "app.security.initial-admin.dni=",
        "app.security.initial-admin.password=",
        "app.security.initial-admin.name=",
        "app.security.initial-admin.lastname=",
        "app.template.seed-enabled=false"
})
class TemplateVariantListLazyIntegrationTest {
    @Autowired
    private TemplateRepository templateRepository;

    @Autowired
    private TemplateVariantRepository variantRepository;

    @Autowired
    private TemplateVariantService variantService;

    @Test
    void listsVariantsAndMapsTemplateIdWithoutAnOpenTestTransaction() {
        String suffix = UUID.randomUUID().toString();
        Template template = templateRepository.saveAndFlush(new Template(
                "Plantilla " + suffix, "Descripción de prueba"));
        variantRepository.saveAndFlush(new TemplateVariant(template, "Variante " + suffix, "templates/" + suffix + ".pdf"));

        List<TemplateDtos.TemplateVariantResponse> variants = variantService.list(template.getId(), null, true, true);

        assertThat(variants).hasSize(1);
        assertThat(variants.getFirst().templateId()).isEqualTo(template.getId());
    }
}
