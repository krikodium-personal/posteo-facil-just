import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Folder, ChevronRight } from 'lucide-react';
import { getFolderCoverImage } from '../services/DropboxService';
import { CarruselsIcon, HistoriasIcon, OpenFolderIcon, DefaultFolderIcon, getFolderIcon } from './FolderIcons';

const AssetCard = ({ asset, onFolderClick, onAssetClick, selectionMode, isSelected, contextIds, currentPath, layout }) => {
    const [bgUrl, setBgUrl] = useState(null);

    useEffect(() => {
        const fetchCover = async () => {
            if (asset.type === 'folder' && asset.path) {
                const url = await getFolderCoverImage(asset.path);
                if (url) setBgUrl(url);
            }
        };
        fetchCover();
    }, [asset]);

    const handleClick = (e) => {
        if (selectionMode) {
            e.preventDefault();
            if (onAssetClick) onAssetClick(asset);
        }
    };

    const isSmall = layout === "grid-2" || layout === "card-small";
    const isDeep = layout === "grid-3" || layout === "card-v3";
    const isListFolders = layout === "list-subfolders" || layout === "folder-list-row";

    // If it's a folder, it's always a card unless it's the new list-subfolders view
    if (asset.type === 'folder') {
        const folderBg = bgUrl ? `url(${bgUrl})` : undefined;
        let iconSize = 64;
        let iconColor = "#fff";
        let cardClass = "category-card";

        if (isSmall) {
            iconSize = 48;
            iconColor = "#A098D5";
            cardClass += " card-small";
        } else if (isDeep) {
            iconSize = 56;
            iconColor = "#456ECE";
            cardClass += " card-v3";
        }

        const renderIcon = () => {
            if (bgUrl) return null;
            return getFolderIcon(asset.display_type, asset.title || asset.name, iconSize, iconColor) ||
                <DefaultFolderIcon size={iconSize} />;
        };

        if (isListFolders) {
            const icon = getFolderIcon(asset.display_type, asset.title || asset.name, 24, "#456ECE") ||
                <OpenFolderIcon size={24} color="#456ECE" />;

            return (
                <div
                    className="folder-list-row"
                    onClick={() => onFolderClick(asset.path || asset.name)}
                >
                    <div className="txt-wrapper">
                        {icon}
                        <span className="folder-title">{asset.title || asset.name}</span>
                    </div>
                    <ChevronRight className="chevron-icon" color="#5AAFF1" size={16} />
                </div>
            );
        }

        return (
            <div
                className={cardClass}
                onClick={() => onFolderClick(asset.path)}
            >
                <div
                    className="card-image-container"
                    style={{
                        backgroundImage: folderBg,
                        backgroundColor: '#EEECF7',
                        flexShrink: 0,
                        height: (cardClass.includes('card-small') || cardClass.includes('card-v3')) ? '172px' : '232px',
                        minHeight: (cardClass.includes('card-small') || cardClass.includes('card-v3')) ? '172px' : '232px',
                        maxHeight: (cardClass.includes('card-small') || cardClass.includes('card-v3')) ? '172px' : '232px'
                    }}
                >
                    {!bgUrl && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            {renderIcon()}
                        </div>
                    )}
                </div>
                <div className="card-footer-btn">
                    <span className="card-title">{asset.title || asset.name}</span>
                    <ChevronRight className="chevron-icon" color="#5AAFF1" size={16} />
                </div>
            </div>
        );
    }

    // For file assets in small mode (Grid View)
    if (isSmall || isDeep) {
        let cardClass = "category-card card-small";
        if (isDeep) cardClass = "category-card card-v3";

        return (
            <div className={cardClass} onClick={handleClick}>
                <Link
                    to={selectionMode ? '#' : `/asset/${asset.id}`}
                    state={{ contextIds, returnPath: currentPath }}
                    className="asset-link"
                    style={{ width: '100%', height: 'auto', textDecoration: 'none', display: 'flex', flexDirection: 'column' }}
                >
                    <div
                        className="card-image-container"
                        style={{
                            backgroundColor: isDeep ? '#ECF0FA' : '#EEECF7',
                            position: 'relative',
                            flexShrink: 0,
                            height: (cardClass.includes('card-small') || cardClass.includes('card-v3')) ? '172px' : '232px',
                            minHeight: (cardClass.includes('card-small') || cardClass.includes('card-v3')) ? '172px' : '232px',
                            maxHeight: (cardClass.includes('card-small') || cardClass.includes('card-v3')) ? '172px' : '232px'
                        }}
                    >
                        {asset.thumbnail ? (
                            <img
                                src={asset.thumbnail}
                                alt={asset.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div className="skeleton" style={{ width: '100%', height: '100%' }}></div>
                        )}

                        {selectionMode && (
                            <div style={{
                                position: 'absolute', top: '12px', right: '12px',
                                width: '24px', height: '24px', borderRadius: '50%',
                                border: '2px solid white',
                                backgroundColor: isSelected ? '#5AAFF1' : 'rgba(0,0,0,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {isSelected && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                            </div>
                        )}
                    </div>
                    <div className="card-footer-btn">
                        <span className="card-title">{asset.title || asset.name}</span>
                        <ChevronRight className="chevron-icon" color="#5AAFF1" size={16} />
                    </div>
                </Link>
            </div>
        );
    }
    const formatDuration = (ms) => {
        if (!ms) return '';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Layout: asset-foto-grid (Redesign)
    if (layout === "asset-foto-grid") {
        return (
            <div
                className="asset-foto-card"
                onClick={handleClick}
                style={{
                    backgroundImage: asset.thumbnail ? `url(${asset.thumbnail})` : 'none',
                    backgroundColor: '#ECF0FA'
                }}
            >
                {selectionMode && (
                    <div className="selection-overlay" style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        border: '2px solid white',
                        backgroundColor: isSelected ? '#5AAFF1' : 'rgba(0,0,0,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {isSelected && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                    </div>
                )}

                {asset.type === 'video' && asset.duration && (
                    <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }}>
                        {formatDuration(asset.duration)}
                    </div>
                )}

                <Link
                    to={selectionMode ? '#' : `/asset/${asset.id}`}
                    state={{ contextIds, returnPath: currentPath }}
                    className="asset-link"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                    onClick={(e) => {
                        if (selectionMode) e.preventDefault();
                    }}
                />
            </div>
        );
    }

    return (
        <div style={{ padding: '4px', position: 'relative' }}>
            {/* Selection Overlay */}
            {selectionMode && (
                <div
                    onClick={handleClick}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 10,
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: '2px solid white',
                        backgroundColor: isSelected ? '#5AAFF1' : 'rgba(0,0,0,0.3)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}>
                    {isSelected && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                </div>
            )}

            <Link
                to={selectionMode ? '#' : `/asset/${asset.id}`}
                state={{ contextIds, returnPath: currentPath }}
                onClick={handleClick}
                className="asset-link"
                style={{
                    position: 'relative',
                    display: 'block',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    transform: isSelected ? 'scale(0.95)' : 'scale(1)',
                    transition: 'transform 0.1s ease',
                    boxShadow: isSelected ? '0 0 0 2px #5AAFF1' : 'none'
                }}>
                {asset.thumbnail ? (
                    <img
                        src={asset.thumbnail}
                        alt={asset.title}
                        className="asset-thumbnail"
                        loading="lazy"
                        style={{ borderRadius: '8px', opacity: selectionMode && !isSelected ? 0.8 : 1 }}
                    />
                ) : (
                    <div className="skeleton"></div>
                )}
                {asset.type === 'video' && asset.duration && (
                    <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }}>
                        {formatDuration(asset.duration)}
                    </div>
                )}
            </Link>
        </div>
    );
};

export default AssetCard;
