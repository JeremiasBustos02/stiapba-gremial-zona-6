package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.template.entity.TemplateField;
import com.stiapba.documentmanagement.template.entity.TemplateFieldMode;
import com.stiapba.documentmanagement.template.entity.TemplateFieldAlignment;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationWidget;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.apache.pdfbox.pdmodel.interactive.form.PDField;
import org.apache.pdfbox.pdmodel.interactive.form.PDTextField;
import org.apache.pdfbox.pdmodel.interactive.form.PDVariableText;
import org.apache.pdfbox.cos.COSName;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Component
public class PdfTemplateRenderer {
    private static final float MAX_FONT_SIZE = 12f;
    private static final float MIN_FONT_SIZE = 7f;
    private static final float HORIZONTAL_PADDING = 4f;
    private static final float VERTICAL_PADDING = 2f;
    private static final PDType1Font FONT = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

    public byte[] render(TemplateVariant variant, Map<String, String> logicalValues, byte[] templateContent) throws IOException {
        try (PDDocument document = Loader.loadPDF(templateContent); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDAcroForm acroForm = document.getDocumentCatalog().getAcroForm();
            boolean hasAcroformFields = variant.getFields().stream().anyMatch(field -> field.getMode() == TemplateFieldMode.ACROFORM);
            if (hasAcroformFields && acroForm == null) {
                throw new DocumentException(422, "ACROFORM_NOT_FOUND", "La plantilla no contiene campos AcroForm.");
            }
            Map<String, PDField> fieldsByName = acroForm == null ? Map.of() : fieldsByName(acroForm);
            if (acroForm != null) {
                normalizeWidgets(acroForm);
                for (PDField field : fieldsByName.values()) {
                    if (field instanceof PDTextField textField) {
                        textField.setDefaultAppearance(defaultAppearance(MAX_FONT_SIZE));
                    }
                }
            }

            for (TemplateField templateField : variant.getFields()) {
                if (templateField.getMode() != TemplateFieldMode.ACROFORM) {
                    continue;
                }
                String logicalKey = templateField.getFieldDefinition().getKey();
                String value = logicalValues.get(logicalKey);
                if (templateField.isRequired() && (value == null || value.isBlank())) {
                    throw new DocumentException(422, "TEMPLATE_FIELD_REQUIRED", "Falta un dato obligatorio para completar la plantilla.");
                }
                if (value == null || value.isBlank()) {
                    continue;
                }
                PDField field = fieldsByName.get(templateField.getAcroFieldName());
                if (field == null) {
                    throw new DocumentException(422, "ACROFORM_FIELD_NOT_FOUND", "La plantilla no contiene uno de los campos configurados.");
                }
                if (!(field instanceof PDTextField textField)) {
                    throw new DocumentException(422, "ACROFORM_FIELD_TYPE_UNSUPPORTED", "La plantilla contiene un tipo de campo no compatible.");
                }
                textField.setDefaultAppearance(defaultAppearance(fontSizeFor(textField, value, templateField)));
                textField.setQ(quadding(templateField.getAlignment()));
                textField.setMultiline(Boolean.TRUE.equals(templateField.getMultiline()));
                textField.setValue(value);
            }
            if (acroForm != null) {
                acroForm.setNeedAppearances(false);
                acroForm.refreshAppearances();
            }
            for (TemplateField templateField : variant.getFields()) {
                if (templateField.getMode() == TemplateFieldMode.POSITIONED) {
                    drawPositionedField(document, templateField, logicalValues);
                }
            }
            if (acroForm != null) {
                acroForm.flatten();
            }
            document.save(output);
            return output.toByteArray();
        }
    }

    private Map<String, PDField> fieldsByName(PDAcroForm acroForm) {
        Map<String, PDField> fields = new HashMap<>();
        for (PDField field : acroForm.getFieldTree()) {
            fields.put(field.getFullyQualifiedName(), field);
        }
        return fields;
    }

