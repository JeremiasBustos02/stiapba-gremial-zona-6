package com.stiapba.documentmanagement.template;

import com.stiapba.documentmanagement.template.entity.FieldDefinition;
import com.stiapba.documentmanagement.template.entity.FieldSourceType;
import com.stiapba.documentmanagement.template.entity.FieldType;
import com.stiapba.documentmanagement.template.repository.FieldDefinitionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FieldDefinitionServiceTest {
    @Mock
    private FieldDefinitionRepository repository;

    @Test
    void createsManualDefinitionWithNormalizedTechnicalKey() {
        when(repository.existsByKey(any())).thenReturn(false);
        when(repository.saveAndFlush(any(FieldDefinition.class))).thenAnswer(invocation -> invocation.getArgument(0));

        new FieldDefinitionService(repository).create(new FieldDefinitionService.FieldDefinitionRequest(
                "Dirección del sector", FieldType.TEXT, FieldSourceType.MANUAL, true));

        ArgumentCaptor<FieldDefinition> definition = ArgumentCaptor.forClass(FieldDefinition.class);
        verify(repository).saveAndFlush(definition.capture());
        assertThat(definition.getValue().getKey()).isEqualTo("direccion_del_sector");
        assertThat(definition.getValue().getLabel()).isEqualTo("Dirección del sector");
    }

    @Test
    void appendsSuffixWhenTechnicalKeyAlreadyExists() {
        when(repository.existsByKey(eq("direccion"))).thenReturn(true);
        when(repository.existsByKey(eq("direccion_2"))).thenReturn(false);
        when(repository.saveAndFlush(any(FieldDefinition.class))).thenAnswer(invocation -> invocation.getArgument(0));

        new FieldDefinitionService(repository).create(new FieldDefinitionService.FieldDefinitionRequest(
                "Dirección", FieldType.TEXT, FieldSourceType.MANUAL, false));

        ArgumentCaptor<FieldDefinition> definition = ArgumentCaptor.forClass(FieldDefinition.class);
        verify(repository).saveAndFlush(definition.capture());
        assertThat(definition.getValue().getKey()).isEqualTo("direccion_2");
    }
}
