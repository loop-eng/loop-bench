package config

import (
	"os"
	"path/filepath"
	"testing"
)

// TestMergeAllThreeSources verifies that fields from all three
// configuration sources are merged into a single Config struct,
// with each source contributing different fields.
func TestMergeAllThreeSources(t *testing.T) {
	// Clean env
	vars := []string{
		"APP_HOST", "APP_PORT", "APP_DEBUG", "APP_LOG_LEVEL",
		"APP_DB_HOST", "APP_DB_PORT", "APP_DB_NAME", "APP_WORKERS",
	}
	for _, v := range vars {
		os.Unsetenv(v)
	}

	// File provides: host, port, db_name
	dir := t.TempDir()
	path := filepath.Join(dir, "config.conf")
	content := "host = file-host\nport = 7070\ndb_name = filedb\n"
	os.WriteFile(path, []byte(content), 0644)

	// Env provides: debug, log_level, db_host
	os.Setenv("APP_DEBUG", "true")
	os.Setenv("APP_LOG_LEVEL", "warn")
	os.Setenv("APP_DB_HOST", "env-db-host")
	defer os.Unsetenv("APP_DEBUG")
	defer os.Unsetenv("APP_LOG_LEVEL")
	defer os.Unsetenv("APP_DB_HOST")

	// CLI provides: workers
	args := []string{"--workers=16"}

	cfg := LoadConfig(path, args)

	// From file
	if cfg.Host != "file-host" {
		t.Errorf("host should come from file: expected 'file-host', got '%s'", cfg.Host)
	}
	if cfg.Port != 7070 {
		t.Errorf("port should come from file: expected 7070, got %d", cfg.Port)
	}
	if cfg.DBName != "filedb" {
		t.Errorf("db_name should come from file: expected 'filedb', got '%s'", cfg.DBName)
	}

	// From env
	if !cfg.Debug {
		t.Error("debug should come from env: expected true")
	}
	if cfg.LogLevel != "warn" {
		t.Errorf("log_level should come from env: expected 'warn', got '%s'", cfg.LogLevel)
	}
	if cfg.DBHost != "env-db-host" {
		t.Errorf("db_host should come from env: expected 'env-db-host', got '%s'", cfg.DBHost)
	}

	// From CLI
	if cfg.Workers != 16 {
		t.Errorf("workers should come from CLI: expected 16, got %d", cfg.Workers)
	}

	// Defaults for unset fields
	if cfg.DBPort != 5432 {
		t.Errorf("db_port should use default: expected 5432, got %d", cfg.DBPort)
	}
}

// TestMergeFileOnlyFields verifies that when env and CLI don't set
// a field, the file value is used.
func TestMergeFileOnlyFields(t *testing.T) {
	vars := []string{
		"APP_HOST", "APP_PORT", "APP_DEBUG", "APP_LOG_LEVEL",
		"APP_DB_HOST", "APP_DB_PORT", "APP_DB_NAME", "APP_WORKERS",
	}
	for _, v := range vars {
		os.Unsetenv(v)
	}

	dir := t.TempDir()
	path := filepath.Join(dir, "config.conf")
	content := "host = from-file\nport = 6060\nlog_level = debug\ndb_host = file-db\ndb_port = 3306\ndb_name = mydb\nworkers = 8\n"
	os.WriteFile(path, []byte(content), 0644)

	cfg := LoadConfig(path, nil)

	if cfg.Host != "from-file" {
		t.Errorf("host: expected 'from-file', got '%s'", cfg.Host)
	}
	if cfg.Port != 6060 {
		t.Errorf("port: expected 6060, got %d", cfg.Port)
	}
	if cfg.LogLevel != "debug" {
		t.Errorf("log_level: expected 'debug', got '%s'", cfg.LogLevel)
	}
	if cfg.DBHost != "file-db" {
		t.Errorf("db_host: expected 'file-db', got '%s'", cfg.DBHost)
	}
	if cfg.DBPort != 3306 {
		t.Errorf("db_port: expected 3306, got %d", cfg.DBPort)
	}
	if cfg.DBName != "mydb" {
		t.Errorf("db_name: expected 'mydb', got '%s'", cfg.DBName)
	}
	if cfg.Workers != 8 {
		t.Errorf("workers: expected 8, got %d", cfg.Workers)
	}
}

// TestMergeEnvOverwritesFileSelectively verifies that env overwrites
// only the fields it sets, leaving other file fields untouched.
func TestMergeEnvOverwritesFileSelectively(t *testing.T) {
	vars := []string{
		"APP_HOST", "APP_PORT", "APP_DEBUG", "APP_LOG_LEVEL",
		"APP_DB_HOST", "APP_DB_PORT", "APP_DB_NAME", "APP_WORKERS",
	}
	for _, v := range vars {
		os.Unsetenv(v)
	}

	dir := t.TempDir()
	path := filepath.Join(dir, "config.conf")
	content := "host = file-host\nport = 5050\ndb_name = filedb\nworkers = 3\n"
	os.WriteFile(path, []byte(content), 0644)

	// Env only overrides host
	os.Setenv("APP_HOST", "env-host")
	defer os.Unsetenv("APP_HOST")

	cfg := LoadConfig(path, nil)

	// Host overridden by env
	if cfg.Host != "env-host" {
		t.Errorf("host should be from env: expected 'env-host', got '%s'", cfg.Host)
	}
	// Other fields stay from file
	if cfg.Port != 5050 {
		t.Errorf("port should stay from file: expected 5050, got %d", cfg.Port)
	}
	if cfg.DBName != "filedb" {
		t.Errorf("db_name should stay from file: expected 'filedb', got '%s'", cfg.DBName)
	}
	if cfg.Workers != 3 {
		t.Errorf("workers should stay from file: expected 3, got %d", cfg.Workers)
	}
}

// TestMergeConfigStructExists verifies the Config struct has
// all expected fields.
func TestMergeConfigStructExists(t *testing.T) {
	cfg := LoadConfig("", nil)

	// Verify the struct type has all required fields by assigning them
	_ = cfg.Host
	_ = cfg.Port
	_ = cfg.Debug
	_ = cfg.LogLevel
	_ = cfg.DBHost
	_ = cfg.DBPort
	_ = cfg.DBName
	_ = cfg.Workers
}
