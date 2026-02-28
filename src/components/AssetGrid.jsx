import React from 'react';
import AssetCard from './AssetCard';

const AssetGrid = ({ assets, onFolderClick, onAssetClick, selectionMode, selectedAssets, currentPath, layout, renderAsFragment }) => {
    if (!assets || assets.length === 0) {
        return null;
    }

    // Determine container class based on layout prop or detection
    let containerClass = "items-list";
    if (layout === "grid-2" || layout === "grid-3" || layout === "card-small" || layout === "card-v3") {
        containerClass = "grid-2-col";
    } else if (layout === "asset-foto-grid") {
        containerClass = "asset-foto-grid";
    } else if (layout === "list-subfolders" || layout === "folder-list-row") {
        containerClass = "folder-list-container";
    } else if (layout === "grid") {
        containerClass = "grid";
    } else if (!layout) {
        const hasFolders = assets.some(a => a.type === 'folder');
        containerClass = hasFolders ? "items-list" : "grid";
    }

    // Filter out folders to get only navigable assets (images/videos) for context
    const navigableIds = assets
        .filter(a => a.type !== 'folder')
        .map(a => a.id);

    const content = assets.map((asset) => (
        <AssetCard
            key={asset.id}
            asset={asset}
            onFolderClick={onFolderClick}
            onAssetClick={onAssetClick}
            selectionMode={selectionMode}
            isSelected={selectedAssets?.some(a => a.id === asset.id)}
            contextIds={navigableIds}
            currentPath={currentPath}
            layout={layout}
        />
    ));

    if (renderAsFragment) {
        return <>{content}</>;
    }

    return (
        <div className={containerClass} style={{ width: '100%' }}>
            {content}
        </div>
    );
};

export default AssetGrid;
