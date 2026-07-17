package config

import (
	"bufio"
	"os"
	"strconv"
	"strings"
)

// FileConfig holds configuration loaded from a config file.
type FileConfig struct {
	Host     string
	Port     int
	Debug    bool
	LogLevel string
	DBHost   string
	DBPort   int
	DBName   string
	Workers  int
	Loaded   bool
}

// LoadFromFile reads configuration from a key=value config file.
// Format: key = value (one per line, # for comments)
func LoadFromFile(path string) (FileConfig, error) {
	cfg := FileConfig{}

	file, err := os.Open(path)
	if err != nil {
		return cfg, err
	}
	defer file.Close()

	cfg.Loaded = true
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		switch key {
		case "host":
			cfg.Host = value
		case "port":
			if v, err := strconv.Atoi(value); err == nil {
				cfg.Port = v
			}
		case "debug":
			cfg.Debug = value == "true"
		case "log_level":
			cfg.LogLevel = value
		case "db_host":
			cfg.DBHost = value
		case "db_port":
			if v, err := strconv.Atoi(value); err == nil {
				cfg.DBPort = v
			}
		case "db_name":
			cfg.DBName = value
		case "workers":
			if v, err := strconv.Atoi(value); err == nil {
				cfg.Workers = v
			}
		}
	}

	return cfg, scanner.Err()
}
