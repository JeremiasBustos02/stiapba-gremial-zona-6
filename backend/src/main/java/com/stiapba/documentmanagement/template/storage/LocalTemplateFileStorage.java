package com.stiapba.documentmanagement.template.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Component
public class LocalTemplateFileStorage implements TemplateFileStorage {
    private final Path root;

    public LocalTemplateFileStorage(@Value("${app.template.storage-path:storage/templates}") String storagePath) {
        this.root = Path.of(storagePath).toAbsolutePath().normalize();
    }

    @Override
    public String store(byte[] content) throws IOException {
        Files.createDirectories(root);
        String fileKey = "templates/" + UUID.randomUUID() + ".pdf";
        Path destination = resolveSafe(fileKey);
        Files.createDirectories(destination.getParent());
        Path temporary = root.resolve(".upload-" + UUID.randomUUID() + ".tmp").normalize();
        try {
            Files.write(temporary, content);
            try {
                Files.move(temporary, destination, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException exception) {
                Files.move(temporary, destination);
            }
            return fileKey;
        } finally {
            Files.deleteIfExists(temporary);
        }
    }

    @Override
    public void delete(String fileKey) throws IOException {
        Files.deleteIfExists(resolveSafe(fileKey));
    }

    private Path resolveSafe(String fileKey) {
        if (fileKey == null || fileKey.isBlank()) {
            throw new IllegalArgumentException("La referencia del archivo no es válida.");
        }
        Path resolved = root.resolve(fileKey).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("La referencia del archivo no es válida.");
        }
        return resolved;
    }
}
