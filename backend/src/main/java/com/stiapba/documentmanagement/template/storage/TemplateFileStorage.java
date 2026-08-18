package com.stiapba.documentmanagement.template.storage;

import java.io.IOException;

public interface TemplateFileStorage {
    String store(byte[] content) throws IOException;

    void delete(String fileKey) throws IOException;
}
