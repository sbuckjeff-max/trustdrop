import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function query<T>(sql: string): Promise<T[]> {
  try {
    // Escape single quotes in SQL for the bash command
    const escapedSql = sql.replace(/'/g, "'\\''");
    const { stdout, stderr } = await execPromise(`team-db "${escapedSql}"`);
    
    if (stderr && stderr.trim()) {
      console.error('DB Error stderr:', stderr);
    }

    if (!stdout || stdout.trim() === '') {
      return [];
    }

    return JSON.parse(stdout);
  } catch (error) {
    console.error('Database query failed:', error);
    throw error;
  }
}

export async function run(sql: string): Promise<void> {
  await query(sql);
}
