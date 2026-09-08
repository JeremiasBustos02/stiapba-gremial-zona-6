ALTER TABLE template_fields
    ADD COLUMN page_number INTEGER,
    ADD COLUMN x REAL,
    ADD COLUMN y REAL,
    ADD COLUMN width REAL,
    ADD COLUMN height REAL,
    ADD COLUMN font_size REAL,
    ADD COLUMN min_font_size REAL,
    ADD COLUMN max_font_size REAL,
    ADD COLUMN alignment VARCHAR(10),
    ADD COLUMN multiline BOOLEAN;

ALTER TABLE template_fields
    ADD CONSTRAINT ck_template_fields_positioned_values CHECK (
        mode <> 'POSITIONED' OR (
            page_number >= 1 AND x >= 0 AND y >= 0 AND width > 0 AND height > 0
            AND font_size > 0 AND min_font_size > 0 AND max_font_size >= min_font_size
            AND alignment IN ('LEFT', 'CENTER', 'RIGHT') AND multiline IS NOT NULL
        )
    );
