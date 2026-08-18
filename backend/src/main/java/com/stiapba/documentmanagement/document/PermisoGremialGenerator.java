package com.stiapba.documentmanagement.document;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.TextStyle;
import java.util.Locale;

@Component
public class PermisoGremialGenerator implements DocumentGenerator {
    private static final float BASE_FONT_SIZE = 10f;
    private static final float MIN_FONT_SIZE = 7f;
    private static final PDType1Font FONT = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

    private static final Field PROVINCE = new Field(315f, 635f, 100f);
    private static final Field ISSUE_DAY = new Field(389f, 635f, 28f);
    private static final Field ISSUE_MONTH = new Field(477f, 635f, 92f);
    private static final Field ISSUE_YEAR = new Field(565f, 635f, 20f);
    private static final Field COMPANY = new Field(105f, 552f, 115f);
    private static final Field DELEGATE = new Field(151f, 408f, 208f);
    private static final Field PERMIT_DAY = new Field(490f, 387f, 105f);
    private static final Field AGREEMENT = new Field(449f, 340f, 54f);

    @Override
    public byte[] generate(PermisoGremialData data, byte[] templateContent) throws IOException {
        try (PDDocument document = Loader.loadPDF(templateContent); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = document.getPage(0);
            try (PDPageContentStream content = new PDPageContentStream(document, page,
                    PDPageContentStream.AppendMode.APPEND, true, true)) {
                drawCentered(content, PROVINCE, data.provinceName());
                drawCentered(content, ISSUE_DAY, Integer.toString(data.issueDate().getDayOfMonth()));
                drawCentered(content, ISSUE_MONTH, data.issueDate().getMonth().getDisplayName(TextStyle.FULL, Locale.forLanguageTag("es-AR")));
                drawCentered(content, ISSUE_YEAR, String.format("%02d", data.issueDate().getYear() % 100));
                drawCentered(content, COMPANY, data.companyName());
                drawCentered(content, DELEGATE, data.delegateText());
                drawCentered(content, PERMIT_DAY, Integer.toString(data.permitDay()));
                drawCentered(content, AGREEMENT, data.agreementCode());
            }
            document.save(output);
            return output.toByteArray();
        }
    }

    private void drawCentered(PDPageContentStream content, Field field, String text) throws IOException {
        float size = fontSizeFor(text, field.maxWidth());
        float width = FONT.getStringWidth(text) / 1000f * size;
        content.beginText();
        content.setFont(FONT, size);
        content.newLineAtOffset(field.centerX() - width / 2f, field.baselineY());
        content.showText(text);
        content.endText();
    }

    private float fontSizeFor(String text, float maxWidth) throws IOException {
        for (float size = BASE_FONT_SIZE; size >= MIN_FONT_SIZE; size -= 0.5f) {
            if (FONT.getStringWidth(text) / 1000f * size <= maxWidth) {
                return size;
            }
        }
        throw new DocumentException(422, "PDF_TEXT_TOO_LONG", "Uno de los datos no entra en el espacio disponible de la plantilla.");
    }

    private record Field(float centerX, float baselineY, float maxWidth) {
    }
}
