import { taskStore, Task, CreateTaskInput } from './task';

describe('TaskStore', () => {
  beforeEach(() => {
    taskStore.clear();
  });

  it('should create a task with correct defaults', () => {
    const input: CreateTaskInput = {
      title: 'Test task',
      description: 'A test task',
      priority: 1,
    };
    const task = taskStore.create(input);

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Test task');
    expect(task.description).toBe('A test task');
    expect(task.status).toBe('pending');
    expect(task.priority).toBe(1);
    expect(task.createdAt).toBeInstanceOf(Date);
    expect(task.updatedAt).toBeInstanceOf(Date);
  });

  it('should find a task by id', () => {
    const task = taskStore.create({
      title: 'Find me',
      description: 'Find this task',
      priority: 2,
    });

    const found = taskStore.findById(task.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Find me');
  });

  it('should return undefined for non-existent id', () => {
    const found = taskStore.findById('non-existent-id');
    expect(found).toBeUndefined();
  });

  it('should update a task', () => {
    const task = taskStore.create({
      title: 'Original',
      description: 'Original description',
      priority: 1,
    });

    const updated = taskStore.update(task.id, { title: 'Updated' });
    expect(updated).toBeDefined();
    expect(updated!.title).toBe('Updated');
    expect(updated!.description).toBe('Original description');
  });

  it('should delete a task', () => {
    const task = taskStore.create({
      title: 'Delete me',
      description: 'To be deleted',
      priority: 1,
    });

    expect(taskStore.delete(task.id)).toBe(true);
    expect(taskStore.findById(task.id)).toBeUndefined();
  });

  it('should return false when deleting non-existent task', () => {
    expect(taskStore.delete('non-existent-id')).toBe(false);
  });

  it('should list all tasks', () => {
    taskStore.create({ title: 'Task 1', description: 'First', priority: 1 });
    taskStore.create({ title: 'Task 2', description: 'Second', priority: 2 });

    const all = taskStore.findAll();
    expect(all).toHaveLength(2);
  });
});
