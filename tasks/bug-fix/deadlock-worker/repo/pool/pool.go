package pool

import (
	"sync"
)

// Task represents a unit of work to be processed by the pool.
type Task struct {
	ID      int
	Payload interface{}
	Fn      func(interface{}) (interface{}, error)
}

// Result holds the outcome of processing a Task.
type Result struct {
	TaskID int
	Value  interface{}
	Err    error
}

// Pool manages a set of worker goroutines that process tasks concurrently.
type Pool struct {
	workers int
	tasks   chan Task
	results chan Result
	wg      sync.WaitGroup
}

// New creates a new Pool with the given number of workers.
func New(workers int) *Pool {
	return &Pool{
		workers: workers,
		tasks:   make(chan Task),   // BUG: unbuffered
		results: make(chan Result), // BUG: unbuffered - causes deadlock
	}
}

// Start launches the worker goroutines.
func (p *Pool) Start() {
	for i := 0; i < p.workers; i++ {
		p.wg.Add(1)
		go func() {
			defer p.wg.Done()
			for task := range p.tasks {
				value, err := task.Fn(task.Payload)
				// BUG: This blocks if results channel is full,
				// which prevents the worker from picking up more tasks.
				// If all workers are blocked here and Submit is blocked
				// trying to send a task, we have a deadlock.
				p.results <- Result{
					TaskID: task.ID,
					Value:  value,
					Err:    err,
				}
			}
		}()
	}
}

// Submit sends a task to the pool for processing.
// BUG: This blocks if the tasks channel is full (unbuffered),
// creating a deadlock when workers are blocked on results.
func (p *Pool) Submit(task Task) {
	p.tasks <- task
}

// Close signals that no more tasks will be submitted and waits
// for all workers to finish.
func (p *Pool) Close() {
	close(p.tasks)
	p.wg.Wait()
	close(p.results)
}

// Results returns the channel from which results can be read.
func (p *Pool) Results() <-chan Result {
	return p.results
}
