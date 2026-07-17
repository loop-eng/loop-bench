package config

import (
	"strconv"
	"strings"
)

// FlagConfig holds configuration loaded from command-line flags.
type FlagConfig struct {
	Host     string
	Port     int
	Debug    bool
	LogLevel string
	DBHost   string
	DBPort   int
	DBName   string
	Workers  int
	Parsed   bool
}

// ParseFlags parses CLI arguments in the form --key=value or --key value.
func ParseFlags(args []string) FlagConfig {
	cfg := FlagConfig{}
	if len(args) == 0 {
		return cfg
	}
	cfg.Parsed = true

	for i := 0; i < len(args); i++ {
		arg := args[i]
		if !strings.HasPrefix(arg, "--") {
			continue
		}

		var key, value string
		arg = strings.TrimPrefix(arg, "--")

		if idx := strings.Index(arg, "="); idx >= 0 {
			key = arg[:idx]
			value = arg[idx+1:]
		} else if i+1 < len(args) && !strings.HasPrefix(args[i+1], "--") {
			key = arg
			value = args[i+1]
			i++
		} else {
			key = arg
			value = "true" // bare flag like --debug
		}

		switch key {
		case "host":
			cfg.Host = value
		case "port":
			if v, err := strconv.Atoi(value); err == nil {
				cfg.Port = v
			}
		case "debug":
			cfg.Debug = value == "true" || value == "1"
		case "log-level":
			cfg.LogLevel = value
		case "db-host":
			cfg.DBHost = value
		case "db-port":
			if v, err := strconv.Atoi(value); err == nil {
				cfg.DBPort = v
			}
		case "db-name":
			cfg.DBName = value
		case "workers":
			if v, err := strconv.Atoi(value); err == nil {
				cfg.Workers = v
			}
		}
	}

	return cfg
}
