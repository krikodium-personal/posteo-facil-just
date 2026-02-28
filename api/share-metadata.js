
export default function handler(request, response) {
    // Add CORS headers
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    const { title, description, imageUrl, videoUrl, type } = request.query;

    // Determine Base URL for default assets
    const host = request.headers.host;
    const protocol = request.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;

    // Default metadata if missing
    const safeTitle = title || 'Contenido Multimedia';
    const safeDesc = description || 'Mira este contenido compartido.';
    const siteName = 'Posteo Fácil';
    const defaultImage = `${baseUrl}/logo_just.png`; // Fallback image

    let metaTags = `
        <meta property="og:site_name" content="${siteName}" />
        <meta property="og:title" content="${safeTitle}" />
        <meta property="og:description" content="${safeDesc}" />
    `;

    if (type === 'video' && videoUrl) {
        // Ensure Dropbox links are raw streams
        let cleanVideoUrl = videoUrl;
        if (cleanVideoUrl.includes('dropbox.com')) {
            // Replace dl=0 with raw=1 or append raw=1
            if (cleanVideoUrl.includes('dl=0')) {
                cleanVideoUrl = cleanVideoUrl.replace('dl=0', 'raw=1');
            } else if (!cleanVideoUrl.includes('raw=1')) {
                cleanVideoUrl += cleanVideoUrl.includes('?') ? '&raw=1' : '?raw=1';
            }
        }

        metaTags += `
        <meta property="og:type" content="video.other" />
        <meta property="og:video" content="${cleanVideoUrl}" />
        <meta property="og:video:secure_url" content="${cleanVideoUrl}" />
        <meta property="og:video:type" content="video/mp4" />
        <meta property="og:video:width" content="1280" />
        <meta property="og:video:height" content="720" />
        <meta property="og:image" content="${imageUrl || defaultImage}" />
        `;
    } else {
        metaTags += `
        <meta property="og:type" content="website" />
        <meta property="og:image" content="${imageUrl || defaultImage}" />
        `;
    }

    // Redirect script
    // We redirect to the actual content (videoUrl or imageUrl) immediately
    const targetUrl = videoUrl || imageUrl || 'https://google.com';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${safeTitle}</title>
    ${metaTags}
</head>
<body>
    <p>Redirigiendo al contenido...</p>
    <script>window.location.href = "${targetUrl}";</script>
</body>
</html>`;

    response.setHeader('Content-Type', 'text/html');
    response.send(html);
}
