package com.focusflow.support;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/** Horloge controlable pour tester le temps (sessions, retards, fuseaux) de facon deterministe. */
public class MutableClock extends Clock {

    private volatile Instant instant;
    private final ZoneId zone;

    public MutableClock(Instant start) {
        this(start, ZoneOffset.UTC);
    }

    private MutableClock(Instant start, ZoneId zone) {
        this.instant = start;
        this.zone = zone;
    }

    public void set(Instant instant) {
        this.instant = instant;
    }

    public void advance(Duration duration) {
        this.instant = instant.plus(duration);
    }

    @Override
    public ZoneId getZone() {
        return zone;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        // Vue liee a l'horloge d'origine : suit set() / advance().
        MutableClock parent = this;
        return new Clock() {
            @Override
            public ZoneId getZone() {
                return zone;
            }

            @Override
            public Clock withZone(ZoneId other) {
                return parent.withZone(other);
            }

            @Override
            public Instant instant() {
                return parent.instant();
            }
        };
    }

    @Override
    public Instant instant() {
        return instant;
    }
}
