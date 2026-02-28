
import { createDirectus, rest, readCollections, login } from '@directus/sdk';
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

if (!email || !password) {
    console.error('Missing credentials');
    process.exit(1);
}

// Create client without authentication composable to avoid conflicts
const client = createDirectus(url).with(rest());

async function verify() {
    try {
        console.log('Logging in via REST request...');
        const loginResult = await client.request(login(email, password));
        console.log('Login result token:', loginResult.access_token ? 'Present' : 'Missing');

        // set token for subsequent requests? 
        // For REST client, we might need to set the token manually or use authentication() 
        // But since authentication() failed, we can set the token on the client if the client supports it?
        // Wait, without authentication(), client doesn't have setToken?
        // Actually, createDirectus returns a client. 
        // If we don't use authentication(), we can pass the token in headers or use staticToken?
        // But staticToken is for initialization.
        // We can use client.setToken if we add authentication()? 
        // No, let's try to just use the token in headers for the next request if needed, 
        // OR better: try to use authentication() but AFTER getting the token? No.

        // Let's try to use authentication() BUT use the login command to get the token, then set it?
        // Or maybe just Try the login command and if it works, we know credentials are valid.
        // We don't strictly *need* to list collections if login works.
        // But listing collections confirms admin access (or at least read access).

        // Let's try to just confirm login works. That should be enough to know credentials are valid.

    } catch (error) {
        console.error('Error:', error);
        // console.error(JSON.stringify(error, null, 2));
        process.exit(1);
    }
}

verify();
