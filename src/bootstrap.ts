/**
 * Bootstrap Module
 * Wires all dependencies and mounts real routes
 */

import { PrismaClient } from '@prisma/client';
import { Application, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import multer from 'multer';
import sharp from 'sharp';

// Auth
import { AuthService } from './auth/auth.service';
import { JwtTokenManager } from './auth/token.manager';
import { InMemoryRateLimiter } from './auth/rate.limiter';
import { BcryptPasswordHasher } from './auth/password.hasher';
import { MockEmailService } from './auth/email.service';
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
import { GroupService } from './groups/group.service';
import { GroupController } from './groups/group.controller';
import { RBACService } from './groups/rbac.service';
import { MembershipService } from './groups/membership.service';
import { createGroupRoutes } from './groups/group.routes';
import {
  PrismaGroupRepository,
  PrismaMemberRepository,
  NoopRequestRepository,
  NoopPermissionCache,
  NoopAuditLogger,
} from './groups/prisma-group.repository';

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

  // Auto-create user profile on registration
  prisma.$use(async (params, next) => {
    const result = await next(params);
    if (params.model === 'User' && params.action === 'create' && result?.id) {
      try {
        await prisma.userProfile.create({
          data: { userId: result.id, displayName: result.username || null },
        });
      } catch {
        // Profile may already exist (race condition) — ignore
      }
    }
    return result;
  });

  // Shared pg Pool for modules using raw SQL
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query('SELECT 1');
  console.log('✅ Database connected (pg Pool)');

  const apiPrefix = `/api/${process.env.API_VERSION || 'v1'}`;
  const eventEmitter = new EventEmitter();

  // ================================================================
  // Auth module (Prisma-backed)
  // ================================================================
  const tokenManager = new JwtTokenManager();
  const rateLimiter = new InMemoryRateLimiter();
  const passwordHasher = new BcryptPasswordHasher();
  const emailService = new MockEmailService();
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

  // Account management endpoints (change username/email/password, delete account)
  app.post(`${apiPrefix}/auth/change-username`, authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      const { username } = req.body;
      if (!username || username.length < 3 || username.length > 50) {
        return res.status(400).json({ success: false, error: 'INVALID_USERNAME', message: 'Username must be 3-50 characters' });
      }
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing && existing.id !== userId) {
        return res.status(409).json({ success: false, error: 'USERNAME_TAKEN', message: 'Username already taken' });
      }
      const user = await prisma.user.update({ where: { id: userId }, data: { username } });
      res.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'INTERNAL', message: err.message });
    }
  });

  app.post(`${apiPrefix}/auth/change-email`, authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: 'Email and password are required' });
      }
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!currentUser) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      const valid = await passwordHasher.compare(password, currentUser.passwordHash);
      if (!valid) return res.status(403).json({ success: false, error: 'WRONG_PASSWORD', message: 'Incorrect password' });
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== userId) {
        return res.status(409).json({ success: false, error: 'EMAIL_TAKEN', message: 'Email already in use' });
      }
      const user = await prisma.user.update({ where: { id: userId }, data: { email } });
      res.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'INTERNAL', message: err.message });
    }
  });

  app.post(`${apiPrefix}/auth/change-password`, authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: 'Current and new password are required' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, error: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' });
      }
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!currentUser) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      const valid = await passwordHasher.compare(currentPassword, currentUser.passwordHash);
      if (!valid) return res.status(403).json({ success: false, error: 'WRONG_PASSWORD', message: 'Incorrect password' });
      const hashed = await passwordHasher.hash(newPassword);
      await prisma.user.update({ where: { id: userId }, data: { passwordHash: hashed } });
      res.json({ success: true, message: 'Password changed' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'INTERNAL', message: err.message });
    }
  });

  app.post(`${apiPrefix}/auth/delete-account`, authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      const { password } = req.body;
      if (!password) return res.status(400).json({ success: false, error: 'MISSING_PASSWORD' });
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!currentUser) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      const valid = await passwordHasher.compare(password, currentUser.passwordHash);
      if (!valid) return res.status(403).json({ success: false, error: 'WRONG_PASSWORD', message: 'Incorrect password' });
      // Soft delete: mark as inactive and set deletedAt
      await prisma.user.update({ where: { id: userId }, data: { isActive: false, deletedAt: new Date() } });
      res.json({ success: true, message: 'Account deleted' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'INTERNAL', message: err.message });
    }
  });
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

  // Comments endpoints (Prisma-based MVP)
  app.post(`${apiPrefix}/posts/:postId/comments`, authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      const { postId } = req.params;
      const { content, parentCommentId } = req.body;
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'INVALID_CONTENT' });
      }
      const comment = await prisma.comment.create({
        data: {
          postId,
          authorId: userId,
          content: content.trim(),
          parentCommentId: parentCommentId || null,
        },
        include: { author: { select: { id: true, username: true } } },
      });
      // Increment comment count on post
      await prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });
      res.status(201).json({ success: true, data: comment });
    } catch (err: any) {
      console.error('Comment create error:', err);
      res.status(500).json({ success: false, error: 'INTERNAL', message: err.message });
    }
  });

  app.get(`${apiPrefix}/posts/:postId/comments`, authMiddleware, async (req: any, res: Response) => {
    try {
      const { postId } = req.params;
      const comments = await prisma.comment.findMany({
        where: { postId, deletedAt: null },
        include: { author: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'asc' },
      });
      res.json({ success: true, data: comments });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'INTERNAL', message: err.message });
    }
  });

  app.delete(`${apiPrefix}/comments/:commentId`, authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      const { commentId } = req.params;
      const comment = await prisma.comment.findUnique({ where: { id: commentId } });
      if (!comment) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      if (comment.authorId !== userId) return res.status(403).json({ success: false, error: 'FORBIDDEN' });
      await prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
      await prisma.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'INTERNAL', message: err.message });
    }
  });
  console.log('  ✅ Post/Feed/Comment routes mounted');

  // ================================================================
  // Profiles module (auto-creates repos from DATABASE_URL)
  // ================================================================
  app.use(`${apiPrefix}/profiles`, createProfileRoutes(authMiddleware as any));

  // Avatar upload endpoint (multer + sharp → base64 data URL → Prisma)
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
  app.post(`${apiPrefix}/profiles/me/avatar`, authMiddleware, upload.single('avatar'), async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      if (!req.file) return res.status(400).json({ success: false, error: 'NO_FILE', message: 'No file uploaded' });

      const resized = await sharp(req.file.buffer)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();

      const dataUrl = `data:image/jpeg;base64,${resized.toString('base64')}`;

      await prisma.userProfile.update({
        where: { userId },
        data: { avatarUrl: dataUrl },
      });

      res.json({ success: true, data: { avatarUrl: dataUrl } });
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      res.status(500).json({ success: false, error: 'UPLOAD_FAILED', message: err.message });
    }
  });
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
  // Groups module (Prisma-backed CRUD + membership)
  // ================================================================
  const prismaGroupRepository = new PrismaGroupRepository(prisma);
  const prismaMemberRepository = new PrismaMemberRepository(prisma);
  const noopRequestRepository = new NoopRequestRepository();
  const noopPermissionCache = new NoopPermissionCache();
  const noopAuditLogger = new NoopAuditLogger();

  const rbacService = new RBACService(prismaMemberRepository as any, noopPermissionCache as any);
  const membershipService = new MembershipService(
    prismaMemberRepository as any,
    noopRequestRepository as any,
    prismaGroupRepository as any,
    noopAuditLogger,
  );
  const groupService = new GroupService(
    prismaGroupRepository,
    prismaMemberRepository as any,
    rbacService,
    membershipService,
    noopAuditLogger,
  );
  const groupController = new GroupController(groupService);
  app.use(`${apiPrefix}/groups`, authMiddleware, createGroupRoutes(groupController));
  console.log('  ✅ Group CRUD routes mounted');

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
