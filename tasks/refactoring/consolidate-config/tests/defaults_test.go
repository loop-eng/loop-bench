package config

import (
	"os"
	"testing"
)

// TestDefaultsWhenNothingConfigured verifies that sensible defaults
// are returned when no config file, env vars, or CLI flags are provided.
func TestDefaultsWhenNothingConfigured(t *testing.T) {
	// Ensure no APP_* env vars are set
	vars := []string{
		"APP_HOST", "APP_PORT", "APP_DEBUG", "APP_LOG_LEVEL",
		"APP_DB_HOST", "APP_DB_PORT", "APP_DB_NAME", "APP_WORKERS",
	}
	for _, v := range vars {
		os.Unsetenv(v)
	}

	// Load with no file and no args
	cfg := LoadConfig("", nil)

	if cfg.Host != "localhost" {
		t.Errorf("default host: expected 'localhost', got '%s'", cfg.Host)
	}
	if cfg.Port != 8080 {
		t.Errorf("default port: expected 8080, got %d", cfg.Port)
	}
	if cfg.Debug != false {
		t.Errorf("default debug: expected false, got %v", cfg.Debug)
	}
	if cfg.LogLevel != "info" {
		t.Errorf("default log_level: expected 'info', got '%s'", cfg.LogLevel)
	}
	if cfg.DBHost != "localhost" {
		t.Errorf("default db_host: expected 'localhost', got '%s'", cfg.DBHost)
	}
	if cfg.DBPort != 5432 {
		t.Errorf("default db_port: expected 5432, got %d", cfg.DBPort)
	}
	if cfg.DBName != "app" {
		t.Errorf("default db_name: expected 'app', got '%s'", cfg.DBName)
	}
	if cfg.Workers != 4 {
		t.Errorf("default workers: expected 4, got %d", cfg.Workers)
	}
}

// TestDefaultsPartialOverride verifies that defaults remain for fields
// not overridden by any source.
func TestDefaultsPartialOverride(t *testing.T) {
	vars := []string{
		"APP_HOST", "APP_PORT", "APP_DEBUG", "APP_LOG_LEVEL",
		"APP_DB_HOST", "APP_DB_PORT", "APP_DB_NAME", "APP_WORKERS",
	}
	for _, v := range vars {
		os.Unsetenv(v)
	}

	// Only override host via CLI, everything else should be defaults
	args := []string{"--host=custom-host"}
	cfg := LoadConfig("", args)

	if cfg.Host != "custom-host" {
		t.Errorf("host: expected 'custom-host', got '%s'", cfg.Host)
	}
	// All other fields should be defaults
	if cfg.Port != 8080 {
		t.Errorf("default port should remain: expected 8080, got %d", cfg.Port)
	}
	if cfg.LogLevel != "info" {
		t.Errorf("default log_level should remain: expected 'info', got '%s'", cfg.LogLevel)
	}
	if cfg.DBHost != "localhost" {
		t.Errorf("default db_host should remain: expected 'localhost', got '%s'", cfg.DBHost)
	}
	if cfg.DBPort != 5432 {
		t.Errorf("default db_port should remain: expected 5432, got %d", cfg.DBPort)
	}
	if cfg.DBName != "app" {
		t.Errorf("default db_name should remain: expected 'app', got '%s'", cfg.DBName)
	}
	if cfg.Workers != 4 {
		t.Errorf("default workers should remain: expected 4, got %d", cfg.Workers)
	}
}

// TestDefaultsEmptyFilePath verifies that an empty file path is handled
// gracefully (no error, defaults used).
func TestDefaultsEmptyFilePath(t *testing.T) {
	vars := []string{
		"APP_HOST", "APP_PORT", "APP_DEBUG", "APP_LOG_LEVEL",
		"APP_DB_HOST", "APP_DB_PORT", "APP_DB_NAME", "APP_WORKERS",
	}
	for _, v := range vars {
		os.Unsetenv(v)
	}

	cfg := LoadConfig("", []string{})

	if cfg.Host != "localhost" {
		t.Errorf("expected default host 'localhost', got '%s'", cfg.Host)
	}
	if cfg.Port != 8080 {
		t.Errorf("expected default port 8080, got %d", cfg.Port)
	}
}

// TestDefaultsMissingFile verifies that a non-existent config file
// is handled gracefully (falls back to defaults, no panic).
func TestDefaultsMissingFile(t *testing.T) {
	vars := []string{
		"APP_HOST", "APP_PORT", "APP_DEBUG", "APP_LOG_LEVEL",
		"APP_DB_HOST", "APP_DB_PORT", "APP_DB_NAME", "APP_WORKERS",
	}
	for _, v := range vars {
		os.Unsetenv(v)
	}

	cfg := LoadConfig("/nonexistent/path/config.conf", nil)

	if cfg.Host != "localhost" {
		t.Errorf("expected default host 'localhost', got '%s'", cfg.Host)
	}
	if cfg.Port != 8080 {
		t.Errorf("expected default port 8080, got %d", cfg.Port)
	}
}
