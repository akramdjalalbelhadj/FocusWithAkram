package com.focusflow.settings;

import java.util.Map;

import com.focusflow.common.Patch;
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

    public record SettingsResponse(String timeZone, String weekStartsOn, String theme, int workMinutes,
                                   int shortBreakMinutes, int longBreakMinutes, int sessionsBeforeLong,
                                   boolean autoStartBreaks, boolean autoStartWork, boolean notificationsEnabled,
                                   boolean soundEnabled, String soundName, int dailyFocusGoalMinutes,
                                   boolean subtasksCompleteParent, boolean shortcutsEnabled, boolean compactMode) {

        static SettingsResponse from(UserSettings s) {
            return new SettingsResponse(s.getTimeZone(), s.getWeekStartsOn(), s.getTheme(), s.getWorkMinutes(),
                    s.getShortBreakMinutes(), s.getLongBreakMinutes(), s.getSessionsBeforeLong(),
                    s.isAutoStartBreaks(), s.isAutoStartWork(), s.isNotificationsEnabled(), s.isSoundEnabled(),
                    s.getSoundName(), s.getDailyFocusGoalMinutes(), s.isSubtasksCompleteParent(),
                    s.isShortcutsEnabled(), s.isCompactMode());
        }
    }

    @GetMapping
    public SettingsResponse get() {
        return SettingsResponse.from(service.get());
    }

    @PatchMapping
    public SettingsResponse update(@RequestBody Map<String, Object> body) {
        return SettingsResponse.from(service.update(new Patch(body)));
    }
}
