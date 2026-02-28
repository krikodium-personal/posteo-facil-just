
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

async function addField() {
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
        console.log('Authenticated.');

        // 2. Check if field exists
        console.log('Checking existing fields...');
        const fieldResponse = await fetch(`${baseUrl}/fields/banners/suggested_texts`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (fieldResponse.ok) {
            console.log('Field "suggested_texts" already exists. No changes made.');
            return;
        }

        if (fieldResponse.status !== 404 && fieldResponse.status !== 403) {
            // 403 might mean field doesn't exist but we can't see it? assume 404 is the signal.
            // Actually, if we are admin, 403 shouldn't happen for reading fields unless permissions are weird.
            throw new Error(`Unexpected status checking field: ${fieldResponse.status}`);
        }

        // 3. Create Field
        console.log('Creating "suggested_texts" field...');
        const payload = {
            field: "suggested_texts",
            type: "json",
            schema: {
                name: "suggested_texts",
                table: "banners",
                data_type: "json",
                default_value: null,
                is_nullable: true,
            },
            meta: {
                collection: "banners",
                field: "suggested_texts",
                special: ["cast-json"],
                interface: "list", // 'list' interface allows adding strings to a JSON array
                options: {
                    addLabel: "Agregar frase"
                },
                display: null,
                readonly: false,
                hidden: false,
                sort: null,
                width: "full",
                translations: null,
                note: "Frases sugeridas para el posteo",
                conditions: null,
                required: false,
                group: null,
                validation: null,
                validation_message: null
            }
        };

        // Note: Directus POST /fields/:collection
        const createResponse = await fetch(`${baseUrl}/fields/banners`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Failed to create field: ${createResponse.status} - ${errorText}`);
        }

        const createData = await createResponse.json();
        console.log('Field created successfully!');
        // console.log(JSON.stringify(createData, null, 2));

        // 4. Update Field Meta (Label) - sometimes needed separately or to ensure proper labeling
        // The POST above includes 'meta', but let's double check if we need to update just to be sure about the Label "Textos sugeridos"
        // Actually, let's just assume the POST handled it, but usually 'label' is a property in meta?
        // Wait, looking at Directus docs/examples, meta has a 'note' but proper "Label" is usually inferred or stored in 'translations' or 'interface' options? 
        // No, `meta.options` is for the interface. 
        // `meta.display_options` is for display.
        // `meta` object usually has `translations`? 
        // Or simply `meta.label`? 
        // Directus 9+ uses `meta` -> `translations`? No, it often has a `label` property in older versions but newer ones might rely on translations or snake_case conversion.
        // Actually, most systems just grab the field name. 
        // Let's try to update the label explicitly if needed. 
        // Correction: Valid meta properties include `translation`, `note`, `interface`, `options`, `display`, etc.
        // 'label' is NOT a direct property of meta in DB usually, it's dynamic. BUT `translations` is where you set the override.
        // Let's try to set a nice note.

        console.log('Updating field metadata (Label)...');
        // We'll update the 'meta' specifically to add a translation or just verify.
        // Actually, let's keep it simple. If the user wants "Textos sugeridos" as the visible title, 
        // we might rely on Directus auto-formatting or set it via UI later if script fails this part. 
        // But we can try to pass `note` which we did.

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

addField();
