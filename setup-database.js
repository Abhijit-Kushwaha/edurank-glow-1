#!/usr/bin/env node

/**
 * Supabase Database Setup Script
 * Executes SQL_SETUP.sql directly via service role key
 * 
 * Usage: node setup-database.js
 * 
 * Requires:
 * - SUPABASE_URL environment variable (or hardcoded)
 * - SUPABASE_SERVICE_ROLE_KEY environment variable (or hardcoded)
 */

import fs from 'fs';
import path from 'path';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://irlbqoxqgztgjezzwknm.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlybGJxb3hxZ3p0Z2plenp3a25tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY2NTU5OCwiZXhwIjoyMDg0MjQxNTk4fQ.5qfpB_ExlDOP09yoXc4XzJs74c70WxJKPdzuD-VVV0s';

console.log('🚀 Supabase Database Setup');
console.log('═══════════════════════════════════════════════════════════\n');
console.log(`📍 URL: ${SUPABASE_URL}`);
console.log(`🔐 Key: ${SUPABASE_KEY.substring(0, 20)}...`);
console.log('\n═══════════════════════════════════════════════════════════\n');

// Read SQL file
const sqlFilePath = path.join(process.cwd(), 'supabase', 'SQL_SETUP.sql');
console.log(`📄 SQL File: ${sqlFilePath}`);

if (!fs.existsSync(sqlFilePath)) {
  console.error(`❌ SQL file not found: ${sqlFilePath}`);
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
const sqlStatements = sqlContent
  .split(';')
  .map((stmt) => stmt.trim())
  .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

console.log(`✅ Found ${sqlStatements.length} SQL statements\n`);

/**
 * Execute SQL statement via REST API
 */
async function executeSql(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Execute all statements
 */
async function setupDatabase() {
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i];
    const shortSql = sql.substring(0, 60).replace(/\n/g, ' ');

    process.stdout.write(`[${i + 1}/${sqlStatements.length}] ${shortSql}... `);

    const result = await executeSql(sql);

    if (result.success) {
      console.log('✅');
      completed++;
    } else {
      console.log(`❌ ${result.error}`);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 Setup Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Completed: ${completed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${sqlStatements.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failed === 0) {
    console.log('🎉 Database setup complete!\n');
    console.log('Next steps:');
    console.log('1. Set SUPABASE_SERVICE_ROLE_KEY in backend .env: npm run setup:env');
    console.log('2. Start backend: npm run dev:backend');
    console.log('3. Test API: curl http://localhost:3001/health');
    return 0;
  } else {
    console.log(`⚠️  ${failed} statement(s) failed!\n`);
    console.log('Troubleshooting:');
    console.log('1. Verify SUPABASE_SERVICE_ROLE_KEY is correct');
    console.log('2. Check if tables already exist (safe to ignore)');
    console.log('3. Ensure RLS policies are unique (add IF NOT EXISTS)');
    console.log('4. Run manually in Supabase console: https://app.supabase.com\n');
    return 1;
  }
}

// Run setup
setupDatabase().then((exitCode) => process.exit(exitCode));
