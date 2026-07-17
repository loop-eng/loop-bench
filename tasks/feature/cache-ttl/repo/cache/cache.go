package cache

import "time"

// Cache is an in-memory key-value cache.
// TODO: Implement TTL-based expiration, max size eviction, and thread safety.
type Cache struct {
	// TODO: add fields
}

// New creates a new Cache with the given TTL and max number of entries.
func New(ttl time.Duration, maxSize int) *Cache {
	return &Cache{}
}

// Get retrieves a value from the cache.
// Returns the value and true if found and not expired, otherwise nil and false.
func (c *Cache) Get(key string) (interface{}, bool) {
	// TODO: implement
	return nil, false
}

// Set stores a value in the cache with the configured TTL.
// If the cache is full, the least-recently-used entry should be evicted.
func (c *Cache) Set(key string, value interface{}) {
	// TODO: implement
}

// Delete removes an entry from the cache.
func (c *Cache) Delete(key string) {
	// TODO: implement
}

// Len returns the number of entries currently in the cache.
func (c *Cache) Len() int {
	// TODO: implement
	return 0
}
