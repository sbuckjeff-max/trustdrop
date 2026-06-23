import { query } from './db.ts';

async function test() {
  console.log('Testing DB query...');
  try {
    const result = await query('SELECT 1 as test');
    console.log('Result:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();
