CREATE TABLE users (
    id UUID PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    dni VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    first_login BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_users_dni UNIQUE (dni),
    CONSTRAINT ck_users_role CHECK (role IN ('ADMIN', 'DELEGADO'))
);

CREATE INDEX idx_users_active ON users (active);
CREATE INDEX idx_users_role ON users (role);

CREATE TABLE companies (
    id UUID PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_companies_active ON companies (active);

CREATE TABLE agreements (
    id UUID PRIMARY KEY,
    codigo VARCHAR(50),
    descripcion VARCHAR(500) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_agreements_active ON agreements (active);

CREATE TABLE templates (
    id UUID PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_templates_active ON templates (active);

CREATE TABLE template_variants (
    id UUID PRIMARY KEY,
    template_id UUID NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    file_key VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_template_variants_template
        FOREIGN KEY (template_id) REFERENCES templates (id)
);

CREATE INDEX idx_template_variants_template_id ON template_variants (template_id);
CREATE INDEX idx_template_variants_active ON template_variants (active);
