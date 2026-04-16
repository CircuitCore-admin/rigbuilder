import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, optionalAuth } from '../middleware/authenticate';
import { sanitize } from '../middleware/sanitize';

const router = Router();

router.get('/id/:id', UserController.getById);
router.get('/blocked', authenticate, UserController.getBlockedUsers);
router.put('/profile', authenticate, sanitize, UserController.updateProfile);
router.get('/:username', optionalAuth, UserController.getByUsername);
router.get('/:username/threads', UserController.getUserThreads);
router.get('/:username/listings', UserController.getUserListings);
router.get('/:username/reviews', UserController.getUserReviews);
router.post('/:username/block', authenticate, UserController.toggleBlock);
router.get('/:username/block', optionalAuth, UserController.isBlocked);
router.post('/:username/follow', authenticate, UserController.toggleFollow);
router.get('/:username/followers', UserController.getFollowers);
router.get('/:username/following', UserController.getFollowing);
router.get('/:username/is-following', optionalAuth, UserController.isFollowing);

export default router;
