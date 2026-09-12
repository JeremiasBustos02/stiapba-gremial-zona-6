CREATE TABLE monthly_reports (
    id UUID PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL,
    filename VARCHAR(200) NOT NULL,
    storage_key VARCHAR(300) NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_monthly_reports_period_start UNIQUE (period_start),
    CONSTRAINT ck_monthly_reports_period CHECK (period_end = (period_start + INTERVAL '1 month - 1 day')::date),
    CONSTRAINT ck_monthly_reports_status CHECK (status IN ('AVAILABLE'))
);

CREATE INDEX idx_monthly_reports_period_start_desc ON monthly_reports (period_start DESC);
CREATE INDEX idx_document_records_issue_date ON document_records (issue_date);
