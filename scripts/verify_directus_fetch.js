
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.VITE_DIRECTUS_URL;
const email = process.env.DIRECTUS_ADMIN_EMAIL;
const password = process.env.DIRECTUS_ADMIN_PASSWORD;

console.log(`URL: ${url}`);
console.log(`Email: ${email}`);

if (!email || !password || !url) {
    console.error('Missing credentials or URL');
    process.exit(1);
}

// Ensure URL doesn't end with slash for cleaner concatenation
const baseUrl = url.replace(/\/$/, '');

async function verify() {
    try {
        console.log('Logging in via fetch...');
        const loginResponse = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (!loginResponse.ok) {
            const error = await loginResponse.text();
            throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText} - ${error}`);
        }

        const loginData = await loginResponse.json();
        const token = loginData.data?.access_token;

        if (!token) {
            throw new Error('No access token in login response');
        }

        console.log('Login successful. Access token received.');

        console.log('Checking "banners" collection...');
        const collectionResponse = await fetch(`${baseUrl}/collections/banners`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (collectionResponse.ok) {
            const collectionData = await collectionResponse.json();
            console.log('Collection "banners" found.');
            // console.log(collectionData);
        } else if (collectionResponse.status === 403) {
            console.log('Collection "banners" exists but access forbidden (or admin access restricted).');
        } else if (collectionResponse.status === 404) {
            console.error('Collection "banners" NOT found.');
        } else {
            console.error(`Error checking collection: ${collectionResponse.status}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

verify();
