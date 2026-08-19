package com.stiapba.documentmanagement.template.storage;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.nio.file.NoSuchFileException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class S3TemplateFileStorageTest {

    @Test
    void createsS3StorageFromValidConfigurationWithoutCallingTheService() {
        S3TemplateStorageConfiguration configuration = new S3TemplateStorageConfiguration();
        S3Client client = configuration.templateS3Client(
                "https://example.storage.supabase.co/storage/v1/s3", "us-east-1", "access-key", "secret-key");
        try {
            TemplateFileStorage storage = configuration.s3TemplateFileStorage(client, "private-templates");
            assertThat(storage).isInstanceOf(S3TemplateFileStorage.class);
        } finally {
            client.close();
        }
    }

    @Test
    void storesWithGeneratedSafeKey() throws Exception {
        S3Client client = mock(S3Client.class);
        S3TemplateFileStorage storage = new S3TemplateFileStorage(client, "private-templates");

        String key = storage.store("pdf".getBytes());

        ArgumentCaptor<PutObjectRequest> request = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(client).putObject(request.capture(), any(RequestBody.class));
        assertThat(key).matches("templates/[0-9a-f-]{36}\\.pdf");
        assertThat(request.getValue().bucket()).isEqualTo("private-templates");
        assertThat(request.getValue().key()).isEqualTo(key);
        assertThat(request.getValue().contentType()).isEqualTo("application/pdf");
    }

    @Test
    void loadsAndDeletesTheStoredKey() throws Exception {
        S3Client client = mock(S3Client.class);
        S3TemplateFileStorage storage = new S3TemplateFileStorage(client, "private-templates");
        String key = "templates/48eb107f-1cfd-4ea8-94d5-9e33680d8886.pdf";
        when(client.getObjectAsBytes(any(GetObjectRequest.class))).thenReturn(
                ResponseBytes.fromByteArray(GetObjectResponse.builder().build(), "pdf".getBytes()));

        assertThat(storage.load(key)).containsExactly("pdf".getBytes());
        storage.delete(key);

        ArgumentCaptor<GetObjectRequest> getRequest = ArgumentCaptor.forClass(GetObjectRequest.class);
        ArgumentCaptor<DeleteObjectRequest> deleteRequest = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(client).getObjectAsBytes(getRequest.capture());
        verify(client).deleteObject(deleteRequest.capture());
        assertThat(getRequest.getValue().bucket()).isEqualTo("private-templates");
        assertThat(getRequest.getValue().key()).isEqualTo(key);
        assertThat(deleteRequest.getValue().bucket()).isEqualTo("private-templates");
        assertThat(deleteRequest.getValue().key()).isEqualTo(key);
    }

    @Test
    void mapsMissingObjectToNoSuchFileException() {
        S3Client client = mock(S3Client.class);
        S3TemplateFileStorage storage = new S3TemplateFileStorage(client, "private-templates");
        String key = "templates/48eb107f-1cfd-4ea8-94d5-9e33680d8886.pdf";
        when(client.getObjectAsBytes(any(GetObjectRequest.class))).thenThrow(S3Exception.builder().statusCode(404).build());

        assertThatThrownBy(() -> storage.load(key)).isInstanceOf(NoSuchFileException.class);
    }

    @Test
    void rejectsUnsafeFileKeysBeforeCallingS3() {
        S3Client client = mock(S3Client.class);
        S3TemplateFileStorage storage = new S3TemplateFileStorage(client, "private-templates");

        assertThatThrownBy(() -> storage.load("../private.pdf"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("La referencia del archivo no es válida.");
    }
}
