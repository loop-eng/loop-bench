package service

import (
	"errors"
	"testing"
)

// mockBackend implements Backend for testing.
type mockBackend struct {
	data   map[string]string
	calls  int
	failOn string
}

func newMockBackend() *mockBackend {
	return &mockBackend{
		data: map[string]string{
			"user:1":    "Alice",
			"user:2":    "Bob",
			"product:1": "Widget",
		},
	}
}

func (m *mockBackend) Fetch(key string) (string, error) {
	m.calls++
	if m.failOn == key {
		return "", errors.New("backend error")
	}
	val, ok := m.data[key]
	if !ok {
		return "", errors.New("not found")
	}
	return val, nil
}

func TestGetData_ReturnsValue(t *testing.T) {
	b := newMockBackend()
	svc := NewService(b)
	val, err := svc.GetData("user:1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if val != "Alice" {
		t.Fatalf("expected Alice, got %s", val)
	}
}

func TestGetData_ReturnsError(t *testing.T) {
	b := newMockBackend()
	svc := NewService(b)
	_, err := svc.GetData("nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent key")
	}
}

func TestGetData_BackendFailure(t *testing.T) {
	b := newMockBackend()
	b.failOn = "user:1"
	svc := NewService(b)
	_, err := svc.GetData("user:1")
	if err == nil {
		t.Fatal("expected error on backend failure")
	}
}

func TestGetData_MultipleCalls(t *testing.T) {
	b := newMockBackend()
	svc := NewService(b)

	for i := 0; i < 5; i++ {
		val, err := svc.GetData("user:1")
		if err != nil {
			t.Fatalf("call %d: unexpected error: %v", i, err)
		}
		if val != "Alice" {
			t.Fatalf("call %d: expected Alice, got %s", i, val)
		}
	}

	// Without caching, every call hits backend
	if b.calls != 5 {
		t.Fatalf("expected 5 backend calls, got %d", b.calls)
	}
}
