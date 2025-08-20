import type { PublicUser } from '@collabnest/shared';

// Extend Express Request type to include our custom user
declare global {
  namespace Express {
    interface User {
      _id: string;
      email: string;
      name: string;
      avatar?: string;
    }
    
    interface Request {
      token?: string;
    }
  }
}

export {};
