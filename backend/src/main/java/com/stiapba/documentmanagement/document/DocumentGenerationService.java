package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.agreement.entity.Agreement;
import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.entity.Company;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import com.stiapba.documentmanagement.province.entity.Province;
import com.stiapba.documentmanagement.province.repository.ProvinceRepository;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import com.stiapba.documentmanagement.template.storage.TemplateFileStorage;
import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
public class DocumentGenerationService {
    private static final String PERMISO_GREMIAL_TEMPLATE = "Permiso Gremial";
    private final ProvinceRepository provinceRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final AgreementRepository agreementRepository;
    private final TemplateVariantRepository variantRepository;
    private final TemplateFileStorage fileStorage;
    private final DocumentGenerator generator;

    public DocumentGenerationService(ProvinceRepository provinceRepository, CompanyRepository companyRepository,
                                     UserRepository userRepository, AgreementRepository agreementRepository,
                                     TemplateVariantRepository variantRepository, TemplateFileStorage fileStorage,
                                     DocumentGenerator generator) {
        this.provinceRepository = provinceRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.agreementRepository = agreementRepository;
        this.variantRepository = variantRepository;
        this.fileStorage = fileStorage;
        this.generator = generator;
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
                .filter(value -> value.isActive() && value.getTemplate().isActive()
                        && PERMISO_GREMIAL_TEMPLATE.equals(value.getTemplate().getNombre()))
                .orElseThrow(() -> notFound("TEMPLATE_VARIANT_NOT_FOUND", "No encontramos una variante activa de Permiso Gremial."));
        try {
            byte[] templateContent = fileStorage.load(variant.getFileKey());
            return generator.generate(new PermisoGremialData(province.getName(), request.issueDate(), company.getNombre(),
                    delegate.getNombre() + " " + delegate.getApellido() + " DNI " + delegate.getDni(),
                    request.permitDay(), agreement.getCodigo().trim()), templateContent);
        } catch (DocumentException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new DocumentException(422, "TEMPLATE_FILE_UNAVAILABLE", "No pudimos leer el archivo de la plantilla.");
        }
    }

    private DocumentException notFound(String code, String message) {
        return new DocumentException(404, code, message);
    }
}
