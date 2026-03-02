import React from 'react';

const HASHTAGS = [
    "#vitaljust",
    "#bienestaren2clicks",
    "#bienestarjust",
    "#tiendajustonline",
    "#justonline"
];

const QuickHashtags = ({ onAddTag }) => {
    return (
        <div style={{ marginTop: '12px', marginBottom: '16px' }}>
            <span style={{
                fontFamily: "'Museo Sans'",
                fontStyle: 'normal',
                fontWeight: 400,
                fontSize: '12px',
                lineHeight: '18px',
                display: 'flex',
                alignItems: 'center',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                color: '#908F9A',
                marginBottom: '16px',
            }}>
                Agrega Hashtags a tu posteo:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {HASHTAGS.map(tag => (
                    <button
                        key={tag}
                        onClick={() => onAddTag(tag)}
                        style={{
                            background: '#f0f9ff',
                            border: '1px solid #b3e0ff',
                            borderRadius: '16px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            color: '#0061FE',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        {tag}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QuickHashtags;
