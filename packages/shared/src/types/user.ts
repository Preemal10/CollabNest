import { z } from 'zod';

// Base user schema
export const UserSchema = z.object({
  _id: z.string(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  avatar: z.string().url().optional(),
  passwordHash: z.string().optional(),
  oauthProvider: z.enum(['local', 'google', 'github']).default('local'),
  oauthId: z.string().optional(),
  isEmailVerified: z.boolean().default(false),
  lastLoginAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

// Public user info (safe to expose)
export const PublicUserSchema = UserSchema.pick({
  _id: true,
  email: true,
  name: true,
  avatar: true,
});

export type PublicUser = z.infer<typeof PublicUserSchema>;

// User creation payload
export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
});

export type CreateUserPayload = z.infer<typeof CreateUserSchema>;

// User login payload
export const LoginUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginUserPayload = z.infer<typeof LoginUserSchema>;

// User update payload
export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().optional(),
});

export type UpdateUserPayload = z.infer<typeof UpdateUserSchema>;

// Auth tokens
export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export type AuthTokens = z.infer<typeof AuthTokensSchema>;

// Auth response
export const AuthResponseSchema = z.object({
  user: PublicUserSchema,
  tokens: AuthTokensSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
