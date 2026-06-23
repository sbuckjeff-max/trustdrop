import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type SqlPrimitive = string | number | boolean | null | undefined;

function normalizeSqlOutput(stdout: string): string {
  const trimmed = stdout.trim();
  if (trimmed === '') {
    return '[]';
  }
  return trimmed;
}

export const sql = {
  literal(value: SqlPrimitive): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error('Invalid number literal for SQL statement.');
      }
      return String(value);
    }

    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }

    return `'${value.replace(/'/g, "''")}'`;
  },
};

export async function query<T = Record<string, unknown>>(statement: string): Promise<T[]> {
  const { stdout, stderr } = await execFileAsync('team-db', [statement], {
    maxBuffer: 1024 * 1024 * 4,
  });

  if (stderr && stderr.trim()) {
    console.error('team-db stderr:', stderr);
  }

  return JSON.parse(normalizeSqlOutput(stdout)) as T[];
}

export async function queryOne<T = Record<string, unknown>>(statement: string): Promise<T | null> {
  const rows = await query<T>(statement);
  return rows[0] ?? null;
}
