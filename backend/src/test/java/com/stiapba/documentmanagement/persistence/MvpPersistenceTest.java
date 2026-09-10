package com.stiapba.documentmanagement.persistence;

import com.stiapba.documentmanagement.agreement.entity.Agreement;
import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.entity.Company;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import com.stiapba.documentmanagement.province.entity.Province;
import com.stiapba.documentmanagement.province.repository.ProvinceRepository;
import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.repository.TemplateRepository;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class MvpPersistenceTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private AgreementRepository agreementRepository;

    @Autowired
    private ProvinceRepository provinceRepository;

    @Autowired
    private TemplateRepository templateRepository;

    @Autowired
    private TemplateVariantRepository templateVariantRepository;

    @Autowired
    private DataSource dataSource;

    @Test
    void persistsTheMvpEntitiesWithUuidAndTimestamps() {
        String dni = uniqueDni();
        User user = userRepository.save(new User(
                "Ada", "Lovelace", dni, "hashed-password", Role.DELEGADO));
        Company company = companyRepository.save(new Company("Empresa Ejemplo"));
        Agreement agreement = agreementRepository.save(new Agreement(null, "Convenio de ejemplo"));
        Company companyWithAgreement = companyRepository.save(new Company("Empresa con convenio", agreement));
        Province province = provinceRepository.save(new Province("Provincia de prueba"));
        Template template = templateRepository.save(new Template("Permiso Gremial", "Plantilla estándar"));
        TemplateVariant variant = templateVariantRepository.save(
                new TemplateVariant(template, "Bruna", "permiso-gremial/bruna.pdf"));

        templateVariantRepository.flush();

        assertThat(user.getId()).isNotNull();
        assertThat(user.getCreatedAt()).isNotNull();
        assertThat(user.getUpdatedAt()).isNotNull();
        assertThat(company.getId()).isNotNull();
        assertThat(company.getAgreement()).isNull();
        assertThat(agreement.getId()).isNotNull();
        assertThat(companyWithAgreement.getAgreement().getId()).isEqualTo(agreement.getId());
        assertThat(province.getId()).isNotNull();
        assertThat(province.getCreatedAt()).isNotNull();
        assertThat(template.getId()).isNotNull();
        assertThat(variant.getId()).isNotNull();
        assertThat(variant.getTemplate().getId()).isEqualTo(template.getId());
    }

    @Test
    void rejectsDuplicateDni() {
        String dni = uniqueDni();
        userRepository.save(new User(
                "Ada", "Lovelace", dni, "hash-one", Role.DELEGADO));
        userRepository.flush();

        userRepository.save(new User(
                "Grace", "Hopper", dni, "hash-two", Role.ADMIN));

        assertThrows(DataIntegrityViolationException.class, userRepository::flush);
    }

    @Test
    void rejectsTemplateVariantWithoutTemplate() {
        templateVariantRepository.save(new TemplateVariant(null, "Bruna", "bruna.pdf"));

        assertThrows(DataIntegrityViolationException.class, templateVariantRepository::flush);
    }

    @Test
    void migratesExistingCompanyAgreementAssociations() throws Exception {
        String schema = "company_agreement_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
        }
        try {
            Flyway.configure().dataSource(dataSource).schemas(schema).defaultSchema(schema)
                    .target("4").locations("classpath:db/migration").load().migrate();
            Map<String, UUID> agreements = new LinkedHashMap<>();
            agreements.put("771/10", UUID.randomUUID());
            agreements.put("372/02", UUID.randomUUID());
            agreements.put("783/20", UUID.randomUUID());
            agreements.put("244/94", UUID.randomUUID());
            insertMigrationFixtures(schema, agreements);

            Flyway.configure().dataSource(dataSource).schemas(schema).defaultSchema(schema)
                    .locations("classpath:db/migration").load().migrate();

            Map<String, String> associations = new LinkedHashMap<>();
            try (Connection connection = dataSource.getConnection(); PreparedStatement statement = connection.prepareStatement(
                    "SELECT c.nombre, a.codigo FROM " + schema + ".companies c JOIN " + schema
                            + ".agreements a ON a.id = c.agreement_id")) {
                try (ResultSet resultSet = statement.executeQuery()) {
                    while (resultSet.next()) {
                        associations.put(resultSet.getString(1), resultSet.getString(2));
                    }
                }
            }
            assertThat(associations).containsExactlyInAnyOrderEntriesOf(Map.of(
                    "INFRIBA", "771/10",
                    "PESCADERIA VICTORIA", "372/02",
                    "SURANO S.A.", "783/20",
                    "OTRA EMPRESA", "244/94"
            ));
        } finally {
            try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
                statement.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }

    private void insertMigrationFixtures(String schema, Map<String, UUID> agreements) throws Exception {
        OffsetDateTime now = OffsetDateTime.now();
        try (Connection connection = dataSource.getConnection(); PreparedStatement agreementStatement = connection.prepareStatement(
                "INSERT INTO " + schema + ".agreements (id, codigo, descripcion, active, created_at, updated_at) VALUES (?, ?, ?, true, ?, ?)")) {
            for (Map.Entry<String, UUID> entry : agreements.entrySet()) {
                agreementStatement.setObject(1, entry.getValue());
                agreementStatement.setString(2, entry.getKey());
                agreementStatement.setString(3, "Convenio " + entry.getKey());
                agreementStatement.setObject(4, now);
                agreementStatement.setObject(5, now);
                agreementStatement.addBatch();
            }
            agreementStatement.executeBatch();
        }
        try (Connection connection = dataSource.getConnection(); PreparedStatement companyStatement = connection.prepareStatement(
                "INSERT INTO " + schema + ".companies (id, nombre, active, created_at, updated_at) VALUES (?, ?, true, ?, ?)")) {
            for (String nombre : new String[]{"INFRIBA", "PESCADERIA VICTORIA", "SURANO S.A.", "OTRA EMPRESA"}) {
                companyStatement.setObject(1, UUID.randomUUID());
                companyStatement.setString(2, nombre);
                companyStatement.setObject(3, now);
                companyStatement.setObject(4, now);
                companyStatement.addBatch();
            }
            companyStatement.executeBatch();
        }
    }

    private String uniqueDni() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 20);
    }
}
