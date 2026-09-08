package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.agreement.entity.Agreement;
import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.entity.Company;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import com.stiapba.documentmanagement.province.entity.Province;
import com.stiapba.documentmanagement.province.repository.ProvinceRepository;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.entity.DocumentType;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import com.stiapba.documentmanagement.template.storage.TemplateFileStorage;
import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.format.TextStyle;
import java.util.Map;
import java.util.Locale;

@Service
public class DocumentGenerationService {
    private final ProvinceRepository provinceRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final AgreementRepository agreementRepository;
    private final TemplateVariantRepository variantRepository;
    private final TemplateFileStorage fileStorage;
    private final DocumentGenerator generator;
    private final PdfTemplateRenderer pdfTemplateRenderer;

    public DocumentGenerationService(ProvinceRepository provinceRepository, CompanyRepository companyRepository,
                                      UserRepository userRepository, AgreementRepository agreementRepository,
                                      TemplateVariantRepository variantRepository, TemplateFileStorage fileStorage,
                                      DocumentGenerator generator, PdfTemplateRenderer pdfTemplateRenderer) {
        this.provinceRepository = provinceRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.agreementRepository = agreementRepository;
        this.variantRepository = variantRepository;
        this.fileStorage = fileStorage;
        this.generator = generator;
        this.pdfTemplateRenderer = pdfTemplateRenderer;
    }

    @Transactional
    public byte[] generatePermisoGremial(PermisoGremialRequest request) {
        if (request.permitDay() < 1 || request.permitDay() > 31) {
            throw new DocumentException(400, "INVALID_PERMIT_DAY", "El día de permiso debe estar entre 1 y 31.");
        }
        Province province = provinceRepository.findById(request.provinceId()).filter(Province::isActive)
                .orElseThrow(() -> notFound("PROVINCE_NOT_FOUND", "No encontramos una provincia activa."));
        Company company = companyRepository.findById(request.companyId()).filter(Company::isActive)
                .orElseThrow(() -> notFound("COMPANY_NOT_FOUND", "No encontramos una empresa activa."));
        User delegate = userRepository.findById(request.delegateId())
                .filter(user -> user.isActive() && user.getRole() == Role.DELEGADO)
                .orElseThrow(() -> notFound("DELEGATE_NOT_FOUND", "No encontramos un delegado activo."));
        Agreement agreement = agreementRepository.findById(request.agreementId()).filter(Agreement::isActive)
                .orElseThrow(() -> notFound("AGREEMENT_NOT_FOUND", "No encontramos un convenio activo."));
        if (agreement.getCodigo() == null || agreement.getCodigo().isBlank()) {
            throw new DocumentException(422, "AGREEMENT_CODE_REQUIRED", "El convenio seleccionado no tiene código para imprimir.");
        }
        TemplateVariant variant = variantRepository.findById(request.variantId())
                .filter(value -> value.isActive() && value.getTemplate().isActive())
                .orElseThrow(() -> notFound("TEMPLATE_VARIANT_NOT_FOUND", "No encontramos una variante activa de Permiso Gremial."));
        if (variant.getTemplate().getDocumentType() != DocumentType.PERMISO_GREMIAL) {
            throw new DocumentException(422, "TEMPLATE_DOCUMENT_TYPE_UNSUPPORTED", "La plantilla seleccionada no corresponde a Permiso Gremial.");
        }
        try {
            byte[] templateContent = fileStorage.load(variant.getFileKey());
            if (!variant.getFields().isEmpty()) {
                return pdfTemplateRenderer.render(variant, logicalValues(province, company, delegate, agreement, request), templateContent);
            }
            if (!variant.isLegacyPositioned()) {
                throw new DocumentException(422, "TEMPLATE_FIELDS_NOT_CONFIGURED", "La variante no tiene campos configurados para generar el documento.");
            }
            return generator.generate(new PermisoGremialData(province.getName(), request.issueDate(), company.getNombre(),
                    delegate.getNombre() + " " + delegate.getApellido() + " DNI " + delegate.getDni(),
                    request.permitDay(), agreement.getCodigo().trim()), templateContent);
        } catch (DocumentException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new DocumentException(422, "TEMPLATE_FILE_UNAVAILABLE", "No pudimos leer el archivo de la plantilla.");
        }
    }

    private Map<String, String> logicalValues(Province province, Company company, User delegate, Agreement agreement,
                                              PermisoGremialRequest request) {
        String delegateName = delegate.getNombre() + " " + delegate.getApellido();
        String delegateDni = delegate.getDni();
        return Map.of(
                "province", province.getName(),
                "company", company.getNombre(),
                "delegate", delegateName + " DNI " + delegateDni,
                "delegateDni", delegateDni,
                "agreement", agreement.getCodigo().trim(),
                "issueDay", Integer.toString(request.issueDate().getDayOfMonth()),
                "issueMonth", request.issueDate().getMonth().getDisplayName(TextStyle.FULL, Locale.forLanguageTag("es-AR")),
                "issueYear", String.format("%02d", request.issueDate().getYear() % 100),
                "permitDay", Integer.toString(request.permitDay())
        );
    }

    private DocumentException notFound(String code, String message) {
        return new DocumentException(404, code, message);
    }
}
