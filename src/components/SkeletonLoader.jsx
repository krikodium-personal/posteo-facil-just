import React from 'react';

const SkeletonLoader = ({ layoutType, count = 6 }) => {
    // Generate an array of dummy items based on count
    const items = Array.from({ length: count }, (_, i) => i);

    if (layoutType === 'list-subfolders' || layoutType === 'folder-list-row') {
        return (
            <div className="folder-list-container skeleton-container">
                {items.slice(0, 5).map((i) => (
                    <div key={i} className="folder-list-row" style={{ cursor: 'default' }}>
                        <div className="txt-wrapper" style={{ width: '100%', gap: '16px' }}>
                            <div className="skeleton-box pulse" style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0 }}></div>
                            <div className="skeleton-box pulse" style={{ height: '16px', borderRadius: '4px', flex: 1, maxWidth: '200px' }}></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (layoutType === 'asset-foto-grid') {
        const heights = ['150px', '250px', '180px', '300px', '200px', '220px'];
        return (
            <div className="asset-foto-grid skeleton-container">
                <div className="grid-sizer"></div>
                {items.map((i) => (
                    <div key={i} className="grid-item">
                        <div
                            className="skeleton-box pulse"
                            style={{
                                height: heights[i % heights.length],
                                width: '100%',
                                borderRadius: '12px'
                            }}
                        ></div>
                    </div>
                ))}
            </div>
        );
    }

    // Default to card grids (card-small / grid-2 OR card-v3 / grid-3)
    const isSmall = layoutType === 'card-small' || layoutType === 'grid-2';
    const numCards = isSmall ? 4 : 6;

    return (
        <div className="grid-2-col skeleton-container">
            {items.slice(0, numCards).map((i) => (
                <div key={i} className={`category-card ${isSmall ? 'card-small' : 'card-v3'}`} style={{ cursor: 'default' }}>
                    <div
                        className="card-image-container skeleton-box pulse"
                        style={{
                            height: '172px',
                            minHeight: '172px',
                            maxHeight: '172px',
                            flexShrink: 0,
                            borderRadius: '16px 16px 0 0',
                            backgroundColor: '#E2E8F0' // Base skeleton color
                        }}
                    ></div>
                    <div className="card-footer-btn" style={{ justifyContent: 'flex-start', padding: '16px' }}>
                        <div className="skeleton-box pulse" style={{ height: '14px', borderRadius: '4px', width: '60%' }}></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SkeletonLoader;
