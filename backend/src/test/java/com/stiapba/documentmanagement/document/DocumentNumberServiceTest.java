package com.stiapba.documentmanagement.document;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.Test;

import java.math.BigInteger;
import java.time.Year;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DocumentNumberServiceTest {

    @Test
    void formatsDistinctValuesProvidedByTheDatabaseSequence() {
        EntityManager entityManager = mock(EntityManager.class);
        Query query = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        when(query.getSingleResult()).thenReturn(BigInteger.ONE, BigInteger.TWO);
        DocumentNumberService service = new DocumentNumberService(entityManager);

        String first = service.nextPermisoGremialNumber();
        String second = service.nextPermisoGremialNumber();

        assertThat(first).isEqualTo("PG-" + Year.now(java.time.ZoneId.of("America/Argentina/Buenos_Aires")) + "-000001");
        assertThat(second).endsWith("-000002").isNotEqualTo(first);
    }
}
