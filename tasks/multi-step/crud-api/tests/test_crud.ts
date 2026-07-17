import request from 'supertest';
import { app } from '../repo/src/server';
import { taskStore } from '../repo/src/models/task';

describe('Task CRUD API', () => {
  beforeEach(() => {
    taskStore.clear();
  });

  describe('POST /tasks', () => {
    it('should create a task and return 201', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'New task',
          description: 'Task description',
          priority: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New task');
      expect(res.body.description).toBe('Task description');
      expect(res.body.status).toBe('pending');
      expect(res.body.priority).toBe(1);
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({
          description: 'No title',
          priority: 1,
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 when description is missing', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'No description',
          priority: 1,
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 when priority is not a number', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'Bad priority',
          description: 'Has invalid priority',
          priority: 'high',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /tasks/:id', () => {
    it('should return a task by id', async () => {
      const task = taskStore.create({
        title: 'Existing task',
        description: 'Already exists',
        priority: 2,
      });

      const res = await request(app).get(`/tasks/${task.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.title).toBe('Existing task');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app).get('/tasks/non-existent-id');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update a task and return 200', async () => {
      const task = taskStore.create({
        title: 'Original title',
        description: 'Original description',
        priority: 1,
      });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          title: 'Updated title',
          status: 'in_progress',
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated title');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.description).toBe('Original description');
    });

    it('should return 404 when updating non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid status value', async () => {
      const task = taskStore.create({
        title: 'Task',
        description: 'Description',
        priority: 1,
      });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete a task and return 204', async () => {
      const task = taskStore.create({
        title: 'To delete',
        description: 'Will be deleted',
        priority: 1,
      });

      const res = await request(app).delete(`/tasks/${task.id}`);

      expect(res.status).toBe(204);
      expect(taskStore.findById(task.id)).toBeUndefined();
    });

    it('should return 404 when deleting non-existent task', async () => {
      const res = await request(app).delete('/tasks/non-existent-id');

      expect(res.status).toBe(404);
    });
  });
});
