/**
 * Express Application Configuration
 * Main app setup with middleware and routes
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app = express();

  // ============================================================
  // Security Middleware
  // ============================================================
  app.use(helmet());
  app.use(cors({
    origin: [
      process.env.CORS_ORIGIN || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    credentials: true,
  }));

  // ============================================================
  // Request Parsing
  // ============================================================
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ============================================================
  // Logging
  // ============================================================
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // ============================================================
  // Health Check
  // ============================================================
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      modules: {
        auth: 'M1 - Authentication with JWT & rate limiting',
        profiles: 'M2 - User profiles with media upload',
        posts: 'M3 - Posts & feed with caching',
        comments: 'M4 - Threaded comments with mentions',
        groups: 'M5 - Groups with RBAC permissions',
        social: 'M6 - Follow/block social graph',
        notifications: 'M7 - Real-time notifications',
        admin: 'M8 - Admin panel with 2FA',
      },
    });
  });

  // ============================================================
  // API Routes — wired by bootstrap.ts
  // Health check and CORS are set up here.
  // Real module routes + 404/error handlers are added by bootstrap().
  // ============================================================

  return app;
}

export default createApp;
