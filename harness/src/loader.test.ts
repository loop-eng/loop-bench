import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { loadTasks } from "./loader.js";

const TASKS_DIR = resolve(__dirname, "..", "..", "tasks");

describe("loadTasks", () => {
  it("loads all bug-fix tasks from the tasks directory", () => {
    const { tasks, errors } = loadTasks({ tasksDir: TASKS_DIR });
    expect(errors).toHaveLength(0);
    expect(tasks.length).toBeGreaterThanOrEqual(10);
  });

  it("tasks are sorted by id", () => {
    const { tasks } = loadTasks({ tasksDir: TASKS_DIR });
    for (let i = 1; i < tasks.length; i++) {
      expect(tasks[i]!.id.localeCompare(tasks[i - 1]!.id)).toBeGreaterThanOrEqual(0);
    }
  });

  it("filters by category", () => {
    const { tasks } = loadTasks({ tasksDir: TASKS_DIR, category: "bug-fix" });
    expect(tasks.length).toBe(10);
    for (const task of tasks) {
      expect(task.category).toBe("bug-fix");
    }
  });

  it("filters by difficulty", () => {
    const { tasks } = loadTasks({ tasksDir: TASKS_DIR, difficulty: "easy" });
    expect(tasks.length).toBeGreaterThanOrEqual(3);
    for (const task of tasks) {
      expect(task.difficulty).toBe("easy");
    }
  });

  it("filters by language", () => {
    const { tasks } = loadTasks({ tasksDir: TASKS_DIR, language: "python" });
    expect(tasks.length).toBeGreaterThanOrEqual(2);
    for (const task of tasks) {
      expect(task.language).toBe("python");
    }
  });

  it("returns error for non-existent directory", () => {
    const { tasks, errors } = loadTasks({ tasksDir: "/nonexistent/path" });
    expect(tasks).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.message).toContain("not found");
  });

  it("returns empty when filter matches nothing", () => {
    const { tasks } = loadTasks({
      tasksDir: TASKS_DIR,
      category: "multi-step",
    });
    expect(tasks).toHaveLength(0);
  });

  it("every loaded task has required fields", () => {
    const { tasks } = loadTasks({ tasksDir: TASKS_DIR });
    for (const task of tasks) {
      expect(task.id).toBeTruthy();
      expect(task.name).toBeTruthy();
      expect(task.category).toBeTruthy();
      expect(task.difficulty).toBeTruthy();
      expect(task.language).toBeTruthy();
      expect(task.description.length).toBeGreaterThanOrEqual(20);
      expect(task.goal.length).toBeGreaterThanOrEqual(20);
      expect(task.rubric.length).toBeGreaterThanOrEqual(1);
      expect(task.constraints.max_iterations).toBeGreaterThanOrEqual(1);
    }
  });

  it("rubric weights sum to 1.0 for all tasks", () => {
    const { tasks } = loadTasks({ tasksDir: TASKS_DIR });
    for (const task of tasks) {
      const sum = task.rubric.reduce((s, r) => s + r.weight, 0);
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.01);
    }
  });
});
