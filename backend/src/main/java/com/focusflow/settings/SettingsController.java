package com.focusflow.settings;

import com.focusflow.settings.dto.SettingsResponse;
import com.focusflow.settings.dto.UpdateSettingsRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/settings")
public class SettingsController {

    private final SettingsService service;

    public SettingsController(SettingsService service) {
        this.service = service;
    }

    @GetMapping
    public SettingsResponse get() {
        return SettingsMapper.toResponse(service.get());
    }

    @PatchMapping
    public SettingsResponse update(@RequestBody UpdateSettingsRequest request) {
        return SettingsMapper.toResponse(service.update(request.toPatch()));
    }
}
