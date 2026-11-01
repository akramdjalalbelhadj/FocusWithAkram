package com.focusflow.finance.dto;

import com.focusflow.finance.AccountType;
import java.util.UUID;

public record AccountRef(UUID id, String name, AccountType type) {
}
