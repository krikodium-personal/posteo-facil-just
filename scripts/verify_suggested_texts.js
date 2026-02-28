
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.VITE_DIRECTUS_URL;
const email = process.env.DIRECTUS_ADMIN_EMAIL;
const password = process.env.DIRECTUS_ADMIN_PASSWORD;

// Ensure URL doesn't end with slash
const baseUrl = url ? url.replace(/\/$/, '') : '';

if (!email || !password || !baseUrl) {
    console.error('Missing credentials or URL in .env');
    process.exit(1);
}

async function verifyField() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginResponse = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!loginResponse.ok) throw new Error(await loginResponse.text());
        const loginData = await loginResponse.json();
        const token = loginData.data.access_token;

        // 2. Get Field Info
        console.log('Fetching field info...');
        const fieldResponse = await fetch(`${baseUrl}/fields/banners/suggested_texts`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!fieldResponse.ok) {
            throw new Error(`Field check failed: ${fieldResponse.status} ${fieldResponse.statusText}`);
        }

        const fieldData = await fieldResponse.json();

        if (fieldData.data) {
            console.log('Field "suggested_texts" verified!');
            console.log(`Type: ${fieldData.data.type}`);
            console.log(`Interface: ${fieldData.data.meta?.interface}`);
            // console.log(JSON.stringify(fieldData.data, null, 2));
        } else {
            console.error('Field data is empty!');
            process.exit(1);
        }

    } catch (error) {
        console.error('Verification Error:', error.message);
        process.exit(1);
    }
}

verifyField();
