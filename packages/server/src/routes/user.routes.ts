import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/errors.js';
import { User } from '../models/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /users/search
 * Search users by name or email
 */
const searchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().min(1).max(50).default(10),
});

router.get(
  '/search',
  validate(searchQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { q, limit } = req.query as unknown as { q: string; limit: number };

    const users = await User.find({
      $and: [
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
          ],
        },
        { _id: { $ne: req.user!._id } }, // Exclude current user
      ],
    })
      .select('name email avatar')
      .limit(limit);

    res.json({
      success: true,
      data: { users },
    });
  })
);

/**
 * GET /users/:id
 * Get user by ID (public info only)
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('name email avatar');

    if (!user) {
      res.status(404).json({
        success: false,
        error: { message: 'User not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: { user },
    });
  })
);

export default router;
