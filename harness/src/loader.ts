import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { parse } from "yaml";
import { validateTask } from "./validate.js";
import type {
  TaskDefinition,
  TaskCategory,
  Difficulty,
  Language,
} from "./types.js";

export interface LoadOptions {
  tasksDir: string;
  category?: TaskCategory;
  difficulty?: Difficulty;
  language?: Language;
}

export interface LoadResult {
  tasks: TaskDefinition[];
  errors: TaskLoadError[];
}

export interface TaskLoadError {
  path: string;
  message: string;
}

export function loadTasks(options: LoadOptions): LoadResult {
  const { tasksDir } = options;
  const tasks: TaskDefinition[] = [];
  const errors: TaskLoadError[] = [];

  if (!existsSync(tasksDir)) {
    errors.push({ path: tasksDir, message: "Tasks directory not found" });
    return { tasks, errors };
  }

  const yamlFiles = findTaskYamls(tasksDir);

  for (const yamlPath of yamlFiles) {
    try {
      const raw = readFileSync(yamlPath, "utf-8");
      const data = parse(raw) as unknown;
      const validation = validateTask(data);

      if (!validation.valid) {
        errors.push({
          path: yamlPath,
          message: validation.errors.map((e) => `${e.path}: ${e.message}`).join("; "),
        });
        continue;
      }

      const task = data as TaskDefinition;

      if (options.category && task.category !== options.category) continue;
      if (options.difficulty && task.difficulty !== options.difficulty) continue;
      if (options.language && task.language !== options.language) continue;

      tasks.push(task);
    } catch (err) {
      errors.push({
        path: yamlPath,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  tasks.sort((a, b) => a.id.localeCompare(b.id));
  return { tasks, errors };
}

export function loadSingleTask(taskYamlPath: string): TaskDefinition {
  if (!existsSync(taskYamlPath)) {
    throw new Error(`Task file not found: ${taskYamlPath}`);
  }

  const raw = readFileSync(taskYamlPath, "utf-8");
  const data = parse(raw) as unknown;
  const validation = validateTask(data);

  if (!validation.valid) {
    const msg = validation.errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    throw new Error(`Invalid task definition: ${msg}`);
  }

  return data as TaskDefinition;
}

export function resolveTaskDir(tasksDir: string, task: TaskDefinition): string {
  const categoryDir = join(tasksDir, task.category);
  if (!existsSync(categoryDir)) {
    throw new Error(`Category directory not found: ${categoryDir}`);
  }

  const entries = readdirSync(categoryDir);
  for (const entry of entries) {
    const candidate = join(categoryDir, entry, "task.yaml");
    if (existsSync(candidate)) {
      try {
        const raw = readFileSync(candidate, "utf-8");
        const data = parse(raw) as { id?: string };
        if (data.id === task.id) {
          return join(categoryDir, entry);
        }
      } catch {
        continue;
      }
    }
  }

  throw new Error(`Task directory not found for ${task.id}`);
}

function findTaskYamls(dir: string): string[] {
  const results: string[] = [];

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = resolve(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      const taskYaml = join(fullPath, "task.yaml");
      if (existsSync(taskYaml)) {
        results.push(taskYaml);
      }
      results.push(...findTaskYamls(fullPath));
    }
  }

  return results;
}
