import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Instagram, Music2, Image, Film, History } from 'lucide-react';
import { loginToInstagram, postCarouselToInstagram, postToInstagram } from '../services/InstagramService';
import { loginToTikTok, postToTikTok } from '../services/TikTokService';
import { getTemporaryLink } from '../services/DropboxService';
import QuickHashtags from '../components/QuickHashtags';

const Compose = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [assets, setAssets] = useState([]);
    const [caption, setCaption] = useState("");
    const [publishing, setPublishing] = useState(false);
    const [destination, setDestination] = useState("INSTAGRAM"); // "INSTAGRAM" or "TIKTOK"
    const [postType, setPostType] = useState("FEED"); // "FEED", "STORY", "REEL"
    const [connectedInstagram, setConnectedInstagram] = useState(false);
    const [connectedTikTok, setConnectedTikTok] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");


    useEffect(() => {
        if (location.state && location.state.assets) {
            setAssets(location.state.assets);
        } else {
            // Check if we are returning from Auth flow
            const pendingAssets = localStorage.getItem('pending_post_assets');
            const pendingCaption = localStorage.getItem('pending_post_caption');

            if (pendingAssets) {
                try {
                    setAssets(JSON.parse(pendingAssets));
                    if (pendingCaption) setCaption(pendingCaption);
                } catch (e) {
                    console.error("Error parsing pending assets", e);
                    navigate('/');
                }
            } else {
                // If no state and no pending assets, go back home
                navigate('/');
            }
        }
    }, [location, navigate]);

    // Enforce Carousel Constraints
    useEffect(() => {
        if (assets.length > 1) {
            setDestination('INSTAGRAM');
            setPostType('FEED');
        }
    }, [assets]);

    useEffect(() => {
        const checkConnection = () => {
            const igToken = localStorage.getItem('instagram_access_token');
            const igAccount = localStorage.getItem('instagram_account_id');
            const ttToken = localStorage.getItem('tiktok_access_token');

            setConnectedInstagram(!!(igToken && igAccount));
            setConnectedTikTok(!!ttToken);
        };
        setTimeout(checkConnection, 100);
    }, []);

    const handleConnect = (platform) => {
        localStorage.setItem('pending_post_assets', JSON.stringify(assets));
        localStorage.setItem('pending_post_caption', caption);

        if (platform === 'INSTAGRAM') {
            loginToInstagram();
        } else {
            loginToTikTok();
        }
    };

    const handlePublish = async () => {
        setPublishing(true);
        setStatusMessage("Generando enlaces públicos...");
        try {
            const igToken = localStorage.getItem('instagram_access_token');
            const igAccount = localStorage.getItem('instagram_account_id');
            const ttToken = localStorage.getItem('tiktok_access_token');

            // Resolve public URLs
            const publicAssets = await Promise.all(assets.map(async (asset) => {
                if (asset.url && asset.url.startsWith('http') && !asset.url.includes('dropbox')) return asset;
                const link = await getTemporaryLink(asset.path || asset.id);
                if (!link) throw new Error(`No se pudo generar enlace para ${asset.name}`);
                return { ...asset, url: link };
            }));

            if (destination === 'INSTAGRAM') {
                setStatusMessage("Publicando en Instagram...");
                if (publicAssets.length > 1) {
                    // Carousel (Always FEED for now, API limitation usually)
                    await postCarouselToInstagram(publicAssets, caption, igToken, igAccount);
                    if (postType === 'STORY') {
                        // Warn about carousel story conversion?
                    }
                } else {
                    await postToInstagram(publicAssets[0], caption, igToken, igAccount, postType);
                }
            } else {
                setStatusMessage("Publicando en TikTok...");
                if (publicAssets.length > 1) {
                    throw new Error("TikTok Direct Post solo soporta un video a la vez.");
                }
                const videoAsset = publicAssets[0];
                if (videoAsset.type !== 'video') {
                    throw new Error("TikTok requiere un video.");
                }
                await postToTikTok(videoAsset, caption, ttToken);
            }

            if (destination === 'INSTAGRAM') {
                setStatusMessage("¡Publicado exitosamente en Instagram!");
            } else {
                setStatusMessage("¡Publicado exitosamente en TikTok!");
            }
            // setTimeout(() => navigate('/'), 2000);
            setPublishing(false);
        } catch (error) {
            console.error(error);
            setStatusMessage("Error: " + error.message);
            setPublishing(false);
        }
    };

    return (
        <div className="container" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px' }}>
                    <ArrowLeft size={24} />
                </button>
                <h2>Publicar Contenido</h2>
            </div>

            {/* Platform Selection */}
            {assets.length > 1 ? (
                <div style={{ padding: '10px', background: '#e3f2fd', borderRadius: '8px', marginBottom: '20px', color: '#0d47a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Image size={20} />
                    <strong>Modo Carrusel:</strong> Solo disponible para Instagram Post.
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <button
                            onClick={() => setDestination('INSTAGRAM')}
                            style={{
                                flex: 1, padding: '10px', borderRadius: '8px', border: destination === 'INSTAGRAM' ? '2px solid #0095f6' : '1px solid #dbdbdb',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer',
                                backgroundColor: destination === 'INSTAGRAM' ? '#f0f9ff' : 'white'
                            }}
                        >
                            <Instagram size={20} color={destination === 'INSTAGRAM' ? '#0095f6' : '#666'} />
                            <span>Instagram</span>
                        </button>
                        <button
                            onClick={() => setDestination('TIKTOK')}
                            style={{
                                flex: 1, padding: '10px', borderRadius: '8px', border: destination === 'TIKTOK' ? '2px solid #000' : '1px solid #dbdbdb',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer',
                                backgroundColor: destination === 'TIKTOK' ? '#f5f5f5' : 'white'
                            }}
                        >
                            <Music2 size={20} color={destination === 'TIKTOK' ? '#000' : '#666'} />
                            <span>TikTok</span>
                        </button>
                    </div>

                    {/* Post Type Selection (Instagram Only) */}
                    {destination === 'INSTAGRAM' && (
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <button
                                onClick={() => setPostType('FEED')}
                                style={{
                                    flex: 1, padding: '8px', borderRadius: '8px',
                                    border: postType === 'FEED' ? '2px solid #E1306C' : '1px solid #dbdbdb',
                                    backgroundColor: postType === 'FEED' ? '#fff0f5' : 'white',
                                    color: postType === 'FEED' ? '#E1306C' : '#666',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px'
                                }}
                            >
                                <Image size={16} /> Posteo
                            </button>
                            <button
                                onClick={() => setPostType('STORY')}
                                style={{
                                    flex: 1, padding: '8px', borderRadius: '8px',
                                    border: postType === 'STORY' ? '2px solid #E1306C' : '1px solid #dbdbdb',
                                    backgroundColor: postType === 'STORY' ? '#fff0f5' : 'white',
                                    color: postType === 'STORY' ? '#E1306C' : '#666',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px'
                                }}
                            >
                                <History size={16} /> Historia
                            </button>
                            <button
                                onClick={() => setPostType('REEL')}
                                style={{
                                    flex: 1, padding: '8px', borderRadius: '8px',
                                    border: postType === 'REEL' ? '2px solid #E1306C' : '1px solid #dbdbdb',
                                    backgroundColor: postType === 'REEL' ? '#fff0f5' : 'white',
                                    color: postType === 'REEL' ? '#E1306C' : '#666',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px'
                                }}
                            >
                                <Film size={16} /> Reel
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Preview Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '8px',
                marginBottom: '20px'
            }}>
                {assets.map((asset, index) => (
                    <div key={asset.id} style={{ position: 'relative', aspectRatio: '1/1' }}>
                        <img
                            src={asset.thumbnail || asset.url}
                            alt="preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                        />
                        <div style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            {index + 1}
                        </div>
                    </div>
                ))}
            </div>

            {/* Caption Section - Explicit Logic v51 */}
            {destination === 'INSTAGRAM' && postType === 'STORY' ? (
                <div style={{
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: '#fff3cd',
                    color: '#856404',
                    borderRadius: '8px',
                    border: '1px solid #ffeeba',
                    fontSize: '14px',
                    textAlign: 'center'
                }}>
                    <strong>⚠️ Importante (v51)</strong><br />
                    La API de Instagram NO permite añadir texto a las Historias automáticamente.<br />
                    La imagen se subirá tal cual.
                </div>
            ) : (
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Descripción</label>
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={4}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #dbdbdb',
                            fontSize: '16px',
                            fontFamily: 'inherit',
                            resize: 'none'
                        }}
                        placeholder="Escribe una descripción..."
                    />
                    <QuickHashtags onAddTag={(tag) => setCaption(prev => prev ? prev + " " + tag : tag)} />
                </div>
            )}

            {/* Actions */}
            <div>
                {destination === 'INSTAGRAM' ? (
                    !connectedInstagram ? (
                        <button
                            onClick={() => handleConnect('INSTAGRAM')}
                            style={{ width: '100%', padding: '14px', backgroundColor: '#00C853', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
                        >
                            Conectar a Instagram
                        </button>
                    ) : (
                        <button
                            onClick={handlePublish}
                            disabled={publishing}
                            style={{
                                width: '100%', padding: '14px', backgroundColor: publishing ? '#ccc' : '#0095f6', color: 'white',
                                border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: publishing ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            {publishing && <Loader2 className="animate-spin" size={20} />}
                            {publishing ? statusMessage : (
                                assets.length > 1 ? 'Compartir Carrusel' :
                                    (postType === 'STORY' ? 'Publicar Historia (v51)' :
                                        postType === 'REEL' ? 'Publicar Reel' : 'Publicar en Instagram')
                            )}
                        </button>
                    )
                ) : (
                    !connectedTikTok ? (
                        <button
                            onClick={() => handleConnect('TIKTOK')}
                            style={{ width: '100%', padding: '14px', backgroundColor: '#000000', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
                        >
                            Conectar a TikTok
                        </button>
                    ) : (
                        <button
                            onClick={handlePublish}
                            disabled={publishing}
                            style={{
                                width: '100%', padding: '14px', backgroundColor: publishing ? '#ccc' : '#000000', color: 'white',
                                border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: publishing ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            {publishing && <Loader2 className="animate-spin" size={20} />}
                            {publishing ? statusMessage : 'Publicar en TikTok'}
                        </button>
                    )
                )}

                {statusMessage && statusMessage.startsWith('¡Publicado') && (
                    <div style={{
                        marginTop: '15px',
                        padding: '12px',
                        backgroundColor: '#E8F5E9',
                        color: '#2E7D32',
                        borderRadius: '8px',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <span>{statusMessage}</span>
                        <button
                            onClick={() => setStatusMessage("")}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#2E7D32',
                                cursor: 'pointer',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                padding: '0 5px'
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Compose;
