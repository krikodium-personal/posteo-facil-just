const { createDirectus, rest, authentication, updateItem } = await import('@directus/sdk');
import fs from 'fs';
import path from 'path';

function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envFile.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (key && val) env[key.trim()] = val.trim();
        });
        return env;
    } catch (e) {
        console.error("Could not load .env file", e);
        return {};
    }
}

const env = loadEnv();

const DIRECTUS_URL = env.VITE_DIRECTUS_URL;
const ADMIN_EMAIL = env.DIRECTUS_ADMIN_EMAIL;
const ADMIN_PASSWORD = env.DIRECTUS_ADMIN_PASSWORD;

if (!DIRECTUS_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error("Error: Missing credentials in .env");
    process.exit(1);
}

const client = createDirectus(DIRECTUS_URL)
    .with(authentication())
    .with(rest());

async function updateBanner() {
    try {
        console.log(`Connecting to ${DIRECTUS_URL}...`);
        await client.login({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
        console.log("Authenticated as Admin.");

        console.log("Updating Banner ID 4 'Tienda Compartida' with layout 'card-v3'...");

        await client.request(updateItem('banners', 4, {
            display_layout: 'card-v3'
        }));

        console.log("SUCCESS: Banner updated successfully.");

    } catch (error) {
        console.error("Failed to update banner!");
        console.dir(error, { depth: null });
    }
}

updateBanner();
