import React, { useEffect, useState } from 'react';
import { ArrowLeft, Search, X, Images, Layers, ChevronRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getBanners, getImageUrl } from '../services/DirectusService';
import { getAssets, getThumbnail, searchAssets, getThumbnailsBatch, getTagsBatch } from '../services/DropboxService';
import AssetGrid from '../components/AssetGrid';
import { CarruselsIcon, HistoriasIcon, OpenFolderIcon, getFolderIcon } from '../components/FolderIcons';
import SkeletonLoader from '../components/SkeletonLoader';

const Home = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const country = searchParams.get('country');

    const GLOBAL_ROOT_PATH = import.meta.env.VITE_DROPBOX_ROOT_PATH || "";
    const APP_ROOT_PATH = country ? `${GLOBAL_ROOT_PATH}/${country}` : GLOBAL_ROOT_PATH;

    const pathParam = searchParams.get('path');
    const currentPath = pathParam && pathParam !== "" ? pathParam : APP_ROOT_PATH;

    const segments = currentPath === APP_ROOT_PATH
        ? []
        : currentPath.replace(APP_ROOT_PATH, '').split('/').filter(Boolean);

    // Calculate expected layout for skeleton pre-fetching (before CMS loads)
    // Level 2 (2 segments) -> grid-3
    // Level 3 (3 segments) -> list-subfolders
    // Level 4+ (4+ segments) -> asset-foto-grid
    const expectedLayout = segments.length >= 4 ? "asset-foto-grid" : (segments.length >= 3 ? "list-subfolders" : (segments.length >= 2 ? "grid-3" : "grid-2"));

    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    const [selectedTag, setSelectedTag] = useState(null);
    const [availableTags, setAvailableTags] = useState([]);

    const [campaignFolder, setCampaignFolder] = useState(null);
    const [productsFolder, setProductsFolder] = useState(null);
    const [directusBanners, setDirectusBanners] = useState([]);
    const [currentBanner, setCurrentBanner] = useState(null);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedAssets, setSelectedAssets] = useState([]);

    useEffect(() => {
        if (!country) {
            navigate('/');
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                let data = [];
                if (searchQuery.trim().length > 0) {
                    setIsSearching(true);
                    data = await searchAssets(searchQuery, currentPath);
                    setCampaignFolder(null);
                } else {
                    setIsSearching(false);
                    data = await getAssets(currentPath);

                    if (currentPath === APP_ROOT_PATH) {
                        const campaignItem = data.find(a => a.name.toLowerCase() === 'campañas' && a.type === 'folder');
                        const productsItem = data.find(a => a.name.toLowerCase() === 'productos' && a.type === 'folder');
                        setCampaignFolder(campaignItem || null);
                        setProductsFolder(productsItem || null);
                    } else {
                        setCampaignFolder(null);
                        setProductsFolder(null);
                    }
                }

                setAssets(data);

                const allTags = new Set();
                data.forEach(asset => {
                    if (asset.tags && Array.isArray(asset.tags)) {
                        asset.tags.forEach(tag => allTags.add(tag));
                    }
                });
                setAvailableTags(Array.from(allTags).sort());

                const fileAssets = data.filter(a => a.type !== 'folder');

                if (fileAssets.length > 0) {
                    const pathsForThumbs = fileAssets.map(a => a.path);
                    const pathsForTags = fileAssets.map(a => a.path);
                    const videoAssets = fileAssets.filter(a => a.type === 'video');

                    const [thumbsMap, tagsMap, durationsMap] = await Promise.all([
                        getThumbnailsBatch(pathsForThumbs),
                        getTagsBatch(pathsForTags),
                        videoAssets.length > 0
                            ? import('../services/DropboxService').then(m => m.getVideoDurations(videoAssets))
                            : Promise.resolve({})
                    ]);

                    setAssets(prev => {
                        const updatedTagsSet = new Set(availableTags);
                        const next = prev.map(asset => {
                            if (asset.type === 'folder') return asset;
                            let changes = {};
                            if (thumbsMap[asset.id]) {
                                changes.thumbnail = thumbsMap[asset.id];
                                if (!asset.url) changes.url = thumbsMap[asset.id];
                            }
                            const newTags = tagsMap[asset.path];
                            if (newTags && newTags.length > 0) {
                                changes.tags = newTags;
                                newTags.forEach(t => updatedTagsSet.add(t));
                            }
                            if (asset.type === 'video' && durationsMap[asset.id]) {
                                changes.duration = durationsMap[asset.id];
                            }
                            if (Object.keys(changes).length > 0) {
                                return { ...asset, ...changes };
                            }
                            return asset;
                        });
                        setAvailableTags(Array.from(updatedTagsSet).sort());
                        return next;
                    });
                }

                let fetchedBanners = [];
                try {
                    fetchedBanners = await getBanners();
                } catch (e) {
                    console.warn("Directus fetch failed", e);
                }

                const cleanCurrentPath = currentPath.replace(/\/$/, '');

                const matchingCurrentBanner = fetchedBanners.find(banner => {
                    if (!banner.target_path) return false;
                    const cleanGlobalRoot = GLOBAL_ROOT_PATH.replace(/\/$/, '');
                    const cleanTarget = banner.target_path.replace(/^\//, '').replace(/\/$/, '');
                    const bannerFullPath = `${cleanGlobalRoot}/${cleanTarget}`;
                    return bannerFullPath === cleanCurrentPath;
                });
                setCurrentBanner(matchingCurrentBanner || null);

                const filteredBanners = fetchedBanners.filter(banner => {
                    if (!banner.target_path) return false;
                    const cleanGlobalRoot = GLOBAL_ROOT_PATH.replace(/\/$/, '');
                    const cleanTarget = banner.target_path.replace(/^\//, '').replace(/\/$/, '');
                    const bannerFullPath = `${cleanGlobalRoot}/${cleanTarget}`;
                    const lastSlashIndex = bannerFullPath.lastIndexOf('/');
                    const parentPath = bannerFullPath.substring(0, lastSlashIndex);
                    return parentPath === cleanCurrentPath;
                });

                if (filteredBanners.length > 0) {
                    setDirectusBanners(filteredBanners);
                    setCampaignFolder(null);
                    setProductsFolder(null);
                } else {
                    setDirectusBanners([]);
                }

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchData();
        }, 300);

        return () => clearTimeout(timeoutId);

    }, [currentPath, searchQuery, country]);

    const handleFolderClick = (path) => {
        if (isSelectionMode) return;
        let nextPath = path;
        if (!path.startsWith('/')) {
            const safeRoot = APP_ROOT_PATH.endsWith('/') ? APP_ROOT_PATH.slice(0, -1) : APP_ROOT_PATH;
            nextPath = `${safeRoot}/${path}`;
        }
        setSearchParams({ path: nextPath, country });
        setSearchQuery("");
        setSelectedTag(null);
    };

    const handleBack = () => {
        if (currentPath === APP_ROOT_PATH) {
            navigate('/');
            return;
        }
        const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        if (parentPath.length < APP_ROOT_PATH.length) {
            setSearchParams({ country, path: APP_ROOT_PATH });
        } else {
            setSearchParams({ country, path: parentPath });
        }
        setSelectedTag(null);
    };

    const clearSearch = () => {
        setSearchQuery("");
        setSearchParams({ country, path: currentPath });
    };

    const handleTagClick = (tag) => {
        if (selectedTag === tag) {
            setSelectedTag(null);
        } else {
            setSelectedTag(tag);
        }
    };

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        if (isSelectionMode) {
            setSelectedAssets([]);
        }
    };

    const handleAssetClick = (asset) => {
        if (!isSelectionMode) return;
        setSelectedAssets(prev => {
            const exists = prev.find(a => a.id === asset.id);
            if (exists) {
                return prev.filter(a => a.id !== asset.id);
            } else {
                if (prev.length >= 10) {
                    alert("Maximum 10 items for carousel.");
                    return prev;
                }
                return [...prev, asset];
            }
        });
    };

    const handlePostCarousel = () => {
        navigate('/compose', { state: { assets: selectedAssets } });
    };

    const displayedAssets = assets.map(a => {
        // Find matching banner to merge metadata
        let enriched = { ...a };
        const matchingBanner = directusBanners.find(banner => {
            if (!banner.target_path) return false;

            const normalize = (p) => (p || "").toLowerCase().replace(/carrousel/g, 'carrusel').replace(/\/+$/, '');
            const assetPath = normalize(a.path);
            const bannerPath = normalize(banner.target_path);
            const assetName = normalize(a.name);

            return assetPath === bannerPath || bannerPath === assetName || assetPath.endsWith(`/${bannerPath}`);
        });

        if (matchingBanner) {
            enriched.display_type = matchingBanner.display_type;
        }

        return enriched;
    }).filter(a => {
        if (selectedTag && (!a.tags || !a.tags.includes(selectedTag))) return false;
        if (campaignFolder && a.id === campaignFolder.id) return false;
        if (productsFolder && a.id === productsFolder.id) return false;

        // Hide folders that are specifically handled as banners at the top
        if (directusBanners.length > 0 && a.type === 'folder') {
            const isBannerTarget = directusBanners.some(banner => {
                if (!banner.target_path) return false;
                const normalize = (p) => (p || "").toLowerCase().replace(/carrousel/g, 'carrusel').replace(/\/+$/, '');
                const assetPath = normalize(a.path);
                const bannerPath = normalize(banner.target_path);
                const assetName = normalize(a.name);
                return assetPath === bannerPath || bannerPath === assetName || assetPath.endsWith(`/${bannerPath}`);
            });
            if (isBannerTarget) return false;
        }
        return true;
    });

    return (
        <div className="home-container">
            <header className="header-mobile-wrapper">
                <div className="header-top-nav">
                    <button onClick={handleBack} className="back-btn" style={{ background: 'none', border: 'none', padding: 0 }}>
                        <ArrowLeft size={24} color="#171A22" />
                    </button>

                    <div className="header-title-container">
                        <span className="header-title">Posteo Fácil</span>
                    </div>

                    <button onClick={() => navigate('/')} className="close-btn" style={{ background: 'none', border: 'none', padding: 0 }}>
                        <X size={24} color="#171A22" />
                    </button>
                </div>

                <div className="search-filter-wrapper">
                    <div className="search-bar-container">
                        <input
                            type="text"
                            placeholder="Buscar archivos..."
                            className="search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery ? (
                            <X size={20} color="#5AAFF1" onClick={clearSearch} style={{ cursor: 'pointer' }} />
                        ) : (
                            <Search size={20} color="#5AAFF1" />
                        )}
                    </div>
                </div>
            </header>

            <main style={{ width: '100%' }}>
                {!isSearching && currentPath === APP_ROOT_PATH && (
                    <div className="intro-header">
                        <img src="/logo_just.png" alt="Just Logo" className="logo-just" />
                        <h1 className="intro-title">Posteo Fácil Just</h1>
                    </div>
                )}

                <div className={`body-content ${segments.length >= 2 ? 'is-deep' : ''}`}>
                    {loading && (
                        <div className="content-wrapper" style={{ marginTop: '24px' }}>
                            <SkeletonLoader layoutType={expectedLayout} />
                        </div>
                    )}

                    {error && (
                        <div style={{ padding: '20px', color: '#721c24', backgroundColor: '#f8d7da', borderRadius: '8px' }}>
                            <h3>Error de Configuración</h3>
                            <p>{error}</p>
                        </div>
                    )}

                    {!loading && !error && (
                        <div className="content-wrapper">
                            {/* Breadcrumb */}
                            {currentPath !== APP_ROOT_PATH && !isSearching && (
                                <div className={`breadcrumb-container ${segments.length >= 2 ? 'is-deep' : ''}`}>
                                    {segments.length >= 4 ? (
                                        <div className="content-view-header">
                                            <button
                                                className="back-button"
                                                onClick={() => {
                                                    const parentPath = segments.slice(0, -1).join('/');
                                                    handleFolderClick(parentPath);
                                                }}
                                            >
                                                <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M3.4 7.575H18.575C18.8583 7.575 19.0958 7.47917 19.2875 7.2875C19.4792 7.09583 19.575 6.85833 19.575 6.575C19.575 6.29167 19.4792 6.05417 19.2875 5.8625C19.0958 5.67083 18.8583 5.575 18.575 5.575H3.4L7.275 1.675C7.45833 1.49167 7.55417 1.2625 7.5625 0.9875C7.57083 0.7125 7.475 0.475 7.275 0.275C7.09167 0.0916667 6.85833 0 6.575 0C6.29167 0 6.05833 0.0916667 5.875 0.275L0.275 5.875C0.175 5.975 0.104167 6.08333 0.0625 6.2C0.0208333 6.31667 0 6.44167 0 6.575C0 6.70833 0.0208333 6.83333 0.0625 6.95C0.104167 7.06667 0.175 7.175 0.275 7.275L5.875 12.875C6.05833 13.0583 6.2875 13.15 6.5625 13.15C6.8375 13.15 7.075 13.0583 7.275 12.875C7.475 12.675 7.575 12.4375 7.575 12.1625C7.575 11.8875 7.475 11.65 7.275 11.45L3.4 7.575Z" fill="#5AAFF1" />
                                                </svg>
                                                Volver
                                            </button>

                                            <button
                                                className="action-button-main"
                                                onClick={toggleSelectionMode}
                                            >
                                                {isSelectionMode ? (
                                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M10 11.4L12.9 14.3C13.0833 14.4833 13.3167 14.575 13.6 14.575C13.8833 14.575 14.1167 14.4833 14.3 14.3C14.4833 14.1167 14.575 13.8833 14.575 13.6C14.575 13.3167 14.4833 13.0833 14.3 12.9L11.4 10L14.3 7.1C14.4833 6.91667 14.575 6.68333 14.575 6.4C14.575 6.11667 14.4833 5.88333 14.3 5.7C14.1167 5.51667 13.8833 5.425 13.6 5.425C13.3167 5.425 13.0833 5.51667 12.9 5.7L10 8.6L7.1 5.7C6.91667 5.51667 6.68333 5.425 6.4 5.425C6.11667 5.425 5.88333 5.51667 5.7 5.7C5.51667 5.88333 5.425 6.11667 5.425 6.4C5.425 6.68333 5.51667 6.91667 5.7 7.1L8.6 10L5.7 12.9C5.51667 13.0833 5.425 13.3167 5.425 13.6C5.425 13.8833 5.51667 14.1167 5.7 14.3C5.88333 14.4833 6.11667 14.575 6.4 14.575C6.68333 14.575 6.91667 14.4833 7.1 14.3L10 11.4ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20Z" fill="#5AAFF1" />
                                                    </svg>
                                                ) : (
                                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M12.7657 2.11061L2.52789 12.3443L5.64952 15.4721L15.8873 5.23839L12.7657 2.11061Z" fill="#5AAFF1" />
                                                        <path d="M16.7025 4.42187L17.2973 3.82663C17.7007 3.43673 17.9487 2.9135 17.9952 2.35421C18.0159 2.04055 17.9695 1.72609 17.859 1.43183C17.7485 1.13757 17.5766 0.870536 17.3546 0.648112C17.1327 0.425689 16.8659 0.253192 16.572 0.14224C16.2781 0.0312891 15.964 -0.01569 15.6505 0.00460222C15.0918 0.0508446 14.5689 0.298757 14.1791 0.702038L13.5822 1.29727L16.7025 4.42187Z" fill="#5AAFF1" />
                                                        <path d="M1.73974 13.5159L0.0392718 17.3569C0.00183431 17.4414 -0.00918355 17.5352 0.00771163 17.626C0.0246068 17.7169 0.0685892 17.8005 0.133888 17.8659C0.199187 17.9312 0.282752 17.9753 0.37354 17.9922C0.464328 18.0091 0.55809 17.9984 0.642507 17.9609L4.48175 16.2599C4.50692 16.2486 4.52898 16.2313 4.54603 16.2096C4.56308 16.1879 4.57465 16.1623 4.5797 16.1351C4.58476 16.108 4.58317 16.0799 4.57508 16.0535C4.567 16.0271 4.55265 16.0028 4.53326 15.9831L2.01088 13.464C1.99141 13.4453 1.96776 13.4317 1.94186 13.424C1.91596 13.4163 1.88855 13.4148 1.862 13.4199C1.83545 13.4249 1.81053 13.4361 1.78926 13.4527C1.76798 13.4694 1.75099 13.4913 1.73974 13.5159Z" fill="#5AAFF1" />
                                                    </svg>
                                                )}
                                                {isSelectionMode ? "Cancelar selección" : (currentPath.toLowerCase().includes('historia') ? "Crear una historia" : "Crear un carrousel")}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="breadcrumb-container">
                                            <button
                                                className="breadcrumb-link"
                                                onClick={() => setSearchParams({ country, path: APP_ROOT_PATH })}
                                                style={{ background: 'none', border: 'none', padding: 0 }}
                                            >
                                                Inicio
                                            </button>
                                            <ChevronRight className="breadcrumb-separator" />
                                            {segments.map((segment, index) => {
                                                const pathSoFar = segments.slice(0, index + 1).join('/');
                                                const isLast = index === segments.length - 1;
                                                const isFirst = index === 0;

                                                return (
                                                    <React.Fragment key={pathSoFar}>
                                                        {isLast ? (
                                                            <span className="breadcrumb-current">{segment}</span>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    className={`breadcrumb-link ${(!isFirst && !isLast) ? "is-truncated" : ""}`}
                                                                    onClick={() => handleFolderClick(pathSoFar)}
                                                                >
                                                                    {segment}
                                                                </button>
                                                                <ChevronRight className="breadcrumb-separator" />
                                                            </>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="items-list">
                                {/* Tags Filter */}
                                {availableTags.length > 0 && (
                                    <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '8px', width: '100%' }}>
                                        {availableTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => handleTagClick(tag)}
                                                style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    backgroundColor: selectedTag === tag ? '#5AAFF1' : '#f0f0f0',
                                                    color: selectedTag === tag ? '#fff' : '#333',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                #{tag}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Selection Mode Toggle */}
                                {segments.length < 4 && currentPath !== APP_ROOT_PATH && displayedAssets.filter(a => a.type !== 'folder').length > 0 && (
                                    <button
                                        onClick={toggleSelectionMode}
                                        className="action-button-main"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: isSelectionMode ? '#ECF5FE' : 'transparent',
                                            color: '#5AAFF1',
                                            border: '1px solid #5AAFF1',
                                            borderRadius: '12px',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            marginBottom: '16px'
                                        }}
                                    >
                                        <Images size={20} />
                                        {isSelectionMode ? "Cancelar Selección" : "Seleccionar Varias"}
                                    </button>
                                )}

                                {/* Combined Content Grid (Banners + Folders + Files) */}
                                {currentPath === APP_ROOT_PATH ? (
                                    <>
                                        {/* Large Banners at Root */}
                                        {directusBanners.length > 0 && (
                                            <div className="items-list" style={{ width: '100%', marginBottom: '24px' }}>
                                                {directusBanners.map(banner => {
                                                    const icon = getFolderIcon(banner.display_type, banner.title, 64, "#fff");
                                                    return (
                                                        <div
                                                            key={banner.id}
                                                            className="category-card"
                                                            onClick={() => {
                                                                let target = banner.target_path;
                                                                if (target && !target.startsWith('/')) {
                                                                    const cleanGlobal = GLOBAL_ROOT_PATH.replace(/\/$/, '');
                                                                    target = `${cleanGlobal}/${target}`;
                                                                }
                                                                handleFolderClick(target);
                                                            }}
                                                        >
                                                            <div
                                                                className="card-image-container"
                                                                style={{
                                                                    backgroundImage: banner.image ? `url(${getImageUrl(banner.image)})` : undefined,
                                                                    backgroundSize: 'cover',
                                                                    backgroundColor: !banner.image ? '#5AAFF1' : undefined,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                {!banner.image && icon}
                                                            </div>
                                                            <div className="card-footer-btn">
                                                                <span className="card-title">{banner.title}</span>
                                                                <ChevronRight className="chevron-icon" color="#5AAFF1" size={24} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {/* AssetGrid (List View at Root) */}
                                        <AssetGrid
                                            assets={displayedAssets}
                                            onFolderClick={handleFolderClick}
                                            onAssetClick={handleAssetClick}
                                            selectionMode={isSelectionMode}
                                            selectedAssets={selectedAssets}
                                            currentPath={currentPath}
                                            layout="list"
                                        />
                                    </>
                                ) : (
                                    <>
                                        {/* Default Logic vs CMS Override */}
                                        {(() => {
                                            let layoutType = segments.length >= 4 ? "asset-foto-grid" : (segments.length >= 3 ? "list-subfolders" : (segments.length >= 2 ? "grid-3" : "grid-2"));
                                            let wrapClass = segments.length >= 4 ? "asset-foto-grid" : (segments.length >= 3 ? "folder-list-container" : "grid-2-col");

                                            // Override with CMS display_layout if present
                                            if (currentBanner && currentBanner.display_layout) {
                                                const dl = currentBanner.display_layout;
                                                layoutType = dl;
                                                if (dl === "list-subfolders" || dl === "folder-list-row") {
                                                    layoutType = "list-subfolders";
                                                    wrapClass = "folder-list-container";
                                                } else if (dl === "asset-foto-grid") {
                                                    layoutType = "asset-foto-grid";
                                                    wrapClass = "asset-foto-grid";
                                                } else {
                                                    // card-small (grid-2), card-v3 (grid-3) etc.
                                                    // both use generic 2-column grid wrapper
                                                    wrapClass = "grid-2-col";
                                                    // we allow layoutType to remain card-v3 etc. for child AssetGrid passing
                                                    // but AssetGrid might expect standard ones. We map them internally below.
                                                }
                                            }

                                            return (
                                                <div className={wrapClass}>
                                                    {/* Banners first */}
                                                    {directusBanners.map(banner => {
                                                        // CMS Override for INDIVIDUAL child banner item configuration
                                                        let isListLevel = segments.length >= 3;
                                                        let cardClass = "category-card card-small"; // Default Level 2

                                                        if (isListLevel) {
                                                            cardClass = "folder-list-row";          // Level 4+
                                                        } else if (segments.length === 2) {
                                                            cardClass = "category-card card-v3";    // Level 3
                                                        }

                                                        if (currentBanner && currentBanner.display_layout) {
                                                            // if the parent explicitly set layout to list-subfolders
                                                            if (currentBanner.display_layout === "list-subfolders") {
                                                                isListLevel = true;
                                                                cardClass = "folder-list-row";
                                                            } else {
                                                                isListLevel = false;
                                                                // if parent set layout to card-v3, its children banners use it
                                                                if (currentBanner.display_layout === "card-v3") {
                                                                    cardClass = "category-card card-v3";
                                                                } else if (currentBanner.display_layout === "card-small") {
                                                                    cardClass = "category-card card-small";
                                                                } else {
                                                                    cardClass = currentBanner.display_layout; // Pass-through
                                                                }
                                                            }
                                                        }

                                                        // Local individual banner override if that specific child has its own layout defined
                                                        // (though usually parent defines child view, if local is needed it could be here)
                                                        if (banner.display_layout) {
                                                            if (banner.display_layout === "list-subfolders") {
                                                                isListLevel = true;
                                                                cardClass = "folder-list-row";
                                                            } else {
                                                                isListLevel = false;
                                                                if (banner.display_layout.includes("card")) {
                                                                    cardClass = `category-card ${banner.display_layout}`;
                                                                }
                                                            }
                                                        }
                                                        // Render banner as a row if in list level, else as a card
                                                        if (isListLevel) {
                                                            return (
                                                                <div
                                                                    key={banner.id}
                                                                    className="folder-list-row"
                                                                    onClick={() => {
                                                                        let target = banner.target_path;
                                                                        if (target && !target.startsWith('/')) {
                                                                            const cleanGlobal = GLOBAL_ROOT_PATH.replace(/\/$/, '');
                                                                            target = `${cleanGlobal}/${target}`;
                                                                        }
                                                                        handleFolderClick(target);
                                                                    }}
                                                                >
                                                                    <div className="txt-wrapper">
                                                                        {getFolderIcon(banner.display_type, banner.title, 24, "#456ECE") || <OpenFolderIcon size={24} color="#456ECE" />}
                                                                        <span className="folder-title">{banner.title}</span>
                                                                    </div>
                                                                    <ChevronRight className="chevron-icon" color="#5AAFF1" size={16} />
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div
                                                                key={banner.id}
                                                                className={cardClass}
                                                                onClick={() => {
                                                                    let target = banner.target_path;
                                                                    if (target && !target.startsWith('/')) {
                                                                        const cleanGlobal = GLOBAL_ROOT_PATH.replace(/\/$/, '');
                                                                        target = `${cleanGlobal}/${target}`;
                                                                    }
                                                                    handleFolderClick(target);
                                                                }}
                                                            >
                                                                <div
                                                                    className="card-image-container"
                                                                    style={{
                                                                        backgroundImage: banner.image ? `url(${getImageUrl(banner.image)})` : undefined,
                                                                        backgroundColor: segments.length >= 2 ? '#ECF0FA' : '#EEECF7',
                                                                        backgroundSize: 'cover',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        flexShrink: 0,
                                                                        height: (cardClass.includes('card-small') || cardClass.includes('card-v3')) ? '172px' : '232px',
                                                                        minHeight: (cardClass.includes('card-small') || cardClass.includes('card-v3')) ? '172px' : '232px',
                                                                        maxHeight: (cardClass.includes('card-small') || cardClass.includes('card-v3')) ? '172px' : '232px'
                                                                    }}
                                                                >
                                                                    {!banner.image && getFolderIcon(banner.display_type, banner.title, segments.length >= 2 ? 56 : 48, segments.length >= 2 ? "#456ECE" : "#A098D5")}
                                                                </div>
                                                                <div className="card-footer-btn">
                                                                    <span className="card-title">{banner.title}</span>
                                                                    <ChevronRight className="chevron-icon" color="#5AAFF1" size={16} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Pure Asset Display */}
                                                    {displayedAssets.length > 0 && (
                                                        <AssetGrid
                                                            assets={displayedAssets}
                                                            onFolderClick={handleFolderClick}
                                                            onAssetClick={handleAssetClick}
                                                            selectionMode={isSelectionMode}
                                                            selectedAssets={selectedAssets}
                                                            currentPath={currentPath}
                                                            layout={layoutType}
                                                            renderAsFragment={true}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {!isSelectionMode && (
                <footer style={{ width: '100%', padding: '40px 20px', textAlign: 'center' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            background: 'none',
                            border: '1px solid #DDDDDD',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            color: '#908F9A',
                            fontSize: '13px'
                        }}
                    >
                        🌍 Cambiar País ({country})
                    </button>
                    <div style={{ marginTop: '10px', fontSize: '11px', color: '#DDDDDD' }}>
                        v{import.meta.env.PACKAGE_VERSION}
                    </div>
                </footer>
            )}

            {
                isSelectionMode && selectedAssets.length > 0 && (
                    <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, width: '90%' }}>
                        <button
                            onClick={handlePostCarousel}
                            style={{
                                width: '100%',
                                padding: '16px',
                                backgroundColor: '#5AAFF1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '16px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <Layers size={20} />
                            Publicar Carrusel ({selectedAssets.length})
                        </button>
                    </div>
                )
            }
        </div >
    );
};

export default Home;
