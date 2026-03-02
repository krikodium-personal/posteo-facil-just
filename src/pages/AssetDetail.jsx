
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { getAssetById, getThumbnail, getTemporaryLink, addTag, getTags } from '../services/DropboxService';
import { initFacebookSdk, loginToInstagram, getInstagramAccountId, postToInstagram } from '../services/InstagramService';
import { loginToTikTok, postToTikTok, getTikTokCreatorInfo } from '../services/TikTokService';
import { loginToFacebook, getFacebookPages, postToFacebook } from '../services/FacebookService';
import { getBanners } from '../services/DirectusService';
import { ArrowLeft, Instagram, Send, Plus, Tag, ChevronLeft, ChevronRight, Music2, Facebook, Loader2, Download, Copy, ExternalLink, MessageSquareText, X, Share2 } from 'lucide-react';

import QuickHashtags from '../components/QuickHashtags';
import { InstagramIconLarge, TikTokIconLarge, FacebookIconLarge, ShareIconLarge, DownloadIconLarge, CopyLinkIconLarge, CheckCircleIconSmall, DisconnectIconMedium, SuggestedTextsIconSmall } from '../components/SocialIcons';

const AssetDetail = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [asset, setAsset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [imageLoading, setImageLoading] = useState(true);
    const scrollTargetRef = useRef(null);

    // Auth State
    const [isConnectedInstagram, setIsConnectedInstagram] = useState(false);
    const [isConnectedTikTok, setIsConnectedTikTok] = useState(false);
    const [isConnectedFacebook, setIsConnectedFacebook] = useState(false);

    // Facebook specific state
    const [facebookPages, setFacebookPages] = useState([]);
    const [selectedPageId, setSelectedPageId] = useState('');
    const [fbMode, setFbMode] = useState('PAGE'); // 'PAGE', 'PERSONAL', 'NATIVE'
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [destination, setDestination] = useState('INSTAGRAM');

    // Post State
    const [caption, setCaption] = useState('');
    const [posting, setPosting] = useState(false);
    const [postResult, setPostResult] = useState(null);
    const [error, setError] = useState(null);
    const [postType, setPostType] = useState('FEED');

    // Tags State
    const [tags, setTags] = useState([]);
    const [newTag, setNewTag] = useState('');
    const [addingTag, setAddingTag] = useState(false);
    // Suggested Texts State
    const [suggestedTexts, setSuggestedTexts] = useState([]);
    const [isSuggestedTextsModalOpen, setIsSuggestedTextsModalOpen] = useState(false);
    const [suggestedTextMode, setSuggestedTextMode] = useState('SET_CAPTION'); // 'SET_CAPTION' | 'COPY'
    const [copyFeedback, setCopyFeedback] = useState('');

    useEffect(() => {
        const fetchSuggestedTexts = async () => {
            if (!asset || !asset.path) return;

            try {
                const banners = await getBanners();
                if (!banners) return;

                // Find matching banner
                // Directus banners use 'target_path'
                // Logic: if asset.path starts with banner.target_path
                // We should pick the longest matching path (most specific)? Or just the first one?
                // Usually one banner per folder.

                // Normalize paths
                const assetPath = asset.path.toLowerCase();
                const GLOBAL_ROOT_PATH = import.meta.env.VITE_DROPBOX_ROOT_PATH || "";

                // Filter all matching banners first
                const matchingBanners = banners.filter(b => {
                    if (!b.target_path) return false;

                    let target = b.target_path;
                    // If target is relative (doesn't start with / or doesn't include root), prepend root
                    // Directus targets are often like "Argentina/Campañas"
                    // Asset path is like "/Apps/Posteo Facil/Argentina/Campañas/..."

                    if (!target.startsWith('/')) {
                        const cleanRoot = GLOBAL_ROOT_PATH.replace(/\/$/, '');
                        target = `${cleanRoot}/${target}`;
                    } else if (!target.toLowerCase().startsWith(GLOBAL_ROOT_PATH.toLowerCase().replace(/\/$/, ''))) {
                        // Even if it starts with /, if it misses the root prefix, add it?
                        // safest to assume if it doesn't match the root, it's relative from root.
                        const cleanRoot = GLOBAL_ROOT_PATH.replace(/\/$/, '');
                        // Ensure we don't double slash if target starts with /
                        target = `${cleanRoot}${target}`;
                    }

                    const targetLower = target.toLowerCase();
                    return assetPath.startsWith(targetLower);
                });

                // Sort by length (descending) to get the most specific match
                matchingBanners.sort((a, b) => b.target_path.length - a.target_path.length);

                const matchingBanner = matchingBanners.length > 0 ? matchingBanners[0] : null;

                if (matchingBanner && matchingBanner.suggested_texts && Array.isArray(matchingBanner.suggested_texts)) {
                    // Filter valid texts
                    const validTexts = matchingBanner.suggested_texts
                        .map(item => item.text) // Extract 'text' field from repeater item
                        .filter(t => t && typeof t === 'string' && t.trim().length > 0);

                    setSuggestedTexts(validTexts);
                } else {
                    setSuggestedTexts([]);
                }

            } catch (err) {
                console.error("Error fetching suggested texts:", err);
            }
        };

        fetchSuggestedTexts();
    }, [asset]);


    useEffect(() => {
        const fetchAsset = async () => {
            const data = await getAssetById(id);
            if (data) {
                const link = await getTemporaryLink(id);
                const thumb = await getThumbnail(id);
                setAsset({ ...data, url: link || thumb, thumbnail: thumb });
                setImageLoading(true);

                // Fetch Tags using PATH, not ID
                try {
                    // Dropbox Native Tags API requires path_lower or path_display
                    // data.path should hold path_display from getAssetById
                    if (data.path) {
                        const fetchedTags = await getTags(data.path);
                        setTags(fetchedTags);
                    }
                } catch (e) {
                    console.error("Failed to fetch tags:", e);
                }
            }
            setLoading(false);
        };
        fetchAsset();

        // Check if already connected from localStorage
        const ttToken = localStorage.getItem('tiktok_access_token');
        const igToken = localStorage.getItem('instagram_access_token');
        const igAccount = localStorage.getItem('instagram_account_id');
        const fbToken = localStorage.getItem('facebook_access_token');

        setIsConnectedInstagram(!!(igToken && igAccount));
        setIsConnectedTikTok(!!ttToken);
        setIsConnectedFacebook(!!fbToken);

        // Fetch Facebook pages if connected
        if (fbToken) {
            getFacebookPages(fbToken).then(pages => {
                setFacebookPages(pages);
                if (pages.length > 0) setSelectedPageId(pages[0].id);
            }).catch(console.error);
        }

        // If specifically returning from TikTok/Facebook auth, maybe switch destination
        if (location.pathname.includes('tiktok')) {
            setDestination('TIKTOK');
        } else if (location.pathname.includes('facebook')) {
            setDestination('FACEBOOK');
        }
    }, [id, location.pathname]);

    const handleAddTag = async () => {
        if (!newTag.trim() || !asset) return;
        setAddingTag(true);
        try {
            // Use asset.path (path_display) for adding tags
            const updatedTags = await addTag(asset.path, newTag.trim());
            setTags(updatedTags);
            setNewTag('');
        } catch (e) {
            console.error("Failed to add tag", e);
            setError("Failed to save tag");
        } finally {
            setAddingTag(false);
        }
    };

    useEffect(() => {
        // Init SDK on mount
        initFacebookSdk();
    }, []);

    const handleConnect = (platform) => {
        try {
            // Save state specifically for AssetDetail return
            localStorage.setItem('pending_asset_detail_id', id);
            localStorage.setItem('pending_post_caption', caption);

            if (platform === 'INSTAGRAM') {
                loginToInstagram();
            } else if (platform === 'TIKTOK') {
                loginToTikTok();
            } else {
                loginToFacebook();
            }
        } catch (error) {
            console.error(error);
            setError(error.message || "Failed to initiate connection");
        }
    };

    const handleDownload = async () => {
        if (!asset) return;
        try {
            let downloadUrl = asset.url;

            // Generate temp link if needed
            if (!downloadUrl || !downloadUrl.startsWith('http') || downloadUrl.includes('dropbox')) {
                const link = await getTemporaryLink(asset.path || asset.id);
                if (link) downloadUrl = link;
            }

            if (downloadUrl.includes('dropbox.com')) {
                if (downloadUrl.includes('raw=1')) {
                    downloadUrl = downloadUrl.replace('raw=1', 'dl=1');
                } else if (downloadUrl.includes('dl=0')) {
                    downloadUrl = downloadUrl.replace('dl=0', 'dl=1');
                } else {
                    downloadUrl += downloadUrl.includes('?') ? '&dl=1' : '?dl=1';
                }
            }

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', asset.name || 'download');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Download failed", e);
            alert("No se pudo iniciar la descarga.");
        }
    };

    const handleNativeShare = async () => {
        if (!asset) return;

        try {
            setPosting(true); // Reuse posting state for loading feedback

            // 1. Get a direct URL (Dropbox temp link)
            let fileUrl = asset.url;
            if (fileUrl.includes('dropbox.com')) {
                // Ensure we get the raw file, not the preview page
                // dl=1 forces download, but fetching it might be tricky with CORS if not handled right.
                // Actually, for fetch() we often need raw=1 to get the binary data directly?
                // Or just the temp link.
                // Let's try to get a fresh temp link first to be sure.
                const link = await getTemporaryLink(asset.path || asset.id);
                if (link) fileUrl = link;
            }

            // 2. Fetch the file as a Blob
            const response = await fetch(fileUrl);
            const blob = await response.blob();

            // 3. Create a File object
            // We need a proper filename and mime type
            const filename = asset.name || 'shared_asset';
            const file = new File([blob], filename, { type: blob.type });

            // 4. Check if we can share
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: asset.title || 'Posteo Just',
                    text: caption || asset.description || 'Mira este contenido!',
                });
            } else {
                // Fallback: Just download it if sharing isn't supported
                // Or maybe share just text/url? User requested FILE sharing.
                console.warn("Native file sharing not supported, falling back to download.");
                await handleDownload();
            }

        } catch (error) {
            console.error("Error sharing:", error);
            // Fallback to download on error?
            alert("No se pudo compartir nativamente. Iniciando descarga...");
            await handleDownload();
        } finally {
            setPosting(false);
        }
    };

    const renderUnconnectedFallback = () => (
        <div className="asset-detail-message">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <h4 className="asset-detail-message-title">¿No pudiste conectar tu cuenta?</h4>
                <p className="asset-detail-message-body">No importa, igual puedes utilizar estos contenidos para postearlos en tus redes.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <p className="asset-detail-message-step-title">Sigue estos simples pasos:</p>
                <p className="asset-detail-message-body">
                    Descarga el posteo<br />
                    Selecciona y copia el texto sugerido para el posteo<br />
                    Ingresa a tu red social y crea un nuevo posteo, selecciona el posteo que descargaste en tu carrete de imágenes y pega el texto sugerido.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                <button
                    className="asset-detail-main-btn asset-detail-main-btn-secondary"
                    onClick={() => {
                        setSuggestedTextMode('COPY');
                        setIsSuggestedTextsModalOpen(true);
                    }}
                >
                    <CopyLinkIconLarge />
                    <span className="asset-detail-main-btn-text">Ver texto sugerido</span>
                </button>
                <button
                    className="asset-detail-main-btn asset-detail-main-btn-secondary"
                    onClick={handleDownload}
                >
                    <DownloadIconLarge />
                    <span className="asset-detail-main-btn-text">Descargar posteo</span>
                </button>
            </div>
        </div>
    );

    const handlePost = async () => {
        if (destination === 'INSTAGRAM' && postType !== 'STORY' && !caption) {
            setError("La descripción es obligatoria para publicaciones de Posteo/Reel.");
            return;
        }
        if (destination === 'TIKTOK' && !caption) {
            setError("TikTok requiere una descripción.");
            return;
        }

        // Facebook checks depending on mode
        if (destination === 'FACEBOOK' && fbMode === 'PAGE' && !selectedPageId) {
            setError("Debes seleccionar una Página de Facebook.");
            return;
        }

        try {
            setPosting(true);
            setError(null);

            const igToken = localStorage.getItem('instagram_access_token');
            const igAccount = localStorage.getItem('instagram_account_id');
            const ttToken = localStorage.getItem('tiktok_access_token');

            // Resolve public URL
            let cleanAsset = { ...asset };
            if (!asset.url || !asset.url.startsWith('http') || asset.url.includes('dropbox')) {
                const link = await getTemporaryLink(asset.path || asset.id);
                if (!link) throw new Error("No se pudo generar el enlace público.");
                cleanAsset.url = link;
            }

            if (destination === 'INSTAGRAM') {
                if (!igToken || !igAccount) throw new Error("Instagram no conectado.");
                const result = await postToInstagram(cleanAsset, caption, igToken, igAccount, postType);
                setPostResult({
                    success: true,
                    message: `¡Publicado exitosamente en Instagram! (ID: ${result.id})`
                });
            } else if (destination === 'TIKTOK') {
                if (!ttToken) throw new Error("TikTok no conectado.");
                const result = await postToTikTok(cleanAsset, caption, ttToken);
                setPostResult({
                    success: true,
                    message: "¡Publicado exitosamente en TikTok!"
                });
            } else if (destination === 'FACEBOOK') {

                if (fbMode === 'PERSONAL') {
                    // Manual Share Logic (Link Share)
                    const shareTitle = asset ? asset.title : 'Publicación';
                    const shareDesc = caption || asset.description || '';
                    const isVideo = asset.type === 'video';

                    const metadataBase = `${window.location.origin}/api/share-metadata`;
                    const params = new URLSearchParams();
                    params.append('title', shareTitle);
                    params.append('description', shareDesc);
                    params.append('type', isVideo ? 'video' : 'image');

                    if (isVideo) {
                        params.append('videoUrl', cleanAsset.url);
                    } else {
                        params.append('imageUrl', cleanAsset.url);
                    }

                    const metadataUrl = `${metadataBase}?${params.toString()}`;
                    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(metadataUrl)}&quote=${encodeURIComponent(caption)}`;

                    window.open(facebookShareUrl, '_blank', 'width=600,height=600');

                    setPostResult({
                        success: true,
                        message: 'Se abrió la ventana de compartir enlace.'
                    });
                } else if (fbMode === 'NATIVE') {
                    // Native Video Logic (Download + Copy)
                    // 1. Copy text
                    try {
                        await navigator.clipboard.writeText(caption);
                    } catch (err) {
                        console.warn("Clipboard access failed", err);
                    }

                    // 2. Prepare Download URL
                    await handleDownload();

                    // 4. Open Facebook

                    // 4. Open Facebook
                    setTimeout(() => {
                        window.open('https://www.facebook.com', '_blank');
                    }, 1000);

                    setPostResult({
                        success: true,
                        message: '1. Video descargado ⬇️ 2. Texto copiado 📋 3. En Facebook, sube el archivo y pega el texto.'
                    });

                } else {
                    // Page Auto Logic
                    const fbToken = localStorage.getItem('facebook_access_token');
                    if (!fbToken) throw new Error("Facebook no conectado.");
                    const page = facebookPages.find(p => p.id === selectedPageId);
                    if (!page) throw new Error("Página no encontrada.");
                    const result = await postToFacebook(cleanAsset, caption, page.access_token, page.id);
                    setPostResult({
                        success: true,
                        message: `¡Publicado exitosamente en Facebook! (ID: ${result.id})`
                    });
                }
            }

        } catch (err) {
            console.error(err);
            setPostResult({
                success: false,
                message: "Error al publicar: " + err.message
            });
        } finally {
            setPosting(false);
        }
    };

    const handleDisconnect = (platform) => {
        if (platform === 'INSTAGRAM') {
            localStorage.removeItem('instagram_access_token');
            localStorage.removeItem('instagram_account_id');
            localStorage.removeItem('instagram_username');
            setIsConnectedInstagram(false);
        } else if (platform === 'TIKTOK') {
            localStorage.removeItem('tiktok_access_token');
            localStorage.removeItem('tiktok_username');
            localStorage.removeItem('tiktok_open_id');
            setIsConnectedTikTok(false);
        } else {
            localStorage.removeItem('facebook_access_token');
            setIsConnectedFacebook(false);
            setFacebookPages([]);
        }
        setPostResult(null);
    };

    const contextIds = location.state?.contextIds || [];
    const returnPath = location.state?.returnPath;

    // Compute Next/Prev
    const currentIndex = contextIds.indexOf(id);
    const prevId = currentIndex > 0 ? contextIds[currentIndex - 1] : null;
    const nextId = currentIndex !== -1 && currentIndex < contextIds.length - 1 ? contextIds[currentIndex + 1] : null;

    // Determine Back Link
    const GLOBAL_ROOT_PATH = import.meta.env.VITE_DROPBOX_ROOT_PATH || "";

    let backLink = '/';

    if (returnPath) {
        // Normal case: We have state from navigation
        backLink = `/?path=${encodeURIComponent(returnPath)}`;
        // If we have country in query, maybe we should preserve it?
        // But pure path navigation in Home usually handles it if path is absolute.
        // However, Home expects 'country' param for initial load usually.
        // Let's rely on Home's ability to parse path or just link to root if fails.
        // Better: Try to ensure country is in the URL if possible.
        // But wait, the previous code was: `/?path=${encodeURIComponent(returnPath)}` which relies on Home logic (if path includes country).
        // Actually Home requires `country` param?
        // Home: const APP_ROOT_PATH = country ? ... : ...;
        // If no country, it navigates to '/'.
        // So we MUST provide country param if we want to go deep.

        // Let's try to parse country from returnPath if we can, or rely on existing mechanism.
        // Ideally we pass 'country' in state too?
        // location.state has contextIds, returnPath.
        // But let's look at the fallback I'm designing:

        // If we have returnPath, assume it's valid for 'path' param. 
        // We probably also need 'country' param if the returnPath is inside a country.
        // But if returnPath is absolute (starts with /Apps/...), Home might handle it?
        // Home.jsx: const currentPath = pathParam ... : APP_ROOT_PATH;
        // But generic Home checks `if (!country) navigate('/')`.
        // SO WE MUST PROVIDE COUNTRY PARAM!
    }

    // Improved Back Link Calculation
    const getBackLink = () => {
        if (returnPath) {
            // Try to extract country from returnPath or location?
            // If returnPath is "/Apps/PF/Argentina/..."
            // We can assume we need to extract "Argentina".
            const relative = returnPath.replace(GLOBAL_ROOT_PATH, '');
            const parts = relative.split('/').filter(p => p);
            if (parts.length > 0) {
                const country = parts[0];
                return `/home?country=${country}&path=${encodeURIComponent(returnPath)}`;
            }
        }

        if (asset && asset.path) {
            // Fallback: Infer from asset path
            // content path: /Apps/PF/Argentina/Folder/Image.jpg
            const dirPath = asset.path.substring(0, asset.path.lastIndexOf('/'));

            // Extract Country
            // Remove Global Root
            // /Apps/Posteo Facil/Argentina/Folder -> /Argentina/Folder
            const relativeToRoot = dirPath.replace(GLOBAL_ROOT_PATH, '');
            const parts = relativeToRoot.split('/').filter(p => p);

            if (parts.length > 0) {
                const country = parts[0];
                return `/home?country=${country}&path=${encodeURIComponent(dirPath)}`;
            }
        }

        return '/';
    };

    backLink = getBackLink();

    if (loading) return <div className="container">Cargando...</div>;
    if (!asset) return <div className="container">Archivo no encontrado</div>;

    const navigateTo = (targetId) => {
        if (!targetId) return;
        // When navigating between siblings, we keep the same returnPath
        navigate(`/asset/${targetId}`, { state: { contextIds, returnPath } });
    };

    const handleDestinationChange = (dest) => {
        setDestination(dest);
        setTimeout(() => {
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
        }, 100);
    };

    return (
        <div className="asset-detail-body">
            <div className="asset-detail-header">
                <Link to={backLink} className="asset-detail-header-btn-close">
                    <ArrowLeft size={24} color="#171A22" />
                </Link>
                <h1 className="asset-detail-header-title">Posteo Fácil</h1>
                <div style={{ width: 24 }} /> {/* Balance space-between */}
            </div>

            <div className="asset-detail-content">
                <div className="asset-detail-container">
                    <div className="asset-detail-container-foto">
                        {imageLoading && <div className="skeleton-box pulse" style={{ width: '100%', height: '100%', position: 'absolute' }}></div>}
                        {asset.type === 'video' ? (
                            <video
                                src={asset.url}
                                controls
                                style={{ display: imageLoading ? 'none' : 'block' }}
                                onLoadedData={() => setImageLoading(false)}
                            />
                        ) : (
                            <img
                                src={asset.url}
                                alt={asset.title}
                                style={{ display: imageLoading ? 'none' : 'block' }}
                                onLoad={() => setImageLoading(false)}
                            />
                        )}
                    </div>
                </div>

                {tags.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                        <div style={{ fontSize: '12px', fontWeight: '400', lineHeight: '18px', letterSpacing: '0.02em', textTransform: 'uppercase', color: '#908F9A', fontFamily: 'Museo Sans' }}>
                            Agrega Hashtags a tu posteo:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {tags.map((tag, i) => (
                                <div key={i} className="tag-pill selected">
                                    #{tag}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="asset-detail-plataforma" style={{ marginTop: tags.length > 0 ? 0 : '-16px' }}>
                    <div className="asset-detail-fila">
                        <button
                            className={`asset-detail-rs ${destination === 'INSTAGRAM' ? 'instagram-selected' : ''}`}
                            onClick={() => handleDestinationChange('INSTAGRAM')}
                        >
                            <InstagramIconLarge color={destination === 'INSTAGRAM' ? "#6667C2" : "#8889DB"} />
                            <span className="asset-detail-rs-text">Instagram</span>
                        </button>
                        <button
                            className={`asset-detail-rs ${destination === 'TIKTOK' ? 'tiktok-selected' : ''}`}
                            onClick={() => handleDestinationChange('TIKTOK')}
                        >
                            <TikTokIconLarge color={destination === 'TIKTOK' ? "#171A22" : "#8889DB"} />
                            <span className="asset-detail-rs-text">TikTok</span>
                        </button>
                    </div>
                    <div className="asset-detail-fila">
                        <button
                            className={`asset-detail-rs ${destination === 'FACEBOOK' ? 'facebook-selected' : ''}`}
                            onClick={() => handleDestinationChange('FACEBOOK')}
                        >
                            <FacebookIconLarge color={destination === 'FACEBOOK' ? "#456ECE" : "#8889DB"} />
                            <span className="asset-detail-rs-text">Facebook</span>
                        </button>
                        <button
                            className={`asset-detail-rs ${destination === 'SHARE' ? 'share-selected' : ''}`}
                            onClick={() => handleDestinationChange('SHARE')}
                            style={{ background: destination === 'SHARE' ? '#E2E8F0' : '#FFFFFF' }}
                        >
                            <ShareIconLarge color={destination === 'SHARE' ? "#171A22" : "#6667C2"} />
                            <span className="asset-detail-rs-text">Compartir</span>
                        </button>
                    </div>
                </div>

                {error ? (
                    <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '10px' }}>
                        {error}
                    </div>
                ) : null}

                {destination === 'INSTAGRAM' ? (
                    !isConnectedInstagram ? (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <button
                                className="asset-detail-main-btn"
                                onClick={() => handleConnect('INSTAGRAM')}
                                disabled={posting}
                            >
                                <InstagramIconLarge color="#FFF" />
                                <span className="asset-detail-main-btn-text">{posting ? 'Conectando...' : 'Conectar a Instagram'}</span>
                            </button>
                            {renderUnconnectedFallback()}
                        </div>
                    ) : null
                ) : destination === 'TIKTOK' ? (
                    !isConnectedTikTok ? (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <button
                                className="asset-detail-main-btn"
                                onClick={() => handleConnect('TIKTOK')}
                                disabled={posting}
                                style={{ backgroundColor: '#171A22' }}
                            >
                                <TikTokIconLarge color="#FFF" />
                                <span className="asset-detail-main-btn-text">{posting ? 'Conectando...' : 'Conectar a TikTok'}</span>
                            </button>
                            {renderUnconnectedFallback()}
                        </div>
                    ) : null
                ) : destination === 'FACEBOOK' ? (
                    !isConnectedFacebook ? (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <button
                                className="asset-detail-main-btn"
                                onClick={() => handleConnect('FACEBOOK')}
                                disabled={posting}
                                style={{ backgroundColor: '#456ECE' }}
                            >
                                <FacebookIconLarge color="#FFF" />
                                <span className="asset-detail-main-btn-text">{posting ? 'Conectando...' : 'Conectar a Facebook'}</span>
                            </button>
                            {renderUnconnectedFallback()}
                        </div>
                    ) : null
                ) : destination === 'SHARE' ? (
                    <div className="asset-detail-message">
                        <h4 className="asset-detail-message-title">Paso a paso para compartir en tus redes</h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                            <div>
                                <p className="asset-detail-message-step-title" style={{ marginBottom: '4px' }}>1. Selecciona el texto que quieras utilizar para tu publicación.</p>
                                <p className="asset-detail-message-body">
                                    Haz click en el siguiente botón de "Textos sugeridos" para elegir el texto a utilizar. Simplemente toca el texto que quieras usar y se copiará en tu portapapeles para luego pegarlo en tu publicación.
                                </p>
                            </div>
                            {suggestedTexts.length > 0 ? (
                                <button
                                    className="asset-detail-main-btn asset-detail-main-btn-secondary"
                                    onClick={() => {
                                        setSuggestedTextMode('COPY');
                                        setIsSuggestedTextsModalOpen(true);
                                    }}
                                >
                                    <CopyLinkIconLarge />
                                    <span className="asset-detail-main-btn-text">Textos sugeridos</span>
                                </button>
                            ) : (
                                <div style={{ fontSize: '13px', color: '#999', fontStyle: 'italic', padding: '8px', textAlign: 'center' }}>No hay textos sugeridos disponibles para este contenido.</div>
                            )}
                        </div>

                        <div>
                            <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#34495e' }}>2. Haz click en "Publicar en mi cuenta".</p>
                            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#495057', lineHeight: '1.5' }}>
                                Se desplegará el menú para compartir, busca el icono de la red social donde lo quieras compartir y sigue los pasos para armar tu posteo.
                            </p>
                            <button
                                onClick={handleNativeShare}
                                disabled={posting}
                                style={{ width: '100%', padding: '16px', borderRadius: '8px', border: 'none', background: '#0061FE', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'white', fontWeight: '600', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                            >
                                {posting ? 'Procesando...' : 'Publicar en mi cuenta'}
                                {!posting && <Share2 size={20} />}
                            </button>
                        </div>
                    </div>
                ) : null}

                {((destination === 'INSTAGRAM' && isConnectedInstagram) || (destination === 'TIKTOK' && isConnectedTikTok) || (destination === 'FACEBOOK' && isConnectedFacebook)) && (
                    <div className="post-form" style={{ width: '100%' }}>

                        {postResult ? (
                            <div style={{ padding: '16px', marginBottom: '16px', background: postResult.success ? '#d4edda' : '#f8d7da', borderRadius: '8px', color: postResult.success ? '#155724' : '#721c24', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ whiteSpace: 'pre-line' }}>{postResult.message}</span>
                                <button onClick={() => setPostResult(null)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: 'inherit' }}>&times;</button>
                            </div>
                        ) : null}

                        <div className="asset-detail-user-fila">
                            <div className="asset-detail-user-content">
                                <div className="asset-detail-user-status"><CheckCircleIconSmall /></div>
                                <span className="asset-detail-user-text">
                                    Conectado como {destination === 'INSTAGRAM' ? `@${localStorage.getItem('instagram_username')}` : destination === 'TIKTOK' ? localStorage.getItem('tiktok_username') : 'Usuario Facebook'}
                                </span>
                            </div>
                            <button className="asset-detail-user-disconnect" onClick={() => handleDisconnect(destination)}>
                                <DisconnectIconMedium />
                            </button>
                        </div>

                        {destination === 'INSTAGRAM' && (
                            <div className="asset-detail-tabs-container">
                                <div className="asset-detail-tabs">
                                    {[
                                        { id: 'FEED', label: 'Posteo' },
                                        { id: 'STORY', label: 'Historia' },
                                        ...(asset.type === 'video' ? [{ id: 'REEL', label: 'Reel' }] : [])
                                    ].map(type => (
                                        <div
                                            key={type.id}
                                            className={`asset-detail-tab-item ${postType === type.id ? 'active' : ''}`}
                                            onClick={() => setPostType(type.id)}
                                        >
                                            <span className="asset-detail-tab-text">{type.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {destination === 'FACEBOOK' && (
                            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                <div className="asset-detail-tabs-container">
                                    <div className="asset-detail-tabs">
                                        {[
                                            { id: 'PAGE', label: 'Página (Auto)' },
                                            { id: 'PERSONAL', label: 'Perfil (Link)' },
                                            { id: 'NATIVE', label: 'Perfil (Nativo)' }
                                        ].map(type => (
                                            <div
                                                key={type.id}
                                                className={`asset-detail-tab-item ${fbMode === type.id ? 'active' : ''}`}
                                                onClick={() => setFbMode(type.id)}
                                            >
                                                <span className="asset-detail-tab-text">{type.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {fbMode === 'PAGE' && (
                                    <div className="asset-detail-fb-select-container" style={{ marginBottom: '24px' }}>
                                        <div className="asset-detail-fb-select-label-row">
                                            <span className="asset-detail-fb-select-label">Selecciona una Página:</span>
                                        </div>
                                        <div style={{ position: 'relative', width: '100%' }}>
                                            <button
                                                className="asset-detail-fb-select-field"
                                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            >
                                                <div className="asset-detail-fb-select-content">
                                                    <span>{facebookPages.find(p => p.id === selectedPageId)?.name || 'Selecciona una página...'}</span>
                                                </div>
                                                <div className="asset-detail-fb-select-chevron">
                                                    <span style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'flex' }}>
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M7 10L12 15L17 10" stroke="#5AAFF1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </span>
                                                </div>
                                            </button>

                                            {isDropdownOpen && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    marginTop: '4px',
                                                    backgroundColor: 'white',
                                                    border: '1px solid #CED2FF',
                                                    borderRadius: '16px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                    zIndex: 1000,
                                                    maxHeight: '200px',
                                                    overflowY: 'auto'
                                                }}>
                                                    {facebookPages.map(page => (
                                                        <div
                                                            key={page.id}
                                                            onClick={() => {
                                                                setSelectedPageId(page.id);
                                                                setIsDropdownOpen(false);
                                                            }}
                                                            style={{
                                                                padding: '12px 16px',
                                                                cursor: 'pointer',
                                                                backgroundColor: selectedPageId === page.id ? '#f0f9ff' : 'white',
                                                                color: selectedPageId === page.id ? '#0095f6' : '#333',
                                                                borderBottom: '1px solid #f0f0f0',
                                                                fontFamily: 'Museo Sans',
                                                                fontSize: '16px'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (selectedPageId !== page.id) e.target.style.backgroundColor = '#fafafa';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (selectedPageId !== page.id) e.target.style.backgroundColor = 'white';
                                                            }}
                                                        >
                                                            {page.name}
                                                        </div>
                                                    ))}
                                                    {facebookPages.length === 0 && (
                                                        <div style={{ padding: '12px', color: '#999', textAlign: 'center', fontFamily: 'Museo Sans' }}>
                                                            No se encontraron páginas
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {facebookPages.length === 0 && <p style={{ fontSize: '12px', color: '#e67e22', marginTop: '4px', fontFamily: 'Museo Sans' }}>No se encontraron páginas administradas.</p>}
                                    </div>
                                )}

                                {fbMode === 'PERSONAL' && (
                                    <div className="asset-detail-fb-info-box">
                                        <div style={{ width: '20px', height: '20px', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M10 0C8.02219 0 6.08879 0.58649 4.4443 1.6853C2.79981 2.78412 1.51809 4.3459 0.761209 6.17316C0.00433278 8.00042 -0.1937 10.0111 0.192152 11.9509C0.578004 13.8907 1.53041 15.6725 2.92894 17.0711C4.32746 18.4696 6.10929 19.422 8.0491 19.8078C9.98891 20.1937 11.9996 19.9957 13.8268 19.2388C15.6541 18.4819 17.2159 17.2002 18.3147 15.5557C19.4135 13.9112 20 11.9778 20 10C19.9997 7.34791 18.9461 4.80452 17.0708 2.92922C15.1955 1.05391 12.6521 0.000259208 10 0ZM10 4.43499C10.3349 4.43461 10.6624 4.53355 10.941 4.71931C11.2197 4.90506 11.437 5.16929 11.5655 5.47857C11.694 5.78784 11.7278 6.12827 11.6628 6.45679C11.5978 6.78532 11.4368 7.08718 11.2002 7.32419C10.9636 7.5612 10.662 7.72272 10.3336 7.78832C10.0052 7.85391 9.66468 7.82064 9.35518 7.6927C9.04568 7.56477 8.78108 7.34792 8.59484 7.06958C8.4086 6.79124 8.30909 6.46393 8.3089 6.12903C8.30864 5.68017 8.48663 5.24958 8.80375 4.93192C9.12086 4.61425 9.55114 4.43551 10 4.43499ZM12.2581 14.6764C12.2568 14.8044 12.2054 14.9267 12.1149 15.0172C12.0245 15.1076 11.9021 15.159 11.7742 15.1603H8.22581C8.09787 15.159 7.97554 15.1076 7.88507 15.0172C7.7946 14.9267 7.74321 14.8044 7.74194 14.6764V13.7087C7.74321 13.5808 7.7946 13.4584 7.88507 13.368C7.97554 13.2775 8.09787 13.2261 8.22581 13.2248H8.70968V10.6452H8.22581C8.09787 10.6439 7.97554 10.5925 7.88507 10.502C7.7946 10.4116 7.74321 10.2892 7.74194 10.1613V9.18866C7.74321 9.06072 7.7946 8.93839 7.88507 8.84792C7.97554 8.75745 8.09787 8.70606 8.22581 8.70479H10.8065C10.9344 8.70606 11.0567 8.75745 11.1472 8.84792C11.2377 8.93839 11.2891 9.06072 11.2903 9.18866V13.2258H11.7742C11.9021 13.2271 12.0245 13.2785 12.1149 13.3689C12.2054 13.4594 12.2568 13.5817 12.2581 13.7097V14.6764Z" fill="#456ECE" />
                                            </svg>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                            <span className="asset-detail-fb-info-text-regular">Se compartirá como un <span className="asset-detail-fb-info-text-bold">enlace multimedia</span>.</span>
                                            <span className="asset-detail-fb-info-text-regular">Facebook generará una tarjeta visual.</span>
                                        </div>
                                    </div>
                                )}

                                {fbMode === 'NATIVE' && (
                                    <div className="asset-detail-fb-info-box">
                                        <div style={{ width: '20px', height: '20px', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M10 0C8.02219 0 6.08879 0.58649 4.4443 1.6853C2.79981 2.78412 1.51809 4.3459 0.761209 6.17316C0.00433278 8.00042 -0.1937 10.0111 0.192152 11.9509C0.578004 13.8907 1.53041 15.6725 2.92894 17.0711C4.32746 18.4696 6.10929 19.422 8.0491 19.8078C9.98891 20.1937 11.9996 19.9957 13.8268 19.2388C15.6541 18.4819 17.2159 17.2002 18.3147 15.5557C19.4135 13.9112 20 11.9778 20 10C19.9997 7.34791 18.9461 4.80452 17.0708 2.92922C15.1955 1.05391 12.6521 0.000259208 10 0ZM10 4.43499C10.3349 4.43461 10.6624 4.53355 10.941 4.71931C11.2197 4.90506 11.437 5.16929 11.5655 5.47857C11.694 5.78784 11.7278 6.12827 11.6628 6.45679C11.5978 6.78532 11.4368 7.08718 11.2002 7.32419C10.9636 7.5612 10.662 7.72272 10.3336 7.78832C10.0052 7.85391 9.66468 7.82064 9.35518 7.6927C9.04568 7.56477 8.78108 7.34792 8.59484 7.06958C8.4086 6.79124 8.30909 6.46393 8.3089 6.12903C8.30864 5.68017 8.48663 5.24958 8.80375 4.93192C9.12086 4.61425 9.55114 4.43551 10 4.43499ZM12.2581 14.6764C12.2568 14.8044 12.2054 14.9267 12.1149 15.0172C12.0245 15.1076 11.9021 15.159 11.7742 15.1603H8.22581C8.09787 15.159 7.97554 15.1076 7.88507 15.0172C7.7946 14.9267 7.74321 14.8044 7.74194 14.6764V13.7087C7.74321 13.5808 7.7946 13.4584 7.88507 13.368C7.97554 13.2775 8.09787 13.2261 8.22581 13.2248H8.70968V10.6452H8.22581C8.09787 10.6439 7.97554 10.5925 7.88507 10.502C7.7946 10.4116 7.74321 10.2892 7.74194 10.1613V9.18866C7.74321 9.06072 7.7946 8.93839 7.88507 8.84792C7.97554 8.75745 8.09787 8.70606 8.22581 8.70479H10.8065C10.9344 8.70606 11.0567 8.75745 11.1472 8.84792C11.2377 8.93839 11.2891 9.06072 11.2903 9.18866V13.2258H11.7742C11.9021 13.2271 12.0245 13.2785 12.1149 13.3689C12.2054 13.4594 12.2568 13.5817 12.2581 13.7097V14.6764Z" fill="#456ECE" />
                                            </svg>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                            <span className="asset-detail-fb-info-text-regular"><span className="asset-detail-fb-info-text-bold">Mejor Calidad Visual:</span> La App te ayudará</span>
                                            <span className="asset-detail-fb-info-text-regular">a descargar el video y copiar el texto para que</span>
                                            <span className="asset-detail-fb-info-text-regular">lo subas "nativamente" a Facebook.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!(destination === 'INSTAGRAM' && postType === 'STORY') && (
                            <div className="asset-detail-inputs-container">
                                <div className="asset-detail-textarea-group">
                                    <div className="asset-detail-textarea-header">
                                        <span className="asset-detail-textarea-label">Texto de la publicación</span>
                                        <span className="asset-detail-textarea-counter" style={{ opacity: caption.length > 0 ? 1 : 0.5 }}>{caption.length}/2200</span>
                                    </div>
                                    <div className="asset-detail-textarea-box">
                                        <textarea
                                            className="asset-detail-textarea-input"
                                            placeholder="Escribe el texto de tu publicación aquí..."
                                            value={caption}
                                            onChange={(e) => setCaption(e.target.value)}
                                            maxLength={2200}
                                        />
                                    </div>
                                </div>

                                {suggestedTexts.length > 0 && (
                                    <button
                                        className="asset-detail-suggested-texts-btn"
                                        onClick={() => {
                                            setSuggestedTextMode('INSERT');
                                            setIsSuggestedTextsModalOpen(true);
                                        }}
                                    >
                                        <SuggestedTextsIconSmall /> Ver descripciones sugeridas ({suggestedTexts.length})
                                    </button>
                                )}
                            </div>
                        )}

                        {destination === 'INSTAGRAM' && postType === 'STORY' ? (
                            <div className="asset-detail-warning-message" style={{ marginTop: '24px', marginBottom: '16px' }}>
                                <div style={{ width: '24px', height: '24px', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="21" height="18" viewBox="0 0 21 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0.988461 18C0.805128 18 0.638462 17.9542 0.488462 17.8625C0.338462 17.7708 0.221795 17.65 0.138462 17.5C0.0551282 17.35 0.00929487 17.1875 0.000961538 17.0125C-0.0073718 16.8375 0.0384615 16.6667 0.138462 16.5L9.38846 0.5C9.48846 0.333333 9.61763 0.208333 9.77596 0.125C9.9343 0.0416667 10.0968 0 10.2635 0C10.4301 0 10.5926 0.0416667 10.751 0.125C10.9093 0.208333 11.0385 0.333333 11.1385 0.5L20.3885 16.5C20.4885 16.6667 20.5343 16.8375 20.526 17.0125C20.5176 17.1875 20.4718 17.35 20.3885 17.5C20.3051 17.65 20.1885 17.7708 20.0385 17.8625C19.8885 17.9542 19.7218 18 19.5385 18H0.988461ZM2.71346 16H17.8135L10.2635 3L2.71346 16ZM10.2635 15C10.5468 15 10.7843 14.9042 10.976 14.7125C11.1676 14.5208 11.2635 14.2833 11.2635 14C11.2635 13.7167 11.1676 13.4792 10.976 13.2875C10.7843 13.0958 10.5468 13 10.2635 13C9.98013 13 9.74263 13.0958 9.55096 13.2875C9.35929 13.4792 9.26346 13.7167 9.26346 14C9.26346 14.2833 9.35929 14.5208 9.55096 14.7125C9.74263 14.9042 9.98013 15 10.2635 15ZM10.2635 12C10.5468 12 10.7843 11.9042 10.976 11.7125C11.1676 11.5208 11.2635 11.2833 11.2635 11V8C11.2635 7.71667 11.1676 7.47917 10.976 7.2875C10.7843 7.09583 10.5468 7 10.2635 7C9.98013 7 9.74263 7.09583 9.55096 7.2875C9.35929 7.47917 9.26346 7.71667 9.26346 8V11C9.26346 11.2833 9.35929 11.5208 9.55096 11.7125C9.74263 11.9042 9.98013 12 10.2635 12Z" fill="#2F3238" />
                                    </svg>
                                </div>
                                <div className="asset-detail-warning-text-container">
                                    <span className="asset-detail-warning-title">IMPORTANTE</span>
                                    <span className="asset-detail-warning-body">No es posible añadir texto automáticamente a las historias de Instagram. La imagen se subirá tal cual.</span>
                                </div>
                            </div>
                        ) : (
                            <QuickHashtags onAddTag={(tag) => setCaption(prev => prev ? prev + " " + tag : tag)} />
                        )}

                        <button
                            className="asset-detail-main-btn"
                            onClick={handlePost}
                            disabled={posting || ((destination === 'INSTAGRAM' && postType !== 'STORY' && !caption) || (destination === 'TIKTOK' && !caption))}
                            style={
                                (destination === 'FACEBOOK' && fbMode === 'NATIVE')
                                    ? {
                                        background: '#5AAFF1',
                                        boxShadow: 'none',
                                    } : {}
                            }
                        >
                            {posting ? <Loader2 className="animate-spin" size={20} color="#FFF" /> :
                                (destination === 'FACEBOOK' && fbMode === 'NATIVE') ? <DownloadIconLarge color="#FFF" /> : <Send size={20} color="#FFF" />
                            }
                            <span
                                className="asset-detail-main-btn-text"
                                style={
                                    (destination === 'FACEBOOK' && fbMode === 'NATIVE')
                                        ? {
                                            fontFamily: 'Museo Sans',
                                            fontWeight: 700,
                                            fontSize: '16px'
                                        } : {}
                                }
                            >
                                {posting ? 'Procesando...' :
                                    destination === 'INSTAGRAM' ? (postType === 'STORY' ? 'Publicar Historia (Sin Texto)' : `Publicar en ${postType === 'FEED' ? 'Instagram Post' : 'Instagram Reel'}`) :
                                        destination === 'TIKTOK' ? 'Publicar en TikTok' :
                                            (fbMode === 'NATIVE' ? 'Descargar y Copiar' : 'Publicar en Facebook')
                                }
                            </span>
                        </button>
                    </div>
                )}
            </div>
            {/* Suggested Texts Modal (Moved to root) */}
            {isSuggestedTextsModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }} onClick={() => setIsSuggestedTextsModalOpen(false)}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        position: 'relative',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px' }}>
                                {suggestedTextMode === 'COPY' ? 'Copiar descripción' : 'Descripciones Sugeridas'}
                            </h3>
                            <button onClick={() => setIsSuggestedTextsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {suggestedTexts.map((text, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        if (suggestedTextMode === 'COPY') {
                                            navigator.clipboard.writeText(text).then(() => {
                                                setCopyFeedback("Copiado al portapapeles");
                                                setTimeout(() => setCopyFeedback(''), 2000);
                                            }).catch(err => {
                                                console.error("Failed to copy", err);
                                            });
                                        } else {
                                            setCaption(text);
                                            setIsSuggestedTextsModalOpen(false);
                                        }
                                    }}
                                    style={{
                                        padding: '12px',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        lineHeight: '1.5',
                                        whiteSpace: 'pre-wrap', // Preserve newlines
                                        transition: 'background-color 0.2s',
                                        backgroundColor: '#fafafa'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fafafa'}
                                >
                                    {text}
                                </div>
                            ))}
                            {copyFeedback && (
                                <div style={{
                                    position: 'sticky',
                                    bottom: '0',
                                    marginTop: '8px',
                                    padding: '10px',
                                    backgroundColor: '#333',
                                    color: 'white',
                                    textAlign: 'center',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                    animation: 'fadeIn 0.3s ease-out'
                                }}>
                                    {copyFeedback}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetDetail;
