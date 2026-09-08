package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.template.entity.FieldDefinition;
import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.entity.TemplateField;
import com.stiapba.documentmanagement.template.entity.TemplateFieldAlignment;
import com.stiapba.documentmanagement.template.entity.TemplateFieldMode;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.apache.pdfbox.pdmodel.interactive.form.PDField;
import org.apache.pdfbox.pdmodel.interactive.form.PDTextField;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PdfTemplateRendererTest {
    private static final Path ACROFORM_TEMPLATE = Path.of("..", "docs", "pdf-templates", "Permiso-Gremial-Bruna-ACROFORM.pdf");
    private static final Path POSITIONED_TEMPLATE = Path.of("..", "docs", "pdf-templates", "Permiso-Gremial-Bruna.pdf");
    private final PdfTemplateRenderer renderer = new PdfTemplateRenderer();

    @Test
    void detectsAndListsTheActualAcroFormFields() throws Exception {
        try (PDDocument document = Loader.loadPDF(Files.readAllBytes(ACROFORM_TEMPLATE))) {
            PDAcroForm form = document.getDocumentCatalog().getAcroForm();

            assertThat(form).isNotNull();
            assertThat(form.getFieldTree()).extracting(PDField::getFullyQualifiedName).containsExactly(
                    "Provincia", "Dia fecha", "Mes", "Año", "Empresa", "Dia de permiso", "Convenio",
                    "Direccion", "Nombre delegado y dni");
            assertThat(findField(form, "Provincia")).isInstanceOf(PDTextField.class);
            PDTextField delegateField = (PDTextField) findField(form, "Nombre delegado y dni");
            assertThat(delegateField.getDefaultAppearance()).isEqualTo("/Helvetica 12 Tf 0 g");
            assertThat(delegateField.isMultiline()).isFalse();
            assertThat(delegateField.getFieldFlags()).isZero();
            assertThat(delegateField.getWidgets()).singleElement().satisfies(widget -> {
                assertThat(widget.getRectangle().getLowerLeftX()).isEqualTo(49.5f);
                assertThat(widget.getRectangle().getLowerLeftY()).isEqualTo(409.05f);
            });
        }
    }

    @Test
    void mapsEverySupportedLogicalValueToItsActualAcroFormField() {
        Map<String, String> mappings = new LinkedHashMap<>();
        configuredVariant().getFields().forEach(field -> mappings.put(field.getFieldDefinition().getKey(), field.getAcroFieldName()));

        assertThat(mappings).containsAllEntriesOf(Map.of(
                "province", "Provincia",
                "issueDay", "Dia fecha",
                "issueMonth", "Mes",
                "issueYear", "Año",
                "company", "Empresa",
                "delegate", "Nombre delegado y dni",
                "permitDay", "Dia de permiso",
                "agreement", "Convenio"
        )).hasSize(8);
    }

    @Test
    void fillsShortTextAndKeepsTheSourceUntouched() throws Exception {
        byte[] source = Files.readAllBytes(ACROFORM_TEMPLATE);
        byte[] sourceHash = MessageDigest.getInstance("SHA-256").digest(source);
        Map<String, String> values = shortValues();

        byte[] generated = renderer.render(configuredVariant(), values, source);

        assertGeneratedValues(generated, values);
        assertThat(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(ACROFORM_TEMPLATE))).isEqualTo(sourceHash);
        assertThat(fieldAppearance(generated, "Empresa")).isEqualTo("/Helv 12.0 Tf 0 g");
        assertThat(fieldAppearance(generated, "Direccion")).isEqualTo("/Helv 12.0 Tf 0 g");
        writeValidationPdf("permiso-gremial-acroform-short.pdf", generated);
    }

    @Test
    void rejectsLongTextThatWouldRequireAnUnreadableFontSize() throws Exception {
        Map<String, String> values = new LinkedHashMap<>(shortValues());
        values.put("company", "INDUSTRIAS FRIGORIFICAS DE BUENOS AIRES SOCIEDAD ANONIMA");

        assertDocumentCode("PDF_TEXT_TOO_LONG", () -> renderer.render(configuredVariant(), values,
                Files.readAllBytes(ACROFORM_TEMPLATE)));
    }

    @Test
    void fillsLongDelegateText() throws Exception {
        Map<String, String> values = new LinkedHashMap<>(shortValues());
        values.put("delegate", "Juan Carlos Pérez Fernández DNI 40123456");

        byte[] generated = renderer.render(configuredVariant(), values, Files.readAllBytes(ACROFORM_TEMPLATE));

        assertGeneratedValues(generated, values);
        writeValidationPdf("permiso-gremial-acroform-delegate-long.pdf", generated);
    }

    @Test
    void shrinksCompanyTextWithinTheReadableLimit() throws Exception {
        Map<String, String> values = new LinkedHashMap<>(shortValues());
        values.put("company", "FRIGORIFICO DEL SUR");

        byte[] generated = renderer.render(configuredVariant(), values, Files.readAllBytes(ACROFORM_TEMPLATE));

        assertGeneratedValues(generated, values);
        assertThat(fontSize(fieldAppearance(generated, "Empresa"))).isBetween(7f, 12f);
        writeValidationPdf("permiso-gremial-acroform-company-shrink.pdf", generated);
    }

    @Test
    void fillsSpanishCharactersSupportedByTheTemplateFont() throws Exception {
        Map<String, String> values = new LinkedHashMap<>(shortValues());
        values.put("company", "Ñandú áéíóú S.A.");

        byte[] generated = renderer.render(configuredVariant(), values, Files.readAllBytes(ACROFORM_TEMPLATE));

        assertGeneratedValues(generated, values);
    }

    @Test
    void rejectsAnUnknownAcroFormField() throws Exception {
        TemplateVariant variant = new TemplateVariant(new Template("Permiso Gremial", "Prueba"), "Bruna", "template.pdf");
        addField(variant, "company", "No existe", true, 1);

        assertDocumentCode("ACROFORM_FIELD_NOT_FOUND", () -> renderer.render(variant, Map.of("company", "INFRIBA"),
                Files.readAllBytes(ACROFORM_TEMPLATE)));
    }

    @Test
    void rejectsARequiredFieldWithoutValue() throws Exception {
        TemplateVariant variant = new TemplateVariant(new Template("Permiso Gremial", "Prueba"), "Bruna", "template.pdf");
        addField(variant, "company", "Empresa", true, 1);

        assertDocumentCode("TEMPLATE_FIELD_REQUIRED", () -> renderer.render(variant, Map.of(), Files.readAllBytes(ACROFORM_TEMPLATE)));
    }

    @Test
    void rejectsPdfWithoutAcroForm() throws Exception {
        assertDocumentCode("ACROFORM_NOT_FOUND", () -> renderer.render(configuredVariant(), shortValues(),
                Files.readAllBytes(POSITIONED_TEMPLATE)));
    }

    @Test
    void drawsPositionedTextOnPdfWithoutAcroForm() throws Exception {
        TemplateVariant variant = new TemplateVariant(new Template("Permiso Gremial", "Prueba"), "Bruna", "template.pdf");
        TemplateField field = new TemplateField(variant, new FieldDefinition("company"), TemplateFieldMode.POSITIONED,
                null, true, 1);
        field.updatePositioned(field.getFieldDefinition(), true, 1, 1, 72, 640, 180, 18,
                12, 7, 12, TemplateFieldAlignment.LEFT, false);
        variant.addField(field);

        byte[] generated = renderer.render(variant, Map.of("company", "INFRIBA"), Files.readAllBytes(POSITIONED_TEMPLATE));

        try (PDDocument document = Loader.loadPDF(generated)) {
            assertThat(new PDFTextStripper().getText(document)).contains("INFRIBA");
        }
    }

    private TemplateVariant configuredVariant() {
        TemplateVariant variant = new TemplateVariant(new Template("Permiso Gremial", "Prueba"), "Bruna AcroForm", "template.pdf");
        addField(variant, "province", "Provincia", true, 1);
        addField(variant, "issueDay", "Dia fecha", true, 2);
        addField(variant, "issueMonth", "Mes", true, 3);
        addField(variant, "issueYear", "Año", true, 4);
        addField(variant, "company", "Empresa", true, 5);
        addField(variant, "delegate", "Nombre delegado y dni", true, 6);
        addField(variant, "permitDay", "Dia de permiso", true, 7);
        addField(variant, "agreement", "Convenio", true, 8);
        return variant;
    }

    private void addField(TemplateVariant variant, String key, String acroFieldName, boolean required, int displayOrder) {
        TemplateField field = new TemplateField(variant, new FieldDefinition(key), TemplateFieldMode.ACROFORM,
                acroFieldName, required, displayOrder);
        variant.addField(field);
    }

    private Map<String, String> shortValues() {
        return Map.of(
                "province", "Buenos Aires",
                "issueDay", "18",
                "issueMonth", "agosto",
                "issueYear", "26",
                "company", "INFRIBA",
                "delegate", "Juan Pérez DNI 40123456",
                "permitDay", "21",
                "agreement", "CCT-123"
        );
    }

    private void assertGeneratedValues(byte[] generated, Map<String, String> values) throws Exception {
        try (PDDocument document = Loader.loadPDF(generated)) {
            PDAcroForm form = document.getDocumentCatalog().getAcroForm();
            assertThat(findField(form, "Provincia").getValueAsString()).isEqualTo(values.get("province"));
            assertThat(findField(form, "Empresa").getValueAsString()).isEqualTo(values.get("company"));
            assertThat(findField(form, "Nombre delegado y dni").getValueAsString()).isEqualTo(values.get("delegate"));
        }
    }

    private String fieldAppearance(byte[] generated, String fieldName) throws Exception {
        try (PDDocument document = Loader.loadPDF(generated)) {
            return ((PDTextField) findField(document.getDocumentCatalog().getAcroForm(), fieldName)).getDefaultAppearance();
        }
    }

    private void assertDocumentCode(String expectedCode, ThrowingRunnable runnable) {
        assertThatThrownBy(runnable::run).isInstanceOfSatisfying(DocumentException.class,
                exception -> assertThat(exception.getCode()).isEqualTo(expectedCode));
    }

    private PDField findField(PDAcroForm form, String name) {
        for (PDField field : form.getFieldTree()) {
            if (name.equals(field.getFullyQualifiedName())) {
                return field;
            }
        }
        return null;
    }

    private float fontSize(String appearance) {
        return Float.parseFloat(appearance.split(" ")[1]);
    }

    private void writeValidationPdf(String name, byte[] content) throws Exception {
        Path directory = Path.of("target", "acroform-validation");
        Files.createDirectories(directory);
        Files.write(directory.resolve(name), content);
    }

    @FunctionalInterface
    private interface ThrowingRunnable {
        void run() throws Exception;
    }
}
