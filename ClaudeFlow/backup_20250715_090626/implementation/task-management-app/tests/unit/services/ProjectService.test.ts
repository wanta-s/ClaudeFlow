import { ProjectService } from '../../../backend/src/services/projectService';
import { ProjectRepository } from '../../../backend/src/repositories/projectRepository';
import { AppError, ErrorCode } from '../../../backend/src/models/errors';

describe('ProjectService', () => {
  let projectService: ProjectService;
  let projectRepository: jest.Mocked<ProjectRepository>;

  beforeEach(() => {
    projectRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUser: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addMember: jest.fn(),
      removeMember: jest.fn(),
      getMembers: jest.fn(),
    } as any;

    projectService = new ProjectService(projectRepository);
  });

  describe('createProject', () => {
    const projectData = {
      name: 'Test Project',
      description: 'Test Description',
    };

    it('should create a new project successfully', async () => {
      const createdProject = {
        id: '1',
        ...projectData,
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      projectRepository.create.mockResolvedValue(createdProject as any);

      const result = await projectService.createProject(projectData, 'user-1');

      expect(projectRepository.create).toHaveBeenCalledWith({
        ...projectData,
        ownerId: 'user-1',
      });
      expect(result).toEqual(createdProject);
    });
  });

  describe('updateProject', () => {
    const updateData = {
      name: 'Updated Project',
      description: 'Updated Description',
    };

    it('should update project successfully', async () => {
      const existingProject = {
        id: '1',
        name: 'Original Project',
        ownerId: 'user-1',
      };

      const updatedProject = {
        ...existingProject,
        ...updateData,
        updatedAt: new Date(),
      };

      projectRepository.findById.mockResolvedValue(existingProject as any);
      projectRepository.update.mockResolvedValue(updatedProject as any);

      const result = await projectService.updateProject('1', updateData, 'user-1');

      expect(projectRepository.findById).toHaveBeenCalledWith('1');
      expect(projectRepository.update).toHaveBeenCalledWith('1', updateData);
      expect(result).toEqual(updatedProject);
    });

    it('should throw error if project not found', async () => {
      projectRepository.findById.mockResolvedValue(null);

      await expect(
        projectService.updateProject('999', updateData, 'user-1')
      ).rejects.toThrow(new AppError(ErrorCode.PROJECT001, 404));

      expect(projectRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if user is not owner', async () => {
      const existingProject = {
        id: '1',
        ownerId: 'other-user',
      };

      projectRepository.findById.mockResolvedValue(existingProject as any);

      await expect(
        projectService.updateProject('1', updateData, 'user-1')
      ).rejects.toThrow(new AppError(ErrorCode.AUTH003, 403));
    });
  });

  describe('addMember', () => {
    it('should add member to project successfully', async () => {
      const project = {
        id: '1',
        ownerId: 'user-1',
      };

      projectRepository.findById.mockResolvedValue(project as any);
      projectRepository.addMember.mockResolvedValue(undefined);

      await projectService.addMember('1', 'new-member', 'user-1');

      expect(projectRepository.findById).toHaveBeenCalledWith('1');
      expect(projectRepository.addMember).toHaveBeenCalledWith('1', 'new-member');
    });

    it('should throw error if user is not owner', async () => {
      const project = {
        id: '1',
        ownerId: 'other-user',
      };

      projectRepository.findById.mockResolvedValue(project as any);

      await expect(
        projectService.addMember('1', 'new-member', 'user-1')
      ).rejects.toThrow(new AppError(ErrorCode.AUTH003, 403));

      expect(projectRepository.addMember).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('should remove member from project successfully', async () => {
      const project = {
        id: '1',
        ownerId: 'user-1',
      };

      projectRepository.findById.mockResolvedValue(project as any);
      projectRepository.removeMember.mockResolvedValue(undefined);

      await projectService.removeMember('1', 'member-id', 'user-1');

      expect(projectRepository.findById).toHaveBeenCalledWith('1');
      expect(projectRepository.removeMember).toHaveBeenCalledWith('1', 'member-id');
    });

    it('should throw error if trying to remove owner', async () => {
      const project = {
        id: '1',
        ownerId: 'user-1',
      };

      projectRepository.findById.mockResolvedValue(project as any);

      await expect(
        projectService.removeMember('1', 'user-1', 'user-1')
      ).rejects.toThrow(new AppError(ErrorCode.PROJECT002, 400));

      expect(projectRepository.removeMember).not.toHaveBeenCalled();
    });
  });

  describe('getProjects', () => {
    it('should get all user projects', async () => {
      const projects = [
        { id: '1', name: 'Project 1' },
        { id: '2', name: 'Project 2' },
      ];

      projectRepository.findByUser.mockResolvedValue(projects as any);

      const result = await projectService.getProjects('user-1');

      expect(projectRepository.findByUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(projects);
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      const project = {
        id: '1',
        ownerId: 'user-1',
      };

      projectRepository.findById.mockResolvedValue(project as any);
      projectRepository.delete.mockResolvedValue(undefined);

      await projectService.deleteProject('1', 'user-1');

      expect(projectRepository.findById).toHaveBeenCalledWith('1');
      expect(projectRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw error if project not found', async () => {
      projectRepository.findById.mockResolvedValue(null);

      await expect(
        projectService.deleteProject('999', 'user-1')
      ).rejects.toThrow(new AppError(ErrorCode.PROJECT001, 404));

      expect(projectRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw error if user is not owner', async () => {
      const project = {
        id: '1',
        ownerId: 'other-user',
      };

      projectRepository.findById.mockResolvedValue(project as any);

      await expect(
        projectService.deleteProject('1', 'user-1')
      ).rejects.toThrow(new AppError(ErrorCode.AUTH003, 403));
    });
  });
});