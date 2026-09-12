package com.stiapba.documentmanagement.report.storage;

import java.io.IOException;

public interface ReportFileStorage {
    void store(String fileKey, byte[] content) throws IOException;
    byte[] load(String fileKey) throws IOException;
    void delete(String fileKey) throws IOException;
}
