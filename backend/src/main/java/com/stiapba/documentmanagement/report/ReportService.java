package com.stiapba.documentmanagement.report;

import com.stiapba.documentmanagement.agreement.entity.Agreement;
import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.entity.Company;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import com.stiapba.documentmanagement.document.DocumentException;
import com.stiapba.documentmanagement.document.DocumentHistoryService;
import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.document.repository.DocumentRecordRepository;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ReportService {
    private final DocumentRecordRepository documents;
    private final CompanyRepository companies;
    private final AgreementRepository agreements;
    private final UserRepository users;

    public ReportService(DocumentRecordRepository documents, CompanyRepository companies, AgreementRepository agreements, UserRepository users) {
        this.documents = documents; this.companies = companies; this.agreements = agreements; this.users = users;
    }

    public ReportDtos.ReportSummary summary(UserPrincipal principal, LocalDate from, LocalDate to) {
        List<DocumentRecord> records = records(principal, from, to);
        return summary(from, to, records);
    }

    public byte[] exportReport(UserPrincipal principal, LocalDate from, LocalDate to) {
        List<DocumentRecord> records = records(principal, from, to);
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            CellStyle header = header(workbook);
            ReportDtos.ReportSummary summary = summary(from, to, records);
            var sheet = workbook.createSheet("Resumen");
            String[][] values = {{"Reporte de actividad", ""}, {"Período", from + " a " + to}, {"Total documentos", String.valueOf(summary.totalDocuments())}, {"Delegados involucrados", String.valueOf(summary.uniqueDelegates())}, {"Empresas", String.valueOf(summary.uniqueCompanies())}, {"Convenios", String.valueOf(summary.uniqueAgreements())}, {"Fecha de generación", LocalDate.now().toString()}};
            for (int index = 0; index < values.length; index++) { var row = sheet.createRow(index); text(row.createCell(0), values[index][0]); text(row.createCell(1), values[index][1]); }
            sheet.setColumnWidth(0, 28 * 256); sheet.setColumnWidth(1, 28 * 256);
            documentSheet(workbook, header, records);
            activitySheet(workbook, header, "Empresas", records, this::companyKey, "Empresa", "Cantidad de delegados distintos");
            activitySheet(workbook, header, "Delegados", records, this::delegateKey, "Delegado", "Cantidad de empresas distintas");
            activitySheet(workbook, header, "Convenios", records, this::agreementKey, "Convenio", "Cantidad de empresas distintas");
            workbook.write(output); return output.toByteArray();
        } catch (IOException exception) { throw new DocumentException(500, "REPORT_EXPORT_FAILED", "No pudimos generar el reporte."); }
    }

    public byte[] exportCatalog(UserPrincipal principal, String catalog) {
        requireAdmin(principal);
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            CellStyle header = header(workbook);
            switch (catalog) {
                case "companies" -> catalogSheet(workbook, header, "Empresas", new String[]{"Nombre", "Convenio predeterminado", "Estado", "Fecha de creación"}, companies.findAll((Specification<Company>) null, Sort.by("nombre")), company -> new String[]{company.getNombre(), company.getAgreement() == null ? "" : agreementLabel(company.getAgreement()), state(company.isActive()), date(company.getCreatedAt())});
                case "delegates" -> catalogSheet(workbook, header, "Delegados", new String[]{"Nombre", "DNI", "Estado", "Fecha de creación"}, users.findAll(Sort.by("apellido", "nombre")).stream().filter(user -> user.getRole() == Role.DELEGADO).toList(), user -> new String[]{fullName(user), user.getDni(), state(user.isActive()), date(user.getCreatedAt())});
                case "agreements" -> catalogSheet(workbook, header, "Convenios", new String[]{"Código", "Descripción", "Estado", "Fecha de creación"}, agreements.findAll(Sort.by("codigo")), agreement -> new String[]{agreement.getCodigo(), agreement.getDescripcion(), state(agreement.isActive()), date(agreement.getCreatedAt())});
                case "users" -> catalogSheet(workbook, header, "Usuarios", new String[]{"Nombre", "DNI", "Rol", "Estado", "Fecha de creación"}, users.findAll(Sort.by("apellido", "nombre")), user -> new String[]{fullName(user), user.getDni(), user.getRole().name(), state(user.isActive()), date(user.getCreatedAt())});
                default -> throw new DocumentException(404, "EXPORT_NOT_FOUND", "No encontramos la exportación solicitada.");
            }
            workbook.write(output); return output.toByteArray();
        } catch (IOException exception) { throw new DocumentException(500, "CATALOG_EXPORT_FAILED", "No pudimos generar la exportación."); }
    }

    private List<DocumentRecord> records(UserPrincipal principal, LocalDate from, LocalDate to) {
        requireAdmin(principal);
        if (from == null || to == null || from.isAfter(to)) throw new DocumentException(400, "INVALID_DATE_RANGE", "La fecha desde no puede ser posterior a la fecha hasta.");
        Specification<DocumentRecord> specification = (root, query, builder) -> builder.between(root.get("issueDate"), from, to);
        return documents.findAll(specification, Sort.by("issueDate").ascending().and(Sort.by("createdAt").ascending()));
    }

    private ReportDtos.ReportSummary summary(LocalDate from, LocalDate to, List<DocumentRecord> records) {
        return new ReportDtos.ReportSummary(from, to, records.size(), distinct(records, this::delegateKey).size(), distinct(records, this::companyKey).size(), distinct(records, this::agreementKey).size());
    }

    private void documentSheet(XSSFWorkbook workbook, CellStyle header, List<DocumentRecord> records) {
        var sheet = workbook.createSheet("Documentos"); String[] headings = {"Número", "Tipo", "Fecha", "Empresa", "Delegado", "DNI", "Convenio", "Generado por", "Fecha de generación"}; headings(sheet, header, headings);
        int row = 1; for (DocumentRecord record : records) { var cells = sheet.createRow(row++); Map<String, String> snapshot = record.getSnapshot(); text(cells.createCell(0), record.getPublicNumber()); text(cells.createCell(1), record.getDocumentType().name()); text(cells.createCell(2), record.getIssueDate().toString()); text(cells.createCell(3), record.getCompanyName()); text(cells.createCell(4), record.getDelegateName()); text(cells.createCell(5), snapshot.get("delegateDni")); text(cells.createCell(6), snapshot.getOrDefault("agreementCode", snapshot.get("agreement"))); text(cells.createCell(7), record.getCreatedByName()); text(cells.createCell(8), date(record.getCreatedAt())); }
        finish(sheet, headings.length, row);
    }

    private void activitySheet(XSSFWorkbook workbook, CellStyle header, String sheetName, List<DocumentRecord> records, Function<DocumentRecord, String> key, String label, String distinctLabel) {
        var sheet = workbook.createSheet(sheetName); String[] headings = {label, "Cantidad de documentos", distinctLabel, "Último documento del período"}; headings(sheet, header, headings);
        Map<String, List<DocumentRecord>> grouped = records.stream().filter(record -> key.apply(record) != null).collect(Collectors.groupingBy(key, LinkedHashMap::new, Collectors.toList()));
        List<Map.Entry<String, List<DocumentRecord>>> rows = grouped.entrySet().stream().sorted((a, b) -> { int count = Integer.compare(b.getValue().size(), a.getValue().size()); return count != 0 ? count : a.getKey().compareToIgnoreCase(b.getKey()); }).toList();
        int row = 1; for (var entry : rows) { var cells = sheet.createRow(row++); List<DocumentRecord> documents = entry.getValue(); text(cells.createCell(0), sheetName.equals("Delegados") ? delegateLabel(entry.getKey()) : entry.getKey()); cells.createCell(1).setCellValue(documents.size()); cells.createCell(2).setCellValue(distinct(documents, sheetName.equals("Empresas") ? this::delegateKey : this::companyKey).size()); text(cells.createCell(3), documents.stream().map(DocumentRecord::getIssueDate).max(LocalDate::compareTo).map(LocalDate::toString).orElse("")); }
        finish(sheet, headings.length, row);
    }

    private <T> void catalogSheet(XSSFWorkbook workbook, CellStyle header, String name, String[] columns, List<T> items, Function<T, String[]> values) { var sheet = workbook.createSheet(name); headings(sheet, header, columns); int row = 1; for (T item : items) { var cells = sheet.createRow(row++); String[] rowValues = values.apply(item); for (int column = 0; column < rowValues.length; column++) text(cells.createCell(column), rowValues[column]); } finish(sheet, columns.length, row); }
    private void headings(org.apache.poi.ss.usermodel.Sheet sheet, CellStyle style, String[] values) { var row = sheet.createRow(0); for (int column = 0; column < values.length; column++) { var cell = row.createCell(column); text(cell, values[column]); cell.setCellStyle(style); } }
    private void finish(org.apache.poi.ss.usermodel.Sheet sheet, int columns, int rows) { sheet.setAutoFilter(new CellRangeAddress(0, Math.max(0, rows - 1), 0, columns - 1)); sheet.createFreezePane(0, 1); for (int column = 0; column < columns; column++) sheet.setColumnWidth(column, 24 * 256); }
    private CellStyle header(XSSFWorkbook workbook) { CellStyle style = workbook.createCellStyle(); style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex()); style.setFillPattern(FillPatternType.SOLID_FOREGROUND); var font = workbook.createFont(); font.setBold(true); font.setColor(IndexedColors.WHITE.getIndex()); style.setFont(font); return style; }
    private void text(org.apache.poi.ss.usermodel.Cell cell, String value) { cell.setCellValue(DocumentHistoryService.safeExcelText(value)); }
    private Set<String> distinct(List<DocumentRecord> records, Function<DocumentRecord, String> key) { return records.stream().map(key).filter(java.util.Objects::nonNull).collect(Collectors.toSet()); }
    private String companyKey(DocumentRecord record) { String value = record.getSnapshot().getOrDefault("companyName", record.getCompanyName()); return blank(value); }
    private String agreementKey(DocumentRecord record) { return blank(record.getSnapshot().getOrDefault("agreementCode", record.getSnapshot().get("agreement"))); }
    private String delegateKey(DocumentRecord record) { Map<String, String> snapshot = record.getSnapshot(); String name = blank(snapshot.getOrDefault("delegateName", record.getDelegateName())); String id = blank(snapshot.get("delegateId")); if (id != null) return id + "\u0000" + (name == null ? "" : name); String dni = blank(snapshot.get("delegateDni")); if (dni != null) return dni + "\u0000" + (name == null ? "" : name); return name == null ? null : name.toLowerCase() + "\u0000" + name; }
    private String delegateLabel(String key) { int separator = key.indexOf('\u0000'); return separator < 0 ? key : key.substring(separator + 1); }
    private String blank(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private String fullName(User user) { return user.getNombre() + " " + user.getApellido(); }
    private String agreementLabel(Agreement agreement) { return agreement.getCodigo() == null || agreement.getCodigo().isBlank() ? agreement.getDescripcion() : agreement.getCodigo() + " - " + agreement.getDescripcion(); }
    private String state(boolean active) { return active ? "Activo" : "Inactivo"; }
    private String date(java.time.OffsetDateTime value) { return value == null ? "" : value.toLocalDate().toString(); }
    private void requireAdmin(UserPrincipal principal) { if (principal == null || principal.role() != Role.ADMIN) throw new DocumentException(403, "REPORTS_FORBIDDEN", "No tenés permisos para acceder a reportes."); }
}
