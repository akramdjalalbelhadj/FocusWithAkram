package com.focusflow.settings.repository;

import com.focusflow.settings.entity.UserSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettingsRepository extends JpaRepository<UserSettings, Short> {
}
