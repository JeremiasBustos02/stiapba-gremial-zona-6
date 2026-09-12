package com.stiapba.documentmanagement.report.storage;

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

public class S3ReportFileStorage implements ReportFileStorage {
    private final S3Client s3Client;
    private final String bucket;

    public S3ReportFileStorage(S3Client s3Client, String bucket) {
        this.s3Client = s3Client;
        this.bucket = bucket;
    }

    @Override
    public void store(String fileKey, byte[] content) throws IOException {
        String safeFileKey = requireSafeFileKey(fileKey);
        try {
            s3Client.putObject(PutObjectRequest.builder().bucket(bucket).key(safeFileKey)
                    .contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").build(), RequestBody.fromBytes(content));
        } catch (SdkException exception) {
            throw new IOException("No se pudo guardar el reporte mensual.", exception);
        }
    }

    @Override
    public byte[] load(String fileKey) throws IOException {
        String safeFileKey = requireSafeFileKey(fileKey);
        try {
            ResponseBytes<GetObjectResponse> response = s3Client.getObjectAsBytes(GetObjectRequest.builder().bucket(bucket).key(safeFileKey).build());
            return response.asByteArray();
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) throw new NoSuchFileException(safeFileKey);
            throw new IOException("No se pudo leer el reporte mensual.", exception);
        } catch (SdkException exception) {
            throw new IOException("No se pudo leer el reporte mensual.", exception);
        }
    }

    @Override
    public void delete(String fileKey) throws IOException {
        String safeFileKey = requireSafeFileKey(fileKey);
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(safeFileKey).build());
        } catch (S3Exception exception) {
            if (exception.statusCode() != 404) throw new IOException("No se pudo eliminar el reporte mensual.", exception);
        } catch (SdkException exception) {
            throw new IOException("No se pudo eliminar el reporte mensual.", exception);
        }
    }

    private String requireSafeFileKey(String fileKey) {
        if (fileKey == null || !fileKey.matches("reports/\\d{4}/(0[1-9]|1[0-2])/reporte-\\d{4}-(0[1-9]|1[0-2])\\.xlsx")) {
            throw new IllegalArgumentException("La referencia del archivo no es válida.");
        }
        return fileKey;
    }
}
