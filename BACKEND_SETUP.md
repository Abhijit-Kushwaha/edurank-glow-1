# BrainBuddy Backend Setup Guide

## Overview

Your BrainBuddy project has been fully configured with:
- ✅ **Backend Server** (Express.js + TypeScript)
- ✅ **Supabase Integration** (Secure authentication & database)
- ✅ **Database Setup SQL** (Ready for execution)
- ✅ **MCP Protocol** (Direct database editing via Claude)

## Quick Start (3 Steps)

### Step 1: Configure Environment

Create `.env` file with your Supabase credentials:

```bash
# Frontend keys (public - safe to expose)
VITE_SUPABASE_URL=https://irlbqoxqgztgjezzwknm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlybGJxb3hxZ3p0Z2plenp3a25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NjU1OTgsImV4cCI6MjA4NDI0MTU5OH0.kzfPjawzdmhPeiM6lqwhbRxG46CTPpdbDWL3UIkUIAg

# Backend keys (secret - NEVER expose)
SUPABASE_URL=https://irlbqoxqgztgjezzwknm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlybGJxb3hxZ3p0Z2plenp3a25tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY2NTU5OCwiZXhwIjoyMDg0MjQxNTk4fQ.5qfpB_ExlDOP09yoXc4XzJs74c70WxJKPdzuD-VVV0s

# Backend configuration
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Step 2: Setup Database Schema

Execute the database setup SQL:

```bash
npm run setup:database
```

This will:
- Create `user_unlocks` table
- Create `coin_transactions` table
- Add `coins` column to `profiles`
- Set up Row Level Security (RLS) policies
- Create atomic transaction functions
- Create performance indexes
- Grant service role permissions

**Note:** If you see "duplicate table" errors, that's normal - it means RLS policies are already in place.

### Step 3: Start Services

**Terminal 1 - Backend Server:**
```bash
npm run dev:backend
```

Server will start on `http://localhost:3001`

**Terminal 2 - Frontend (keep running):**
```bash
npm run dev
```

Frontend will start on `http://localhost:5173`

## Architecture

### Backend Server (`server/index.ts`)
- Express.js with security middleware (Helmet, CORS, Rate Limiting)
- JWT authentication via Supabase
- 3 API endpoints for game unlocking
- Rate limits: 100 req/15min (general), 10 req/1min (sensitive)

### Admin Client (`server/lib/supabaseAdmin.ts`)
- Service role key (backend only)
- Atomic coin deduction with transaction logging
- Zero trust - all validation server-side

### Database
- PostgreSQL via Supabase
- Row Level Security (RLS) on all tables
- Atomic functions with row locking
- Complete audit trail

### MCP Integration
- `mcp-servers/supabase-mcp.js` - Direct database operations
- `claude.json` - Claude Copilot configuration
- `.cline/cline.json` - Cline agent configuration

## API Endpoints

### POST `/api/unlock-game`
Unlock a game for a user by deducting coins.

```bash
curl -X POST http://localhost:3001/api/unlock-game \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "epic-era-battles",
    "userId": "<user-uuid>"
  }'
```

**Validation:**
- JWT token verified server-side
- Coin balance checked in database
- Price tampering detection
- Atomic coin deduction

### GET `/api/user/coins`
Get user's current coin balance.

```bash
curl -X GET http://localhost:3001/api/user/coins \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### GET `/api/game/:gameId/status`
Check if user has unlocked a game.

```bash
curl -X GET http://localhost:3001/api/game/epic-era-battles/status \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### GET `/health`
Health check endpoint.

```bash
curl http://localhost:3001/health
```

## Security Features

✅ **Zero Trust Architecture**
- All logic on backend
- Frontend never trusted with secrets
- Anon key only for frontend
- Service role key only for backend

✅ **Row Level Security (RLS)**
- Users can only access their own data
- Service role has full access
- Policies enforce at database level

✅ **Atomic Transactions**
- Coin deduction with row locking
- Automatic rollback on error
- Prevents race conditions

