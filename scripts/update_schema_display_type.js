const { createDirectus, rest, authentication, createField, readFieldsByCollection } = await import('@directus/sdk');
import fs from 'fs';
import path from 'path';

// ... (env loading same as before) ...
// Helper to load .env manually
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

        console.log("Email Type:", typeof ADMIN_EMAIL, "Value:", ADMIN_EMAIL);
        console.log("Password Type:", typeof ADMIN_PASSWORD, "Value len:", ADMIN_PASSWORD ? ADMIN_PASSWORD.length : 0);

        // Try passing as object based on composable.js analysis
        // Try passing as object based on composable.js analysis
        await client.login({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
        console.log("Authenticated as Admin.");

        // Check if field exists
        try {
            const fields = await client.request(readFieldsByCollection('banners'));
            const existing = fields.find(f => f.field === 'display_type');
            if (existing) {
                console.log("Field 'display_type' already exists. Skipping creation.");
                return;
            }
        } catch (e) {
            console.warn("Could not list fields, proceeding to create...", e.message);
        }

        console.log("Adding 'display_type' field to 'banners' collection...");

        await client.request(createField('banners', {
            field: 'display_type',
            type: 'string',
            meta: {
                interface: 'select-dropdown',
                options: {
                    choices: [
                        { text: 'Banner (Ancho Completo)', value: 'full' },
                        { text: 'Carpeta (Medio Ancho)', value: 'half' }
                    ]
                },
                display: 'labels',
                display_options: {
                    show_as_dot: true,
                    choices: [
                        { text: 'Banner', value: 'full', background: '#0061FE', color: '#FFFFFF' },
                        { text: 'Carpeta', value: 'half', background: '#2EC551', color: '#FFFFFF' }
                    ]
                },
                width: 'half',
                note: 'Determina si se muestra como banner principal o como carpeta pequeña.'
            },
            schema: {
                default_value: 'full',
                is_nullable: false
            }
        }));

        console.log("SUCCESS: Field 'display_type' added.");

    } catch (error) {
        console.error("Failed to update schema!");
        console.dir(error, { depth: null });
        if (error.errors) {
            console.log("Errors:", JSON.stringify(error.errors, null, 2));
        }
    }
}

updateSchema();
