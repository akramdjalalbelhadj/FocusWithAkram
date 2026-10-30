package com.focusflow.settings;

import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.ZoneId;
import java.util.Set;

import com.focusflow.common.ApiException;
import com.focusflow.common.Patch;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsService {

    private static final Set<String> THEMES = Set.of("LIGHT", "DARK", "SYSTEM");
    private static final Set<String> SOUNDS = Set.of("bell", "chime", "soft");

    private final SettingsRepository repository;

    public SettingsService(SettingsRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public UserSettings get() {
        return repository.findById(UserSettings.SINGLETON_ID)
                .orElseThrow(() -> ApiException.notFound("Parametres", UserSettings.SINGLETON_ID));
    }

    @Transactional(readOnly = true)
    public ZoneId zone() {
        return ZoneId.of(get().getTimeZone());
    }

    @Transactional(readOnly = true)
    public DayOfWeek weekStart() {
        return DayOfWeek.valueOf(get().getWeekStartsOn());
    }

    @Transactional
    public UserSettings update(Patch p) {
        UserSettings s = get();
        if (p.has("timeZone")) {
            String tz = p.string("timeZone");
            try {
                ZoneId.of(tz);
            } catch (DateTimeException | NullPointerException e) {
                throw new IllegalArgumentException("Fuseau horaire invalide : " + tz);
            }
            s.setTimeZone(tz);
        }
        if (p.has("weekStartsOn")) {
            String d = String.valueOf(p.string("weekStartsOn"));
            if (!d.equals("MONDAY") && !d.equals("SUNDAY") && !d.equals("SATURDAY")) {
                throw new IllegalArgumentException("Premier jour de la semaine invalide : " + d);
            }
            s.setWeekStartsOn(d);
        }
        if (p.has("theme")) {
            String t = String.valueOf(p.string("theme"));
            if (!THEMES.contains(t)) {
                throw new IllegalArgumentException("Theme invalide : " + t);
            }
            s.setTheme(t);
        }
        if (p.has("soundName")) {
            String n = String.valueOf(p.string("soundName"));
            if (!SOUNDS.contains(n)) {
                throw new IllegalArgumentException("Son invalide : " + n);
            }
            s.setSoundName(n);
        }
        if (p.has("workMinutes")) {
            s.setWorkMinutes(range("workMinutes", p.integer("workMinutes"), 1, 180));
        }
        if (p.has("shortBreakMinutes")) {
            s.setShortBreakMinutes(range("shortBreakMinutes", p.integer("shortBreakMinutes"), 1, 60));
        }
        if (p.has("longBreakMinutes")) {
            s.setLongBreakMinutes(range("longBreakMinutes", p.integer("longBreakMinutes"), 1, 120));
        }
        if (p.has("sessionsBeforeLong")) {
            s.setSessionsBeforeLong(range("sessionsBeforeLong", p.integer("sessionsBeforeLong"), 1, 12));
        }
        if (p.has("dailyFocusGoalMinutes")) {
            s.setDailyFocusGoalMinutes(range("dailyFocusGoalMinutes", p.integer("dailyFocusGoalMinutes"), 0, 720));
        }
        if (p.has("autoStartBreaks")) s.setAutoStartBreaks(Boolean.TRUE.equals(p.bool("autoStartBreaks")));
        if (p.has("autoStartWork")) s.setAutoStartWork(Boolean.TRUE.equals(p.bool("autoStartWork")));
        if (p.has("notificationsEnabled")) s.setNotificationsEnabled(Boolean.TRUE.equals(p.bool("notificationsEnabled")));
        if (p.has("soundEnabled")) s.setSoundEnabled(Boolean.TRUE.equals(p.bool("soundEnabled")));
        if (p.has("subtasksCompleteParent")) s.setSubtasksCompleteParent(Boolean.TRUE.equals(p.bool("subtasksCompleteParent")));
        if (p.has("shortcutsEnabled")) s.setShortcutsEnabled(Boolean.TRUE.equals(p.bool("shortcutsEnabled")));
        if (p.has("compactMode")) s.setCompactMode(Boolean.TRUE.equals(p.bool("compactMode")));
        return s;
    }

    private static int range(String field, Integer value, int min, int max) {
        if (value == null || value < min || value > max) {
            throw new IllegalArgumentException(field + " doit etre compris entre " + min + " et " + max + ".");
        }
        return value;
    }
}
