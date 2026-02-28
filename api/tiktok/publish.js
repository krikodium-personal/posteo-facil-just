
import fetch from 'node-fetch';

export default async function handler(request, response) {
    // Add CORS headers for Vercel
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        let body = request.body;

        // Ensure body is parsed
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                console.error("[Backend] Failed to parse body string:", e);
                return response.status(400).json({ error: 'Invalid JSON body' });
            }
        }

        // Default to empty object to avoid destructuring error
        body = body || {};

        const { post_info, source_info, accessToken, media_type, post_mode } = body;
        console.log("[Backend] Parsed Body:", JSON.stringify(body, null, 2));

        if (!post_info || !source_info) {
            console.error("[Backend] Missing post_info or source_info");
            return response.status(400).json({ error: 'Missing post_info or source_info in request' });
        }

        if (!accessToken) {
            return response.status(400).json({ error: 'Missing TikTok access token' });
        }

        console.log("[Backend] Initializing TikTok post...");

        let initUrl;
        const tiktokBody = { post_info, source_info };

        if (media_type === 'PHOTO') {
            initUrl = 'https://open.tiktokapis.com/v2/post/publish/content/init/';
            tiktokBody.media_type = 'PHOTO';
            tiktokBody.post_mode = post_mode || 'DIRECT_POST';
        } else {
            initUrl = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
        }

        console.log(`[Backend] Using Endpoint: ${initUrl}`);

        const initRes = await fetch(initUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tiktokBody)
        });

        const initData = await initRes.json();
        console.log("[Backend] TikTok Init Response:", initData);

        return response.status(initRes.status).json(initData);

    } catch (error) {
        console.error("[Backend] TikTok Publish Init Error:", error);
        return response.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}
