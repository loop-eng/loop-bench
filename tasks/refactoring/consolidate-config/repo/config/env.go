package config

import (
	"os"
	"strconv"
)

// EnvConfig holds configuration loaded from environment variables.
type EnvConfig struct {
	Host     string
	Port     int
	Debug    bool
	LogLevel string
	DBHost   string
	DBPort   int
	DBName   string
	Workers  int
}

// LoadFromEnv reads configuration from environment variables.
// Variable names: APP_HOST, APP_PORT, APP_DEBUG, APP_LOG_LEVEL,
// APP_DB_HOST, APP_DB_PORT, APP_DB_NAME, APP_WORKERS
func LoadFromEnv() EnvConfig {
	cfg := EnvConfig{}

	if v := os.Getenv("APP_HOST"); v != "" {
		cfg.Host = v
	}
	if v := os.Getenv("APP_PORT"); v != "" {
		if port, err := strconv.Atoi(v); err == nil {
			cfg.Port = port
		}
	}
	if v := os.Getenv("APP_DEBUG"); v != "" {
		cfg.Debug = v == "true" || v == "1"
	}
	if v := os.Getenv("APP_LOG_LEVEL"); v != "" {
		cfg.LogLevel = v
	}
	if v := os.Getenv("APP_DB_HOST"); v != "" {
		cfg.DBHost = v
	}
	if v := os.Getenv("APP_DB_PORT"); v != "" {
		if port, err := strconv.Atoi(v); err == nil {
			cfg.DBPort = port
		}
	}
	if v := os.Getenv("APP_DB_NAME"); v != "" {
		cfg.DBName = v
	}
	if v := os.Getenv("APP_WORKERS"); v != "" {
		if w, err := strconv.Atoi(v); err == nil {
			cfg.Workers = w
		}
	}

	return cfg
}
