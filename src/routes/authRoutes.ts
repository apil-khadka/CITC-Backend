import express from 'express';
import {  googleLogin, getMe, login } from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/login', login);
router.post('/google-login', googleLogin);
router.get('/me', protect, getMe);

export default router;
