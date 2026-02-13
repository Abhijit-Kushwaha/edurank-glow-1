#!/usr/bin/env node

/**
 * Supabase MCP Server v2
 * 
 * Direct Supabase Database Operations via MCP
 * Allows Claude to execute SQL, manage tables, and configure RLS
 * 
 * MCP Tools provided:
 * - exec_sql: Execute direct SQL statements (CREATE, ALTER, INSERT, SELECT, etc.)
 * - query_database: Execute SQL SELECT queries
 * - execute_function: Call Supabase RPC functions
 * - insert_record: Insert records into tables
 * - update_record: Update records in tables
 * - get_table_schema: Get table structure
 * - verify_rls: Check RLS policies on a table
 * - list_tables: List all tables in public schema
 */

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * MCP Protocol Message Handler
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// MCP initialization
console.error('[MCP] Supabase MCP Server Starting...');
console.error(`[MCP] Connected to: ${supabaseUrl}`);

// Tool definitions as per MCP spec
const TOOLS = {
  exec_sql: {
    name: 'exec_sql',
    description: 'Execute direct SQL statements (CREATE TABLE, ALTER TABLE, INSERT, SELECT, DROP, etc.) on Supabase. Use this for database schema configuration and direct SQL execution.',
    inputSchema: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'SQL statement to execute (CREATE TABLE, ALTER TABLE, SELECT, INSERT, UPDATE, DELETE, DROP, etc.)',
        },
        description: {
          type: 'string',
          description: 'Description of what this SQL does (optional)',
        },
      },
      required: ['sql'],
    },
  },

  query_database: {
    name: 'query_database',
    description: 'Execute SQL SELECT query on Supabase database',
    inputSchema: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'SQL SELECT query to execute',
        },
        limit: {
          type: 'number',
          description: 'Max rows to return (default 100)',
        },
      },
      required: ['sql'],
    },
  },

  execute_function: {
    name: 'execute_function',
    description: 'Call a Supabase RPC function (deduct_user_coins, add_user_coins, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        function_name: {
          type: 'string',
          description: 'Name of the RPC function (e.g., "deduct_user_coins")',
        },
        args: {
          type: 'object',
          description: 'Function arguments as object (e.g., {p_user_id: "uuid", p_amount: 100})',
        },
      },
      required: ['function_name', 'args'],
    },
  },

  insert_record: {
    name: 'insert_record',
    description: 'Insert a record into a Supabase table',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Table name',
        },
        data: {
          type: 'object',
          description: 'Record data to insert',
        },
      },
      required: ['table', 'data'],
    },
  },

  update_record: {
    name: 'update_record',
    description: 'Update records in a Supabase table',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Table name',
        },
        filter: {
          type: 'object',
          description: 'Filter conditions (e.g., {id: "uuid-value"})',
        },
        data: {
          type: 'object',
          description: 'Data to update',
        },
      },
      required: ['table', 'filter', 'data'],
    },
  },

  get_table_schema: {
    name: 'get_table_schema',
    description: 'Get schema information for a table',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Table name',
        },
      },
      required: ['table'],
    },
  },

  verify_rls: {
    name: 'verify_rls',
    description: 'Check Row Level Security (RLS) status and policies for a table',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Table name',
        },
      },
      required: ['table'],
    },
  },

  list_tables: {
    name: 'list_tables',
    description: 'List all tables in the public schema',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
};

/**
 * Tool Implementations
 */

async function execSql(sql, description = '') {
  try {
    console.error(`[MCP] Executing SQL: ${description || sql.substring(0, 50)}...`);
    
    // Use the postgres client directly with service role key
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      message: 'SQL executed successfully',
      description: description,
      rowsAffected: result.rowCount || 0,
      data: result.data || result,
    };
  } catch (error) {
    console.error(`[MCP] SQL Error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      sql: sql,
    };
  }
}

async function queryDatabase(sql, limit = 100) {
  try {
    // Sanitize and validate SQL is SELECT only
    if (!sql.trim().toUpperCase().startsWith('SELECT')) {
      throw new Error('Only SELECT queries are allowed');
    }

    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) throw error;
    return {
      success: true,
      rowCount: data?.length || 0,
      data: data?.slice(0, limit) || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function executeFunction(functionName, args) {
  try {
    const { data, error } = await supabase.rpc(functionName, args);

    if (error) throw error;
    return {
      success: true,
      data: data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function insertRecord(table, data) {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert([data])
      .select();

    if (error) throw error;
    return {
      success: true,
      data: result?.[0],
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function updateRecord(table, filter, data) {
  try {
    let query = supabase.from(table).update(data);

    // Apply filters
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value);
    }

    const { data: result, error } = await query.select();

    if (error) throw error;
    return {
      success: true,
      rowsUpdated: result?.length || 0,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function getTableSchema(table) {
  try {
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `;

    const { data, error } = await supabase.rpc('exec_sql', {
      query: query.replace('$1', `'${table}'`),
    });

    if (error) throw error;
    return {
      success: true,
      schema: data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function verifyRLS(table) {
  try {
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
      query: `SELECT rowsecurity FROM pg_tables WHERE tablename = '${table}' AND schemaname = 'public'`,
    });

    const { data: policies, error: policyError } = await supabase.rpc('exec_sql', {
      query: `SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = '${table}' AND schemaname = 'public'`,
    });

    if (rlsError || policyError) throw rlsError || policyError;

    return {
      success: true,
      rls_enabled: rlsStatus?.[0]?.rowsecurity || false,
      policies_count: policies?.length || 0,
      policies: policies || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function listTables() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    });

    if (error) throw error;
    return {
      success: true,
      tables: data?.map((t) => t.tablename) || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * MCP Protocol Handler
 */

async function handleToolCall(toolName, toolInput) {
  switch (toolName) {
    case 'exec_sql':
      return await execSql(toolInput.sql, toolInput.description);
    case 'query_database':
      return await queryDatabase(toolInput.sql, toolInput.limit);
    case 'execute_function':
      return await executeFunction(toolInput.function_name, toolInput.args);
    case 'insert_record':
      return await insertRecord(toolInput.table, toolInput.data);
    case 'update_record':
      return await updateRecord(toolInput.table, toolInput.filter, toolInput.data);
    case 'get_table_schema':
      return await getTableSchema(toolInput.table);
    case 'verify_rls':
      return await verifyRLS(toolInput.table);
    case 'list_tables':
      return await listTables();
    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

/**
 * MCP Server Loop
 */

let requestId = 1;

rl.on('line', async (line) => {
  try {
    const message = JSON.parse(line);

    if (message.method === 'initialize') {
      // Initialize response
      console.log(
        JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'supabase-mcp',
              version: '1.0.0',
            },
          },
        })
      );
    } else if (message.method === 'tools/list') {
      // List available tools
      console.log(
        JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            tools: Object.values(TOOLS),
          },
        })
      );
    } else if (message.method === 'tools/call') {
      // Execute tool
      const { name, arguments: args } = message.params;
      const result = await handleToolCall(name, args);

      console.log(
        JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        })
      );
    } else {
      console.log(
        JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32601,
            message: `Unknown method: ${message.method}`,
          },
        })
      );
    }
  } catch (error) {
    console.error(`[MCP ERROR] ${error.message}`);
  }
});

rl.on('close', () => {
  console.error('[MCP] Supabase MCP Server Shutting Down');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.error('[MCP] Received SIGINT, shutting down gracefully');
  process.exit(0);
});

console.error('[MCP] Supabase MCP Server Ready');
