import { v4 as uuidv4 } from 'uuid';

export interface Item {
  id: string;
  name: string;
  value: number;
  ownerId: string;
  createdAt: Date;
}

class ItemStore {
  private items: Map<string, Item> = new Map();

  create(name: string, value: number, ownerId: string): Item {
    const item: Item = {
      id: uuidv4(),
      name,
      value,
      ownerId,
      createdAt: new Date(),
    };
    this.items.set(item.id, item);
    return item;
  }

  findById(id: string): Item | undefined {
    return this.items.get(id);
  }

  findAll(): Item[] {
    return Array.from(this.items.values());
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }

  clear(): void {
    this.items.clear();
  }
}

export const itemStore = new ItemStore();
