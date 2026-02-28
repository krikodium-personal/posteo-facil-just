
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

async function fixConfig() {
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

        // 2. Prepare Payload
        // We need to fetch existing meta to merge? Or PATCH merges automatically?
        // Directus PATCH /fields/:collection/:field merges top-level properties but `meta` is a nested object.
        // Usually it merges `meta` properties too.

        const payload = {
            "meta": {
                "interface": "list",
                "options": {
                    "addLabel": "Agregar frase",
                    "fields": [
                        {
                            "field": "text",
                            "name": "Frase",
                            "type": "string",
                            "meta": {
                                "interface": "input",
                                "width": "full",
                                "options": {
                                    "placeholder": "Escribe una frase aquí... 🚀"
                                }
                            }
                        }
                    ]
                }
            }
        };

        // 3. Patch Field
        console.log('Updating field config...');
        const updateResponse = await fetch(`${baseUrl}/fields/banners/suggested_texts`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`Failed to update field: ${updateResponse.status} - ${errorText}`);
        }

        const updateData = await updateResponse.json();
        console.log('Field configuration updated successfully!');
        // console.log(JSON.stringify(updateData.data.meta.options, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

fixConfig();
