package com.stiapba.documentmanagement.template.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.LinkOption;
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
        Path storageRoot = ensureRoot();
        String fileKey = "templates/" + UUID.randomUUID() + ".pdf";
        Path destination = resolveSafe(storageRoot, fileKey);
        Files.createDirectories(destination.getParent());
        ensureNoSymlinks(storageRoot, destination.getParent());
        Path temporary = storageRoot.resolve(".upload-" + UUID.randomUUID() + ".tmp");
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
        Path storageRoot = ensureRoot();
        Files.deleteIfExists(resolveSafe(storageRoot, fileKey));
    }

    @Override
    public byte[] load(String fileKey) throws IOException {
        Path storageRoot = ensureRoot();
        return Files.readAllBytes(resolveSafe(storageRoot, fileKey));
    }

    private Path ensureRoot() throws IOException {
        Files.createDirectories(root);
        if (Files.isSymbolicLink(root)) {
            throw new IOException("El directorio de almacenamiento no es válido.");
        }
        return root.toRealPath(LinkOption.NOFOLLOW_LINKS);
    }

    private Path resolveSafe(Path storageRoot, String fileKey) throws IOException {
        if (fileKey == null || fileKey.isBlank()) {
            throw new IllegalArgumentException("La referencia del archivo no es válida.");
        }
        Path relative = Path.of(fileKey).normalize();
        Path resolved = storageRoot.resolve(relative).normalize();
        if (relative.isAbsolute() || !resolved.startsWith(storageRoot)) {
            throw new IllegalArgumentException("La referencia del archivo no es válida.");
        }
        ensureNoSymlinks(storageRoot, resolved);
        return resolved;
    }

    private void ensureNoSymlinks(Path storageRoot, Path path) throws IOException {
        Path current = storageRoot;
        Path relative = storageRoot.relativize(path);
        for (Path component : relative) {
            current = current.resolve(component);
            if (Files.exists(current, LinkOption.NOFOLLOW_LINKS) && Files.isSymbolicLink(current)) {
                throw new IOException("La referencia del archivo no es válida.");
            }
        }
    }
}
