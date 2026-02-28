import { Dropbox } from 'dropbox';

// Initialize the Dropbox client
// We might want to create a singleton or initialize it inside functions if the token can change,
// but for this app structure, a module-level initialization is fine provided the env var is loaded.
// Initialize the Dropbox client
// We use the Refresh Token flow to ensure the connection doesn't expire.
const clientId = import.meta.env.VITE_DROPBOX_APP_KEY;
const clientSecret = import.meta.env.VITE_DROPBOX_APP_SECRET;
const refreshToken = import.meta.env.VITE_DROPBOX_REFRESH_TOKEN;

const dbx = new Dropbox({
    clientId: clientId,
    clientSecret: clientSecret,
    refreshToken: refreshToken
});
export const getFullPath = (path) => {
    const rootPath = import.meta.env.VITE_DROPBOX_ROOT_PATH || '';
    if (!path) return rootPath;
    if (path.startsWith(rootPath)) return path; // Already fully qualified
    if (path.startsWith('/')) return `${rootPath}${path}`;
    return `${rootPath}/${path}`;
};

export const getAssets = async (path = "") => {
    if (!clientId || !clientSecret || !refreshToken) {
        console.warn("Dropbox credentials (App Key, Secret, or Refresh Token) missing");
        return [];
    }

    try {
        const rootPath = import.meta.env.VITE_DROPBOX_ROOT_PATH || '';

        // Normalize path
        let queryPath = path;
        if (queryPath === "" || queryPath === "/") {
            queryPath = rootPath;
        } else if (!queryPath.startsWith('/') && rootPath) {
            // If path is "Productos", make it "/Apps/Posteo Facil/Productos"
            // Careful not to double slash if rootPath ends in /
            const safeRoot = rootPath.endsWith('/') ? rootPath.slice(0, -1) : rootPath;
            queryPath = `${safeRoot}/${queryPath}`;
        }

        // Dropbox API requirement: Root must be empty string if App Folder access, 
        // OR specific path if Full Dropbox. 
        // Our env implies specific root path usage.

        console.log(`[DropboxService] Listing folder: ${queryPath}`);

        const response = await dbx.filesListFolder({
            path: queryPath,
            recursive: false,
            include_media_info: true,
            include_deleted: false,
            include_mounted_folders: true
        });

        const entries = response.result.entries;

        // Filter for files and folders (excluding deleted and hidden starting with . or _)
        const validEntries = entries.filter(entry =>
            (entry['.tag'] === 'file' || entry['.tag'] === 'folder') &&
            !entry.name.startsWith('.') &&
            !entry.name.startsWith('_')
        );

        return validEntries.map(entry => {
            const isFolder = entry['.tag'] === 'folder';

            // Extract Tags
            let tags = [];
            if (entry.property_groups) {
                const group = entry.property_groups.find(g => g.template_id === 'dam_metadata');
                if (group) {
                    const tagsField = group.fields.find(f => f.name === 'tags');
                    if (tagsField) {
                        tags = tagsField.value.split(',').map(t => t.trim()).filter(t => t);
                    }
                }
            }

            return {
                id: entry.id,
                name: entry.name,
                path: entry.path_display,
                // Folders don't have size or client_modified usually in the same way, handle gracefully
                size: entry.size || 0,
                client_modified: entry.client_modified || null,
                title: entry.name,
                type: isFolder ? 'folder' : (entry.name.match(/\.(mp4|mov)$/i) ? 'video' : 'image'),
                url: entry.path_display, // Placeholder
                thumbnail: null, // To be populated
                tags: tags,
                duration: entry.media_info?.metadata?.duration || null
            };
        });
    } catch (error) {
        console.error("Error fetching Dropbox assets:", error);
        throw error;
    }
};

export const getThumbnail = async (path) => {
    try {
        // The SDK might return the binary data in result.fileBlob
        const response = await dbx.filesGetThumbnail({
            path: path,
            format: 'jpeg',
            size: 'w640h480',
            mode: 'bestfit'
        });

        // The Dropbox SDK for JS puts the file data in 'result.fileBlob'
        if (response.result.fileBlob) {
            return URL.createObjectURL(response.result.fileBlob);
        }
        return null;
    } catch (error) {
        // Silencing ALL errors for thumbnails (silent failure is expected for missing covers/banners)
        return null;
    }
};

