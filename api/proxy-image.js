
import fetch from 'node-fetch';

export default async function handler(request, response) {
    // Add CORS headers
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    const { url } = request.query;

    if (!url) {
        return response.status(400).json({ error: 'Missing "url" query parameter' });
    }

    try {
        const imageRes = await fetch(url);

        if (!imageRes.ok) {
            return response.status(imageRes.status).send(`Failed to fetch image: ${imageRes.statusText}`);
        }

        const contentType = imageRes.headers.get('content-type');
        if (contentType) {
            response.setHeader('Content-Type', contentType);
        }

        // Stream the body to the response
        // Note: For newer Node/Vercel environments, we can pipeline. 
        // Or simpler: getting the buffer. Buffer is safer for small images (TikTok limit is 20MB).
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        response.setHeader('Content-Length', buffer.length);
        response.send(buffer);

    } catch (error) {
        console.error("[Proxy] Error fetching image:", error);
        return response.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
