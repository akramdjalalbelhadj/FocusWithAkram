package com.focusflow.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class ExistingIdsTest {

    @Test
    void identifiersAreLookedUpByBatchesIgnoringNullsAndRepeats() {
        List<UUID> candidates = new ArrayList<>(IntStream.range(0, 2_500).mapToObj(i -> UUID.randomUUID()).toList());
        UUID repeated = candidates.getFirst();
        candidates.add(repeated);
        candidates.add(null);
        List<Integer> batchSizes = new ArrayList<>();

        // La « base » contient un identifiant sur deux.
        var existing = ExistingIds.among(candidates, batch -> {
            batchSizes.add(batch.size());
            return batch.stream().filter(id -> candidates.indexOf(id) % 2 == 0).toList();
        });

        assertThat(batchSizes).containsExactly(ExistingIds.BATCH, ExistingIds.BATCH, 500);
        assertThat(existing).hasSize(1_250).contains(repeated);
    }

    @Test
    void noQueryWithoutCandidates() {
        List<UUID> nothing = new ArrayList<>();
        nothing.add(null);
        assertThat(ExistingIds.among(nothing, batch -> {
            throw new AssertionError("aucune requete attendue");
        })).isEmpty();
    }
}
