package com.stiapba.documentmanagement.report.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Component
@ConditionalOnProperty(prefix = "app.template", name = "storage-type", havingValue = "local", matchIfMissing = true)
public class LocalReportFileStorage implements ReportFileStorage {
    private final Path root;

    public LocalReportFileStorage(@Value("${app.template.storage-path:storage/templates}") String storagePath) {
        this.root = Path.of(storagePath).toAbsolutePath().normalize();
    }

    @Override
    public void store(String fileKey, byte[] content) throws IOException {
        Path storageRoot = ensureRoot();
        Path destination = resolveSafe(storageRoot, fileKey);
        Files.createDirectories(destination.getParent());
        ensureNoSymlinks(storageRoot, destination.getParent());
        Path temporary = storageRoot.resolve(".report-" + UUID.randomUUID() + ".tmp");
        try {
            Files.write(temporary, content);
            try {
                Files.move(temporary, destination, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException exception) {
                Files.move(temporary, destination, StandardCopyOption.REPLACE_EXISTING);
            }
        } finally {
            Files.deleteIfExists(temporary);
        }
    }

    @Override
    public byte[] load(String fileKey) throws IOException {
        return Files.readAllBytes(resolveSafe(ensureRoot(), fileKey));
    }

    @Override
    public void delete(String fileKey) throws IOException {
        Files.deleteIfExists(resolveSafe(ensureRoot(), fileKey));
    }

    private Path ensureRoot() throws IOException {
        Files.createDirectories(root);
        if (Files.isSymbolicLink(root)) throw new IOException("El directorio de almacenamiento no es válido.");
        return root.toRealPath(LinkOption.NOFOLLOW_LINKS);
    }

    private Path resolveSafe(Path storageRoot, String fileKey) throws IOException {
        if (fileKey == null || !fileKey.matches("reports/\\d{4}/(0[1-9]|1[0-2])/reporte-\\d{4}-(0[1-9]|1[0-2])\\.xlsx")) {
            throw new IllegalArgumentException("La referencia del archivo no es válida.");
        }
        Path relative = Path.of(fileKey).normalize();
        Path resolved = storageRoot.resolve(relative).normalize();
        if (relative.isAbsolute() || !resolved.startsWith(storageRoot)) throw new IllegalArgumentException("La referencia del archivo no es válida.");
        ensureNoSymlinks(storageRoot, resolved);
        return resolved;
    }

    private void ensureNoSymlinks(Path storageRoot, Path path) throws IOException {
        Path current = storageRoot;
        for (Path component : storageRoot.relativize(path)) {
            current = current.resolve(component);
            if (Files.exists(current, LinkOption.NOFOLLOW_LINKS) && Files.isSymbolicLink(current)) throw new IOException("La referencia del archivo no es válida.");
        }
    }
}
