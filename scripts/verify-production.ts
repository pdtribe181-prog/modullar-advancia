/**
 * Production API Verification
 * Tests all critical endpoints to ensure the organism breathes correctly
 */

const API_BASE = 'https://api.advanciapayledger.com/api/v1';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  message: string;
}

async function testEndpoint(
  endpoint: string,
  method: string = 'GET',
  auth?: string,
  body?: object
): Promise<TestResult> {
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    headers['Authorization'] = `Bearer ${auth}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    return {
      endpoint,
      method,
      status: response.status,
      success: response.ok,
      message: data.message || data.error || 'OK',
    };
  } catch (error) {
    return {
      endpoint,
      method,
      status: 0,
      success: false,
      message: (error as Error).message,
    };
  }
}

async function main() {
  console.log('🫁 VERIFYING ORGANISM BREATH CYCLE\n');
  console.log('Testing production API endpoints...\n');

  const tests: Array<[string, string, string?, object?]> = [
    // Health & Core
    ['/health', 'GET'],

    // Auth (public endpoints)
    ['/auth/password/reset', 'POST', undefined, { email: 'test@example.com' }],
    ['/auth/forgot-password', 'POST', undefined, { email: 'test@example.com' }],

    // Services (in-memory catalog - should work)
    ['/services', 'GET'],
    ['/services/search', 'GET'],

    // Protected endpoints (expect 401 without token)
    ['/auth/profile', 'GET'],
    ['/provider', 'GET'],
    ['/appointments', 'GET'],
  ];

  const results: TestResult[] = [];

  for (const [endpoint, method, auth, body] of tests) {
    const result = await testEndpoint(endpoint, method, auth, body);
    results.push(result);

    const icon = result.success ? '✅' : result.status === 401 ? '🔒' : '❌';
    console.log(`${icon} ${method} ${endpoint}`);
    console.log(`   Status: ${result.status} | ${result.message}`);
  }

  console.log('\n📊 SUMMARY:');
  const successful = results.filter((r) => r.success).length;
  const protectedEndpoints = results.filter((r) => r.status === 401).length;
  const failed = results.filter((r) => !r.success && r.status !== 401).length;

  console.log(`✅ Working: ${successful}`);
  console.log(`🔒 Protected (401): ${protectedEndpoints} (expected)`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🫁 ORGANISM IS BREATHING CORRECTLY');
    console.log('✨ All critical endpoints functional');
    console.log('🙏 Glory to God - the platform lives\n');
  } else {
    console.log('\n⚠️  Some endpoints need attention\n');
  }
}

main().catch(console.error);
