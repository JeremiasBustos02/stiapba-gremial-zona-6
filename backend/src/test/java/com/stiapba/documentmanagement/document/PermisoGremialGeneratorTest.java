package com.stiapba.documentmanagement.document;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PermisoGremialGeneratorTest {

    @Test
    void generatesReadablePdfWithoutChangingSourceTemplate() throws Exception {
        Path source = Path.of("..", "docs", "pdf-templates", "Permiso Gremial Bruna.pdf");
        byte[] sourceContent = Files.readAllBytes(source);
        byte[] sourceHash = MessageDigest.getInstance("SHA-256").digest(sourceContent);

        byte[] generated = new PermisoGremialGenerator().generate(new PermisoGremialData(
                "Buenos Aires", LocalDate.of(2026, 8, 18), "Empresa Ejemplo S.A.",
                "Ana Pérez DNI 40123456", 21, "CCT-123"), sourceContent);

        assertThat(generated).isNotEmpty().isNotEqualTo(sourceContent);
        try (PDDocument document = Loader.loadPDF(generated)) {
            assertThat(document.getNumberOfPages()).isEqualTo(1);
        }
        assertThat(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(source))).isEqualTo(sourceHash);
    }

    @Test
    void rejectsUnicodeOutsideStandard14Encoding() throws Exception {
        Path source = Path.of("..", "docs", "pdf-templates", "Permiso Gremial Bruna.pdf");

        assertThatThrownBy(() -> new PermisoGremialGenerator().generate(new PermisoGremialData(
                "Buenos Aires", LocalDate.of(2026, 8, 18), "Empresa ✓",
                "Ana Pérez DNI 40123456", 21, "CCT-123"), Files.readAllBytes(source)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
