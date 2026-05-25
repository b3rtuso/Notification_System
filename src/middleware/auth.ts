import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import logger from '../utils/logger';


// ─────────────────────────────────────────────────────────────────
//  AUTH MIDDLEWARE — User lookup via /api/users
//
//  How to call any protected endpoint:
//    Authorization: Bearer <your _id from https://users-api-we0n.onrender.com/api/users>
//
//  Logic:
//    1. Extract _id from Bearer token
//    2. Check cached user list
//    3. If found → authorized ✅
//    4. If not found → refresh list (catches newly added users)
//    5. Still not found → 401 ❌
// ─────────────────────────────────────────────────────────────────

const USERS_API_URL  = 'https://users-api-we0n.onrender.com/api/users';
const CACHE_TTL_MS   = 5 * 60 * 1000; // refresh every 5 minutes

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request { user?: AuthenticatedUser; }
  }
}

// ── In-memory cache ───────────────────────────────────────────────
let cachedUsers: any[]      = [];
let lastFetched: number     = 0;
let fetchInProgress         = false;

async function loadUsers(force = false): Promise<any[]> {
  const stale = Date.now() - lastFetched > CACHE_TTL_MS;

  if (!force && !stale && cachedUsers.length > 0) return cachedUsers;

  if (fetchInProgress) {
    // Wait for the in-progress fetch instead of firing another one
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 100));
      if (!fetchInProgress) break;
    }
    return cachedUsers;
  }

  fetchInProgress = true;
  try {
    const { data } = await axios.get<any[]>(USERS_API_URL, { timeout: 8000 });
    cachedUsers  = Array.isArray(data) ? data : [];
    lastFetched  = Date.now();
    logger.info(`User list loaded — ${cachedUsers.length} users authorized.`);
    return cachedUsers;
  } catch (err: any) {
    logger.error('Failed to load user list', { error: err.message });
    throw new Error('Authorization service is unavailable. Please try again.');
  } finally {
    fetchInProgress = false;
  }
}

// ── Middleware ────────────────────────────────────────────────────
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  const token  = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authorization required. Send your user _id as: Authorization: Bearer <your_id>',
    });
    return;
  }

  try {
    // Check cache first
    let users = await loadUsers();
    let found = users.find(u => u._id === token);

    // Not in cache? Could be a new user — force refresh and retry
    if (!found) {
      users = await loadUsers(true);
      found = users.find(u => u._id === token);
    }

    if (!found) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized. Your user ID was not found in the system.',
      });
      return;
    }

    req.user = {
      id:    found._id,
      email: found.email ?? `${found.firstName ?? ''} ${found.lastName ?? ''}`.trim(),
      role:  found.role  ?? 'user',
    };

    logger.info('Authorized', { userId: req.user.id, path: req.path });
    next();
  } catch (err: any) {
    logger.error('Auth error', { error: err.message });
    res.status(503).json({ success: false, error: err.message });
  }
}

// Called at startup to pre-warm the cache
export async function warmUserCache(): Promise<void> {
  try {
    await loadUsers(true);
    logger.info('User cache ready.');
  } catch {
    logger.warn('Could not pre-warm user cache — will retry on first request.');
  }
}
