package tests

import (
	"sync/atomic"
	"testing"
	"time"

	"github.com/bench/worker-pool/pool"
)

func TestNoDeadlockManyTasks(t *testing.T) {
	const numTasks = 100
	const numWorkers = 2
	const timeout = 5 * time.Second

	p := pool.New(numWorkers)
	p.Start()

	// Collect results in background
	var completed int64
	resultsDone := make(chan struct{})
	go func() {
		defer close(resultsDone)
		for range p.Results() {
			atomic.AddInt64(&completed, 1)
			if atomic.LoadInt64(&completed) == numTasks {
				return
			}
		}
	}()

	// Submit all tasks - this would deadlock with the bug
	submitDone := make(chan struct{})
	go func() {
		defer close(submitDone)
		for i := 0; i < numTasks; i++ {
			p.Submit(pool.Task{
				ID:      i,
				Payload: i,
				Fn: func(payload interface{}) (interface{}, error) {
					n := payload.(int)
					return n * 2, nil
				},
			})
		}
	}()

	// Wait for all submissions with timeout
	select {
	case <-submitDone:
		// good
	case <-time.After(timeout):
		t.Fatal("DEADLOCK DETECTED: Submit blocked for more than 5 seconds")
	}

	// Wait for all results with timeout
	select {
	case <-resultsDone:
		// good
	case <-time.After(timeout):
		t.Fatalf("DEADLOCK DETECTED: only %d/%d results received within timeout",
			atomic.LoadInt64(&completed), numTasks)
	}

	count := atomic.LoadInt64(&completed)
	if count != numTasks {
		t.Errorf("expected %d results, got %d", numTasks, count)
	}

	p.Close()
}

func TestResultsAreComplete(t *testing.T) {
	const numTasks = 50
	p := pool.New(4)
	p.Start()

	// Collect results
	results := make(map[int]interface{})
	resultsDone := make(chan struct{})
	go func() {
		defer close(resultsDone)
		count := 0
		for r := range p.Results() {
			if r.Err != nil {
				t.Errorf("unexpected error for task %d: %v", r.TaskID, r.Err)
			}
			results[r.TaskID] = r.Value
			count++
			if count == numTasks {
				return
			}
		}
	}()

	// Submit tasks
	for i := 0; i < numTasks; i++ {
		p.Submit(pool.Task{
			ID:      i,
			Payload: i,
			Fn: func(payload interface{}) (interface{}, error) {
				n := payload.(int)
				return n * n, nil
			},
		})
	}

	select {
	case <-resultsDone:
		// good
	case <-time.After(10 * time.Second):
		t.Fatal("timeout waiting for results")
	}

	// Verify all results
	for i := 0; i < numTasks; i++ {
		val, ok := results[i]
		if !ok {
			t.Errorf("missing result for task %d", i)
			continue
		}
		expected := i * i
		if val.(int) != expected {
			t.Errorf("task %d: expected %d, got %v", i, expected, val)
		}
	}

	p.Close()
}
