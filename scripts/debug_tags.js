import { Dropbox } from 'dropbox';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch'; // Ensure node-fetch is available or use global if node 18+

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const dbx = new Dropbox({
    accessToken: envConfig.VITE_DROPBOX_ACCESS_TOKEN, // Use the token if available, or try to get one using refresh
    clientId: envConfig.VITE_DROPBOX_APP_KEY,
    clientSecret: envConfig.VITE_DROPBOX_APP_SECRET,
    refreshToken: envConfig.VITE_DROPBOX_REFRESH_TOKEN,
});

const debugTags = async () => {
    try {
        // We'll search for a file that likely has tags, or just list root to find one
        console.log("Listing files to find one...");
        const list = await dbx.filesListFolder({ path: envConfig.VITE_DROPBOX_ROOT_PATH || '' });

        let targetFile = list.result.entries.find(e => e['.tag'] === 'file');

        if (!targetFile) {
            // Deep search
            const search = await dbx.filesSearchV2({ query: "jpg" });
            if (search.result.matches.length > 0) {
                targetFile = search.result.matches[0].metadata.metadata;
            }
        }

        if (!targetFile) {
            console.log("No file found.");
            return;
        }

        console.log(`Inspecting tags for: ${targetFile.path_display}`);

        // Get Access Token explicitly if needed (SDK handles it usually but for fetch we need it)
        dbx.auth.setAccessToken(null); // Force refresh if using refresh token? 
        // Actually, just let the SDK get the token
        const token = await dbx.auth.getAccessToken();

        const response = await fetch('https://api.dropboxapi.com/2/files/tags/get', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paths: [targetFile.path_lower]
            })
        });

        const data = await response.json();
        console.log("Raw Tags Response:", JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
};

debugTags();
