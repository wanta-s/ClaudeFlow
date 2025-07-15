import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock the app setup
const app = express();
app.use(express.json());

// Mock database
const mockDb = {
  users: new Map(),
  tasks: new Map(),
  projects: new Map(),
};

describe('API Integration Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(() => {
    // Setup test user
    userId = 'test-user-1';
    authToken = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    
    mockDb.users.set(userId, {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      password: bcrypt.hashSync('password123', 10),
    });
  });

  describe('Authentication API', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'newuser@example.com',
            password: 'password123',
            name: 'New User',
          })
          .expect(201);

        expect(response.body).toHaveProperty('token');
        expect(response.body.user).toMatchObject({
          email: 'newuser@example.com',
          name: 'New User',
        });
        expect(response.body.user).not.toHaveProperty('password');
      });

      it('should return 400 for duplicate email', async () => {
        await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'password123',
            name: 'Duplicate User',
          })
          .expect(400);
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'invalid-email',
            password: '123',
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123',
          })
          .expect(200);

        expect(response.body).toHaveProperty('token');
        expect(response.body.user).toMatchObject({
          id: userId,
          email: 'test@example.com',
        });
      });

      it('should return 401 for invalid credentials', async () => {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword',
          })
          .expect(401);
      });
    });
  });

  describe('User API', () => {
    describe('GET /api/users/me', () => {
      it('should get current user profile', async () => {
        const response = await request(app)
          .get('/api/users/me')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          id: userId,
          email: 'test@example.com',
          name: 'Test User',
        });
      });

      it('should return 401 without auth token', async () => {
        await request(app)
          .get('/api/users/me')
          .expect(401);
      });
    });

    describe('PUT /api/users/me', () => {
      it('should update user profile', async () => {
        const response = await request(app)
          .put('/api/users/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Updated Name',
          })
          .expect(200);

        expect(response.body.name).toBe('Updated Name');
      });
    });
  });

  describe('Task API', () => {
    let taskId: string;
    let projectId: string;

    beforeAll(() => {
      // Create test project
      projectId = 'test-project-1';
      mockDb.projects.set(projectId, {
        id: projectId,
        name: 'Test Project',
        ownerId: userId,
      });
    });

    describe('POST /api/tasks', () => {
      it('should create a new task', async () => {
        const response = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Task',
            description: 'Test Description',
            projectId,
            priority: 'HIGH',
            dueDate: '2024-12-31',
          })
          .expect(201);

        taskId = response.body.id;
        expect(response.body).toMatchObject({
          title: 'Test Task',
          status: 'TODO',
          priority: 'HIGH',
          createdById: userId,
        });
      });

      it('should validate required fields', async () => {
        await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            description: 'Missing title',
          })
          .expect(400);
      });
    });

    describe('GET /api/tasks', () => {
      it('should get all user tasks', async () => {
        const response = await request(app)
          .get('/api/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.length).toBeGreaterThan(0);
      });

      it('should filter tasks by status', async () => {
        const response = await request(app)
          .get('/api/tasks?status=TODO')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        response.body.forEach((task: any) => {
          expect(task.status).toBe('TODO');
        });
      });

      it('should filter tasks by project', async () => {
        const response = await request(app)
          .get(`/api/tasks?projectId=${projectId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        response.body.forEach((task: any) => {
          expect(task.projectId).toBe(projectId);
        });
      });
    });

    describe('PUT /api/tasks/:id', () => {
      it('should update task', async () => {
        const response = await request(app)
          .put(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            status: 'IN_PROGRESS',
            title: 'Updated Task Title',
          })
          .expect(200);

        expect(response.body).toMatchObject({
          id: taskId,
          status: 'IN_PROGRESS',
          title: 'Updated Task Title',
        });
      });

      it('should return 404 for non-existent task', async () => {
        await request(app)
          .put('/api/tasks/non-existent')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'DONE' })
          .expect(404);
      });
    });

    describe('DELETE /api/tasks/:id', () => {
      it('should delete task', async () => {
        await request(app)
          .delete(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);

        // Verify deletion
        await request(app)
          .get(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });
  });

  describe('Project API', () => {
    let projectId: string;

    describe('POST /api/projects', () => {
      it('should create a new project', async () => {
        const response = await request(app)
          .post('/api/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Integration Test Project',
            description: 'Test project for integration tests',
          })
          .expect(201);

        projectId = response.body.id;
        expect(response.body).toMatchObject({
          name: 'Integration Test Project',
          ownerId: userId,
        });
      });
    });

    describe('GET /api/projects', () => {
      it('should get all user projects', async () => {
        const response = await request(app)
          .get('/api/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.some((p: any) => p.id === projectId)).toBe(true);
      });
    });

    describe('POST /api/projects/:id/members', () => {
      it('should add member to project', async () => {
        const newUserId = 'new-member-1';
        mockDb.users.set(newUserId, {
          id: newUserId,
          email: 'member@example.com',
          name: 'New Member',
        });

        await request(app)
          .post(`/api/projects/${projectId}/members`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ userId: newUserId })
          .expect(200);
      });

      it('should return 403 for non-owner', async () => {
        const otherUserToken = jwt.sign({ userId: 'other-user' }, process.env.JWT_SECRET!);
        
        await request(app)
          .post(`/api/projects/${projectId}/members`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .send({ userId: 'some-user' })
          .expect(403);
      });
    });
  });
});