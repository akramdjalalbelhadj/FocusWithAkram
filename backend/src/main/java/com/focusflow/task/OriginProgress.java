package com.focusflow.task;

/** Avancement des taches issues d'une meme idee : nombre total et nombre de taches terminees. */
public record OriginProgress(long total, long done) {
}