export const getTemporaryLink = async (path) => {
    try {
        const response = await dbx.filesGetTemporaryLink({ path });
        return response.result.link;
    } catch (error) {
        console.error("Error getting temporary link:", error);
        return null;
    }
};

export const getAssetById = async (id, assets = []) => {
    // Try to find in cache first
    const asset = assets.find(a => a.id === id);
    if (asset) return asset;

    try {
        const response = await dbx.filesGetMetadata({
            path: id,
            include_media_info: true
        });

        const file = response.result;
        return {
            id: file.id,
            name: file.name,
            path: file.path_display,
            title: file.name,
            size: file.size || 0,
            type: file.name.match(/\.(mp4|mov)$/i) ? 'video' : 'image',
            url: file.path_display,
            duration: file.media_info?.metadata?.duration || null
        };
    } catch (error) {
        console.error("Error getting asset by ID:", error);
        return null;
    }
};

export const getThumbnailsBatch = async (paths) => {
    if (!paths || paths.length === 0) return {};

    try {
        // Dropbox batch limit is 25. We need to chunk.
        const CHUNK_SIZE = 25;
        const chunks = [];
        for (let i = 0; i < paths.length; i += CHUNK_SIZE) {
            chunks.push(paths.slice(i, i + CHUNK_SIZE));
        }

        const results = {};

        for (const chunk of chunks) {
            const entries = chunk.map(path => ({
                path: path,
                format: 'jpeg',
                size: 'w640h480',
                mode: 'bestfit'
            }));

            const response = await dbx.filesGetThumbnailBatch({
                entries: entries
            });

            response.result.entries.forEach(entry => {
                if (entry['.tag'] === 'success') {
                    // entry.metadata.path_display or id can be used to map back
                    // usage in JS SDK: entry.thumbnail is the base64 string
                    results[entry.metadata.id] = 'data:image/jpeg;base64,' + entry.thumbnail;
                }
            });
        }
        return results;
    } catch (error) {
        console.error("Error batch fetching thumbnails:", error);
        return {};
    }
};

export const searchAssets = async (query, path = "") => {
    if (!query) return [];

    // Resolve effective path: Use provided path or fallback to configured root path
    const rootPath = import.meta.env.VITE_DROPBOX_ROOT_PATH || '';

    // If path is empty, use rootPath. If path starts with /, use it as is.
    // However, if path is passed from UI, it might be relative or absolute.
    // In Home.jsx, currentPath is usually full path (e.g. /Apps/Posteo Facil/Folder) or empty string.

    let effectivePath = path;
    if (!effectivePath || effectivePath === "" || effectivePath === "/") {
        effectivePath = rootPath;
    }

    console.log(`[DropboxService] searchAssets query="${query}" inputs__path="${path}" effectivePath="${effectivePath}"`);

    try {
        const options = {
            file_status: 'active',
            filename_only: false,
        };

        // If we have a valid effective path (not logic root which is empty string for Dropbox API)
        if (effectivePath && effectivePath !== "" && effectivePath !== "/") {
            options.path = effectivePath;
        }

        const response = await dbx.filesSearchV2({
            query: query,
            options: options
        });

        const matches = response.result.matches;

        return matches.map(match => {
            const entry = match.metadata.metadata;

            if (!entry) return null;

            // Client-side scope verification (Fallback)
            // Use effectivePath for filtering
            if (effectivePath && effectivePath !== "" && effectivePath !== "/") {
                const entryPathLower = entry.path_lower || entry.path_display.toLowerCase();
                const scopePathLower = effectivePath.toLowerCase();
                // Ensure it starts with the scope path
                if (!entryPathLower.startsWith(scopePathLower)) {
                    // console.log(`[Internal Filter] Skipping ${entryPathLower} (outside ${scopePathLower})`);
                    return null;
                }
            }

            const isFolder = entry['.tag'] === 'folder';
            return {
                id: entry.id,
                name: entry.name,
                path: entry.path_display,
                title: entry.name,
                type: isFolder ? 'folder' : (entry.name && entry.name.match(/\.(mp4|mov)$/i) ? 'video' : 'image'),
                url: entry.path_display,
                thumbnail: null, // Will be fetched by Home.jsx if needed
                client_modified: entry.client_modified || null,
                duration: entry.media_info?.metadata?.duration || null
            };
        }).filter(item => item !== null);

    } catch (error) {
        console.error("Error searching Dropbox assets:", error);
        throw error;
    }
};

