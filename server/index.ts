/**
 * Backend Server Setup
 * 
 * Secure Express server for BrainBuddy
 * - Validates environment variables
 * - Implements authentication middleware
 * - Rate limiting on sensitive routes
 * - Comprehensive logging
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { supabaseAdmin } from './lib/supabaseAdmin';
import { unlockGame, getUserCoins, getGameUnlockStatus, consumeCredits, getUserCredits } from './routes/gameUnlock';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
      };
      id?: string;
    }
  }
}

// Validate server environment variables on startup
function validateServerEnv() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required backend environment variables: ${missing.join(', ')}`
    );
  }

  console.log('✓ Backend environment variables validated');
}

// Initialize Express app
const app = express();

// Security Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request ID for logging
app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
});

// Rate limiting: General API limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true, // Return info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
});

// Rate limiting: Sensitive operations (stricter)
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 requests per window
  message: 'Too many requests to this endpoint',
  skipSuccessfulRequests: false,
});

// Authentication Middleware
// Verifies JWT token from Supabase
async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    // Attach user to request
    req.user = {
      id: data.user.id,
      email: data.user.email,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Game unlock routes (old coin system)
app.post('/api/unlock-game', apiLimiter, strictLimiter, authMiddleware, unlockGame);
app.get('/api/user/coins', apiLimiter, authMiddleware, getUserCoins);
app.get('/api/game/:gameId/status', apiLimiter, authMiddleware, getGameUnlockStatus);

// Credit-based system routes (new)
app.post('/api/consume-credits', apiLimiter, strictLimiter, authMiddleware, consumeCredits);
app.get('/api/user/credits', apiLimiter, authMiddleware, getUserCredits);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Start server
async function startServer() {
  try {
    // Validate environment
    validateServerEnv();

    const PORT = process.env.PORT || 3001;
    
    app.listen(PORT, () => {
      console.log(`\n✓ Server running on port ${PORT}`);
      console.log(`  Health check: http://localhost:${PORT}/health`);
      console.log(`  Game unlock: POST ${PORT}/api/unlock-game`);
      console.log(`\n⚠️  Make sure frontend is configured with:
  VITE_API_URL=http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();
