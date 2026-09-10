package com.stiapba.documentmanagement.document;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;

import java.time.Year;
import java.time.ZoneId;

@Service
public class DocumentNumberService {
    private static final ZoneId ARGENTINA_TIME_ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

    private final EntityManager entityManager;

    public DocumentNumberService(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public String nextPermisoGremialNumber() {
        Number sequenceValue = (Number) entityManager.createNativeQuery("SELECT nextval('document_record_number_seq')")
                .getSingleResult();
        return "PG-" + Year.now(ARGENTINA_TIME_ZONE).getValue() + "-" + String.format("%06d", sequenceValue.longValue());
    }
}
