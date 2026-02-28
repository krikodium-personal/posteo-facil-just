const { createDirectus, rest, authentication, createField, readFieldsByCollection } = await import('@directus/sdk');
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
    console.error("Check VITE_DIRECTUS_URL, DIRECTUS_ADMIN_EMAIL, DIRECTUS_ADMIN_PASSWORD");
    process.exit(1);
}

const client = createDirectus(DIRECTUS_URL)
    .with(authentication())
    .with(rest());

async function updateSchema() {
    try {
        console.log(`Connecting to ${DIRECTUS_URL}...`);
        await client.login({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
        console.log("Authenticated as Admin.");

        // Check if field exists
        try {
            const fields = await client.request(readFieldsByCollection('banners'));
            const existing = fields.find(f => f.field === 'display_layout');
            if (existing) {
                console.log("Field 'display_layout' already exists. Skipping creation.");
                return;
            }
        } catch (e) {
            console.warn("Could not list fields, proceeding to create...", e.message);
        }

        console.log("Adding 'display_layout' field to 'banners' collection...");

        await client.request(createField('banners', {
            field: 'display_layout',
            type: 'string',
            meta: {
                interface: 'select-dropdown',
                options: {
                    choices: [
                        { text: 'Card (Nivel 2/Small)', value: 'card-small' },
                        { text: 'Card V3 (Nivel 3/Tienda)', value: 'card-v3' },
                        { text: 'Lista Expandida (Nivel 4)', value: 'list-subfolders' },
                        { text: 'Grilla de Fotos (Nivel 5)', value: 'asset-foto-grid' }
                    ]
                },
                display: 'labels',
                display_options: {
                    show_as_dot: true,
                    choices: [
                        { text: 'Card (Nivel 2/Small)', value: 'card-small', background: '#A098D5', color: '#FFFFFF' },
                        { text: 'Card V3 (Nivel 3/Tienda)', value: 'card-v3', background: '#456ECE', color: '#FFFFFF' },
                        { text: 'Lista Expandida (Nivel 4)', value: 'list-subfolders', background: '#5AAFF1', color: '#FFFFFF' },
                        { text: 'Grilla de Fotos (Nivel 5)', value: 'asset-foto-grid', background: '#2EC551', color: '#FFFFFF' }
                    ]
                },
                width: 'half',
                note: 'Sobreescribe el diseño estructurado de elementos dentro esta carpeta.',
            },
            schema: {
                is_nullable: true
            }
        }));

        console.log("SUCCESS: Field 'display_layout' added.");

    } catch (error) {
        console.error("Failed to update schema!");
        console.dir(error, { depth: null });
    }
}

updateSchema();
