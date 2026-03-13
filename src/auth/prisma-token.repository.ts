import { PrismaClient } from '@prisma/client';
import { RefreshToken, TokenRepository } from './auth.types';

export class PrismaTokenRepository implements TokenRepository {
  constructor(private prisma: PrismaClient) {}

  async saveRefreshToken(token: Omit<RefreshToken, 'id'>): Promise<RefreshToken> {
    const saved = await this.prisma.refreshToken.create({
      data: {
        userId: token.userId,
        token: token.tokenHash,
        family: 'default',
        expiresAt: token.expiresAt,
        isRevoked: false,
      },
    });
    return this.toDomain(saved);
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
    });
    return token ? this.toDomain(token) : null;
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: tokenHash },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  async updateLastUsed(_id: string): Promise<void> {
    // Prisma RefreshToken doesn't have lastUsedAt — skip for MVP
  }

  async deleteExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  private toDomain(t: any): RefreshToken {
    return {
      id: t.id,
      userId: t.userId,
      tokenHash: t.token,
      expiresAt: t.expiresAt,
      isRevoked: t.isRevoked,
      createdAt: t.createdAt,
      lastUsedAt: t.createdAt,
    };
  }
}
