// API Integration Tests
import 'dotenv/config';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  status?: number;
  data?: unknown;
  error?: string;
}

const tests: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    tests.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    tests.push({ name, passed: false, error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data, ok: response.ok };
}

async function runTests() {
  console.log(`\n🧪 Testing API at ${BASE_URL}\n`);

  // Health check
  await test('GET /health returns OK', async () => {
    const { status, data } = await request('/health');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (data.status !== 'ok') throw new Error('Status not ok');
  });

  // Providers (public)
  await test('GET /providers returns array', async () => {
    const { status, data } = await request('/providers');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (!Array.isArray(data)) throw new Error('Expected array');
  });

  // Auth required endpoints
  await test('GET /profile requires auth', async () => {
    const { status } = await request('/profile');
    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
  });

  await test('GET /patients requires auth', async () => {
    const { status } = await request('/patients');
    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
  });

  await test('GET /notifications requires auth', async () => {
    const { status } = await request('/notifications');
    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
  });

  await test('POST /appointments requires auth', async () => {
    const { status } = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({ patient_id: 'test', provider_id: 'test' }),
    });
    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
  });

  await test('GET /webhooks requires auth', async () => {
    const { status } = await request('/webhooks');
    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
  });

  await test('GET /api-keys requires auth', async () => {
    const { status } = await request('/api-keys');
    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
  });

  // Invalid auth
  await test('Invalid token returns 401', async () => {
    const { status } = await request('/profile', {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
  });

  // Summary
  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
