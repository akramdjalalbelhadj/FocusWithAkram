package com.focusflow.common;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;

/**
 * Lecture par lots des identifiants deja en base avant un import.
 *
 * <p>Une requete par element (existsById) declenche a chaque fois la synchronisation du contexte de persistance, qui
 * reverifie tout ce qui a deja ete importe dans la transaction : le temps devient quadratique (5 000 operations
 * prenaient plus d'une minute). Ici, une requete par lot de {@value #BATCH} identifiants, avant la boucle d'import.
 */
public final class ExistingIds {

    /** Taille des lots (nombre de parametres d'une requete). */
    public static final int BATCH = 1000;

    private ExistingIds() {
    }

    /**
     * Parmi les identifiants candidats (les {@code null} sont ignores), ceux que {@code finder} trouve en base.
     *
     * @param finder requete « identifiants existants parmi ceux-ci », appelee avec au plus {@value #BATCH} valeurs
     */
    public static Set<UUID> among(Collection<UUID> candidates, Function<List<UUID>, ? extends Collection<UUID>> finder) {
        List<UUID> ids = candidates.stream().filter(Objects::nonNull).distinct().toList();
        Set<UUID> existing = new HashSet<>();
        for (int i = 0; i < ids.size(); i += BATCH) {
            existing.addAll(finder.apply(ids.subList(i, Math.min(ids.size(), i + BATCH))));
        }
        return existing;
    }
}
