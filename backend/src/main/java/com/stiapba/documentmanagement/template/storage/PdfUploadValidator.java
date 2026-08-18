package com.stiapba.documentmanagement.template.storage;

import com.stiapba.documentmanagement.template.TemplateException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;

@Component
public class PdfUploadValidator {
    private final long maxBytes;

    public PdfUploadValidator(@Value("${app.template.max-file-size-bytes:10485760}") long maxBytes) {
        this.maxBytes = maxBytes;
    }

    public byte[] validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw invalid("El archivo PDF es obligatorio.");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw invalid("El archivo debe tener extensión PDF.");
        }
        if (!"application/pdf".equalsIgnoreCase(file.getContentType())) {
            throw invalid("El archivo debe ser un PDF.");
        }
        if (file.getSize() > maxBytes) {
            throw new TemplateException(413, "PDF_TOO_LARGE", "El archivo PDF supera el tamaño máximo permitido.");
        }
        try {
            byte[] content = file.getBytes();
            validateBytes(content);
            return content;
        } catch (IOException | RuntimeException exception) {
            if (exception instanceof TemplateException templateException) {
                throw templateException;
            }
            throw invalid("El archivo PDF no es válido o no pudo leerse.");
        }
    }

    public void validateBytes(byte[] content) {
        if (content == null || content.length == 0) {
            throw invalid("El archivo PDF es obligatorio.");
        }
        if (content.length > maxBytes) {
            throw new TemplateException(413, "PDF_TOO_LARGE", "El archivo PDF supera el tamaño máximo permitido.");
        }
        try (PDDocument ignored = Loader.loadPDF(content)) {
            if (ignored.getNumberOfPages() < 1) {
                throw invalid("El archivo PDF no contiene páginas.");
            }
        } catch (IOException | RuntimeException exception) {
            if (exception instanceof TemplateException templateException) {
                throw templateException;
            }
            throw invalid("El archivo PDF no es válido o no pudo leerse.");
        }
    }

    private TemplateException invalid(String message) {
        return new TemplateException(400, "INVALID_PDF", message);
    }
}
