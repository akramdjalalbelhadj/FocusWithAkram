package com.focusflow.finance.dto;

import jakarta.validation.constraints.Size;

/** Regularisation : abandon explicite du reste du, avec un motif facultatif. */
public record WriteOffRequest(@Size(max = 500, message = "500 caracteres maximum.") String reason) {
}
