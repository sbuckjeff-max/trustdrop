import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne, sql } from '../db';
import { authenticate } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import type { AuthUser, UserRole } from '../types';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'trustdrop-secret-key-change-in-prod';

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
  name: string;
}

function createTokenPayload(user: Pick<UserRow, 'id' | 'email' | 'role' | 'name'>): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, tosAccepted } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      role?: UserRole;
      tosAccepted?: boolean;
    };

    if (!email || !password || !name || !role) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    if (!['dealer', 'courier', 'buyer'].includes(role)) {
      res.status(400).json({ message: 'Invalid role' });
      return;
    }

    if (!tosAccepted) {
      res.status(400).json({ message: 'You must accept the Terms of Service to register.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await queryOne<UserRow>(
      `SELECT id, email, password_hash, role, name FROM users WHERE email = ${sql.literal(normalizedEmail)} LIMIT 1`,
    );

    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await queryOne(
      `INSERT INTO users (email, password_hash, name, role, tos_accepted_at) VALUES (${sql.literal(normalizedEmail)}, ${sql.literal(
        passwordHash,
      )}, ${sql.literal(name.trim())}, ${sql.literal(role)}, datetime('now'))`,
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await queryOne<UserRow>(
      `SELECT id, email, password_hash, role, name FROM users WHERE email = ${sql.literal(normalizedEmail)} LIMIT 1`,
    );

    if (!user) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    const payload = createTokenPayload(user);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user: payload });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/demo-login — one-click demo access by role
router.post('/demo-login', async (req, res) => {
  try {
    const { role } = req.body as { role?: string };

    if (!role || !['dealer', 'courier', 'buyer'].includes(role)) {
      res.status(400).json({ message: 'Valid role (dealer, courier, or buyer) is required' });
      return;
    }

    const demoEmail = `demo-${role}@trustdrop.test`;

    const user = await queryOne<UserRow>(
      `SELECT id, email, password_hash, role, name FROM users WHERE email = ${sql.literal(demoEmail)} LIMIT 1`,
    );

    if (!user) {
      res.status(404).json({ message: `Demo ${role} account not found. Please run the seed script.` });
      return;
    }

    const payload = createTokenPayload(user);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user: payload });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', authenticate, (req: AuthRequest, res) => {
  res.json(req.user);
});

export default router;
