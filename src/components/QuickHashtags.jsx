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
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                Haz click en los siguientes hashtags para agregarlos a la descripción de tu publicación:
            </p>
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