✅ **Rate Limiting**
- General: 100 requests per 15 minutes
- Sensitive: 10 requests per 1 minute
- Prevents brute force attacks

✅ **Security Headers**
- Helmet.js enabled
- CORS restricted to frontend
- CSRF protection

✅ **Audit Trail**
- All transactions logged
- User ID, amount, reason tracked
- Complete history maintained

## Using MCP for Direct Database Access

The MCP server allows Claude/Cline to execute SQL directly:

```bash
npm run mcp:start
```

Available tools via MCP:
- `exec_sql` - Execute any SQL statement
- `query_database` - SELECT queries with parsing
- `execute_function` - Call RPC functions
- `insert_record` - Insert rows
- `update_record` - Update rows
- `get_table_schema` - View table structure
- `verify_rls` - Check RLS status
- `list_tables` - List all tables

## File Structure

```
server/
├── index.ts                    # Express server + routes
├── lib/
│   └── supabaseAdmin.ts       # Service role client
└── routes/
    └── gameUnlock.ts          # Game unlock endpoints

supabase/
└── SQL_SETUP.sql              # Database configuration (450+ lines)

mcp-servers/
└── supabase-mcp.js            # MCP protocol server

.env                           # Configuration (git ignored)
```

## Environment Variables Reference

| Variable | Location | Purpose | Example |
|----------|----------|---------|---------|
| `VITE_SUPABASE_URL` | Frontend (.env) | Supabase project URL | `https://irlbqoxqgztgjezzwknm.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Frontend (.env) | Public auth key | `eyJhbGc...` |
| `SUPABASE_URL` | Backend (.env) | Supabase project URL | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend (.env) | Admin auth key | `eyJhbGc...` |
| `PORT` | Backend (.env) | Server port | `3001` |
| `FRONTEND_URL` | Backend (.env) | CORS origin | `http://localhost:5173` |

## TypeScript Configuration

The project uses strict TypeScript with:
- Type checking enabled: `npx tsc --noEmit`
- No implicit any
- Strict null checks
- Strict function parameter checks

All dependencies included:
- `@types/express`
- `@types/cors`
- `@types/node`

## Testing APIs

### 1. Get a JWT token (from frontend auth)
Use the frontend to sign in and get a token from sessionStorage.

### 2. Test health endpoint
```bash
curl http://localhost:3001/health
```

### 3. Test with JWT
```bash
# Replace with actual token from frontend
TOKEN="your-jwt-token-here"

curl -X GET http://localhost:3001/api/user/coins \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

### Backend won't start
```bash
# Check dependencies
npm install

# Check TypeScript compilation
npx tsc --noEmit

# Check environment variables
cat .env
```

### Database setup fails
```bash
# SQL already exists (safe)
# Manually execute in Supabase console:
# 1. Open: https://supabase.com/dashboard/project/irlbqoxqgztgjezzwknm/sql
# 2. Copy SQL_SETUP.sql content
# 3. Paste and execute
```

### CORS errors
- Update `FRONTEND_URL` in `.env`
- Ensure backend is running on port 3001

### JWT validation fails
- Token must be from Supabase auth
- Use frontend to sign in first
- Extract token from sessionStorage

## Next Steps

1. ✅ Backend server created and configured
2. ✅ Database schema designed
3. ✅ API endpoints ready
4. ✅ Security implemented
5. 🔲 **Frontend integration** - Call APIs from React components
6. 🔲 **Testing** - Run integration tests
7. 🔲 **Deployment** - Deploy backend to production

## Support

For issues:
1. Check error logs in terminal
2. Verify environment variables
3. Test endpoints with curl
4. View Supabase logs in dashboard
5. Check MCP server output for database issues

---

**Project:** BrainBuddy  
**Technology:** Node.js + Express + Supabase + React  
**Security:** Zero Trust + RLS + Rate Limiting  
**Status:** 🟢 Ready for Development
