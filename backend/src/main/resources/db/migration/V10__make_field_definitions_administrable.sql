ALTER TABLE field_definitions
    ADD COLUMN label VARCHAR(200),
    ADD COLUMN field_type VARCHAR(20),
    ADD COLUMN source_type VARCHAR(20),
    ADD COLUMN required BOOLEAN,
    ADD COLUMN active BOOLEAN;

UPDATE field_definitions SET
    label = CASE field_key
        WHEN 'province' THEN 'Provincia'
        WHEN 'issueDay' THEN 'Día de la fecha'
        WHEN 'issueMonth' THEN 'Mes de la fecha'
        WHEN 'issueYear' THEN 'Año de la fecha'
        WHEN 'company' THEN 'Empresa'
        WHEN 'delegate' THEN 'Delegado'
        WHEN 'delegateDni' THEN 'DNI del delegado'
        WHEN 'permitDay' THEN 'Día de permiso gremial'
        WHEN 'agreement' THEN 'Convenio'
        ELSE field_key
    END,
    field_type = CASE WHEN field_key = 'permitDay' THEN 'NUMBER' ELSE 'TEXT' END,
    source_type = CASE field_key
        WHEN 'province' THEN 'PROVINCE'
        WHEN 'company' THEN 'COMPANY'
        WHEN 'delegate' THEN 'DELEGATE'
        WHEN 'delegateDni' THEN 'DELEGATE'
        WHEN 'agreement' THEN 'AGREEMENT'
        WHEN 'issueDay' THEN 'DERIVED'
        WHEN 'issueMonth' THEN 'DERIVED'
        WHEN 'issueYear' THEN 'DERIVED'
        WHEN 'permitDay' THEN 'DERIVED'
        ELSE 'MANUAL'
    END,
    required = TRUE,
    active = TRUE;

ALTER TABLE field_definitions
    ALTER COLUMN label SET NOT NULL,
    ALTER COLUMN field_type SET NOT NULL,
    ALTER COLUMN source_type SET NOT NULL,
    ALTER COLUMN required SET NOT NULL,
    ALTER COLUMN active SET NOT NULL,
    ADD CONSTRAINT ck_field_definitions_type CHECK (field_type IN ('TEXT', 'DATE', 'NUMBER')),
    ADD CONSTRAINT ck_field_definitions_source CHECK (source_type IN ('MANUAL', 'COMPANY', 'DELEGATE', 'PROVINCE', 'AGREEMENT', 'DERIVED'));

ALTER TABLE template_fields DROP CONSTRAINT uk_template_fields_variant_definition;
CREATE UNIQUE INDEX uk_template_fields_variant_acroform_name
    ON template_fields (template_variant_id, acro_field_name)
    WHERE mode = 'ACROFORM';
