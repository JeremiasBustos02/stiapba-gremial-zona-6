package com.stiapba.documentmanagement.document;

import java.time.LocalDate;

record PermisoGremialData(String provinceName, LocalDate issueDate, String companyName, String delegateText,
                          int permitDay, String agreementCode) {
}
