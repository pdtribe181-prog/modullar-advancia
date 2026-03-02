import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_ACCESS_TOKEN) {
  console.error(
    'Error: SUPABASE_ACCESS_TOKEN is required. Get it from https://supabase.com/dashboard/account/tokens'
  );
  process.exit(1);
}

if (!SUPABASE_URL) {
  console.error('Error: SUPABASE_URL is required.');
  process.exit(1);
}

// Extract project ref from URL (e.g., https://xyz.supabase.co -> xyz)
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

console.log(`Connecting to Supabase project: ${projectRef}`);

async function enablePwnedPasswordCheck() {
  const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;

  console.log(`Updating Auth Config via Management API: ${url}`);

  try {
    // 1. Get current config to verify
    const getResponse = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      throw new Error(
        `Failed to fetch current config: ${getResponse.status} ${getResponse.statusText} - ${errorText}`
      );
    }

    const currentConfig = await getResponse.json();
    const hibpEnabled = currentConfig.password_hibp_enabled === true;
    console.log('Current Auth Config: HIBP check', hibpEnabled ? 'already enabled' : 'disabled');

    if (hibpEnabled) {
      console.log('✅ "Have I Been Pwned" check is already ENABLED.');
      return;
    }

    console.log('Enabling "Have I Been Pwned" check via password_hibp_enabled...');

    // 2. Update config
    const patchResponse = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password_hibp_enabled: true,
      }),
    });

    if (!patchResponse.ok) {
      const errorText = await patchResponse.text();
      throw new Error(
        `Failed to update config: ${patchResponse.status} ${patchResponse.statusText} - ${errorText}`
      );
    }

    await patchResponse.json();
    console.log('Successfully updated Auth Config! HIBP check is now enabled.');
  } catch (error: any) {
    console.error('Error enabling HIBP check:', error.message);
    process.exit(1);
  }
}

enablePwnedPasswordCheck();
