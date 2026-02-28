
const API_BASE = '/api/dash';

const getCleanToken = () => {
    const rawToken = import.meta.env.VITE_DASH_API_TOKEN;
    if (!rawToken) return '';
    // Remove potential surrounding quotes and whitespace
    return rawToken.replace(/^['"]|['"]$/g, '').trim();
};

const getHeaders = () => {
    const token = getCleanToken();
    if (token) {
        console.log('[DashService] Token clean check:', {
            length: token.length,
            start: token.substring(0, 5) + '...',
            end: '...' + token.substring(token.length - 5)
        });
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
};

export const getAssets = async () => {
    if (!import.meta.env.VITE_DASH_API_TOKEN) {
        console.warn("DASH API Token missing");
        throw new Error("Missing VITE_DASH_API_TOKEN in .env");
    }

    try {
        console.log("Fetching assets from Dash...");
        // Updated endpoint to /asset-searches based on valid API probing
        // Payload structure confirmed working via probe_fixed.sh (Test 4)
        // We filter by standard FILE_TYPEs to effectively list "all" relevant assets.
        const response = await fetch(`${API_BASE}/asset-searches`, {
            method: 'POST',
            headers: {
                ...getHeaders(),
                'dash-api-client': 'DASH_FRONTEND'
            },
            body: JSON.stringify({
                from: 0,
                pageSize: 50,
                sorts: [],
                criterion: {
                    type: "FIELD_HAS_ANY_EQUAL",
                    field: {
                        type: "FIXED",
                        fieldName: "FILE_TYPE"
                    },
                    values: ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"]
                }
            })
        });

        console.log("Dash Response Status:", response.status);

        if (!response.ok) {
            const text = await response.text();
            console.error("Dash API Error Body:", text);
            throw new Error(`Failed to fetch assets: ${response.status} ${text}`);
        }

        const data = await response.json();
        console.log("Dash API Data:", data);

        if (!data.results) {
            console.warn("No 'results' array in response:", data);
            return [];
        }

        return data.results.map(itemWrapper => {
            const item = itemWrapper.result;
            return {
                id: item.id,
                type: item.currentAssetFile?.mediaType?.type || 'image',
                url: item.currentAssetFile?.originalFileUrl || item.currentAssetFile?.previewUrl || item.originalFile?.url,
                thumbnail: item.currentAssetFile?.previewUrl || item.originalFile?.url,
                title: item.title || item.currentAssetFile?.name || item.originalFile?.filename || 'Untitled',
                description: '',
                date: item.dateAdded
            };
        });

    } catch (error) {
        console.error("Dash API Error:", error);
        throw error;
    }
};

export const getAssetById = async (id) => {
    if (!import.meta.env.VITE_DASH_API_TOKEN) {
        return null;
    }

    try {
        // Updated endpoint to /assets/{id} (plural convention)
        const response = await fetch(`${API_BASE}/assets/${id}`, {
            headers: {
                ...getHeaders(),
                'dash-api-client': 'DASH_FRONTEND'
            }
        });

        if (!response.ok) throw new Error('Asset not found');

        const data = await response.json();
        const item = data.result;

        return {
            id: item.id,
            type: item.currentAssetFile?.mediaType?.type || 'image',
            url: item.currentAssetFile?.originalFileUrl || item.currentAssetFile?.previewUrl || item.originalFile?.url,
            thumbnail: item.currentAssetFile?.previewUrl || item.originalFile?.url,
            title: item.title || item.currentAssetFile?.name || item.originalFile?.filename || 'Untitled',
            description: '',
            date: item.dateAdded
        };

    } catch (error) {
        console.error("Dash API Error:", error);
        return null;
    }
}
