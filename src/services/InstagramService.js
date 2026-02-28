const GRAPH_API_BASE = 'https://graph.instagram.com/v22.0';

export const initFacebookSdk = () => {
    return new Promise((resolve, reject) => {
        if (window.FB) {
            resolve();
            return;
        }

        window.fbAsyncInit = () => {
            const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
            window.FB.init({
                appId: appId,
                cookie: true,
                xfbml: true,
                version: 'v22.0'
            });
            resolve();
        };

        (function (d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s); js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    });
};

// Native Flow: Business Login for Instagram (Official Meta Recommendation - v2.14.37)
export const loginToInstagram = () => {
    const appId = import.meta.env.VITE_INSTAGRAM_APP_ID;
    const redirectUri = import.meta.env.VITE_INSTAGRAM_REDIRECT_URI || (window.location.origin + '/auth/instagram/callback');

    if (!appId) {
        alert("Configuration Error: VITE_INSTAGRAM_APP_ID is missing.");
        return Promise.reject(new Error("Missing App ID"));
    }

    const state = Math.random().toString(36).substring(2, 15);

    // Scopes from the official Meta recommendation
    const scope = [
        'instagram_business_basic',
        'instagram_business_manage_messages',
        'instagram_business_manage_comments',
        'instagram_business_content_publish',
        'instagram_business_manage_insights'
    ].join(',');

    // Build URL using URLSearchParams to ensure proper encoding
    const params = new URLSearchParams({
        force_reauth: 'true', // Added this based on original code
        client_id: appId,
        redirect_uri: redirectUri,
        scope: scope,
        response_type: 'code',
        state: state
    });

    const authUrl = `https://www.instagram.com/oauth/authorize?${params.toString()}`;

    console.log("Redirecting to Instagram Business Auth (Official Meta Flow v2.14.37):", authUrl);
    console.log("Redirect URI being used:", redirectUri);
    window.location.href = authUrl;

    // Return a promise that never resolves (as we redirect)
    return new Promise(() => { });
};

export const getInstagramAccountId = async (accessToken) => {
    try {
        // Use Instagram Graph API to get user profile
        const userUrl = `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`;
        const response = await fetch(userUrl);
        const data = await response.json();

        if (data.error) {
            console.error("Instagram API Error:", data.error);
            throw new Error(data.error.message || 'Failed to fetch Instagram user data');
        }

        console.log("Instagram User Data:", data);

        return {
            id: data.id,
            username: data.username
        };

    } catch (error) {
        console.error("Error fetching Instagram Account ID:", error);
        throw error;
    }
};

// Helper to poll for media status
const waitForMediaContainer = async (containerId, accessToken) => {
    const maxRetries = 60; // 60 * 2s = 120s (2 minutes) timeout
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < maxRetries; i++) {
        await delay(2000); // Wait 2 seconds between checks

        try {
            const statusUrl = `${GRAPH_API_BASE}/${containerId}?fields=status_code,status&access_token=${accessToken}`;
            const res = await fetch(statusUrl);
            const data = await res.json();

            if (data.error) {
                console.error("Error checking status:", data.error);
                throw new Error(data.error.message);
            }

            const status = data.status_code;
            console.log(`[Status Check] Container ${containerId}: ${status}`);

            if (status === 'FINISHED') {
                return true;
            }
            if (status === 'ERROR') {
                throw new Error(`Media Container failed processing: ${data.status}`);
            }
            if (status === 'EXPIRED') {
                throw new Error("Media Container expired.");
            }
            // If IN_PROGRESS or PUBLISHED (rare here), continue waiting
        } catch (e) {
            console.warn(`Polling warning for ${containerId}:`, e.message);
            // Continue retrying unless it was a fatal error thrown above
            if (e.message.includes("failed processing") || e.message.includes("expired")) throw e;
        }
    }
    throw new Error("Timeout waiting for media to be ready.");
};

