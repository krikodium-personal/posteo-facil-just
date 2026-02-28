import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowRight } from 'lucide-react'; // Assuming lucide-react is installed

const CountrySelector = () => {
    const navigate = useNavigate();
    const [selectedCountry, setSelectedCountry] = useState('Argentina');

    const handleContinue = () => {
        // Redirección a /home con el parámetro country
        navigate(`/home?country=${selectedCountry}`);
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            backgroundColor: '#f7f9fa',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '40px',
                borderRadius: '24px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                width: '100%',
                maxWidth: '360px',
                textAlign: 'center'
            }}>
                <img
                    src="/logo_just.png"
                    alt="Just Logo"
                    style={{ height: '60px', marginBottom: '24px', objectFit: 'contain' }}
                />

                <h1 style={{
                    fontSize: '22px',
                    marginBottom: '12px',
                    color: '#333',
                    fontWeight: '700'
                }}>
                    Bienvenido
                </h1>

                <p style={{
                    color: '#666',
                    marginBottom: '32px',
                    fontSize: '15px'
                }}>
                    ¿Desde dónde nos visitas?
                </p>

                <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#444'
                    }}>
                        Selecciona tu País
                    </label>
                    <div style={{ position: 'relative' }}>
                        <select
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                paddingRight: '40px',
                                borderRadius: '12px',
                                border: '1px solid #e0e0e0',
                                fontSize: '16px',
                                appearance: 'none',
                                backgroundColor: '#fff',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            <option value="Argentina">🇦🇷 Argentina</option>
                            <option value="Mexico">🇲🇽 México</option>
                        </select>
                        <div style={{
                            position: 'absolute',
                            right: '14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none'
                        }}>
                            <Globe size={20} color="#999" />
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleContinue}
                    style={{
                        width: '100%',
                        padding: '16px',
                        backgroundColor: '#0061FE',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        boxShadow: '0 4px 12px rgba(0, 97, 254, 0.3)'
                    }}
                >
                    Continuar
                </button>
            </div>

            <p style={{ marginTop: '24px', color: '#999', fontSize: '12px' }}>
                Posteo Fácil Just v2.0
            </p>
        </div>
    );
};

export default CountrySelector;
