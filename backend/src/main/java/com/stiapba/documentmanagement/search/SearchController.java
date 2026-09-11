package com.stiapba.documentmanagement.search;

import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.search.SearchDtos.SearchResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
public class SearchController {
    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public SearchResponse search(@RequestParam String q, @AuthenticationPrincipal UserPrincipal principal) {
        return searchService.search(q, principal);
    }
}
