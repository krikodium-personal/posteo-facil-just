
import fetch from 'node-fetch';

export default async function handler(request, response) {
    // Allow CORS
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    const { code, redirectUri } = request.body || request.query;

    if (!code) {
        return response.status(400).json({ error: 'Missing code parameter' });
    }

    const appId = process.env.VITE_FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.VITE_FACEBOOK_APP_SECRET;

    if (!appSecret) {
        return response.status(500).json({ error: 'Server misconfiguration: Missing App Secret' });
    }

    try {
        // Exchange code for user access token via Facebook Graph API
        const tokenUrl = 'https://graph.facebook.com/v21.0/oauth/access_token';

        const params = new URLSearchParams();
        params.append('client_id', appId);
        params.append('client_secret', appSecret);
        params.append('redirect_uri', redirectUri);
        params.append('code', code);

        const tokenResponse = await fetch(`${tokenUrl}?${params.toString()}`);
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error("Facebook Auth Error:", tokenData.error);
            return response.status(400).json(tokenData);
        }

        return response.status(200).json(tokenData);

    } catch (error) {
        console.error("Server Error:", error);
        return response.status(500).json({ error: error.message });
    }
}
