# Supabase MCP - Database Operations Guide

## What is MCP?

**Model Context Protocol (MCP)** allows Claude/AI assistants to directly execute database operations without manual copy-paste to Supabase console.

This means:
- ✅ Claude can create tables
- ✅ Claude can modify schemas
- ✅ Claude can manage RLS policies
- ✅ Claude can insert/update data
- ✅ Claude can execute any SQL
- ✅ Claude can troubleshoot database issues

## Starting the MCP Server

```bash
npm run mcp:start
```

The server will start and be ready to receive tool calls from Claude/Cline.

## Available Tools

### 1. `exec_sql` - Execute Any SQL

Execute CREATE, ALTER, INSERT, DELETE, DROP statements.

**Usage Example:**
```
Tool: exec_sql
Input:
  sql: "CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, name TEXT)"
  description: "Create users table"
```

**Response:**
```json
{
  "success": true,
  "message": "SQL executed successfully",
  "rowsAffected": 0
}
```

Used for:
- Creating tables
- Modifying schemas
- Running setup SQL
- Managing indexes
- Configuring RLS policies

### 2. `query_database` - SELECT Queries

Execute SELECT queries and get parsed results.

**Usage Example:**
```
Tool: query_database
Input:
  sql: "SELECT * FROM profiles WHERE id = 'user-123'"
  limit: 100
```

**Response:**
```json
{
  "success": true,
  "rowCount": 1,
  "data": [
    {
      "id": "user-123",
      "email": "user@example.com",
      "coins": 500
    }
  ]
}
```

Used for:
- Checking table contents
- Verifying data
- Troubleshooting
- Monitoring

### 3. `execute_function` - Call RPC Functions

Call Supabase PL/pgSQL functions.

**Usage Example:**
```
Tool: execute_function
Input:
  function_name: "deduct_user_coins"
  args: {
    "p_user_id": "uuid-string",
    "p_amount": 100,
    "p_reason": "game_unlock"
  }
```

**Response:**
```json
{
  "success": true,
  "data": 400
}
```

Available functions:
- `deduct_user_coins(user_id, amount, reason?, game_id?)` → remaining coins
- `add_user_coins(user_id, amount, reason?)` → new balance

### 4. `insert_record` - Insert Rows

Insert records into tables.

**Usage Example:**
```
Tool: insert_record
Input:
  table: "user_unlocks"
  data: {
    "user_id": "uuid-string",
    "game_id": "epic-era-battles"
  }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "unlock-uuid",
    "user_id": "uuid-string",
    "game_id": "epic-era-battles",
    "unlocked_at": "2024-01-15T10:00:00Z"
  }
}
```

Used for:
- Adding data
- Creating records
- Populating tables

### 5. `update_record` - Update Rows

Update existing records.

**Usage Example:**
```
Tool: update_record
Input:
  table: "profiles"
  filter: { "id": "user-123" }
  data: { "coins": 500 }
```

**Response:**
```json
{
  "success": true,
  "rowsUpdated": 1,
  "data": [
    {
      "id": "user-123",
      "coins": 500
    }
  ]
}
```

Used for:
- Modifying data
- Updating statuses
- Adjusting balances

### 6. `get_table_schema` - View Structure

Get detailed schema information for a table.

**Usage Example:**
```
Tool: get_table_schema
Input:
  table: "profiles"
```

**Response:**
```json
{
  "success": true,
  "schema": [
    {
      "column_name": "id",
      "data_type": "uuid",
      "is_nullable": false,
      "column_default": "gen_random_uuid()"
    },
    {
      "column_name": "coins",
      "data_type": "integer",
      "is_nullable": false,
      "column_default": "0"
    }
  ]
}
```

Used for:
- Understanding table structure
- Debugging schema issues
- Planning migrations

### 7. `verify_rls` - Check Security Policies

Verify Row Level Security status and policies.

**Usage Example:**
```
Tool: verify_rls
Input:
  table: "profiles"
```

**Response:**
```json
{
  "success": true,
  "rls_enabled": true,
  "policies_count": 3,
  "policies": [
    {
      "policyname": "Users can view own profile",
      "cmd": "SELECT",
      "qual": "(auth.uid() = id)"
    }
  ]
}
```

Used for:
- Verifying security
- Checking RLS status
- Troubleshooting access issues

### 8. `list_tables` - Enumerate Tables

List all tables in the database.

**Usage Example:**
```
Tool: list_tables
Input: {}
```

**Response:**
```json
{
  "success": true,
  "tables": [
    "profiles",
    "user_unlocks",
    "coin_transactions",
    "audit_logs"
  ]
}
```