// --- Tags / Properties Implementation ---

// --- Native Tags Implementation (Full Dropbox Access) ---

// We are redefining the exported getAssets to wrap parsing or path logic if needed.
// But mostly we need to ensure lists happen inside ROOT_PATH.
// Actually, let's just modify the `filesListFolder` call in the existing `getAssets` function?
// Since I'm replacing the bottom chunk, I can't easily modify the top function without a separate replace call.
// For now, I will implement the TAGS logic here.
// IMPORTANT: `getAssets` upstream needs to be called with ROOT_PATH if listing root.
// The consumer `Home.jsx` calls `getAssets(currentPath)`. 
// If currentPath is "" (root), we should append it to ROOT_PATH.
// I will create a path helper here to be exported and used.

export const ensurePropertyTemplate = async () => { return true; }; // No-op

export const getTags = async (pathOrId) => {
    try {
        const tagsMap = await getTagsBatch([pathOrId]);
        return tagsMap[pathOrId] || [];
    } catch (error) {
        console.error("Error getting tags:", error);
        return [];
    }
};

export const getTagsBatch = async (paths) => {
    if (!paths || paths.length === 0) return {};

    try {
        // Limit paths per request if necessary? Doc doesn't specify simple limit but safe to chunk if huge.
        // Let's assume < 1000 is fine.

        const response = await fetch('https://api.dropboxapi.com/2/files/tags/get', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${dbx.auth.getAccessToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paths: paths
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Failed to fetch tags batch:", response.status, errText);
            return {};
        }

        const data = await response.json();
        const results = {};

        // data.paths_to_tags is array of { path: string, tags: [] }
        if (data.paths_to_tags) {
            data.paths_to_tags.forEach(entry => {
                if (entry.tags) {
                    results[entry.path] = entry.tags.map(t => t.tag_text);
                } else {
                    results[entry.path] = [];
                }
            });
        }
        return results;

    } catch (error) {
        console.error("Error getting tags batch:", error);
        return {};
    }
};

export const addTag = async (pathOrId, tagText) => {
    try {
        const response = await fetch('https://api.dropboxapi.com/2/files/tags/add', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${dbx.auth.getAccessToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: pathOrId,
                tag_text: tagText
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Failed to add tag: ${err}`);
        }

        // Return updated tags
        return await getTags(pathOrId);

    } catch (error) {
        console.error("Error adding tag:", error);
        throw error;
    }
};

export const getFolderCoverImage = async (folderPath) => {
    try {
        const rootPath = import.meta.env.VITE_DROPBOX_ROOT_PATH || '';

        // Extract folder name from path
        // path is like "/Apps/Posteo Facil/Campañas"
        const folderName = folderPath.split('/').pop().toLowerCase();

        // Construct banner path: /_banners/folderName.jpg
        // Note: We use the rootPath to locate _banners
        const bannerPath = `${rootPath}/_banners/${folderName}.jpg`;

        // Try to get thumbnail for this specific path
        // filesGetThumbnail throws error if path not found
        try {
            return await getThumbnail(bannerPath);
        } catch (e) {
            console.log(`No dedicated banner found at ${bannerPath}`);
            return null; // Fallback or return null
        }
    } catch (error) {
        console.warn("Could not fetch cover for folder:", error);
        return null;
    }
};

export const getVideoDurations = async (videoItems) => {
    if (!videoItems || videoItems.length === 0) return {};

    try {
        // Since there is no batch endpoint for metadata, we must use parallel requests.
        // We limit concurrency to avoid 429 errors, although for small folders Promise.all might be okay.
        // Let's assume a reasonable number of videos (e.g. < 20).

        // We accept items with { id, path }

        const results = {};

        const promises = videoItems.map(async (item) => {
            try {
                const response = await dbx.filesGetMetadata({
                    path: item.id, // Use ID for stability
                    include_media_info: true
                });

                const meta = response.result;
                if (meta.media_info?.metadata?.duration) {
                    results[item.id] = meta.media_info.metadata.duration;
                }
            } catch (e) {
                console.warn(`Failed to fetch metadata for video ${item.name}`, e);
            }
        });

        await Promise.all(promises);
        return results;

    } catch (error) {
        console.error("Error batch fetching video durations:", error);
        return {};
    }
};
