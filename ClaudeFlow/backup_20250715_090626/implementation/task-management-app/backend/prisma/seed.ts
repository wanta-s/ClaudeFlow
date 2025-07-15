import { PrismaClient, TaskStatus, TaskPriority } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create test users
  const password = await bcrypt.hash('testpassword123', 10)
  
  const user1 = await prisma.user.create({
    data: {
      email: 'john.doe@example.com',
      passwordHash: password,
      name: 'John Doe',
      tasks: {
        create: [
          {
            title: 'Complete project documentation',
            description: 'Write comprehensive documentation for the new feature',
            status: TaskStatus.IN_PROGRESS,
            priority: TaskPriority.HIGH,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          },
          {
            title: 'Review pull requests',
            description: 'Review and merge pending pull requests',
            status: TaskStatus.PENDING,
            priority: TaskPriority.MEDIUM,
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          },
          {
            title: 'Update dependencies',
            description: 'Update project dependencies to latest versions',
            status: TaskStatus.COMPLETED,
            priority: TaskPriority.LOW,
          },
        ],
      },
    },
  })

  const user2 = await prisma.user.create({
    data: {
      email: 'jane.smith@example.com',
      passwordHash: password,
      name: 'Jane Smith',
      tasks: {
        create: [
          {
            title: 'Design new UI components',
            description: 'Create mockups for the new dashboard',
            status: TaskStatus.PENDING,
            priority: TaskPriority.HIGH,
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          },
          {
            title: 'Fix bug in authentication',
            description: 'Resolve token refresh issue',
            status: TaskStatus.IN_PROGRESS,
            priority: TaskPriority.HIGH,
            dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
          },
        ],
      },
    },
  })

  console.log('Database seed completed!')
  console.log(`Created users: ${user1.email}, ${user2.email}`)
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })