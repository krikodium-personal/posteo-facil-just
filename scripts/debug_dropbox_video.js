import { Dropbox } from 'dropbox';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbx = new Dropbox({
    clientId: process.env.VITE_DROPBOX_APP_KEY,
    clientSecret: process.env.VITE_DROPBOX_APP_SECRET,
    refreshToken: process.env.VITE_DROPBOX_REFRESH_TOKEN
});

const videoId = 'id:6z_OKex_OMoAAAAAAAAATQ'; // From previous run

async function run() {
    try {
        console.log(`Getting Metadata for: ${videoId}`);
        const response = await dbx.filesGetMetadata({
            path: videoId,
            include_media_info: true
        });

        console.log("Metadata Response:", JSON.stringify(response.result, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