export const postToInstagram = async (asset, caption, accessToken, accountId, postType = 'FEED') => {
    if (!accessToken || !accountId) {
        throw new Error("Missing auth credentials (Token or AccountID).");
    }

    try {
        // Step 1: Create Media Container
        const containerUrl = `${GRAPH_API_BASE}/${accountId}/media`;
        const containerParams = new URLSearchParams({
            access_token: accessToken
        });

        // Only add caption for FEED and REELS
        if (postType !== 'STORY') {
            containerParams.append('caption', caption);
        }

        if (asset.type === 'video') {
            containerParams.append('video_url', asset.url);

            if (postType === 'REEL') {
                containerParams.append('media_type', 'REELS');
            } else if (postType === 'STORY') {
                containerParams.append('media_type', 'STORIES');
            } else {
                // Default Feed Video
                containerParams.append('media_type', 'VIDEO');
            }
        } else {
            // Image assets
            containerParams.append('image_url', asset.url);

            if (postType === 'STORY') {
                containerParams.append('media_type', 'STORIES');
            }
            // For FEED images, we don't need explicit media_type (default is IMAGE)
        }

        const containerRes = await fetch(`${containerUrl}?${containerParams.toString()}`, {
            method: 'POST'
        });

        const containerData = await containerRes.json();

        if (containerData.error) {
            throw new Error(`Media Creation Failed: ${containerData.error.message}`);
        }

        const creationId = containerData.id;
        console.log(`Container Created: ${creationId}. Waiting for readiness...`);

        // Step 1.5: Wait for readiness
        await waitForMediaContainer(creationId, accessToken);

        // Step 2: Publish Media
        const publishUrl = `${GRAPH_API_BASE}/${accountId}/media_publish`;
        const publishParams = new URLSearchParams({
            access_token: accessToken,
            creation_id: creationId
        });

        const publishRes = await fetch(`${publishUrl}?${publishParams.toString()}`, {
            method: 'POST'
        });

        const publishData = await publishRes.json();

        if (publishData.error) {
            throw new Error(`Publishing Failed: ${publishData.error.message}`);
        }

        return { success: true, id: publishData.id };

    } catch (error) {
        console.error("Instagram Post Error:", error);
        throw error;
    }
};

export const postCarouselToInstagram = async (assets, caption, accessToken, accountId) => {
    if (!accessToken || !accountId) {
        throw new Error("Missing auth credentials (Token or AccountID).");
    }
    if (!assets || assets.length === 0) {
        throw new Error("No assets selected for carousel.");
    }
    if (assets.length > 10) {
        throw new Error("Maximum 10 assets allowed for a carousel.");
    }

    try {
        const itemCreationIds = [];

        // Step 1: Create Item Containers
        for (const asset of assets) {
            const containerUrl = `${GRAPH_API_BASE}/${accountId}/media`;
            const containerParams = new URLSearchParams({
                access_token: accessToken,
                is_carousel_item: 'true'
            });

            if (asset.type === 'video') {
                containerParams.append('video_url', asset.url);
                containerParams.append('media_type', 'VIDEO');
            } else {
                containerParams.append('image_url', asset.url);
                // default media_type is IMAGE, which is correct for carousel items unless it's a video
            }

            const containerRes = await fetch(`${containerUrl}?${containerParams.toString()}`, {
                method: 'POST'
            });

            const containerData = await containerRes.json();

            if (containerData.error) {
                throw new Error(`Item Creation Failed for ${asset.title}: ${containerData.error.message}`);
            }

            itemCreationIds.push(containerData.id);
        }

        console.log(`Carousel items created: ${itemCreationIds.join(', ')}. Waiting for all items...`);

        // Step 1.5: Wait for all item containers to be ready
        await Promise.all(itemCreationIds.map(id => waitForMediaContainer(id, accessToken)));

        // Step 2: Create Carousel Container
        const carouselUrl = `${GRAPH_API_BASE}/${accountId}/media`;
        const carouselParams = new URLSearchParams({
            access_token: accessToken,
            media_type: 'CAROUSEL',
            caption: caption,
            children: itemCreationIds.join(',')
        });

        const carouselRes = await fetch(`${carouselUrl}?${carouselParams.toString()}`, {
            method: 'POST'
        });

        const carouselData = await carouselRes.json();

        if (carouselData.error) {
            throw new Error(`Carousel Creation Failed: ${carouselData.error.message}`);
        }

        const creationId = carouselData.id;
        console.log(`Carousel Container Created: ${creationId}. Waiting for readiness...`);

        // Step 2.5: Wait for carousel container itself
        await waitForMediaContainer(creationId, accessToken);

        // Step 3: Publish Media
        const publishUrl = `${GRAPH_API_BASE}/${accountId}/media_publish`;
        const publishParams = new URLSearchParams({
            access_token: accessToken,
            creation_id: creationId
        });

        const publishRes = await fetch(`${publishUrl}?${publishParams.toString()}`, {
            method: 'POST'
        });

        const publishData = await publishRes.json();

        if (publishData.error) {
            throw new Error(`Publishing Failed: ${publishData.error.message}`);
        }

        return { success: true, id: publishData.id };

    } catch (error) {
        console.error("Instagram Carousel Post Error:", error);
        throw error;
    }
};
