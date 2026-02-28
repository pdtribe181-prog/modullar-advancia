/**
 * Generate DATABASE_SCHEMA.md from migration files
 *
 * Parses all SQL migrations in /migrations and produces a structured
 * Markdown document listing every table, its columns, constraints,
 * indexes, and enums.
 *
 * Usage:
 *   npx tsx scripts/generate-schema-docs.ts
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const MIGRATIONS_DIR = resolve(import.meta.dirname ?? '.', '..', 'migrations');
const OUTPUT_FILE = resolve(import.meta.dirname ?? '.', '..', 'DATABASE_SCHEMA.md');

// ── Types ──────────────────────────────────────────────────────────────

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  constraints: string[];
}

interface TableDef {
  name: string;
  columns: Column[];
  primaryKey?: string;
  foreignKeys: string[];
  checks: string[];
  migrationFile: string;
}

interface IndexDef {
  name: string;
  table: string;
  columns: string;
  unique: boolean;
  migrationFile: string;
}

interface EnumDef {
  name: string;
  values: string[];
  migrationFile: string;
}

// ── Parsing ────────────────────────────────────────────────────────────

const tables = new Map<string, TableDef>();
const indexes: IndexDef[] = [];
const enums: EnumDef[] = [];

function parseMigration(filename: string, sql: string) {
  // Remove comments
  const cleaned = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

  // Parse CREATE TYPE ... AS ENUM
  const enumRegex = /CREATE\s+TYPE\s+(?:public\.)?(\w+)\s+AS\s+ENUM\s*\(([^)]+)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = enumRegex.exec(cleaned)) !== null) {
    const values = match[2]
      .split(',')
      .map((v) => v.trim().replace(/^'|'$/g, ''))
      .filter(Boolean);
    enums.push({ name: match[1], values, migrationFile: filename });
  }

  // Parse CREATE TABLE
  const tableRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)\s*\(([\s\S]*?)\);/gi;
  while ((match = tableRegex.exec(cleaned)) !== null) {
    const tableName = match[1];
    const body = match[2];

    // Skip if we already have this table (first definition wins)
    if (tables.has(tableName)) continue;

    const table: TableDef = {
      name: tableName,
      columns: [],
      foreignKeys: [],
      checks: [],
      migrationFile: filename,
    };

    // Split by top-level commas (not inside parentheses)
    const parts = splitTopLevel(body);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // CONSTRAINT lines
      if (/^CONSTRAINT\s/i.test(trimmed)) {
        if (/PRIMARY\s+KEY/i.test(trimmed)) {
          const pkMatch = trimmed.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
          if (pkMatch) table.primaryKey = pkMatch[1].trim();
        } else if (/FOREIGN\s+KEY/i.test(trimmed)) {
          table.foreignKeys.push(trimmed.replace(/^CONSTRAINT\s+\S+\s+/i, ''));
        } else if (/CHECK/i.test(trimmed)) {
          table.checks.push(trimmed);
        }
        continue;
      }

      // Inline PRIMARY KEY
      if (/^PRIMARY\s+KEY/i.test(trimmed)) {
        const pkMatch = trimmed.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) table.primaryKey = pkMatch[1].trim();
        continue;
      }

      // Column definition
      const colMatch = trimmed.match(/^(\w+)\s+(.+)/);
      if (colMatch) {
        const colName = colMatch[1];
        const rest = colMatch[2];

        // Skip SQL keywords that aren't column names
        if (/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK|INDEX|EXCLUDE)/i.test(colName)) continue;

        const typeMatch = rest.match(/^([\w\s]+(?:\([^)]*\))?(?:\[\])?)/i);
        const colType = typeMatch ? typeMatch[1].trim() : rest.split(/\s/)[0];

        const nullable = !/NOT\s+NULL/i.test(rest);
        const defaultMatch = rest.match(
          /DEFAULT\s+(.+?)(?:\s+(?:CONSTRAINT|NOT|NULL|CHECK|REFERENCES|PRIMARY|UNIQUE)|$)/i
        );
        const constraints: string[] = [];
        if (/UNIQUE/i.test(rest)) constraints.push('UNIQUE');
        if (/PRIMARY\s+KEY/i.test(rest)) {
          constraints.push('PRIMARY KEY');
          table.primaryKey = colName;
        }
        if (/REFERENCES/i.test(rest)) {
          const refMatch = rest.match(/REFERENCES\s+(\S+)/i);
          if (refMatch) constraints.push(`FK → ${refMatch[1]}`);
        }

        table.columns.push({
          name: colName,
          type: colType.replace(/\s+/g, ' '),
          nullable,
          default: defaultMatch ? defaultMatch[1].trim() : undefined,
          constraints,
        });
      }
    }

    tables.set(tableName, table);
  }

  // Parse CREATE INDEX
  const indexRegex =
    /CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+ON\s+(?:public\.)?(\w+)\s*(?:USING\s+\w+\s*)?\(([^)]+)\)/gi;
  while ((match = indexRegex.exec(cleaned)) !== null) {
    indexes.push({
      name: match[2],
      table: match[3],
      columns: match[4].trim(),
      unique: !!match[1],
      migrationFile: filename,
    });
  }
}

function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

// ── Main ───────────────────────────────────────────────────────────────

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
  parseMigration(file, sql);
}

// ── Generate Markdown ──────────────────────────────────────────────────

const lines: string[] = [];
lines.push('# Advancia PayLedger — Database Schema');
lines.push('');
lines.push(
  `> Auto-generated on ${new Date().toISOString().split('T')[0]} from ${files.length} migration files.`
);
lines.push(`> Re-generate: \`npx tsx scripts/generate-schema-docs.ts\``);
lines.push('');
lines.push('---');
lines.push('');

// Table of contents
lines.push('## Table of Contents');
lines.push('');
const sortedTables = [...tables.values()].sort((a, b) => a.name.localeCompare(b.name));

lines.push('| # | Table | Columns | Migration |');
lines.push('|---|-------|---------|-----------|');
sortedTables.forEach((t, i) => {
  lines.push(`| ${i + 1} | [${t.name}](#${t.name}) | ${t.columns.length} | ${t.migrationFile} |`);
});
lines.push('');

// Enums
if (enums.length > 0) {
  lines.push('---');
  lines.push('');
  lines.push('## Enums');
  lines.push('');
  for (const e of enums) {
    lines.push(`### ${e.name}`);
    lines.push(`*Defined in ${e.migrationFile}*`);
    lines.push('');
    lines.push(`Values: ${e.values.map((v) => `\`${v}\``).join(', ')}`);
    lines.push('');
  }
}

// Tables
lines.push('---');
lines.push('');
lines.push('## Tables');
lines.push('');

for (const table of sortedTables) {
  lines.push(`### ${table.name}`);
  lines.push(`*Defined in ${table.migrationFile}*`);
  lines.push('');

  if (table.primaryKey) {
    lines.push(`**Primary Key:** \`${table.primaryKey}\``);
    lines.push('');
  }

  // Columns table
  lines.push('| Column | Type | Nullable | Default | Constraints |');
  lines.push('|--------|------|----------|---------|-------------|');
  for (const col of table.columns) {
    const constraints = col.constraints.length > 0 ? col.constraints.join(', ') : '';
    lines.push(
      `| ${col.name} | ${col.type} | ${col.nullable ? 'YES' : 'NO'} | ${col.default ?? ''} | ${constraints} |`
    );
  }
  lines.push('');

  // Foreign keys
  if (table.foreignKeys.length > 0) {
    lines.push('**Foreign Keys:**');
    for (const fk of table.foreignKeys) {
      lines.push(`- ${fk}`);
    }
    lines.push('');
  }

  // Indexes for this table
  const tableIndexes = indexes.filter((idx) => idx.table === table.name);
  if (tableIndexes.length > 0) {
    lines.push('**Indexes:**');
    for (const idx of tableIndexes) {
      const uniq = idx.unique ? ' (UNIQUE)' : '';
      lines.push(`- \`${idx.name}\` on (${idx.columns})${uniq}`);
    }
    lines.push('');
  }
}

// Summary
lines.push('---');
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`- **Tables:** ${tables.size}`);
lines.push(`- **Enums:** ${enums.length}`);
lines.push(`- **Indexes:** ${indexes.length}`);
lines.push(`- **Migration files:** ${files.length}`);
lines.push('');

const output = lines.join('\n');
writeFileSync(OUTPUT_FILE, output, 'utf8');
console.log(
  `✓ Generated ${OUTPUT_FILE} (${tables.size} tables, ${enums.length} enums, ${indexes.length} indexes)`
);
