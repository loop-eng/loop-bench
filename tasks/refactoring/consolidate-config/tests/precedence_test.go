package config

import (
	"os"
	"path/filepath"
	"testing"
)

// TestCLIOverridesEnv verifies that CLI flags take precedence over
// environment variables when both provide the same field.
func TestCLIOverridesEnv(t *testing.T) {
	// Clean env before test
	clearConfigEnv(t)

	os.Setenv("APP_HOST", "env-host")
	os.Setenv("APP_PORT", "9090")
	defer os.Unsetenv("APP_HOST")
	defer os.Unsetenv("APP_PORT")

	args := []string{"--host=cli-host"}

	cfg := LoadConfig("", args)

	if cfg.Host != "cli-host" {
		t.Errorf("CLI should override env: expected host 'cli-host', got '%s'", cfg.Host)
	}
	// Port should come from env since no CLI flag for port
	if cfg.Port != 9090 {
		t.Errorf("env should provide port when CLI does not: expected 9090, got %d", cfg.Port)
	}
}

// TestEnvOverridesFile verifies that environment variables take
// precedence over config file values.
func TestEnvOverridesFile(t *testing.T) {
	clearConfigEnv(t)

	dir := t.TempDir()
	path := filepath.Join(dir, "config.conf")
	content := "host = file-host\nport = 7070\ndb_name = filedb\n"
	os.WriteFile(path, []byte(content), 0644)

	os.Setenv("APP_HOST", "env-host")
	defer os.Unsetenv("APP_HOST")

	cfg := LoadConfig(path, nil)

	if cfg.Host != "env-host" {
		t.Errorf("env should override file: expected host 'env-host', got '%s'", cfg.Host)
	}
	// Port should come from file since env doesn't set it
	if cfg.Port != 7070 {
		t.Errorf("file should provide port when env does not: expected 7070, got %d", cfg.Port)
	}
	// DBName should come from file
	if cfg.DBName != "filedb" {
		t.Errorf("file should provide db_name: expected 'filedb', got '%s'", cfg.DBName)
	}
}

// TestCLIOverridesFileAndEnv verifies full three-layer precedence:
// CLI > env > file.
func TestCLIOverridesFileAndEnv(t *testing.T) {
	clearConfigEnv(t)

	dir := t.TempDir()
	path := filepath.Join(dir, "config.conf")
	content := "host = file-host\nport = 7070\nlog_level = file-warn\n"
	os.WriteFile(path, []byte(content), 0644)

	os.Setenv("APP_HOST", "env-host")
	os.Setenv("APP_PORT", "9090")
	defer os.Unsetenv("APP_HOST")
	defer os.Unsetenv("APP_PORT")

	args := []string{"--host=cli-host"}

	cfg := LoadConfig(path, args)

	// Host: CLI wins over env and file
	if cfg.Host != "cli-host" {
		t.Errorf("CLI should override all: expected host 'cli-host', got '%s'", cfg.Host)
	}
	// Port: env wins over file (CLI not set)
	if cfg.Port != 9090 {
		t.Errorf("env should override file: expected port 9090, got %d", cfg.Port)
	}
	// LogLevel: file provides it (env and CLI not set)
	if cfg.LogLevel != "file-warn" {
		t.Errorf("file should provide log_level: expected 'file-warn', got '%s'", cfg.LogLevel)
	}
}

// TestCLIOverridesAllFields tests precedence for every supported field.
func TestCLIOverridesAllFields(t *testing.T) {
	clearConfigEnv(t)

	dir := t.TempDir()
	path := filepath.Join(dir, "config.conf")
	content := "host = file-host\nport = 1111\ndb_host = file-db\ndb_port = 2222\ndb_name = filedb\nworkers = 2\n"
	os.WriteFile(path, []byte(content), 0644)

	os.Setenv("APP_HOST", "env-host")
	os.Setenv("APP_PORT", "3333")
	os.Setenv("APP_DB_HOST", "env-db")
	os.Setenv("APP_DB_PORT", "4444")
	defer os.Unsetenv("APP_HOST")
	defer os.Unsetenv("APP_PORT")
	defer os.Unsetenv("APP_DB_HOST")
	defer os.Unsetenv("APP_DB_PORT")

	args := []string{"--host=cli-host", "--port=5555", "--db-host=cli-db"}

	cfg := LoadConfig(path, args)

	if cfg.Host != "cli-host" {
		t.Errorf("host: expected 'cli-host', got '%s'", cfg.Host)
	}
	if cfg.Port != 5555 {
		t.Errorf("port: expected 5555, got %d", cfg.Port)
	}
	if cfg.DBHost != "cli-db" {
		t.Errorf("db_host: expected 'cli-db', got '%s'", cfg.DBHost)
	}
	// DBPort: env wins (CLI not set)
	if cfg.DBPort != 4444 {
		t.Errorf("db_port: expected 4444, got %d", cfg.DBPort)
	}
	// DBName: file wins (neither CLI nor env set)
	if cfg.DBName != "filedb" {
		t.Errorf("db_name: expected 'filedb', got '%s'", cfg.DBName)
	}
	// Workers: file wins (neither CLI nor env set)
	if cfg.Workers != 2 {
		t.Errorf("workers: expected 2, got %d", cfg.Workers)
	}
}

// clearConfigEnv removes all APP_* environment variables to ensure
// a clean slate for each test.
func clearConfigEnv(t *testing.T) {
	t.Helper()
	vars := []string{
		"APP_HOST", "APP_PORT", "APP_DEBUG", "APP_LOG_LEVEL",
		"APP_DB_HOST", "APP_DB_PORT", "APP_DB_NAME", "APP_WORKERS",
	}
	for _, v := range vars {
		os.Unsetenv(v)
	}
}
