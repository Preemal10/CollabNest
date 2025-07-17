import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/errors.js';

// Validation target
type ValidationTarget = 'body' | 'query' | 'params';

// Validation middleware factory
export function validate<T>(
  schema: ZodSchema<T>,
  target: ValidationTarget = 'body'
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req[target];
      const validated = await schema.parseAsync(data);
      
      // Replace with validated/transformed data
      req[target] = validated as typeof req[typeof target];
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        
        for (const issue of error.issues) {
          const path = issue.path.join('.') || target;
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(issue.message);
        }
        
        next(ApiError.validationError('Validation failed', { fields: details }));
      } else {
        next(error);
      }
    }
  };
}

// Validate multiple targets at once
export function validateAll<
  TBody,
  TQuery,
  TParams
>(schemas: {
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  params?: ZodSchema<TParams>;
}) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors: Record<string, string[]> = {};

      // Validate body
      if (schemas.body) {
        try {
          req.body = await schemas.body.parseAsync(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            for (const issue of error.issues) {
              const path = `body.${issue.path.join('.')}`;
              if (!errors[path]) {
                errors[path] = [];
              }
              errors[path].push(issue.message);
            }
          }
        }
      }

      // Validate query
      if (schemas.query) {
        try {
          req.query = await schemas.query.parseAsync(req.query) as typeof req.query;
        } catch (error) {
          if (error instanceof ZodError) {
            for (const issue of error.issues) {
              const path = `query.${issue.path.join('.')}`;
              if (!errors[path]) {
                errors[path] = [];
              }
              errors[path].push(issue.message);
            }
          }
        }
      }

      // Validate params
      if (schemas.params) {
        try {
          req.params = await schemas.params.parseAsync(req.params) as typeof req.params;
        } catch (error) {
          if (error instanceof ZodError) {
            for (const issue of error.issues) {
              const path = `params.${issue.path.join('.')}`;
              if (!errors[path]) {
                errors[path] = [];
              }
              errors[path].push(issue.message);
            }
          }
        }
      }

      // If any errors, throw validation error
      if (Object.keys(errors).length > 0) {
        throw ApiError.validationError('Validation failed', { fields: errors });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Common param schemas
import { z } from 'zod';

export const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
