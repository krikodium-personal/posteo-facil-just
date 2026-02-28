import { createDirectus, rest, readItems, staticToken } from '@directus/sdk';

const DIRECTUS_URL = import.meta.env.VITE_DIRECTUS_URL || "https://directus-production-4078.up.railway.app";
// Optional: If you use a static token for public access or specific permissions
const DIRECTUS_TOKEN = import.meta.env.VITE_DIRECTUS_STATIC_TOKEN;

let client;

if (DIRECTUS_URL) {
    client = createDirectus(DIRECTUS_URL).with(rest());
    if (DIRECTUS_TOKEN) {
        client.with(staticToken(DIRECTUS_TOKEN));
    }
}

/**
 * Fetch banners from the 'banners' collection.
 * Expected schema:
 * - id
 * - title (string)
 * - image (image file)
 * - target_path (string) - Dropbox Path
 * - active (boolean) - or status
 * - sort (integer)
 */
export const getBanners = async () => {
    if (!client) return [];

    try {
        const result = await client.request(
            readItems('banners', {
                fields: ['id', 'title', 'image', 'target_path', 'active', 'display_type', 'suggested_texts', 'display_layout'],
                filter: {
                    active: {
                        _eq: true
                    }
                },
                sort: ['sort']
            })
        );
        return result;
    } catch (error) {
        console.error("Directus Error:", error);
        return [];
    }
};

export const getImageUrl = (imageId) => {
    if (!imageId || !DIRECTUS_URL) return null;
    return `${DIRECTUS_URL}/assets/${imageId}`;
};
