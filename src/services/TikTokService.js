
const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

// Helper for PKCE: Generate random string
const generateRandomString = (length) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let text = '';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

// Helper for PKCE: Generate SHA-256 challenge
const generateCodeChallenge = async (codeVerifier) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

export const loginToTikTok = async () => {
    const clientKey = import.meta.env.VITE_TIKTOK_CLIENT_KEY;
    const redirectUri = import.meta.env.VITE_TIKTOK_REDIRECT_URI || (window.location.origin + '/auth/tiktok/callback');

    if (!clientKey) {
        alert("Config Error: VITE_TIKTOK_CLIENT_KEY is missing.");
        return Promise.reject(new Error("Missing TikTok Client Key"));
    }

    // Scopes for TikTok Direct Post
    // Testing ONLY video.publish. Sometimes openid is rejected if Login Kit isn't the primary product.
    const scope = 'video.publish';
    const state = Math.random().toString(36).substring(2);

    // PKCE implementation
    const codeVerifier = generateRandomString(128);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Save verifier for the callback
    localStorage.setItem('tiktok_code_verifier', codeVerifier);

    // TikTok OAuth 2.0 URL
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${encodeURIComponent(scope)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    console.log("[TikTokService] window.location.origin:", window.location.origin);
    console.log("[TikTokService] redirectUri:", redirectUri);
    console.log("[TikTokService] authUrl:", authUrl);

    window.location.href = authUrl;

    return new Promise(() => { });
};

export const getTikTokCreatorInfo = async (accessToken) => {
    try {
        const url = `${TIKTOK_API_BASE}/post/publish/creator_info/query/`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'Error fetching TikTok creator info');
        }

        return data.data; // creator_nickname, creator_avatar_url, etc.
    } catch (error) {
        console.error("TikTok Creator Info Error:", error);
        throw error;
    }
};

export const postToTikTok = async (asset, caption, accessToken) => {
    if (!accessToken) {
        throw new Error("Missing TikTok access token.");
    }

    if (asset.type !== 'video' && asset.type !== 'image') {
        throw new Error("Only videos and images are supported for TikTok.");
    }

    try {
        // Step 1: Initialize Post (using backend proxy to avoid CORS)
        console.log("[TikTokService] Initializing post via backend proxy...");
        const initUrl = '/api/tiktok/publish';
        const isPhoto = asset.type === 'image' || asset.type === 'photo';

        let proxyUrl = asset.url;
        if (isPhoto) {
            // Use our Vercel proxy to wrap the image URL
            // This ensures the domain is verified (daminstagramapp.vercel.app)
            const baseUrl = window.location.origin;
            proxyUrl = `${baseUrl}/api/proxy-image?url=${encodeURIComponent(asset.url)}`;
            console.log("[TikTokService] Using Proxy URL:", proxyUrl);
        }

        const initBody = {
            post_info: {
                title: caption ? caption.substring(0, 150) : (isPhoto ? "Photo post" : "Video post"),
                privacy_level: "SELF_ONLY",
                disable_comment: true,
                disable_duet: true,
                disable_stitch: true
            },
            source_info: isPhoto ? {
                source: "PULL_FROM_URL",
                photo_images: [proxyUrl], // Use proxy URL here
                photo_cover_index: 0
            } : {
                source: "FILE_UPLOAD",
                video_size: Number(asset.size) || 0,
                chunk_size: Number(asset.size) || 0,
                total_chunk_count: 1
            },
            accessToken,
            media_type: isPhoto ? 'PHOTO' : undefined,
            post_mode: isPhoto ? 'DIRECT_POST' : undefined
        };

        console.log("[TikTokService] initBody to proxy:", JSON.stringify(initBody, null, 2));

        const initRes = await fetch(initUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(initBody)
        });

        const initData = await initRes.json();

        if (initData.error && initData.error.code !== 'ok') {
            throw new Error(`TikTok Init Failed: ${initData.error.message} (Code: ${initData.error.code})`);
        }

        const { upload_url, publish_id } = initData.data;
        console.log("[TikTokService] Init successful. Upload URL received.");

        // Step 2: Upload Video File (Only for Video)
        if (!isPhoto) {
            console.log("[TikTokService] Fetching asset file...");
            const assetRes = await fetch(asset.url);
            const blob = await assetRes.blob();

            console.log("[TikTokService] Uploading to TikTok...");
            const uploadRes = await fetch(upload_url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'video/mp4',
                    'Content-Length': blob.size.toString(),
                    'Content-Range': `bytes 0-${blob.size - 1}/${blob.size}`
                },
                body: blob
            });

            if (!uploadRes.ok) {
                const errorText = await uploadRes.text();
                throw new Error(`TikTok Upload Failed: ${uploadRes.status} ${errorText}`);
            }

            console.log("[TikTokService] Upload complete!");
        } else {
            console.log("[TikTokService] Photo post initiated via PULL_FROM_URL (Proxy). No manual upload needed.");
        }
        return { success: true, publish_id };

    } catch (error) {
        console.error("TikTok Post Error:", error);
        throw error;
    }
};
