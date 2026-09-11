package com.stiapba.documentmanagement.search;

import com.stiapba.documentmanagement.document.DocumentHistoryDtos.DocumentHistoryResponse;

import java.util.List;
import java.util.UUID;

public final class SearchDtos {
    private SearchDtos() {
    }

    public record SearchResponse(List<DocumentHistoryResponse> documents, List<SearchItem> companies,
                                 List<SearchItem> delegates, List<SearchItem> agreements) {
    }

    public record SearchItem(UUID id, String label, String secondaryLabel) {
    }
}
