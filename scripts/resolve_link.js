import { Dropbox } from 'dropbox';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const dbx = new Dropbox({
    clientId: envConfig.VITE_DROPBOX_APP_KEY,
    clientSecret: envConfig.VITE_DROPBOX_APP_SECRET,
    refreshToken: envConfig.VITE_DROPBOX_REFRESH_TOKEN,
});

const SHARED_LINK = 'https://www.dropbox.com/scl/fo/x77y9gr003snmrkozvzii/AO3sAaz1pf5Ua5FYdb8QWbE?rlkey=uxurtkls6r8qvv2gt7qgpl2zs&dl=0';

const resolve = async () => {
    try {
        console.log("Resolving shared link:", SHARED_LINK);
        const response = await dbx.sharingGetSharedLinkMetadata({
            url: SHARED_LINK
        });

        console.log("Link Metadata:", JSON.stringify(response.result, null, 2));

        if (response.result.path_lower) {
            console.log("ROOT PATH FOUND:", response.result.path_lower);
        } else {
            console.log("No direct path found in link metadata. It might be a public link to a folder I don't have mounted?");
        }

    } catch (e) {
        console.error("Error resolving link:", e);
    }
};

resolve();
