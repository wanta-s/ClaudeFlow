interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'user';
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
}

class InMemoryDatabase {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, Session> = new Map();

  async findUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user: User = {
      ...userData,
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async createSession(userId: string): Promise<Session> {
    const session: Session = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionToken: `token_${Math.random().toString(36).substr(2, 32)}`,
      userId,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
    this.sessions.set(session.sessionToken, session);
    return session;
  }

  async getSession(sessionToken: string): Promise<Session | null> {
    return this.sessions.get(sessionToken) || null;
  }
}

export const db = new InMemoryDatabase();
export type { User, Session };