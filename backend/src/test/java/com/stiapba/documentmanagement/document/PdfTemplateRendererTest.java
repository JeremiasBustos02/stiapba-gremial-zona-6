package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.template.entity.FieldDefinition;
import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.entity.TemplateField;
import com.stiapba.documentmanagement.template.entity.TemplateFieldAlignment;
import com.stiapba.documentmanagement.template.entity.TemplateFieldMode;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.apache.pdfbox.pdmodel.interactive.form.PDField;
import org.apache.pdfbox.pdmodel.interactive.form.PDTextField;
import org.apache.pdfbox.text.TextPosition;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.cos.COSDictionary;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class PdfTemplateRendererTest {
    private static final Path ACROFORM_TEMPLATE = Path.of("..", "docs", "pdf-templates", "Permiso Gremial Bruna.pdf");
    private final PdfTemplateRenderer renderer = new PdfTemplateRenderer();

    @Test
    void detectsAndListsTheActualAcroFormFields() throws Exception {
        try (PDDocument document = Loader.loadPDF(Files.readAllBytes(ACROFORM_TEMPLATE))) {
            PDAcroForm form = document.getDocumentCatalog().getAcroForm();

            assertThat(form).isNotNull();
            assertThat(form.getFieldTree()).extracting(PDField::getFullyQualifiedName).containsExactly(
                    "Provincia", "Dia fecha", "Mes", "Año", "Empresa", "Direccion", "Delegado y DNI",
                    "Dia permiso", "Convenio");
            assertThat(findField(form, "Provincia")).isInstanceOf(PDTextField.class);
            PDTextField delegateField = (PDTextField) findField(form, "Delegado y DNI");
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
                "delegate", "Delegado y DNI",
                "permitDay", "Dia permiso",
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
        try (PDDocument document = Loader.loadPDF(generated)) {
            assertThat(document.getDocumentCatalog().getAcroForm().getFields()).isEmpty();
        }
        writeValidationPdf("permiso-gremial-acroform-short.pdf", generated);
    }

    @Test
    void removesDecorationFromMappedAndUnmappedWidgetsBeforeFlattening() throws Exception {
        byte[] source = Files.readAllBytes(ACROFORM_TEMPLATE);
        try (PDDocument document = Loader.loadPDF(source)) {
            PDTextField company = (PDTextField) findField(document.getDocumentCatalog().getAcroForm(), "Empresa");
            PDTextField address = (PDTextField) findField(document.getDocumentCatalog().getAcroForm(), "Direccion");
            assertThat(company.getWidgets()).singleElement().satisfies(widget -> {
                assertThat(widget.getCOSObject().containsKey(COSName.MK)).isTrue();
                COSDictionary appearance = (COSDictionary) widget.getCOSObject().getDictionaryObject(COSName.MK);
                assertThat(appearance.containsKey(COSName.BC)).isTrue();
                assertThat(appearance.containsKey(COSName.BG)).isTrue();
            });
            assertThat(address.getWidgets()).singleElement().satisfies(widget -> {
                assertThat(widget.getCOSObject().containsKey(COSName.MK)).isTrue();
                COSDictionary appearance = (COSDictionary) widget.getCOSObject().getDictionaryObject(COSName.MK);
                assertThat(appearance.containsKey(COSName.BC)).isTrue();
                assertThat(appearance.containsKey(COSName.BG)).isTrue();
            });
        }

        byte[] generated = renderer.render(configuredVariant(), shortValues(), source);

        try (PDDocument document = Loader.loadPDF(generated)) {
            assertThat(document.getDocumentCatalog().getAcroForm().getFields()).isEmpty();
            assertThat(document.getPages()).allSatisfy(page -> assertThat(page.getAnnotations())
                    .noneMatch(annotation -> annotation instanceof org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationWidget));
            assertThat(new PDFTextStripper().getText(document)).contains("INFRIBA");
        }
    }

    @Test
    void centersMappedAcroFormTextBeforeFlattening() throws Exception {
        byte[] source = Files.readAllBytes(ACROFORM_TEMPLATE);
        float fieldCenter;
        try (PDDocument document = Loader.loadPDF(source)) {
            PDTextField company = (PDTextField) findField(document.getDocumentCatalog().getAcroForm(), "Empresa");
            PDRectangle rect = company.getWidgets().getFirst().getRectangle();
            fieldCenter = (rect.getLowerLeftX() + rect.getUpperRightX()) / 2f;
        }

        byte[] generated = renderer.render(configuredVariant(), shortValues(), source);

        try (PDDocument document = Loader.loadPDF(generated)) {
            List<TextPosition> companyText = textPositions(document, "INFRIBA");
            assertThat(textCenter(companyText)).isCloseTo(fieldCenter, within(1f));
        }
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
        try (PDDocument document = Loader.loadPDF(generated)) {
            List<TextPosition> companyText = textPositions(document, values.get("company"));
            assertThat(companyText).extracting(TextPosition::getFontSizeInPt).allSatisfy(size ->
                    assertThat(size).isBetween(7f, 12f));
            assertThat(companyText).extracting(TextPosition::getFontSizeInPt).allSatisfy(size ->
                    assertThat(size).isLessThan(12f));
        }
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
    void appliesExplicitLeftAndRightAlignmentWhileNullKeepsTheCenteredFallback() throws Exception {
        byte[] source = Files.readAllBytes(ACROFORM_TEMPLATE);
        PDRectangle rectangle;
        try (PDDocument document = Loader.loadPDF(source)) {
            rectangle = ((PDTextField) findField(document.getDocumentCatalog().getAcroForm(), "Empresa"))
                    .getWidgets().getFirst().getRectangle();
        }

        TemplateVariant left = configuredVariant();
        configureAcroformField(left, "company", TemplateFieldAlignment.LEFT, null, null, null, null);
        TemplateVariant right = configuredVariant();
        configureAcroformField(right, "company", TemplateFieldAlignment.RIGHT, null, null, null, null);

        try (PDDocument leftDocument = Loader.loadPDF(renderer.render(left, shortValues(), source));
             PDDocument rightDocument = Loader.loadPDF(renderer.render(right, shortValues(), source))) {
            List<TextPosition> leftText = textPositions(leftDocument, "INFRIBA");
            List<TextPosition> rightText = textPositions(rightDocument, "INFRIBA");
            assertThat(leftText.getFirst().getXDirAdj()).isCloseTo(rectangle.getLowerLeftX() + 2f, within(2f));
            TextPosition last = rightText.getLast();
            assertThat(last.getXDirAdj() + last.getWidthDirAdj()).isCloseTo(rectangle.getUpperRightX() - 2f, within(2f));
        }
    }

    @Test
    void appliesPreferredFontSize() throws Exception {
        TemplateVariant preferred = configuredVariant();
        configureAcroformField(preferred, "company", null, 9f, 7f, 12f, null);

        try (PDDocument document = Loader.loadPDF(renderer.render(preferred, shortValues(), Files.readAllBytes(ACROFORM_TEMPLATE)))) {
            assertThat(textPositions(document, "INFRIBA")).extracting(TextPosition::getFontSizeInPt)
                    .allSatisfy(size -> assertThat(size).isCloseTo(9f, within(0.1f)));
        }

    }

    @Test
    void appliesMultilineOnlyWhenConfigured() throws Exception {
        TemplateVariant variant = configuredVariant();
        configureAcroformField(variant, "delegate", null, null, null, null, true);
        Map<String, String> values = new LinkedHashMap<>(shortValues());
        values.put("delegate", "Juan Pérez\nDNI 40123456");

        byte[] generated = renderer.render(variant, values, Files.readAllBytes(ACROFORM_TEMPLATE));

        try (PDDocument document = Loader.loadPDF(generated)) {
            assertThat(new PDFTextStripper().getText(document)).contains("Juan Pérez", "DNI 40123456");
        }
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
                positionedTemplate()));
    }

    @Test
    void drawsPositionedTextOnPdfWithoutAcroForm() throws Exception {
        TemplateVariant variant = new TemplateVariant(new Template("Permiso Gremial", "Prueba"), "Bruna", "template.pdf");
        TemplateField field = new TemplateField(variant, new FieldDefinition("company"), TemplateFieldMode.POSITIONED,
                null, true, 1);
        field.updatePositioned(field.getFieldDefinition(), true, 1, 1, 72, 640, 180, 18,
                12, 7, 12, TemplateFieldAlignment.LEFT, false);
        variant.addField(field);

        byte[] generated = renderer.render(variant, Map.of("company", "INFRIBA"), positionedTemplate());

        try (PDDocument document = Loader.loadPDF(generated)) {
            assertThat(new PDFTextStripper().getText(document)).contains("INFRIBA");
        }
    }

    @Test
    void processesAcroformAndPositionedFieldsInTheSameVariant() throws Exception {
        TemplateVariant variant = configuredVariant();
        TemplateField positioned = new TemplateField(variant, new FieldDefinition("delegateDni"), TemplateFieldMode.POSITIONED,
                null, true, 9);
        positioned.updatePositioned(positioned.getFieldDefinition(), true, 9, 1, 72, 360, 100, 18,
                12, 7, 12, TemplateFieldAlignment.LEFT, false);
        variant.addField(positioned);

        byte[] generated = renderer.render(variant, shortValuesWithDelegateDni(), Files.readAllBytes(ACROFORM_TEMPLATE));

        try (PDDocument document = Loader.loadPDF(generated)) {
            assertThat(document.getDocumentCatalog().getAcroForm().getFields()).isEmpty();
            assertThat(new PDFTextStripper().getText(document)).contains("40123456");
        }
    }

    private TemplateVariant configuredVariant() {
        TemplateVariant variant = new TemplateVariant(new Template("Permiso Gremial", "Prueba"), "Bruna AcroForm", "template.pdf");
        addField(variant, "province", "Provincia", true, 1);
        addField(variant, "issueDay", "Dia fecha", true, 2);
        addField(variant, "issueMonth", "Mes", true, 3);
        addField(variant, "issueYear", "Año", true, 4);
        addField(variant, "company", "Empresa", true, 5);
        addField(variant, "delegate", "Delegado y DNI", true, 6);
        addField(variant, "permitDay", "Dia permiso", true, 7);
        addField(variant, "agreement", "Convenio", true, 8);
        return variant;
    }

    private byte[] positionedTemplate() throws IOException {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            document.addPage(new PDPage(PDRectangle.A4));
            document.save(output);
            return output.toByteArray();
        }
    }

    private void addField(TemplateVariant variant, String key, String acroFieldName, boolean required, int displayOrder) {
        TemplateField field = new TemplateField(variant, new FieldDefinition(key), TemplateFieldMode.ACROFORM,
                acroFieldName, required, displayOrder);
        variant.addField(field);
    }

    private void configureAcroformField(TemplateVariant variant, String key, TemplateFieldAlignment alignment,
                                        Float fontSize, Float minFontSize, Float maxFontSize, Boolean multiline) {
        TemplateField field = variant.getFields().stream()
                .filter(value -> value.getFieldDefinition().getKey().equals(key))
                .findFirst()
                .orElseThrow();
        field.updateAcroform(field.getFieldDefinition(), field.isRequired(), field.getDisplayOrder(), field.getAcroFieldName(),
                fontSize, minFontSize, maxFontSize, alignment, multiline);
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

    private Map<String, String> shortValuesWithDelegateDni() {
        Map<String, String> values = new LinkedHashMap<>(shortValues());
        values.put("delegateDni", "40123456");
        return values;
    }

    private void assertGeneratedValues(byte[] generated, Map<String, String> values) throws Exception {
        try (PDDocument document = Loader.loadPDF(generated)) {
            assertThat(document.getDocumentCatalog().getAcroForm().getFields()).isEmpty();
            String text = new PDFTextStripper().getText(document);
            assertThat(text).contains(values.get("province"), values.get("company"), values.get("delegate"));
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

    private List<TextPosition> textPositions(PDDocument document, String expectedText) throws IOException {
        PositionCapturingTextStripper stripper = new PositionCapturingTextStripper();
        stripper.getText(document);
        StringBuilder captured = new StringBuilder();
        for (TextPosition position : stripper.positions) {
            captured.append(position.getUnicode());
        }
        int start = captured.indexOf(expectedText);
        assertThat(start).isGreaterThanOrEqualTo(0);
        return stripper.positions.subList(start, start + expectedText.length());
    }

    private float textCenter(List<TextPosition> positions) {
        TextPosition first = positions.getFirst();
        TextPosition last = positions.getLast();
        return (first.getXDirAdj() + last.getXDirAdj() + last.getWidthDirAdj()) / 2f;
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

    private static final class PositionCapturingTextStripper extends PDFTextStripper {
        private final List<TextPosition> positions = new java.util.ArrayList<>();

        private PositionCapturingTextStripper() throws IOException {
        }

        @Override
        protected void processTextPosition(TextPosition text) {
            positions.add(text);
            super.processTextPosition(text);
        }
    }
}
