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

const testRefresh = async () => {
    console.log("Testing Refresh Token...");
    console.log("App Key:", envConfig.VITE_DROPBOX_APP_KEY);
    console.log("Refresh Token:", envConfig.VITE_DROPBOX_REFRESH_TOKEN);

    try {
        // Just listing root to trigger a token refresh/check
        const response = await dbx.filesListFolder({ path: '' });
        console.log("Success! Token works.");
    } catch (error) {
        console.error("Error:", error);
        if (error.error) {
            console.error("Error Detail:", JSON.stringify(error.error, null, 2));
        }
    }
};

testRefresh();
