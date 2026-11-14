package com.focusflow.note;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Efface les idees supprimees dont le delai de 72 heures est ecoule : au demarrage puis toutes les 10 minutes. */
@Component
class NotePurgeJob {

    private final NoteService notes;

    NotePurgeJob(NoteService notes) {
        this.notes = notes;
    }

    @EventListener(ApplicationReadyEvent.class)
    void onStart() {
        notes.purgeExpired();
    }

    @Scheduled(fixedDelayString = "PT10M", initialDelayString = "PT10M")
    void periodic() {
        notes.purgeExpired();
    }
}
