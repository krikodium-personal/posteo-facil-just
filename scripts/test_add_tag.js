import { Dropbox } from 'dropbox';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const dbx = new Dropbox({
    clientId: envConfig.VITE_DROPBOX_APP_KEY,
    clientSecret: envConfig.VITE_DROPBOX_APP_SECRET,
    refreshToken: envConfig.VITE_DROPBOX_REFRESH_TOKEN,
});

const testAddTag = async () => {
    try {
        console.log("1. Finding a file to tag...");
        const list = await dbx.filesListFolder({ path: envConfig.VITE_DROPBOX_ROOT_PATH || '' });
        let targetFile = list.result.entries.find(e => e['.tag'] === 'file');

        if (!targetFile) {
            const search = await dbx.filesSearchV2({ query: "jpg" });
            if (search.result.matches.length > 0) {
                targetFile = search.result.matches[0].metadata.metadata;
            }
        }

        if (!targetFile) {
            console.log("No file found.");
            return;
        }

        console.log(`Target: ${targetFile.path_display}`);
        const TEST_TAG = "test_tag_" + Date.now();
        console.log(`Adding tag: ${TEST_TAG}`);

        // Try using SDK if available? 
        // console.log("SDK methods:", Object.keys(dbx).filter(k => k.includes('tag'))); 
        // Assuming fetch for now as implemented in service

        const token = await dbx.auth.getAccessToken(); // This refreshes if needed because we called listFolder above

        const response = await fetch('https://api.dropboxapi.com/2/files/tags/add', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: targetFile.path_lower,
                tag_text: TEST_TAG
            })
        });

        if (!response.ok) {
            console.log("Add Tag Failed:", await response.text());
        } else {
            console.log("Add Tag Success!");
        }

        console.log("2. Verifying tags...");
        const verifyResp = await fetch('https://api.dropboxapi.com/2/files/tags/get', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paths: [targetFile.path_lower]
            })
        });

        const verifyData = await verifyResp.json();
        console.log("Tags on file:", JSON.stringify(verifyData, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
};

testAddTag();
