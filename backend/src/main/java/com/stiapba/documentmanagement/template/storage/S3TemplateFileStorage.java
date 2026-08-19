package com.stiapba.documentmanagement.template.storage;

import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.nio.file.NoSuchFileException;
import java.util.UUID;
import java.util.regex.Pattern;

public class S3TemplateFileStorage implements TemplateFileStorage {
    private static final Pattern FILE_KEY_PATTERN = Pattern.compile(
            "templates/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.pdf");

    private final S3Client s3Client;
    private final String bucket;

    public S3TemplateFileStorage(S3Client s3Client, String bucket) {
        this.s3Client = s3Client;
        this.bucket = bucket;
    }

    @Override
    public String store(byte[] content) throws IOException {
        String fileKey = "templates/" + UUID.randomUUID() + ".pdf";
        try {
            s3Client.putObject(PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(fileKey)
                            .contentType("application/pdf")
                            .build(),
                    RequestBody.fromBytes(content));
            return fileKey;
        } catch (SdkException exception) {
            throw storageException("No se pudo guardar el archivo en el almacenamiento de plantillas.", exception);
        }
    }

    @Override
    public byte[] load(String fileKey) throws IOException {
        String safeFileKey = requireSafeFileKey(fileKey);
        try {
            ResponseBytes<GetObjectResponse> response = s3Client.getObjectAsBytes(GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(safeFileKey)
                    .build());
            return response.asByteArray();
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) {
                throw new NoSuchFileException(safeFileKey);
            }
            throw storageException("No se pudo leer el archivo del almacenamiento de plantillas.", exception);
        } catch (SdkException exception) {
            throw storageException("No se pudo leer el archivo del almacenamiento de plantillas.", exception);
        }
    }

    @Override
    public void delete(String fileKey) throws IOException {
        String safeFileKey = requireSafeFileKey(fileKey);
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(safeFileKey)
                    .build());
        } catch (S3Exception exception) {
            if (exception.statusCode() != 404) {
                throw storageException("No se pudo eliminar el archivo del almacenamiento de plantillas.", exception);
            }
        } catch (SdkException exception) {
            throw storageException("No se pudo eliminar el archivo del almacenamiento de plantillas.", exception);
        }
    }

    private String requireSafeFileKey(String fileKey) {
        if (fileKey == null || !FILE_KEY_PATTERN.matcher(fileKey).matches()) {
            throw new IllegalArgumentException("La referencia del archivo no es válida.");
        }
        return fileKey;
    }

    private IOException storageException(String message, Exception cause) {
        return new IOException(message, cause);
    }
}
