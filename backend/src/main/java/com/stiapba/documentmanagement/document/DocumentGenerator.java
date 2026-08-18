package com.stiapba.documentmanagement.document;

import java.io.IOException;

public interface DocumentGenerator {
    byte[] generate(PermisoGremialData data, byte[] templateContent) throws IOException;
}
