import { Request, Response } from 'express';
import { getTeamsDB } from '../db/db';
import { IMember } from '../db/schema';
import crypto from 'crypto';
import path from 'path';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

const generateId = () => crypto.randomUUID();

// Helper to sanitize type input
const sanitizeMemberType = (type: any): IMember['type'] => {
  const t = String(type).trim();
  const validTypes: IMember['type'][] = ['Executive', 'Faculty Advisor', 'Mentor', 'Alumni'];
  return validTypes.includes(t as IMember['type']) ? (t as IMember['type']) : 'Executive';
};

// -------------------------------------------------------------------------- //
// CREATE CURRENT MEMBER (POST /api/committee/current)
// -------------------------------------------------------------------------- //
export const addCurrentMember = async (req: AuthRequest, res: Response) => {
  try {
    const db = getTeamsDB();

    const {
      name,
      college_year,
      // member_year, // If not provided, default to current year
      email,
      type,
      title,
      socials,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Missing required field: name' });
    }

    // Default member_year to current year if not provided
    const currentYear = new Date().getFullYear();
    const memberYear = req.body.member_year ? Number(req.body.member_year) : currentYear;

    // Parse socials if it's a string (e.g. from FormData)
    let parsedSocials = socials;
    if (typeof socials === 'string') {
      try {
        parsedSocials = JSON.parse(socials);
      } catch (e) {
        parsedSocials = {};
      }
    }

    let photoUrl = undefined;
    if (req.file) {
      // Assuming app serves /media statically
      photoUrl = `/media/uploads/${req.file.filename}`;
    }

    const newMember: IMember = {
      id: generateId(),
      name: String(name).trim(),
      college_year: college_year ? Number(college_year) : undefined,
      member_year: memberYear,
      email: email?.trim() || undefined,
      photo: photoUrl,
      type: sanitizeMemberType(type),
      title: title?.trim() || undefined,
      socials: parsedSocials || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.data.members.push(newMember);
    await db.write();

    res.status(201).json(newMember);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// -------------------------------------------------------------------------- //
// GET ARCHIVE (GET /api/committee/archive)
// -------------------------------------------------------------------------- //
export const getArchive = async (req: Request, res: Response) => {
  try {
    const db = getTeamsDB();
    const currentYear = new Date().getFullYear();

    // Filter for past members
    let archiveMembers = db.data.members.filter(m => {
        return m.member_year && m.member_year < currentYear;
    });

    // Sort Chronological (Oldest to Newest)
    archiveMembers.sort((a, b) => (a.member_year || 0) - (b.member_year || 0));

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results = archiveMembers.slice(startIndex, endIndex);

    res.json({
      data: results,
      meta: {
        total: archiveMembers.length,
        page,
        limit,
        totalPages: Math.ceil(archiveMembers.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// -------------------------------------------------------------------------- //
// UPDATE MEMBER (PUT /api/committee/current/:id)
// -------------------------------------------------------------------------- //
export const updateMember = async (req: AuthRequest, res: Response) => {
  try {
    const db = getTeamsDB();
    const index = db.data.members.findIndex(m => m.id === req.params.id);

    if (index === -1) return res.status(404).json({ message: 'Team member not found' });

    const existing = db.data.members[index];
    const {
      name,
      college_year,
      member_year,
      email,
      type,
      title,
      socials,
    } = req.body;

    // Handle photo update
    let photoUrl = existing.photo;
    if (req.file) {
      photoUrl = `/media/uploads/${req.file.filename}`;
    }

    // Parse socials if needed
    let parsedSocials = socials;
    if (typeof socials === 'string') {
        try {
            parsedSocials = JSON.parse(socials);
        } catch (e) {
            // Keep existing if parse fails or it wasn't intended to be parsed
            // Actually if socials is passed but invalid json, we might want to ignore or error.
            // But since existing.socials is object, we should be careful.
            // If the user sends nothing, socials is undefined, so we use existing.socials.
        }
    } else if (socials === undefined) {
        parsedSocials = existing.socials;
    }

    const updated: IMember = {
      ...existing,
      name: name ? String(name).trim() : existing.name,
      college_year: college_year !== undefined ? Number(college_year) : existing.college_year,
      member_year: member_year !== undefined ? Number(member_year) : existing.member_year,
      email: email?.trim() || existing.email,
      photo: photoUrl,
      type: type ? sanitizeMemberType(type) : existing.type,
      title: title?.trim() || existing.title,
      socials: parsedSocials,
      updatedAt: new Date().toISOString(),
    };

    db.data.members[index] = updated;
    await db.write();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// -------------------------------------------------------------------------- //
// DELETE MEMBER (DELETE /api/committee/current/:id)
// -------------------------------------------------------------------------- //
export const deleteMember = async (req: Request, res: Response) => {
  try {
    const db = getTeamsDB();
    const initialLength = db.data.members.length;
    db.data.members = db.data.members.filter(m => m.id !== req.params.id);

    if (db.data.members.length < initialLength) {
      await db.write();
      res.json({ message: 'Team member removed' });
    } else {
      res.status(404).json({ message: 'Team member not found' });
    }
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
