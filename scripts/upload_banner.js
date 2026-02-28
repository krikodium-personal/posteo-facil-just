import { Dropbox } from 'dropbox';
import fetch from 'node-fetch'; // Standard fetch in Node 18+, but we might need to rely on global fetch if available or install it. 
// Actually, modern Node has fetch. Let's try native fetch.
import fs from 'fs';
import path from 'path';

// Helper to load .env manually since we are in a script
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

const config = {
    clientId: env.VITE_DROPBOX_APP_KEY,
    clientSecret: env.VITE_DROPBOX_APP_SECRET,
    refreshToken: env.VITE_DROPBOX_REFRESH_TOKEN,
    rootPath: env.VITE_DROPBOX_ROOT_PATH || ''
};

if (!config.clientId || !config.refreshToken) {
    console.error("Missing credentials in .env");
    process.exit(1);
}

const dbx = new Dropbox({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    refreshToken: config.refreshToken,
    fetch: global.fetch
});

async function uploadBanner() {
    const imageUrl = "https://www.dropbox.com/scl/fi/dz9q5xqx69j8qz6s1zoxc/L1YOAiqF.jpeg?rlkey=k9jyjpir4fu4ohm65j6ygqvxs&dl=1";
    const targetPath = `${config.rootPath}/_banners/productos.jpg`;

    console.log(`Downloading image from ${imageUrl}...`);

    try {
        const res = await fetch(imageUrl);
        if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(`Uploading to ${targetPath}...`);

        const uploadRes = await dbx.filesUpload({
            path: targetPath,
            contents: buffer,
            mode: 'overwrite'
        });

        console.log("Upload successful!", uploadRes.result.name);

    } catch (e) {
        console.error("Error:", e);
    }
}

uploadBanner();
