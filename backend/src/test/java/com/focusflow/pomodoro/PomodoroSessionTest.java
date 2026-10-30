package com.focusflow.pomodoro;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;

import com.focusflow.common.ApiException;
import org.junit.jupiter.api.Test;

class PomodoroSessionTest {

    private static final Instant T0 = Instant.parse("2026-10-30T10:00:00Z");

    private static PomodoroSession work(int minutes) {
        return new PomodoroSession(SessionType.WORK, minutes * 60, 1, null, T0);
    }

    @Test
    void remainingTimeIsDerivedFromTimestampsNotCounters() {
        PomodoroSession s = work(25);
        // Meme apres une longue absence (onglet en arriere-plan, veille), le calcul reste exact.
        assertThat(s.remainingSeconds(T0.plus(Duration.ofMinutes(10)))).isEqualTo(15 * 60);
        assertThat(s.expectedEndAt()).isEqualTo(T0.plus(Duration.ofMinutes(25)));
    }

    @Test
    void pauseFreezesTimeAndResumeContinuesFromThere() {
        PomodoroSession s = work(25);
        s.pause(T0.plus(Duration.ofMinutes(10)));

        assertThat(s.getStatus()).isEqualTo(SessionStatus.PAUSED);
        assertThat(s.remainingSeconds(T0.plus(Duration.ofHours(5)))).isEqualTo(15 * 60);
        assertThat(s.expectedEndAt()).isNull();

        Instant resumedAt = T0.plus(Duration.ofHours(1));
        s.resume(resumedAt);
        assertThat(s.remainingSeconds(resumedAt.plus(Duration.ofMinutes(5)))).isEqualTo(10 * 60);
        assertThat(s.expectedEndAt()).isEqualTo(resumedAt.plus(Duration.ofMinutes(15)));
    }

    @Test
    void pauseAndResumeAreIdempotent() {
        PomodoroSession s = work(25);
        s.pause(T0.plusSeconds(60));
        s.pause(T0.plusSeconds(500));
        assertThat(s.remainingSeconds(T0.plusSeconds(9999))).isEqualTo(25 * 60 - 60);
        s.resume(T0.plusSeconds(600));
        s.resume(T0.plusSeconds(700));
        assertThat(s.remainingSeconds(T0.plusSeconds(660))).isEqualTo(25 * 60 - 60 - 60);
    }

    @Test
    void cannotCompleteBeforeThePlannedDuration() {
        PomodoroSession s = work(25);
        assertThatThrownBy(() -> s.complete(T0.plus(Duration.ofMinutes(20))))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).code()).isEqualTo("SESSION_NOT_FINISHED");
        assertThat(s.getStatus()).isEqualTo(SessionStatus.RUNNING);
    }

    @Test
    void completeRecordsExactlyThePlannedWorkEvenIfCalledLate() {
        PomodoroSession s = work(25);
        s.complete(T0.plus(Duration.ofHours(3)));

        assertThat(s.getStatus()).isEqualTo(SessionStatus.COMPLETED);
        assertThat(s.getWorkedSeconds()).isEqualTo(25 * 60);
        assertThat(s.getEndedAt()).isEqualTo(T0.plus(Duration.ofMinutes(25)));
    }

    @Test
    void completeIsIdempotentAndNeverDoubleCounts() {
        PomodoroSession s = work(25);
        s.complete(T0.plus(Duration.ofMinutes(26)));
        s.complete(T0.plus(Duration.ofMinutes(60)));
        assertThat(s.getWorkedSeconds()).isEqualTo(25 * 60);
        assertThat(s.getEndedAt()).isEqualTo(T0.plus(Duration.ofMinutes(25)));
    }

    @Test
    void cancelKeepsWorkedTimeButIsNotACompletedSession() {
        PomodoroSession s = work(25);
        s.cancel(T0.plus(Duration.ofMinutes(12)));

        assertThat(s.getStatus()).isEqualTo(SessionStatus.CANCELLED);
        assertThat(s.getWorkedSeconds()).isEqualTo(12 * 60);
        assertThatThrownBy(() -> s.complete(T0.plus(Duration.ofHours(1)))).isInstanceOf(ApiException.class);
    }

    @Test
    void cancelWhilePausedCountsOnlyTimeBeforeThePause() {
        PomodoroSession s = work(25);
        s.pause(T0.plus(Duration.ofMinutes(7)));
        s.cancel(T0.plus(Duration.ofHours(4)));
        assertThat(s.getWorkedSeconds()).isEqualTo(7 * 60);
    }

    @Test
    void expiredRunningSessionSettlesAtItsTheoreticalEnd() {
        PomodoroSession s = work(25);
        assertThat(s.settleIfExpired(T0.plus(Duration.ofMinutes(24)))).isFalse();

        assertThat(s.settleIfExpired(T0.plus(Duration.ofDays(2)))).isTrue();
        assertThat(s.getStatus()).isEqualTo(SessionStatus.COMPLETED);
        assertThat(s.getEndedAt()).isEqualTo(T0.plus(Duration.ofMinutes(25)));
        assertThat(s.getWorkedSeconds()).isEqualTo(25 * 60);
        assertThat(s.settleIfExpired(T0.plus(Duration.ofDays(3)))).isFalse();
    }

    @Test
    void pausedSessionNeverExpires() {
        PomodoroSession s = work(25);
        s.pause(T0.plus(Duration.ofMinutes(1)));
        assertThat(s.settleIfExpired(T0.plus(Duration.ofDays(30)))).isFalse();
        assertThat(s.getStatus()).isEqualTo(SessionStatus.PAUSED);
    }

    @Test
    void breaksNeverCountAsWorkedTime() {
        PomodoroSession s = new PomodoroSession(SessionType.SHORT_BREAK, 300, 1, null, T0);
        s.complete(T0.plusSeconds(300));
        assertThat(s.getWorkedSeconds()).isZero();
    }
}
