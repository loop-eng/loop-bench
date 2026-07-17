import request from 'supertest';
import { app } from './server';
import { itemStore } from './models/item';

describe('Server', () => {
  it('should respond to health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Item model', () => {
  beforeEach(() => {
    itemStore.clear();
  });

  it('should create an item', () => {
    const item = itemStore.create('Widget', 42, 'owner-1');
    expect(item.id).toBeDefined();
    expect(item.name).toBe('Widget');
    expect(item.value).toBe(42);
    expect(item.ownerId).toBe('owner-1');
  });

  it('should find item by id', () => {
    const item = itemStore.create('Gadget', 99, 'owner-2');
    const found = itemStore.findById(item.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('Gadget');
  });

  it('should list all items', () => {
    itemStore.create('A', 1, 'o1');
    itemStore.create('B', 2, 'o2');
    expect(itemStore.findAll()).toHaveLength(2);
  });

  it('should delete an item', () => {
    const item = itemStore.create('Remove', 0, 'o1');
    expect(itemStore.delete(item.id)).toBe(true);
    expect(itemStore.findById(item.id)).toBeUndefined();
  });
});
