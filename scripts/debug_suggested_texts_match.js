import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const DIRECTUS_URL = process.env.VITE_DIRECTUS_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN; // Using static token if available or we might need login
// If static token is not in env, we might need to login. 
// However, the service uses public access or login. Let's try public first or use the admin login from previous scripts.
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || "password";

async function getBanners() {
    console.log("Fetching banners...");
    // First try to login to get a token
    const loginResp = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });

    let token = '';
    if (loginResp.ok) {
        const loginData = await loginResp.json();
        token = loginData.data.access_token;
    } else {
        console.log("Login failed or public access?");
    }

    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    const resp = await fetch(`${DIRECTUS_URL}/items/banners?fields=id,title,target_path,suggested_texts&filter[active][_eq]=true`, {
        headers
    });

    if (!resp.ok) {
        console.error("Failed to fetch banners", await resp.text());
        return [];
    }

    const data = await resp.json();
    return data.data;
}

async function debugMatch() {
    const banners = await getBanners();
    console.log(`Fetched ${banners.length} banners.`);

    // Detailed banner info
    banners.forEach(b => {
        console.log(`Banner ID: ${b.id}`);
        console.log(`  Title: ${b.title}`);
        console.log(`  Target Path: '${b.target_path}'`);
        console.log(`  Suggested Texts: ${b.suggested_texts ? JSON.stringify(b.suggested_texts) : 'NONE'}`);
    });

    // Test Case provided by user
    // Asset is in: Argentina/Campañas/Tienda Compartida
    // We assume the FULL path from Dropbox might be something like:
    // /Apps/Posteo Facil/Argentina/Campañas/Tienda Compartida/Just-TiendaCompartida-CompraOnline.mp4

    // We also need to know the GLOBAL_ROOT_PATH from env to simulate what the app sees
    const GLOBAL_ROOT_PATH = process.env.VITE_DROPBOX_ROOT_PATH || "";
    console.log(`GLOBAL_ROOT_PATH: '${GLOBAL_ROOT_PATH}'`);

    const testAssetPath = `${GLOBAL_ROOT_PATH}/Argentina/Campañas/Tienda Compartida/Just-TiendaCompartida-CompraOnline.mp4`;
    console.log(`\nTesting with Asset Path: '${testAssetPath}'`);

    // Current Logic in AssetDetail.jsx
    console.log("--- Simulating AssetDetail.jsx Logic ---");
    let matchFound = false;

    const assetPathLower = testAssetPath.toLowerCase();

    for (const b of banners) {
        if (!b.target_path) continue;
        const target = b.target_path.toLowerCase();

        const isMatch = assetPathLower.startsWith(target); // This verifies the CURRENT broken logic
        console.log(`Checking Banner ${b.id} ('${target}'): Match? ${isMatch}`);

        if (isMatch) matchFound = true;
    }

    if (!matchFound) {
        console.log("\n❌ NO MATCH FOUND with current logic.");
        console.log("Reason: 'startsWith' expects the Banner Target Path to match the BEGINNING of the Asset Path.");
        console.log(`Asset Path starts with: '${testAssetPath.substring(0, 20)}...'`);
        console.log("If Banner Target Path is relative (e.g. starting with 'Argentina'), it won't match the '/Apps/...' prefix.");
    } else {
        console.log("\n✅ MATCH FOUND with current logic.");
    }

    // Proposed Fix Logic
    console.log("\n--- Simulating Proposed Fix Logic ---");

    for (const b of banners) {
        if (!b.target_path) continue;

        // Normalize logic from Home.jsx
        let target = b.target_path;
        if (!target.startsWith('/')) {
            // If target is relative, prepend global root? 
            // Or just check if asset path INCLUDES the target path?
            // Safer to construct the absolute expected path.

            // Ensure GLOBAL_ROOT_PATH does not have trailing slash
            const cleanRoot = GLOBAL_ROOT_PATH.replace(/\/$/, '');
            // Ensure target does not have leading slash
            const cleanTarget = target.replace(/^\//, '');

            target = `${cleanRoot}/${cleanTarget}`;
        }

        const targetLower = target.toLowerCase();
        const isMatch = assetPathLower.startsWith(targetLower);

        console.log(`Checking Banner ${b.id} (Normalized: '${targetLower}'): Match? ${isMatch}`);
    }

}

debugMatch();
