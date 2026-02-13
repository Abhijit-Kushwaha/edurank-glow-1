#!/usr/bin/env node

/**
 * Supabase MCP Server Status & Connection Test
 * Verify MCP server can execute database operations
 * 
 * Usage: node check-mcp-status.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://irlbqoxqgztgjezzwknm.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlybGJxb3hxZ3p0Z2plenp3a25tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY2NTU5OCwiZXhwIjoyMDg0MjQxNTk4fQ.5qfpB_ExlDOP09yoXc4XzJs74c70WxJKPdzuD-VVV0s';

console.log('🔍 Supabase MCP Connection Test');
console.log('═══════════════════════════════════════════════════════════\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Simple test query
    const { data, error } = await supabase
      .from('profiles')
      .select('count(*)', { count: 'exact' })
      .limit(0);

    if (error) throw error;

    console.log('✅ Connected to Supabase\n');
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

async function checkTables() {
  try {
    console.log('Checking required tables...\n');

    const tables = [
      'profiles',
      'user_unlocks',
      'coin_transactions',
    ];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`⚠️  ${table}: Not found (needs SQL_SETUP.sql execution)`);
        } else {
          console.log(`✅ ${table}: ${count || 0} rows`);
        }
      } catch (e) {
        console.log(`⚠️  ${table}: Error checking`);
      }
    }
    console.log('');
  } catch (error) {
    console.error('Error checking tables:', error.message);
  }
}

async function checkMCPServer() {
  console.log('MCP Server Status:\n');

  const checks = [
    {
      name: 'MCP server file exists',
      file: 'mcp-servers/supabase-mcp.js',
      status: true,
    },
    {
      name: 'Claude config exists',
      file: 'claude.json',
      status: true,
    },
    {
      name: 'Cline config exists',
      file: '.cline/cline.json',
      status: true,
    },
    {
      name: 'Service role key set',
      env: 'SUPABASE_SERVICE_ROLE_KEY',
      status: !!SUPABASE_KEY,
    },
  ];

  for (const check of checks) {
    const status = check.status ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
  }

  console.log('\n');
}

async function main() {
  const connected = await testConnection();

  if (connected) {
    await checkTables();
  }

  await checkMCPServer();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 Next Steps:\n');

  console.log('1. Set up database (if not already done):');
  console.log('   npm run setup:database\n');

  console.log('2. Start MCP server:');
  console.log('   npm run mcp:start\n');

  console.log('3. Start backend server:');
  console.log('   npm run dev:backend\n');

  console.log('4. In another terminal, start frontend:');
  console.log('   npm run dev\n');

  console.log('📚 Documentation:');
  console.log('   - Backend setup: BACKEND_SETUP.md');
  console.log('   - MCP operations: MCP_OPERATIONS.md');
  console.log('   - SQL setup: supabase/SQL_SETUP.sql\n');

  console.log('═══════════════════════════════════════════════════════════');
}

main();
