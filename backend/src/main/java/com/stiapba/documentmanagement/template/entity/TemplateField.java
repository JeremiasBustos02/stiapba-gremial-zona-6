package com.stiapba.documentmanagement.template.entity;

import com.stiapba.documentmanagement.common.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "template_fields")
public class TemplateField extends AuditableEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_variant_id", nullable = false)
    private TemplateVariant templateVariant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "field_definition_id", nullable = false)
    private FieldDefinition fieldDefinition;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TemplateFieldMode mode;

    @Column(name = "acro_field_name", length = 255)
    private String acroFieldName;

    @Column(nullable = false)
    private boolean required;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "page_number") private Integer pageNumber;
    @Column private Float x;
    @Column private Float y;
    @Column private Float width;
    @Column private Float height;
    @Column(name = "font_size") private Float fontSize;
    @Column(name = "min_font_size") private Float minFontSize;
    @Column(name = "max_font_size") private Float maxFontSize;
    @Enumerated(EnumType.STRING) @Column(length = 10) private TemplateFieldAlignment alignment;
    @Column private Boolean multiline;

    protected TemplateField() {
    }

    public TemplateField(TemplateVariant templateVariant, FieldDefinition fieldDefinition, TemplateFieldMode mode,
                         String acroFieldName, boolean required, int displayOrder) {
        this.templateVariant = templateVariant;
        this.fieldDefinition = fieldDefinition;
        this.mode = mode;
        this.acroFieldName = acroFieldName;
        this.required = required;
        this.displayOrder = displayOrder;
    }

    public FieldDefinition getFieldDefinition() {
        return fieldDefinition;
    }

    public TemplateVariant getTemplateVariant() { return templateVariant; }

    public TemplateFieldMode getMode() {
        return mode;
    }

    public String getAcroFieldName() {
        return acroFieldName;
    }

    public boolean isRequired() {
        return required;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public Integer getPageNumber() { return pageNumber; }
    public Float getX() { return x; }
    public Float getY() { return y; }
    public Float getWidth() { return width; }
    public Float getHeight() { return height; }
    public Float getFontSize() { return fontSize; }
    public Float getMinFontSize() { return minFontSize; }
    public Float getMaxFontSize() { return maxFontSize; }
    public TemplateFieldAlignment getAlignment() { return alignment; }
    public Boolean getMultiline() { return multiline; }

    public void updatePositioned(FieldDefinition definition, boolean required, int displayOrder, int pageNumber,
                                 float x, float y, float width, float height, float fontSize, float minFontSize,
                                 float maxFontSize, TemplateFieldAlignment alignment, boolean multiline) {
        this.fieldDefinition = definition;
        this.mode = TemplateFieldMode.POSITIONED;
        this.acroFieldName = null;
        this.required = required;
        this.displayOrder = displayOrder;
        this.pageNumber = pageNumber;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.fontSize = fontSize;
        this.minFontSize = minFontSize;
        this.maxFontSize = maxFontSize;
        this.alignment = alignment;
        this.multiline = multiline;
    }

    public void updateAcroform(FieldDefinition definition, boolean required, int displayOrder, String acroFieldName,
                               Float fontSize, Float minFontSize, Float maxFontSize,
                               TemplateFieldAlignment alignment, Boolean multiline) {
        this.fieldDefinition = definition;
        this.mode = TemplateFieldMode.ACROFORM;
        this.acroFieldName = acroFieldName;
        this.required = required;
        this.displayOrder = displayOrder;
        this.pageNumber = null;
        this.x = null;
        this.y = null;
        this.width = null;
        this.height = null;
        this.fontSize = fontSize;
        this.minFontSize = minFontSize;
        this.maxFontSize = maxFontSize;
        this.alignment = alignment;
        this.multiline = multiline;
    }
}
