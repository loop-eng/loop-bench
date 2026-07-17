package cache_test

import (
	"sync"
	"testing"
	"time"

	"github.com/example/cache-service/cache"
)

func TestCacheHitReturnsStoredValue(t *testing.T) {
	c := cache.New(1*time.Minute, 10)
	c.Set("key1", "value1")

	val, ok := c.Get("key1")
	if !ok {
		t.Fatal("expected cache hit")
	}
	if val != "value1" {
		t.Fatalf("expected value1, got %v", val)
	}
}

func TestCacheMissReturnsNotOk(t *testing.T) {
	c := cache.New(1*time.Minute, 10)

	_, ok := c.Get("nonexistent")
	if ok {
		t.Fatal("expected cache miss for nonexistent key")
	}
}

func TestExpiredEntryIsEvicted(t *testing.T) {
	c := cache.New(50*time.Millisecond, 10)
	c.Set("key1", "value1")

	// Should be available immediately
	val, ok := c.Get("key1")
	if !ok || val != "value1" {
		t.Fatal("expected cache hit before expiry")
	}

	// Wait for TTL to expire
	time.Sleep(100 * time.Millisecond)

	_, ok = c.Get("key1")
	if ok {
		t.Fatal("expected cache miss after TTL expiry")
	}
}

func TestMaxSizeEvictsLRU(t *testing.T) {
	c := cache.New(1*time.Minute, 3)

	c.Set("a", 1)
	c.Set("b", 2)
	c.Set("c", 3)

	// Access "a" to make it recently used
	c.Get("a")

	// Adding "d" should evict "b" (least recently used)
	c.Set("d", 4)

	if c.Len() != 3 {
		t.Fatalf("expected 3 entries, got %d", c.Len())
	}

	// "a" should still be present (was accessed recently)
	_, ok := c.Get("a")
	if !ok {
		t.Fatal("expected 'a' to still be in cache (recently used)")
	}

	// "b" should be evicted (LRU)
	_, ok = c.Get("b")
	if ok {
		t.Fatal("expected 'b' to be evicted as LRU")
	}

	// "c" and "d" should still be present
	_, ok = c.Get("c")
	if !ok {
		t.Fatal("expected 'c' to still be in cache")
	}
	_, ok = c.Get("d")
	if !ok {
		t.Fatal("expected 'd' to still be in cache")
	}
}

func TestUpdateExistingKeyRefreshesTTL(t *testing.T) {
	c := cache.New(80*time.Millisecond, 10)
	c.Set("key1", "v1")

	time.Sleep(50 * time.Millisecond)
	// Update with new value, should refresh TTL
	c.Set("key1", "v2")

	time.Sleep(50 * time.Millisecond)
	// Original TTL would have expired, but refresh should keep it alive
	val, ok := c.Get("key1")
	if !ok {
		t.Fatal("expected cache hit after TTL refresh")
	}
	if val != "v2" {
		t.Fatalf("expected v2, got %v", val)
	}
}

func TestDeleteRemovesEntry(t *testing.T) {
	c := cache.New(1*time.Minute, 10)
	c.Set("key1", "value1")
	c.Delete("key1")

	_, ok := c.Get("key1")
	if ok {
		t.Fatal("expected cache miss after delete")
	}
}

func TestConcurrentAccess(t *testing.T) {
	c := cache.New(1*time.Minute, 100)
	var wg sync.WaitGroup

	// Concurrent writes
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			key := string(rune('a' + n%26))
			c.Set(key, n)
			c.Get(key)
		}(i)
	}

	wg.Wait()
	// If we get here without a race condition panic, the test passes
}

func TestLenReturnsCorrectCount(t *testing.T) {
	c := cache.New(1*time.Minute, 10)
	if c.Len() != 0 {
		t.Fatalf("expected 0, got %d", c.Len())
	}

	c.Set("a", 1)
	c.Set("b", 2)
	if c.Len() != 2 {
		t.Fatalf("expected 2, got %d", c.Len())
	}

	c.Delete("a")
	if c.Len() != 1 {
		t.Fatalf("expected 1, got %d", c.Len())
	}
}
