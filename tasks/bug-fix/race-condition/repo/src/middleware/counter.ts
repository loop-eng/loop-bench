/**
 * Simulates an async storage backend (e.g., Redis, database).
 * The small delay makes the race condition reproducible.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RequestCounter {
  private count = 0;

  /**
   * Read the current count (simulates async storage read).
   */
  private async read(): Promise<number> {
    await delay(1);
    return this.count;
  }

  /**
   * Write the count value (simulates async storage write).
   */
  private async write(value: number): Promise<void> {
    await delay(1);
    this.count = value;
  }

  /**
   * Increment the counter by 1.
   * BUG: no synchronization — TOCTOU race condition.
   */
  async increment(): Promise<void> {
    const current = await this.read();
    await this.write(current + 1);
  }

  /**
   * Decrement the counter by 1.
   * BUG: no synchronization — TOCTOU race condition.
   */
  async decrement(): Promise<void> {
    const current = await this.read();
    await this.write(current - 1);
  }

  /**
   * Get the current count.
   */
  async getCount(): Promise<number> {
    return this.read();
  }
}
