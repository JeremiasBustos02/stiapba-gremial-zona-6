ALTER TABLE templates
    ADD COLUMN document_type VARCHAR(50) NOT NULL DEFAULT 'PERMISO_GREMIAL';

ALTER TABLE template_variants
    ADD COLUMN legacy_positioned BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE template_variants v
SET legacy_positioned = TRUE
FROM templates t
WHERE v.template_id = t.id
  AND t.nombre = 'Permiso Gremial'
  AND v.nombre = 'Bruna'
  AND NOT EXISTS (SELECT 1 FROM template_fields f WHERE f.template_variant_id = v.id);
