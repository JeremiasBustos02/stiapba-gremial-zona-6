package com.stiapba.documentmanagement.document;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class DocumentBulkRequestValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void rejectsBatchRequestsAndZipArchivesWithMoreThanOneHundredItems() {
        List<UUID> ids = IntStream.range(0, 101).mapToObj(ignored -> UUID.randomUUID()).toList();
        DocumentBulkRequest batch = new DocumentBulkRequest(com.stiapba.documentmanagement.template.entity.DocumentType.PERMISO_GREMIAL,
                UUID.randomUUID(), Map.of(), Map.of(), ids);

        assertThat(validator.validate(batch)).extracting(violation -> violation.getPropertyPath().toString()).contains("delegateIds");
        assertThat(validator.validate(new DocumentBulkDtos.ZipRequest(ids)))
                .extracting(violation -> violation.getPropertyPath().toString()).contains("documentIds");
    }
}
