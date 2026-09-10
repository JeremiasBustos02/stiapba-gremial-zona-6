CREATE SEQUENCE document_record_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE document_records (
    id UUID PRIMARY KEY,
    public_number VARCHAR(40) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    created_by_user_id UUID NOT NULL,
    created_by_name VARCHAR(201) NOT NULL,
    template_id UUID NOT NULL,
    variant_id UUID NOT NULL,
    issue_date DATE NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    delegate_name VARCHAR(201) NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_document_records_public_number UNIQUE (public_number),
    CONSTRAINT ck_document_records_document_type CHECK (document_type IN ('PERMISO_GREMIAL'))
);

CREATE INDEX idx_document_records_created_by_user_id ON document_records (created_by_user_id);
CREATE INDEX idx_document_records_created_at ON document_records (created_at DESC);
CREATE INDEX idx_document_records_document_type ON document_records (document_type);
