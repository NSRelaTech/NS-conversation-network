/**
 * Bootstrap Module
 * Wires all dependencies and mounts real routes
 */

import { PrismaClient } from '@prisma/client';
import { Application, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { EventEmitter } from 'events';

// Auth
import { AuthService } from './auth/auth.service';
import { TokenManager } from './auth/token.manager';
import { InMemoryRateLimiter } from './auth/rate.limiter';
import { PasswordHasher } from './auth/password.hasher';
import { EmailService } from './auth/email.service';
import { PrismaUserRepository } from './auth/prisma-user.repository';
import { PrismaTokenRepository } from './auth/prisma-token.repository';
import { createAuthRouter, createAuthMiddleware } from './auth/auth.routes';

// Posts
import { PostRepository } from './posts/post.repository';
import { FeedRepository } from './posts/feed.repository';
import { ReactionRepository } from './posts/reaction.repository';
import { PostService } from './posts/post.service';
import { FeedService } from './posts/feed.service';
import { ReactionService } from './posts/reaction.service';
import { CacheService } from './posts/cache.service';
import { SanitizerService } from './posts/sanitizer';
import { PostController } from './posts/post.controller';
import {
  createPostRoutes,
  createFeedRoutes,
  createGroupFeedRoutes,
  createUserProfileRoutes,
} from './posts/post.routes';

// Groups
import { GroupMemberRepository } from './groups/group-member.repository';

// Social
import { FollowRepository } from './social/follow.repository';

// Profiles
import { createProfileRoutes } from './profiles/profile.routes';

// Social routes
import { createSocialRoutes } from './social/follow.routes';
import { FollowController } from './social/follow.controller';
import { FollowService } from './social/follow.service';
import { BlockService } from './social/block.service';

export async function bootstrap(app: Application): Promise<{ prisma: PrismaClient; pool: Pool }> {
  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log('✅ Database connected (Prisma)');

  // Shared pg Pool for modules using raw SQL
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query('SELECT 1');
  console.log('✅ Database connected (pg Pool)');

  const apiPrefix = `/api/${process.env.API_VERSION || 'v1'}`;
  const eventEmitter = new EventEmitter();

  // ================================================================
  // Auth module (Prisma-backed)
  // ================================================================
  const tokenManager = new TokenManager();
  const rateLimiter = new InMemoryRateLimiter();
  const passwordHasher = new PasswordHasher();
  const emailService = new EmailService();
  const userRepository = new PrismaUserRepository(prisma);
  const tokenRepository = new PrismaTokenRepository(prisma);

  const authService = new AuthService({
    userRepository,
    tokenRepository,
    tokenManager,
    rateLimiter,
    passwordHasher,
    emailService,
  });

  const authMiddleware = createAuthMiddleware(tokenManager);
  const authRouter = createAuthRouter(authService);
  app.use(`${apiPrefix}/auth`, authRouter);
  console.log('  ✅ Auth routes mounted');

  // ================================================================
  // Posts module (pg Pool + memory cache)
  // ================================================================
  const cacheService = new CacheService(); // memory-only LRU, no Redis
  const sanitizerService = new SanitizerService();

  const postRepository = new PostRepository({ pool });
  const feedRepository = new FeedRepository({ pool });
  const reactionRepository = new ReactionRepository({ pool });

  // FeedService needs FollowRepository and GroupMemberRepository
  const followRepository = new FollowRepository({ pool });
  const groupMemberRepository = new GroupMemberRepository({ pool });

  const postService = new PostService(postRepository, sanitizerService, cacheService, eventEmitter);
  const feedService = new FeedService(feedRepository, cacheService, followRepository, groupMemberRepository);
  const reactionService = new ReactionService(reactionRepository, postRepository, cacheService, eventEmitter);

  const postController = new PostController(postService, feedService, reactionService);

  app.use(`${apiPrefix}/posts`, authMiddleware, createPostRoutes(postController));
  app.use(`${apiPrefix}/feed`, authMiddleware, createFeedRoutes(postController));
  app.use(`${apiPrefix}/groups`, authMiddleware, createGroupFeedRoutes(postController));
  app.use(`${apiPrefix}/users`, authMiddleware, createUserProfileRoutes(postController));
  console.log('  ✅ Post/Feed routes mounted');

  // ================================================================
  // Profiles module (auto-creates repos from DATABASE_URL)
  // ================================================================
  app.use(`${apiPrefix}/profiles`, createProfileRoutes(authMiddleware));
  console.log('  ✅ Profile routes mounted');

  // ================================================================
  // Social module (follow/block)
  // ================================================================
  // Create no-op stubs for interfaces not needed for MVP
  const noopEventPublisher = { publish: async () => {} };
  const noopBlockRepository = {
    create: async () => ({ id: '', blockerId: '', blockedId: '', reason: null, createdAt: new Date() }),
    findByPair: async () => null,
    delete: async () => {},
    deleteByPair: async () => {},
    findBlocks: async () => ({ data: [], total: 0 }),
    isBlocked: async () => false,
    isBidirectionallyBlocked: async () => false,
  };
  const noopUserProfileRepository = {
    findByUserId: async () => null,
    exists: async () => true,
    incrementFollowerCount: async () => {},
    decrementFollowerCount: async () => {},
    incrementFollowingCount: async () => {},
    decrementFollowingCount: async () => {},
  };

  const followService = new FollowService(
    followRepository as any,
    noopBlockRepository as any,
    noopUserProfileRepository as any,
    noopEventPublisher as any,
  );
  const blockService = new BlockService(
    noopBlockRepository as any,
    followRepository as any,
    noopUserProfileRepository as any,
    noopEventPublisher as any,
  );
  const followController = new FollowController(followService, blockService);
  app.use(`${apiPrefix}/social`, createSocialRoutes(followController, authMiddleware));
  console.log('  ✅ Social routes mounted');

  // ================================================================
  // 404 Handler (must come after all routes)
  // ================================================================
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  // ================================================================
  // Global Error Handler
  // ================================================================
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);

    const statusCode = (err as any).statusCode || 500;
    const errorCode = (err as any).code || 'INTERNAL_ERROR';

    res.status(statusCode).json({
      success: false,
      error: errorCode,
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
  });

  return { prisma, pool };
}
