import { Dropbox } from 'dropbox';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load config
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const APP_KEY = envConfig.VITE_DROPBOX_APP_KEY;
const APP_SECRET = envConfig.VITE_DROPBOX_APP_SECRET;
// The "Refresh Token" currently in .env might actually be the Auth Code
const POTENTIAL_CODE = envConfig.VITE_DROPBOX_REFRESH_TOKEN;

const dbx = new Dropbox({
    clientId: APP_KEY,
    clientSecret: APP_SECRET,
});

const exchange = async () => {
    console.log("Attempting to exchange code for token...");
    console.log("Code:", POTENTIAL_CODE);

    try {
        // We use a redirect URI? If we used the standard flow, it might be localhost or just standard
        // For the manual link, usually redirectUri is optional or 'null' implies manual copy-paste flow?
        // The SDK requires redirectUri usually if it was part of the auth url.
        // My link: ...Authorize...?client_id=...&response_type=code
        // I didn't verify redirect_uri. It defaults to the setup in App Console.
        // If the user copied the code, it's likely the "No redirect URI" flow.

        const response = await dbx.auth.getAccessTokenFromCode(undefined, POTENTIAL_CODE);
        console.log("\nSUCCESS! Exchange worked.");
        console.log("Result:", JSON.stringify(response.result, null, 2));

        if (response.result.refresh_token) {
            console.log("\nREAL REFRESH TOKEN:", response.result.refresh_token);
        } else {
            console.log("\nWARNING: No refresh token returned. Did you request offline access?");
        }

    } catch (error) {
        console.error("Exchange Failed:", error);
        if (error.error) {
            console.log("Error details:", JSON.stringify(error.error, null, 2));
        }
    }
};

exchange();
