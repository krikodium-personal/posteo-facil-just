import { Dropbox } from 'dropbox';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars
// We are in scripts/, need to go up one level
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const dbx = new Dropbox({
    accessToken: envConfig.VITE_DROPBOX_ACCESS_TOKEN,
    clientId: envConfig.VITE_DROPBOX_APP_KEY,
    clientSecret: envConfig.VITE_DROPBOX_APP_SECRET,
    refreshToken: envConfig.VITE_DROPBOX_REFRESH_TOKEN,
});

const inspect = async () => {
    try {
        console.log("Listing files...");
        const response = await dbx.filesListFolder({
            path: '',
            recursive: true,
            include_media_info: true,
            include_mounted_folders: true,
            include_has_explicit_shared_members: true
        });

        const files = response.result.entries.filter(e => e['.tag'] === 'file');
        console.log(`Found ${files.length} files.`);

        // Find the specific file if possible, or just dump the first one
        const targetFile = files.find(f => f.name.includes('Balsamo') || f.name.includes('arnica') || f.name.includes('Carrusel-2'));

        if (targetFile) {
            console.log('\n--- TARGET FILE METADATA (from list_folder) ---');
            console.log(JSON.stringify(targetFile, null, 2));

            console.log('\n--- FETCHING DETAILED METADATA ---');
            const detail = await dbx.filesGetMetadata({
                path: targetFile.path_lower,
                include_media_info: true,
                include_has_explicit_shared_members: true,
            });
            console.log(JSON.stringify(detail.result, null, 2));
        } else {
            console.log("Target file not found in list. Dumping first 3 files.");
            files.slice(0, 3).forEach(f => {
                console.log(JSON.stringify(f, null, 2));
            });
        }
        if (files.length > 0) {
            const testFile = files[0];
            console.log(`\n--- TESTING NATIVE TAGS FOR: ${testFile.name} (${testFile.id}) ---`);

            try {
                // Get the fresh token from the SDK instance
                const freshToken = dbx.auth.getAccessToken();
                console.log("Using token:", freshToken ? "Token present" : "Token missing");

                // Try raw fetch for tags, as SDK might not have it or it's beta
                const response = await fetch('https://api.dropboxapi.com/2/files/tags/get', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${freshToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        paths: [testFile.path_lower]
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log("TAGS RESPONSE:", JSON.stringify(data, null, 2));
                } else {
                    console.log("TAGS FETCH FAILED:", response.status, await response.text());
                }

            } catch (e) {
                console.log("Error fetching tags:", e);
            }
        }

    } catch (error) {
        console.error("Error inspecting:", error);
    }
};

inspect();
