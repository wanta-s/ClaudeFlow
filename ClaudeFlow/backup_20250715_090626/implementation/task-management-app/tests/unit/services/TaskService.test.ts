import { TaskService } from '../../../backend/src/services/taskService';
import { TaskRepository } from '../../../backend/src/repositories/taskRepository';
import { AppError, ErrorCode } from '../../../backend/src/models/errors';
import { TaskStatus, TaskPriority } from '../../../backend/src/models/types';

describe('TaskService', () => {
  let taskService: TaskService;
  let taskRepository: jest.Mocked<TaskRepository>;

  beforeEach(() => {
    taskRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUser: jest.fn(),
      findByProject: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
    } as any;

    taskService = new TaskService(taskRepository);
  });

  describe('createTask', () => {
    const taskData = {
      title: 'Test Task',
      description: 'Test Description',
      projectId: 'project-1',
      assigneeId: 'user-1',
      dueDate: new Date('2024-12-31'),
      priority: TaskPriority.HIGH,
    };

    it('should create a new task successfully', async () => {
      const createdTask = {
        id: '1',
        ...taskData,
        status: TaskStatus.TODO,
        createdById: 'creator-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      taskRepository.create.mockResolvedValue(createdTask as any);

      const result = await taskService.createTask(taskData, 'creator-1');

      expect(taskRepository.create).toHaveBeenCalledWith({
        ...taskData,
        status: TaskStatus.TODO,
        createdById: 'creator-1',
      });
      expect(result).toEqual(createdTask);
    });

    it('should create task with default values', async () => {
      const minimalTaskData = {
        title: 'Minimal Task',
        projectId: 'project-1',
      };

      taskRepository.create.mockResolvedValue({} as any);

      await taskService.createTask(minimalTaskData, 'creator-1');

      expect(taskRepository.create).toHaveBeenCalledWith({
        ...minimalTaskData,
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        createdById: 'creator-1',
      });
    });
  });

  describe('updateTask', () => {
    const updateData = {
      title: 'Updated Task',
      status: TaskStatus.IN_PROGRESS,
    };

    it('should update task successfully', async () => {
      const existingTask = {
        id: '1',
        title: 'Original Task',
        createdById: 'user-1',
      };

      const updatedTask = {
        ...existingTask,
        ...updateData,
        updatedAt: new Date(),
      };

      taskRepository.findById.mockResolvedValue(existingTask as any);
      taskRepository.update.mockResolvedValue(updatedTask as any);

      const result = await taskService.updateTask('1', updateData, 'user-1');

      expect(taskRepository.findById).toHaveBeenCalledWith('1');
      expect(taskRepository.update).toHaveBeenCalledWith('1', updateData);
      expect(result).toEqual(updatedTask);
    });

    it('should throw error if task not found', async () => {
      taskRepository.findById.mockResolvedValue(null);

      await expect(
        taskService.updateTask('999', updateData, 'user-1')
      ).rejects.toThrow(new AppError(ErrorCode.TASK001, 404));

      expect(taskRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if user is not authorized', async () => {
      const existingTask = {
        id: '1',
        createdById: 'other-user',
        assigneeId: 'another-user',
      };

      taskRepository.findById.mockResolvedValue(existingTask as any);

      await expect(
        taskService.updateTask('1', updateData, 'user-1')
      ).rejects.toThrow(new AppError(ErrorCode.AUTH003, 403));
    });

    it('should allow assigned user to update task', async () => {
      const existingTask = {
        id: '1',
        createdById: 'other-user',
        assigneeId: 'user-1',
      };

      taskRepository.findById.mockResolvedValue(existingTask as any);
      taskRepository.update.mockResolvedValue({} as any);

      await taskService.updateTask('1', updateData, 'user-1');

      expect(taskRepository.update).toHaveBeenCalled();
    });
  });

  describe('getTasks', () => {
    it('should get tasks with filters', async () => {
      const filters = {
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        projectId: 'project-1',
      };

      const tasks = [
        { id: '1', title: 'Task 1' },
        { id: '2', title: 'Task 2' },
      ];

      taskRepository.search.mockResolvedValue(tasks as any);

      const result = await taskService.getTasks('user-1', filters);

      expect(taskRepository.search).toHaveBeenCalledWith({
        ...filters,
        userId: 'user-1',
      });
      expect(result).toEqual(tasks);
    });

    it('should get all user tasks without filters', async () => {
      const tasks = [{ id: '1', title: 'Task 1' }];

      taskRepository.search.mockResolvedValue(tasks as any);

      const result = await taskService.getTasks('user-1');

      expect(taskRepository.search).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(result).toEqual(tasks);
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      const task = {
        id: '1',
        createdById: 'user-1',
      };

      taskRepository.findById.mockResolvedValue(task as any);
      taskRepository.delete.mockResolvedValue(undefined);

      await taskService.deleteTask('1', 'user-1');

      expect(taskRepository.findById).toHaveBeenCalledWith('1');
      expect(taskRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw error if task not found', async () => {
      taskRepository.findById.mockResolvedValue(null);

      await expect(taskService.deleteTask('999', 'user-1')).rejects.toThrow(
        new AppError(ErrorCode.TASK001, 404)
      );

      expect(taskRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw error if user is not authorized', async () => {
      const task = {
        id: '1',
        createdById: 'other-user',
        assigneeId: 'another-user',
      };

      taskRepository.findById.mockResolvedValue(task as any);

      await expect(taskService.deleteTask('1', 'user-1')).rejects.toThrow(
        new AppError(ErrorCode.AUTH003, 403)
      );
    });
  });

  describe('getTaskStats', () => {
    it('should calculate task statistics', async () => {
      const tasks = [
        { status: TaskStatus.TODO, priority: TaskPriority.HIGH },
        { status: TaskStatus.TODO, priority: TaskPriority.MEDIUM },
        { status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH },
        { status: TaskStatus.DONE, priority: TaskPriority.LOW },
      ];

      taskRepository.findByUser.mockResolvedValue(tasks as any);

      const result = await taskService.getTaskStats('user-1');

      expect(result).toEqual({
        total: 4,
        byStatus: {
          [TaskStatus.TODO]: 2,
          [TaskStatus.IN_PROGRESS]: 1,
          [TaskStatus.DONE]: 1,
        },
        byPriority: {
          [TaskPriority.HIGH]: 2,
          [TaskPriority.MEDIUM]: 1,
          [TaskPriority.LOW]: 1,
        },
      });
    });
  });
});