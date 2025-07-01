// Application constants

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// File upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_ATTACHMENTS_PER_TASK = 20;

// Task limits
export const MAX_TASK_TITLE_LENGTH = 200;
export const MAX_TASK_DESCRIPTION_LENGTH = 10000;
export const MAX_CHECKLIST_ITEMS = 50;
export const MAX_LABELS_PER_TASK = 10;
export const MAX_ASSIGNEES_PER_TASK = 10;

// Comment limits
export const MAX_COMMENT_LENGTH = 5000;

// Board limits
export const MAX_COLUMNS_PER_BOARD = 20;
export const MAX_BOARDS_PER_PROJECT = 10;

// Project limits
export const MAX_PROJECTS_PER_ORGANIZATION = 100;
export const MAX_MEMBERS_PER_PROJECT = 100;

// Organization limits
export const MAX_MEMBERS_PER_ORGANIZATION = 500;

// Session/Token
export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '7d';
export const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 100;
export const AUTH_RATE_LIMIT_MAX_REQUESTS = 10;

// Cache TTL (in seconds)
export const CACHE_TTL = {
  BOARD: 300, // 5 minutes
  PROJECT: 600, // 10 minutes
  USER: 900, // 15 minutes
  NOTIFICATIONS: 300, // 5 minutes
  SESSION: 7 * 24 * 60 * 60, // 7 days
} as const;

// WebSocket
export const WS_RECONNECT_INTERVAL = 3000; // 3 seconds
export const WS_MAX_RECONNECT_ATTEMPTS = 10;
export const WS_PING_INTERVAL = 30000; // 30 seconds
export const WS_PING_TIMEOUT = 5000; // 5 seconds

// Typing indicator
export const TYPING_INDICATOR_TIMEOUT = 3000; // 3 seconds

// Colors for labels/columns
export const PRESET_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#6B7280', // Gray
] as const;

// Priority colors
export const PRIORITY_COLORS = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#F97316',
  urgent: '#EF4444',
} as const;

// Status colors (for default columns)
export const STATUS_COLORS = {
  todo: '#6B7280',
  in_progress: '#3B82F6',
  review: '#F59E0B',
  done: '#10B981',
} as const;

// Date formats
export const DATE_FORMAT = {
  SHORT: 'MMM d',
  MEDIUM: 'MMM d, yyyy',
  LONG: 'MMMM d, yyyy',
  TIME: 'h:mm a',
  DATETIME: 'MMM d, yyyy h:mm a',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
} as const;

// Regex patterns
export const PATTERNS = {
  SLUG: /^[a-z0-9-]+$/,
  HEX_COLOR: /^#[0-9A-Fa-f]{6}$/,
  MENTION: /@\[([^\]]+)\]\(([^)]+)\)/g, // @[Name](userId)
  URL: /https?:\/\/[^\s]+/g,
} as const;
