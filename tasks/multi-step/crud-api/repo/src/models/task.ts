import { v4 as uuidv4 } from 'uuid';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'done';
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateTaskInput = Pick<Task, 'title' | 'description' | 'priority'>;
export type UpdateTaskInput = Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority'>>;

class TaskStore {
  private tasks: Map<string, Task> = new Map();

  create(input: CreateTaskInput): Task {
    const now = new Date();
    const task: Task = {
      id: uuidv4(),
      title: input.title,
      description: input.description,
      status: 'pending',
      priority: input.priority,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  findById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  findAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  update(id: string, input: UpdateTaskInput): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updated: Task = {
      ...task,
      ...input,
      updatedAt: new Date(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  clear(): void {
    this.tasks.clear();
  }
}

export const taskStore = new TaskStore();
