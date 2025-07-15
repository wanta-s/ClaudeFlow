import bcrypt from 'bcrypt'
import { User } from '@prisma/client'
import { UserRepository } from '../repositories/userRepository'
import { AppError, ErrorCode } from '../models/errors'

export class UserService {
  constructor(
    private userRepository: UserRepository,
    private bcryptSaltRounds: number = 10
  ) {}

  async createUser(userData: {
    email: string
    password: string
    name: string
  }): Promise<Omit<User, 'passwordHash'>> {
    // Check if user already exists
    const exists = await this.userRepository.exists(userData.email)
    if (exists) {
      throw new AppError(ErrorCode.USER002, 409)
    }

    // Hash password
    const passwordHash = await this.hashPassword(userData.password)

    // Create user
    const user = await this.userRepository.create({
      email: userData.email,
      passwordHash,
      name: userData.name,
    })

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email)
  }

  async findById(id: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.userRepository.findById(id)
    if (!user) return null

    const { passwordHash, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  async updateUser(
    id: string,
    data: { email?: string; name?: string }
  ): Promise<Omit<User, 'passwordHash'>> {
    // If email is being updated, check if it's already taken
    if (data.email) {
      const existingUser = await this.userRepository.findByEmail(data.email)
      if (existingUser && existingUser.id !== id) {
        throw new AppError(ErrorCode.USER002, 409)
      }
    }

    const updatedUser = await this.userRepository.update(id, data)
    const { passwordHash, ...userWithoutPassword } = updatedUser
    return userWithoutPassword
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptSaltRounds)
  }
}