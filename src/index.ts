/**
 * Application Entry Point
 * Starts the Express server and initializes all services
 */

import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import { createApp } from './app';
import { bootstrap } from './bootstrap';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start(): Promise<void> {
  try {
    console.log('🚀 Starting NS Conversation Network API...');
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

    // Create Express app (middleware only)
    const app = createApp();

    // Wire dependencies and mount routes
    const { prisma, pool } = await bootstrap(app);

    // Start server
    const server = app.listen(PORT, HOST, () => {
      console.log(`✅ Server running at http://${HOST}:${PORT}`);
      console.log(`   API Base: http://${HOST}:${PORT}/api/${process.env.API_VERSION || 'v1'}`);
      console.log(`   Health: http://${HOST}:${PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        await pool.end();
        console.log('Server closed.');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
