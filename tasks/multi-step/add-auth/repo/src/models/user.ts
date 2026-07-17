import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
}

class UserStore {
  private users: Map<string, User> = new Map();

  constructor() {
    this.seed();
  }

  private seed(): void {
    const defaultUsers: Omit<User, 'id'>[] = [
      { email: 'admin@example.com', password: 'admin123', name: 'Admin User', role: 'admin' },
      { email: 'user@example.com', password: 'user123', name: 'Regular User', role: 'user' },
    ];
    for (const u of defaultUsers) {
      const id = uuidv4();
      this.users.set(id, { id, ...u });
    }
  }

  findByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  validateCredentials(email: string, password: string): User | null {
    const user = this.findByEmail(email);
    if (user && user.password === password) {
      return user;
    }
    return null;
  }
}

export const userStore = new UserStore();
