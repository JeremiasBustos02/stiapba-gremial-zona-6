CREATE TABLE field_definitions (
    id UUID PRIMARY KEY,
    field_key VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_field_definitions_key UNIQUE (field_key)
);

CREATE TABLE template_fields (
    id UUID PRIMARY KEY,
    template_variant_id UUID NOT NULL,
    field_definition_id UUID NOT NULL,
    mode VARCHAR(20) NOT NULL,
    acro_field_name VARCHAR(255),
    required BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_template_fields_variant
        FOREIGN KEY (template_variant_id) REFERENCES template_variants (id),
    CONSTRAINT fk_template_fields_definition
        FOREIGN KEY (field_definition_id) REFERENCES field_definitions (id),
    CONSTRAINT ck_template_fields_mode CHECK (mode IN ('ACROFORM', 'POSITIONED')),
    CONSTRAINT ck_template_fields_acroform_name CHECK (
        mode <> 'ACROFORM' OR acro_field_name IS NOT NULL
    ),
    CONSTRAINT uk_template_fields_variant_definition UNIQUE (template_variant_id, field_definition_id)
);

CREATE INDEX idx_template_fields_variant ON template_fields (template_variant_id);
