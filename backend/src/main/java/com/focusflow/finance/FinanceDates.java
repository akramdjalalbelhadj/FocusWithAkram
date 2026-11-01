package com.focusflow.finance;

import com.focusflow.settings.SettingsService;
import java.time.Clock;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

/** Date du jour dans le fuseau de l'utilisateur : reference des statuts (realise, en retard) et des mois. */
@Component
public class FinanceDates {

    private final Clock clock;
    private final SettingsService settings;

    public FinanceDates(Clock clock, SettingsService settings) {
        this.clock = clock;
        this.settings = settings;
    }

    public LocalDate today() {
        return LocalDate.now(clock.withZone(settings.zone()));
    }
}
