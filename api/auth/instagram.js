
// api/auth/instagram.js
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

    // Use Instagram App ID for Instagram OAuth flow
    const appId = process.env.VITE_INSTAGRAM_APP_ID || process.env.VITE_FACEBOOK_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET || process.env.VITE_FACEBOOK_APP_SECRET;

    if (!appSecret) {
        return response.status(500).json({ error: 'Server misconfiguration: Missing App Secret' });
    }

    console.log('Instagram Auth Debug:', {
        appId,
        redirectUri,
        hasCode: !!code,
        hasSecret: !!appSecret
    });

    try {
        // Exchange code via Instagram OAuth API
        const tokenUrl = 'https://api.instagram.com/oauth/access_token';

        const params = new URLSearchParams();
        params.append('client_id', appId);
        params.append('client_secret', appSecret);
        params.append('grant_type', 'authorization_code');
        params.append('redirect_uri', redirectUri);
        params.append('code', code);

        console.log('Sending token request to Instagram:', {
            url: tokenUrl,
            client_id: appId,
            redirect_uri: redirectUri,
            has_secret: !!appSecret,
            has_code: !!code
        });

        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        const tokenData = await tokenResponse.json();

        console.log('Instagram Token Response:', {
            status: tokenResponse.status,
            ok: tokenResponse.ok,
            data: tokenData
        });

        if (tokenData.error) {
            console.error("Instagram Auth Error:", tokenData.error);
            return response.status(400).json(tokenData);
        }

        if (!tokenData.access_token) {
            console.error("No access_token in response:", tokenData);
            return response.status(500).json({
                error: 'No access token received from Instagram',
                details: tokenData
            });
        }

        // Step 2: Exchange short-lived token for long-lived token
        console.log('Exchanging for long-lived token...');

        const longLivedParams = new URLSearchParams();
        longLivedParams.append('grant_type', 'ig_exchange_token');
        longLivedParams.append('client_secret', appSecret);
        longLivedParams.append('access_token', tokenData.access_token);

        const longLivedResponse = await fetch('https://graph.instagram.com/access_token?' + longLivedParams.toString(), {
            method: 'GET'
        });

        const longLivedData = await longLivedResponse.json();

        console.log('Long-lived token response:', {
            status: longLivedResponse.status,
            ok: longLivedResponse.ok,
            hasToken: !!longLivedData.access_token,
            data: longLivedData
        });

        if (longLivedData.error) {
            console.error("Long-lived token error:", longLivedData.error);
            // If long-lived exchange fails, return the short-lived token anyway
            console.log("Falling back to short-lived token");
            return response.status(200).json(tokenData);
        }

        // Return the long-lived token
        console.log("Successfully exchanged for long-lived token");
        return response.status(200).json({
            access_token: longLivedData.access_token,
            token_type: longLivedData.token_type || tokenData.token_type,
            user_id: tokenData.user_id
        });

    } catch (error) {
        console.error("Server Error:", error);
        return response.status(500).json({ error: error.message });
    }
}
