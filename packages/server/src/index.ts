import { createServer } from 'http';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';
import { initializeWebSocket, setSocketInstance } from './websocket/index.js';
import { initializeGraphQL } from './graphql/index.js';

// Main entry point
async function main(): Promise<void> {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();

    // Create Express app
    const app = createApp();

    // Create HTTP server (needed for Socket.io)
    const server = createServer(app);

    // Initialize Socket.io server
    const io = initializeWebSocket(server);
    setSocketInstance(io);

    // Initialize GraphQL server
    await initializeGraphQL(app, server);

    // Start server
    server.listen(config.PORT, () => {
      logger.info(`Server running on http://${config.HOST}:${config.PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info(`API: http://${config.HOST}:${config.PORT}/api`);
      logger.info(`GraphQL: http://${config.HOST}:${config.PORT}/graphql`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run
main();
