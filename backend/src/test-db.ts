import { query } from './db';

async function test() {
  console.log('Testing DB query...');
  try {
    const result = await query('SELECT 1 AS test');
    console.log('Result:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

void test();
