
// api/auth/tiktok.js
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

    const { code, redirectUri, code_verifier } = request.body || request.query;

    if (!code) {
        return response.status(400).json({ error: 'Missing code parameter' });
    }

    const clientKey = process.env.VITE_TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET || process.env.VITE_TIKTOK_CLIENT_SECRET;

    if (!clientSecret) {
        return response.status(500).json({ error: 'Server misconfiguration: Missing TikTok Client Secret' });
    }

    try {
        // Exchange code for access token via TikTok API
        const tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';

        const params = new URLSearchParams();
        params.append('client_key', clientKey);
        params.append('client_secret', clientSecret);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', redirectUri);
        if (code_verifier) {
            params.append('code_verifier', code_verifier);
        }

        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        const tokenData = await tokenResponse.json();
        console.log("TikTok Token Data:", tokenData);

        if (tokenData.error) {
            console.error("TikTok Token Error:", tokenData.error);
            return response.status(400).json(tokenData);
        }

        const accessToken = tokenData.access_token;

        // Fetch Creator Info server-side to avoid CORS
        try {
            const creatorInfoUrl = 'https://open.tiktokapis.com/v2/post/publish/creator_info/query/';
            const creatorResponse = await fetch(creatorInfoUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const creatorData = await creatorResponse.json();
            console.log("TikTok Creator Data:", creatorData);

            // Add creator info to tokenData
            if (creatorData.data) {
                tokenData.creator_nickname = creatorData.data.creator_nickname;
                tokenData.creator_avatar_url = creatorData.data.creator_avatar_url;
            }
        } catch (creatorError) {
            console.error("Error fetching creator info:", creatorError);
            // We don't fail the whole auth if only creator info fails
        }

        return response.status(200).json(tokenData);

    } catch (error) {
        console.error("Server Error:", error);
        return response.status(500).json({ error: error.message });
    }
}
