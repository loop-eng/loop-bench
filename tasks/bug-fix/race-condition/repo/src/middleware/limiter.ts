import { RequestCounter } from "./counter.js";

export class RateLimiter {
  private counter: RequestCounter;
  private maxConcurrent: number;

  constructor(maxConcurrent: number) {
    this.counter = new RequestCounter();
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Try to acquire a slot. Returns true if allowed, false if at limit.
   */
  async tryAcquire(): Promise<boolean> {
    const current = await this.counter.getCount();
    if (current >= this.maxConcurrent) {
      return false;
    }
    await this.counter.increment();
    return true;
  }

  /**
   * Release a slot when a request completes.
   */
  async release(): Promise<void> {
    await this.counter.decrement();
  }

  /**
   * Get the number of active requests.
   */
  async activeCount(): Promise<number> {
    return this.counter.getCount();
  }
}
