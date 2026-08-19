package com.stiapba.documentmanagement.template.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

import java.net.URI;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "app.template", name = "storage-type", havingValue = "s3")
public class S3TemplateStorageConfiguration {

    @Bean(destroyMethod = "close")
    S3Client templateS3Client(
            @Value("${app.template.s3.endpoint}") String endpoint,
            @Value("${app.template.s3.region}") String region,
            @Value("${app.template.s3.access-key}") String accessKey,
            @Value("${app.template.s3.secret-key}") String secretKey
    ) {
        return S3Client.builder()
                .endpointOverride(URI.create(required("S3_ENDPOINT", endpoint)))
                .region(Region.of(required("S3_REGION", region)))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(
                        required("S3_ACCESS_KEY", accessKey), required("S3_SECRET_KEY", secretKey))))
                .forcePathStyle(true)
                .build();
    }

    @Bean
    TemplateFileStorage s3TemplateFileStorage(
            S3Client templateS3Client,
            @Value("${app.template.s3.bucket}") String bucket
    ) {
        return new S3TemplateFileStorage(templateS3Client, required("S3_BUCKET", bucket));
    }

    private String required(String name, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " debe configurarse cuando TEMPLATE_STORAGE_TYPE=s3.");
        }
        return value;
    }
}
