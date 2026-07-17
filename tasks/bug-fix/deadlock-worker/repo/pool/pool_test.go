package pool

import (
	"testing"
)

func TestSingleTaskSubmission(t *testing.T) {
	p := New(2)
	p.Start()

	done := make(chan struct{})
	go func() {
		defer close(done)
		result := <-p.Results()
		if result.TaskID != 1 {
			t.Errorf("expected task ID 1, got %d", result.TaskID)
		}
		val, ok := result.Value.(int)
		if !ok {
			t.Errorf("expected int result, got %T", result.Value)
		}
		if val != 42 {
			t.Errorf("expected value 42, got %d", val)
		}
		if result.Err != nil {
			t.Errorf("unexpected error: %v", result.Err)
		}
	}()

	p.Submit(Task{
		ID:      1,
		Payload: 21,
		Fn: func(payload interface{}) (interface{}, error) {
			n := payload.(int)
			return n * 2, nil
		},
	})

	<-done
	p.Close()
}

func TestTaskWithError(t *testing.T) {
	p := New(1)
	p.Start()

	done := make(chan struct{})
	go func() {
		defer close(done)
		result := <-p.Results()
		if result.Err == nil {
			t.Error("expected error, got nil")
		}
		if result.Value != nil {
			t.Errorf("expected nil value, got %v", result.Value)
		}
	}()

	p.Submit(Task{
		ID:      1,
		Payload: nil,
		Fn: func(payload interface{}) (interface{}, error) {
			return nil, &taskError{"something went wrong"}
		},
	})

	<-done
	p.Close()
}

type taskError struct {
	msg string
}

func (e *taskError) Error() string {
	return e.msg
}
