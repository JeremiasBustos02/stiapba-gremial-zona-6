ALTER TABLE companies ADD COLUMN agreement_id UUID;

ALTER TABLE companies
    ADD CONSTRAINT fk_companies_agreement
        FOREIGN KEY (agreement_id) REFERENCES agreements (id);

CREATE INDEX idx_companies_agreement_id ON companies (agreement_id);

DO $$
DECLARE
    agreement_771_10 UUID;
    agreement_372_02 UUID;
    agreement_783_20 UUID;
    agreement_244_94 UUID;
BEGIN
    IF (SELECT count(*) FROM agreements WHERE codigo IN ('771/10', '372/02', '783/20', '244/94'))
        <> (SELECT count(DISTINCT codigo) FROM agreements WHERE codigo IN ('771/10', '372/02', '783/20', '244/94')) THEN
        RAISE EXCEPTION 'No se pueden asociar empresas: existen códigos de convenio duplicados.';
    END IF;

    IF (SELECT count(*) FROM companies WHERE nombre IN ('INFRIBA', 'PESCADERIA VICTORIA', 'SURANO S.A.'))
        <> (SELECT count(DISTINCT nombre) FROM companies WHERE nombre IN ('INFRIBA', 'PESCADERIA VICTORIA', 'SURANO S.A.')) THEN
        RAISE EXCEPTION 'No se pueden asociar empresas: existen nombres de empresa duplicados.';
    END IF;

    SELECT id INTO agreement_771_10 FROM agreements WHERE codigo = '771/10';
    SELECT id INTO agreement_372_02 FROM agreements WHERE codigo = '372/02';
    SELECT id INTO agreement_783_20 FROM agreements WHERE codigo = '783/20';
    SELECT id INTO agreement_244_94 FROM agreements WHERE codigo = '244/94';

    UPDATE companies SET agreement_id = agreement_771_10
    WHERE nombre = 'INFRIBA' AND agreement_771_10 IS NOT NULL;

    UPDATE companies SET agreement_id = agreement_372_02
    WHERE nombre = 'PESCADERIA VICTORIA' AND agreement_372_02 IS NOT NULL;

    UPDATE companies SET agreement_id = agreement_783_20
    WHERE nombre = 'SURANO S.A.' AND agreement_783_20 IS NOT NULL;

    UPDATE companies SET agreement_id = agreement_244_94
    WHERE nombre NOT IN ('INFRIBA', 'PESCADERIA VICTORIA', 'SURANO S.A.')
      AND agreement_244_94 IS NOT NULL;
END $$;
