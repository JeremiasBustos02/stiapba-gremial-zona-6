package com.stiapba.documentmanagement.catalog;

import com.stiapba.documentmanagement.agreement.entity.Agreement;
import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.CompanyDtos.CompanyResponse;
import com.stiapba.documentmanagement.company.CompanyService;
import com.stiapba.documentmanagement.company.entity.Company;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("dev")
@Transactional
@TestPropertySource(properties = {
        "app.security.jwt.secret=dGVzdC1qd3Qtc2VjcmV0LW11c3QtYmUtYXQtbGVhc3QtMzItYnl0ZXMtbG9uZw==",
        "app.template.seed-enabled=false",
        "spring.jpa.properties.hibernate.generate_statistics=true"
})
class CompanyListQueryStatisticsTest {
    @Autowired private CompanyService companyService;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private AgreementRepository agreementRepository;
    @Autowired private SessionFactory sessionFactory;
    @PersistenceContext private EntityManager entityManager;

    @Test
    void measuresCompanyListQueriesAsCompanyCountGrows() {
        Statistics statistics = sessionFactory.getStatistics();
        Map<Integer, Long> queryCounts = new LinkedHashMap<>();

        for (int companyCount : List.of(1, 5, 10)) {
            seedCompanies(companyCount);
            statistics.clear();

            List<CompanyResponse> responses = companyService.list(null, null, true);

            queryCounts.put(companyCount, statistics.getPrepareStatementCount());
            assertThat(responses).hasSize(companyCount);
        }

        System.out.println("Company list Hibernate query counts: " + queryCounts);
        long minimumQueryCount = queryCounts.values().stream().mapToLong(Long::longValue).min().orElseThrow();
        long maximumQueryCount = queryCounts.values().stream().mapToLong(Long::longValue).max().orElseThrow();
        assertThat(maximumQueryCount - minimumQueryCount).isLessThanOrEqualTo(1L);
    }

    private void seedCompanies(int companyCount) {
        companyRepository.deleteAll();
        agreementRepository.deleteAll();

        IntStream.range(0, companyCount).forEach(index -> {
            Agreement agreement = agreementRepository.save(new Agreement("C-" + index, "Agreement " + index));
            companyRepository.save(new Company("Company " + index, agreement));
        });
        entityManager.flush();
        entityManager.clear();
    }
}
