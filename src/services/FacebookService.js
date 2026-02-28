
const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

export const loginToFacebook = () => {
    const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
    const redirectUri = import.meta.env.VITE_FACEBOOK_REDIRECT_URI || (window.location.origin + '/auth/facebook/callback');

    if (!appId) {
        alert("Configuration Error: VITE_FACEBOOK_APP_ID is missing.");
        return Promise.reject(new Error("Missing App ID"));
    }

    const cleanAppId = appId.trim();

    // Scopes for managing pages and publishing content
    const scope = 'pages_manage_posts,pages_show_list,pages_read_engagement';
    // const scope = 'public_profile';
    const state = 'st=' + Math.random().toString(36).substring(2);

    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${cleanAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}&response_type=code`;

    console.log("Facebook Login Debug:", { appId: cleanAppId, authUrl }); // DEBUG
    window.location.href = authUrl;

    return new Promise(() => { });
};

export const getFacebookPages = async (userAccessToken) => {
    try {
        const url = `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,picture&access_token=${userAccessToken}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        return data.data; // Array of pages: { id, name, access_token, picture }
    } catch (error) {
        console.error("Error fetching Facebook Pages:", error);
        throw error;
    }
};

export const postToFacebook = async (asset, caption, pageAccessToken, pageId) => {
    if (!pageAccessToken || !pageId) {
        throw new Error("Missing Page Access Token or Page ID.");
    }

    try {
        let url;
        const params = new URLSearchParams({
            access_token: pageAccessToken,
            message: caption || '' // Facebook uses 'message' for caption
        });

        if (asset.type === 'video') {
            // Video Post
            // Using logic similar to Instagram/TikTok: If URL is public/proxy, we can try file_url.
            // Facebook Graph API supports file_url for videos.
            url = `${GRAPH_API_BASE}/${pageId}/videos`;
            params.append('file_url', asset.url);
        } else {
            // Photo Post
            url = `${GRAPH_API_BASE}/${pageId}/photos`;
            params.append('url', asset.url);
        }

        const response = await fetch(`${url}?${params.toString()}`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`Facebook Post Failed: ${data.error.message}`);
        }

        return { success: true, id: data.id || data.post_id };

    } catch (error) {
        console.error("Facebook Post Error:", error);
        throw error;
    }
};
