import express from 'express';
import {
    addCurrentMember,
    updateMember,
    deleteMember,
    getArchive
} from '../controllers/committeeController';
import { protect, authorize } from '../middleware/auth';
import upload from '../config/multer';

const router = express.Router();

// Current Committee
router.post('/current', protect, authorize('admin'), upload.single('photo'), addCurrentMember);
router.put('/current/:id', protect, authorize('admin'), upload.single('photo'), updateMember);
router.delete('/current/:id', protect, authorize('admin'), deleteMember);

// Archive
router.get('/archive', getArchive);

export default router;