Used for:
- Getting database overview
- Discovering tables
- Planning queries

## Practical Examples

### Set Up Database
Claude can now run the entire database setup:

```
"Set up the database. Execute all SQL from SQL_SETUP.sql using exec_sql tool."
```

Claude will:
1. Read SQL_SETUP.sql
2. Execute CREATE TABLE statements
3. Execute ALTER TABLE statements
4. Create RLS policies
5. Create functions
6. Set up indexes
7. Verify everything worked

### Verify Database Setup
```
"Check if the user_unlocks table exists and show me its schema."
```

Claude will:
1. List all tables
2. Get schema for user_unlocks
3. Show you the structure
4. Verify columns and types

### Test Coin System
```
"Deduct 100 coins from user 'abc123' for game unlock."
```

Claude will:
1. Call deduct_user_coins function
2. Show remaining balance
3. Verify transaction logged

### Debug Issues
```
"Why is my INSERT failing? Check the RLS policies on user_unlocks table."
```

Claude will:
1. Verify RLS status
2. Check all policies
3. Test INSERT statement
4. Suggest fixes

### Populate Test Data
```
"Add 10 test users to the profiles table with 1000 coins each."
```

Claude will:
1. Insert records
2. Verify inserts
3. Show results

## Security Considerations

⚠️ **Important:**

The MCP server uses the **SERVICE ROLE KEY** which has full database access. This is intentional for database administration, but:

✅ **In Development:**
- Safe to use locally
- Full power for debugging
- Fast iteration

✅ **In Production:**
- Restrict MCP server to admin network
- Use separate admin account
- Monitor all executed queries
- Audit database changes

## Connection Details

**Service Role Key:** 
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlybGJxb3hxZ3p0Z2plenp3a25tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY2NTU5OCwiZXhwIjoyMDg0MjQxNTk4fQ.5qfpB_ExlDOP09yoXc4XzJs74c70WxJKPdzuD-VVV0s
```

**Supabase URL:**
```
https://irlbqoxqgztgjezzwknm.supabase.co
```

## Troubleshooting MCP

### Connection Issues

If MCP won't connect:

1. **Verify environment variables:**
   ```bash
   echo $SUPABASE_URL
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Check server is running:**
   ```bash
   npm run mcp:start
   ```

3. **Test direct connection:**
   ```bash
   curl -X POST https://irlbqoxqgztgjezzwknm.supabase.co/rest/v1/rpc/exec_sql \
     -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"query":"SELECT 1"}'
   ```

### SQL Execution Issues

If SQL fails:

1. **Check syntax:** 
   - Ensure valid SQL statements
   - Add IF NOT EXISTS for idempotency

2. **Check permissions:**
   - Service role has full access
   - RLS policies don't block service role

3. **Check for duplicates:**
   - Tables can't be created twice
   - Use CREATE IF NOT EXISTS

## Integration with MCP Clients

The MCP server is configured for:

### Claude (via claude.json)
```json
{
  "supabase-db": {
    "command": "node mcp-servers/supabase-mcp.js"
  }
}
```

### Cline (via .cline/cline.json)
```json
{
  "name": "supabase-db",
  "autoApprove": false,
  "command": "node mcp-servers/supabase-mcp.js"
}
```

### Cursor (via .cursor/tools.json)
```json
{
  "supabase-db": {
    "command": "node mcp-servers/supabase-mcp.js"
  }
}
```

## Best Practices

✅ **Do:**
- Use `IF NOT EXISTS` in CREATE statements
- Describe complex SQL for clarity
- Test queries before execution
- Check RLS policies before inserting data
- Verify data after operations
- Use transaction functions for atomic operations

❌ **Don't:**
- Execute untrusted SQL
- Drop tables without verification
- Share service role key
- Use MCP for production writes without testing
- Expose MCP server to the internet

## Examples for Claude

When using Claude, you can say:

**"Execute database setup SQL"**
- Claude uses exec_sql to run SQL_SETUP.sql

**"What tables exist in the database?"**
- Claude uses list_tables

**"Check the schema of the user_unlocks table"**
- Claude uses get_table_schema

**"Verify RLS is configured correctly"**
- Claude uses verify_rls on each table

**"Show me all transactions for user ABC123"**
- Claude uses query_database with SELECT

**"Add 1000 coins to user ABC123"**
- Claude uses execute_function (add_user_coins)

---

**Status:** ✅ MCP Ready for Use  
**Security Level:** 🔐 Service Role (Full Access)  
**Environment:** Development & Debugging
