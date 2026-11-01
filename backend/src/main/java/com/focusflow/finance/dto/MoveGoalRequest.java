package com.focusflow.finance.dto;

/** Deplacement dans la matrice des achats : quadrant et ordre dans le quadrant. */
public record MoveGoalRequest(boolean important, boolean urgent, Integer position) {
}
