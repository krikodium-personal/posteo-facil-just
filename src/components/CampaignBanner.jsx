import React, { useEffect, useState } from 'react';
import { getFolderCoverImage } from '../services/DropboxService';

const CampaignBanner = ({ folder, onClick }) => {
    const [bgUrl, setBgUrl] = useState(null);

    useEffect(() => {
        const fetchCover = async () => {
            if (folder && folder.path) {
                const url = await getFolderCoverImage(folder.path);
                if (url) setBgUrl(url);
            }
        };
        fetchCover();
    }, [folder]);

    return (
        <div
            onClick={() => onClick(folder.path)}
            style={{
                width: 'calc(100% - 24px)',
                margin: '0 auto 12px auto',
                height: '180px',
                position: 'relative',
                borderRadius: '4px', // Tweak radius to match grid items usually having small/no radius if edge-to-edge, but let's keep it slightly rounded or make it consistent? Grid items in CSS don't have radius. Let's keep small radius or remove.
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: 'none' // Remove shadow to match flat grid
            }}
        >
            {bgUrl ? (
                <img
                    src={bgUrl}
                    alt="Campaign Cover"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s'
                    }}
                />
            ) : (
                <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%)'
                }} />
            )}

            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)',
                display: 'flex',
                alignItems: 'flex-end',
                padding: '20px'
            }}>
                <div>
                    <span style={{
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: '11px',
                        fontWeight: '700',
                        letterSpacing: '1px',
                        marginBottom: '4px',
                        display: 'block'
                    }}>
                        Carpeta
                    </span>
                    <h2 style={{
                        color: 'white',
                        margin: 0,
                        fontSize: '28px',
                        fontWeight: '700',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}>
                        {folder.name}
                    </h2>
                </div>
            </div>
        </div>
    );
};

export default CampaignBanner;
