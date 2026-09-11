package com.stiapba.documentmanagement.document;

import java.util.List;
import java.util.UUID;

public final class DocumentSuggestionDtos {
    private DocumentSuggestionDtos() {
    }

    public record SuggestionItem(UUID id, String label) {
    }

    public record SuggestionCategory(List<SuggestionItem> recent, List<SuggestionItem> frequent) {
    }

    public record DocumentSuggestionsResponse(SuggestionCategory companies, SuggestionCategory delegates,
                                              SuggestionCategory agreements) {
    }
}
