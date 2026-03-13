import { PrismaClient } from '@prisma/client';
import { User, UserRepository, CreateUserData } from './auth.types';

export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toDomain(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toDomain(user) : null;
  }

  async findByVerificationToken(_tokenHash: string): Promise<User | null> {
    // Prisma schema doesn't have emailVerificationToken on User
    // MVP: auto-verify users (skip email verification)
    return null;
  }

  async findByPasswordResetToken(_tokenHash: string): Promise<User | null> {
    // MVP: skip password reset flow
    return null;
  }

  async create(data: CreateUserData): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        isVerified: true, // MVP: auto-verify
        isActive: true,
      },
    });
    return this.toDomain(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.passwordHash && { passwordHash: data.passwordHash }),
      },
    });
    return this.toDomain(user);
  }

  async incrementFailedAttempts(_id: string): Promise<void> {
    // MVP: no failedLoginAttempts column in Prisma schema
  }

  async resetFailedAttempts(_id: string): Promise<void> {
    // MVP: no-op
  }

  async setAccountLocked(_id: string, _lockedUntil: Date): Promise<void> {
    // MVP: no-op
  }

  async savePasswordResetToken(_id: string, _tokenHash: string, _expiry: Date): Promise<void> {
    // MVP: no-op
  }

  async clearPasswordResetToken(_id: string): Promise<void> {
    // MVP: no-op
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async setEmailVerified(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { isVerified: true } });
  }

  private toDomain(prismaUser: any): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      passwordHash: prismaUser.passwordHash,
      emailVerified: prismaUser.isVerified,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
      passwordResetToken: null,
      passwordResetExpiry: null,
      accountLocked: false,
      lockoutExpiry: null,
      failedLoginAttempts: 0,
      lastFailedLogin: null,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }
}
