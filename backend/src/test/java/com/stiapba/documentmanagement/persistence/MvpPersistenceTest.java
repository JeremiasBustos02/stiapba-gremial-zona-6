package com.stiapba.documentmanagement.persistence;

import com.stiapba.documentmanagement.agreement.entity.Agreement;
import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.entity.Company;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.repository.TemplateRepository;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("dev")
class MvpPersistenceTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private AgreementRepository agreementRepository;

    @Autowired
    private TemplateRepository templateRepository;

    @Autowired
    private TemplateVariantRepository templateVariantRepository;

    @Test
    void persistsTheMvpEntitiesWithUuidAndTimestamps() {
        User user = userRepository.save(new User(
                "Ada", "Lovelace", "40123456", "hashed-password", Role.DELEGADO));
        Company company = companyRepository.save(new Company("Empresa Ejemplo"));
        Agreement agreement = agreementRepository.save(new Agreement(null, "Convenio de ejemplo"));
        Template template = templateRepository.save(new Template("Permiso Gremial", "Plantilla estándar"));
        TemplateVariant variant = templateVariantRepository.save(
                new TemplateVariant(template, "Bruna", "permiso-gremial/bruna.pdf"));

        templateVariantRepository.flush();

        assertThat(user.getId()).isNotNull();
        assertThat(user.getCreatedAt()).isNotNull();
        assertThat(user.getUpdatedAt()).isNotNull();
        assertThat(company.getId()).isNotNull();
        assertThat(agreement.getId()).isNotNull();
        assertThat(template.getId()).isNotNull();
        assertThat(variant.getId()).isNotNull();
        assertThat(variant.getTemplate().getId()).isEqualTo(template.getId());
    }

    @Test
    void rejectsDuplicateDni() {
        userRepository.save(new User(
                "Ada", "Lovelace", "40123456", "hash-one", Role.DELEGADO));
        userRepository.flush();

        userRepository.save(new User(
                "Grace", "Hopper", "40123456", "hash-two", Role.ADMIN));

        assertThrows(DataIntegrityViolationException.class, userRepository::flush);
    }

    @Test
    void rejectsTemplateVariantWithoutTemplate() {
        templateVariantRepository.save(new TemplateVariant(null, "Bruna", "bruna.pdf"));

        assertThrows(DataIntegrityViolationException.class, templateVariantRepository::flush);
    }
}
