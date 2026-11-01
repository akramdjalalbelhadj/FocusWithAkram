package com.focusflow.search.controller;

import com.focusflow.search.dto.SearchResponse;
import com.focusflow.search.service.SearchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Point d'entree HTTP de la recherche globale. */
@RestController
@RequestMapping("/api/v1/search")
public class SearchController {
    private final SearchService service;

    public SearchController(SearchService service) {
        this.service = service;
    }

    @GetMapping
    public SearchResponse search(@RequestParam(defaultValue = "") String q) {
        return service.search(q);
    }
}
