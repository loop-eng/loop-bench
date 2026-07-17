package service

import (
	"fmt"
)

// Backend represents an external API that we query.
type Backend interface {
	Fetch(key string) (string, error)
}

// Service wraps a backend and serves data.
type Service struct {
	backend Backend
}

// NewService creates a new Service that always queries the backend directly.
func NewService(backend Backend) *Service {
	return &Service{
		backend: backend,
	}
}

// GetData fetches data for the given key.
// Currently hits the backend on every call with no caching.
func (s *Service) GetData(key string) (string, error) {
	value, err := s.backend.Fetch(key)
	if err != nil {
		return "", fmt.Errorf("backend fetch failed for %q: %w", key, err)
	}
	return value, nil
}
