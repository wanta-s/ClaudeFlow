import { PrismaClient, User } from '@prisma/client'

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    email: string
    passwordHash: string
    name: string
  }): Promise<User> {
    return this.prisma.user.create({
      data,
    })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    })
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    })
  }

  async update(
    id: string,
    data: Partial<{ email: string; name: string }>
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    })
  }

  async exists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email },
    })
    return count > 0
  }
}