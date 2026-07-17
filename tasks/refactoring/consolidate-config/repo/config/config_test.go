package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadFromEnvBasic(t *testing.T) {
	os.Setenv("APP_HOST", "env-host")
	os.Setenv("APP_PORT", "9090")
	defer os.Unsetenv("APP_HOST")
	defer os.Unsetenv("APP_PORT")

	cfg := LoadFromEnv()
	if cfg.Host != "env-host" {
		t.Errorf("expected host 'env-host', got '%s'", cfg.Host)
	}
	if cfg.Port != 9090 {
		t.Errorf("expected port 9090, got %d", cfg.Port)
	}
}

func TestLoadFromEnvDebug(t *testing.T) {
	os.Setenv("APP_DEBUG", "true")
	defer os.Unsetenv("APP_DEBUG")

	cfg := LoadFromEnv()
	if !cfg.Debug {
		t.Error("expected debug to be true")
	}
}

func TestLoadFromFileBasic(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.conf")
	content := "host = file-host\nport = 7070\ndb_name = testdb\n"
	os.WriteFile(path, []byte(content), 0644)

	cfg, err := LoadFromFile(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Host != "file-host" {
		t.Errorf("expected host 'file-host', got '%s'", cfg.Host)
	}
	if cfg.Port != 7070 {
		t.Errorf("expected port 7070, got %d", cfg.Port)
	}
	if cfg.DBName != "testdb" {
		t.Errorf("expected db_name 'testdb', got '%s'", cfg.DBName)
	}
}

func TestLoadFromFileComments(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.conf")
	content := "# comment\nhost = myhost\n# another comment\n"
	os.WriteFile(path, []byte(content), 0644)

	cfg, err := LoadFromFile(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Host != "myhost" {
		t.Errorf("expected host 'myhost', got '%s'", cfg.Host)
	}
}

func TestLoadFromFileMissing(t *testing.T) {
	_, err := LoadFromFile("/nonexistent/path/config.conf")
	if err == nil {
		t.Error("expected error for missing file")
	}
}

func TestParseFlagsBasic(t *testing.T) {
	args := []string{"--host=flag-host", "--port=3030", "--debug"}
	cfg := ParseFlags(args)
	if cfg.Host != "flag-host" {
		t.Errorf("expected host 'flag-host', got '%s'", cfg.Host)
	}
	if cfg.Port != 3030 {
		t.Errorf("expected port 3030, got %d", cfg.Port)
	}
	if !cfg.Debug {
		t.Error("expected debug to be true")
	}
}

func TestParseFlagsSpaceSeparated(t *testing.T) {
	args := []string{"--host", "spaced-host", "--port", "4040"}
	cfg := ParseFlags(args)
	if cfg.Host != "spaced-host" {
		t.Errorf("expected host 'spaced-host', got '%s'", cfg.Host)
	}
	if cfg.Port != 4040 {
		t.Errorf("expected port 4040, got %d", cfg.Port)
	}
}

func TestParseFlagsEmpty(t *testing.T) {
	cfg := ParseFlags([]string{})
	if cfg.Parsed {
		t.Error("expected Parsed to be false for empty args")
	}
}
