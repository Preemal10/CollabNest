import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { type Application, json } from 'express';
import { type Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';

// Context interface
interface Context {
  userId: string;
}

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Initialize Apollo Server
export async function initializeGraphQL(
  app: Application,
  httpServer: HttpServer
): Promise<ApolloServer<Context>> {
  const server = new ApolloServer<Context>({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (error) => {
      logger.error('GraphQL Error:', error);
      return {
        message: error.message,
        locations: error.locations,
        path: error.path,
        extensions: {
          code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
        },
      };
    },
  });

  await server.start();

  // Apply middleware
  app.use(
    '/graphql',
    json(),
    expressMiddleware(server, {
      context: async ({ req }): Promise<Context> => {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new Error('Authentication required');
        }

        const token = authHeader.replace('Bearer ', '');

        try {
          const decoded = jwt.verify(token, config.JWT_SECRET) as { sub: string };
          return { userId: decoded.sub };
        } catch {
          throw new Error('Invalid or expired token');
        }
      },
    })
  );

  logger.info('GraphQL server initialized at /graphql');

  return server;
}

export { typeDefs, resolvers, schema };