    private float fontSizeFor(PDTextField field, String value, TemplateField templateField) throws IOException {
        PDAnnotationWidget widget = field.getWidgets().stream().findFirst()
                .orElseThrow(() -> new DocumentException(422, "ACROFORM_WIDGET_NOT_FOUND", "La plantilla contiene un campo sin posición."));
        float maxWidth = widget.getRectangle().getWidth() - HORIZONTAL_PADDING;
        float maxHeight = widget.getRectangle().getHeight() - VERTICAL_PADDING;
        String[] lines = Boolean.TRUE.equals(templateField.getMultiline()) ? value.split("\\R", -1) : new String[] { value };
        float widestLine = 0f;
        for (String line : lines) {
            widestLine = Math.max(widestLine, FONT.getStringWidth(line));
        }
        float byWidth = widestLine == 0f ? maxWidth : maxWidth * 1000f / widestLine;
        float byHeight = maxHeight * 1000f / (FONT.getFontDescriptor().getCapHeight() * lines.length);
        float max = templateField.getMaxFontSize() == null ? MAX_FONT_SIZE : templateField.getMaxFontSize();
        float min = templateField.getMinFontSize() == null ? MIN_FONT_SIZE : templateField.getMinFontSize();
        float preferred = templateField.getFontSize() == null ? max : Math.min(templateField.getFontSize(), max);
        float size = Math.min(preferred, Math.min(byWidth, byHeight));
        if (size < min) {
            throw new DocumentException(422, "PDF_TEXT_TOO_LONG", "Uno de los datos no entra legiblemente en el campo de la plantilla.");
        }
        return size;
    }

    private int quadding(TemplateFieldAlignment alignment) {
        return switch (alignment == null ? TemplateFieldAlignment.CENTER : alignment) {
            case LEFT -> PDVariableText.QUADDING_LEFT;
            case CENTER -> PDVariableText.QUADDING_CENTERED;
            case RIGHT -> PDVariableText.QUADDING_RIGHT;
        };
    }

    private String defaultAppearance(float fontSize) {
        return "/Helv " + fontSize + " Tf 0 g";
    }

    private void normalizeWidgets(PDAcroForm acroForm) {
        for (PDField field : acroForm.getFieldTree()) {
            for (PDAnnotationWidget widget : field.getWidgets()) {
            // Remove iLovePDF's widget decoration and cached appearance before PDFBox regenerates text only.
                widget.getCOSObject().removeItem(COSName.MK);
                widget.getCOSObject().removeItem(COSName.BS);
                widget.getCOSObject().removeItem(COSName.BORDER);
                widget.getCOSObject().removeItem(COSName.AP);
            }
        }
    }

    private void drawPositionedField(PDDocument document, TemplateField field, Map<String, String> values) throws IOException {
        String value = values.get(field.getFieldDefinition().getKey());
        if (field.isRequired() && (value == null || value.isBlank())) {
            throw new DocumentException(422, "TEMPLATE_FIELD_REQUIRED", "Falta un dato obligatorio para completar la plantilla.");
        }
        if (value == null || value.isBlank()) return;
        PDRectangle box = new PDRectangle(field.getX(), field.getY(), field.getWidth(), field.getHeight());
        float size = positionedFontSize(value, box, field);
        PDPage page = document.getPage(field.getPageNumber() - 1);
        float textWidth = FONT.getStringWidth(value) / 1000f * size;
        float x = switch (field.getAlignment() == null ? TemplateFieldAlignment.LEFT : field.getAlignment()) {
            case LEFT -> box.getLowerLeftX() + 2f;
            case CENTER -> box.getLowerLeftX() + (box.getWidth() - textWidth) / 2f;
            case RIGHT -> box.getUpperRightX() - textWidth - 2f;
        };
        try (PDPageContentStream content = new PDPageContentStream(document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
            content.beginText();
            content.setFont(FONT, size);
            content.newLineAtOffset(x, box.getLowerLeftY() + (box.getHeight() - size) / 2f);
            content.showText(value);
            content.endText();
        }
    }

    private float positionedFontSize(String value, PDRectangle box, TemplateField field) throws IOException {
        float configuredMax = field.getMaxFontSize() == null ? MAX_FONT_SIZE : field.getMaxFontSize();
        float configuredMin = field.getMinFontSize() == null ? MIN_FONT_SIZE : field.getMinFontSize();
        float preferred = field.getFontSize() == null ? configuredMax : Math.min(field.getFontSize(), configuredMax);
        float byWidth = (box.getWidth() - HORIZONTAL_PADDING) * 1000f / FONT.getStringWidth(value);
        float byHeight = (box.getHeight() - VERTICAL_PADDING) * 1000f / FONT.getFontDescriptor().getCapHeight();
        float size = Math.min(preferred, Math.min(byWidth, byHeight));
        if (size < configuredMin) {
            throw new DocumentException(422, "PDF_TEXT_TOO_LONG", "Uno de los datos no entra legiblemente en el campo de la plantilla.");
        }
        return size;
    }
}
