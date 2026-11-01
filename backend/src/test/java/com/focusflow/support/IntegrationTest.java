package com.focusflow.support;

import java.time.Clock;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Base des tests d'integration : vrai PostgreSQL embarque (migrations Flyway appliquees), horloge controlable,
 * tables videes avant chaque test.
 */
@SpringBootTest(properties = {
        "focusflow.embedded-postgres.port=0",
        "focusflow.embedded-postgres.data-dir="
})
@AutoConfigureMockMvc
@ActiveProfiles("local")
@Import(IntegrationTest.TestClockConfig.class)
public abstract class IntegrationTest {

    public static final Instant START = Instant.parse("2026-10-30T10:00:00Z");

    @TestConfiguration
    static class TestClockConfig {
        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock(START);
        }
    }

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected JdbcTemplate jdbc;

    @Autowired
    protected MutableClock clock;

    @BeforeEach
    protected void resetState() {
        jdbc.execute("TRUNCATE pomodoro_session, daily_goal, task_execution, subtask, task_tag, task, tag, project RESTART IDENTITY CASCADE");
        jdbc.update("UPDATE user_settings SET time_zone = DEFAULT, week_starts_on = DEFAULT, theme = DEFAULT, "
                + "work_minutes = DEFAULT, short_break_minutes = DEFAULT, long_break_minutes = DEFAULT, "
                + "sessions_before_long = DEFAULT, auto_start_breaks = DEFAULT, auto_start_work = DEFAULT, "
                + "notifications_enabled = DEFAULT, sound_enabled = DEFAULT, sound_name = DEFAULT, "
                + "daily_focus_goal_minutes = DEFAULT, subtasks_complete_parent = DEFAULT, shortcuts_enabled = DEFAULT, "
                + "compact_mode = DEFAULT");
        clock.set(START);
    }

    protected Clock testClock() {
        return clock;
    }
}
