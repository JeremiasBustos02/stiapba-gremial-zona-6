package com.stiapba.documentmanagement.template.storage;

import java.io.IOException;

public interface TemplateFileStorage {
    String store(byte[] content) throws IOException;

    byte[] load(String fileKey) throws IOException;

    void delete(String fileKey) throws IOException;
}
