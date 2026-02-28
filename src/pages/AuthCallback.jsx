
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getInstagramAccountId } from '../services/InstagramService';
import { getTikTokCreatorInfo } from '../services/TikTokService';

const AuthCallback = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState("Procesando autenticación...");

    const processedRef = React.useRef(false);

    useEffect(() => {
        const processCode = async () => {
            // Prevent double execution in React StrictMode
            if (processedRef.current) return;
            processedRef.current = true;

            const searchParams = new URLSearchParams(location.search);
            const code = searchParams.get('code');
            const error = searchParams.get('error');

            if (error) {
                setStatus("Error en la autenticación: " + error);
                setTimeout(() => navigate('/home'), 3000);
                return;
            }

            // Determine platform
            const isTikTok = location.pathname.includes('tiktok');
            const isFacebook = location.pathname.includes('facebook');

            const platformName = isTikTok ? 'TikTok' : isFacebook ? 'Facebook' : 'Instagram';
            const apiEndpoint = isTikTok ? '/api/auth/tiktok' : isFacebook ? '/api/auth/facebook' : '/api/auth/instagram';

            if (!code) {
                setStatus(`No se encontró código de autorización para ${platformName}.`);
                return;
            }

            try {
                let redirectUri;
                if (isTikTok) redirectUri = import.meta.env.VITE_TIKTOK_REDIRECT_URI;
                else if (isFacebook) redirectUri = import.meta.env.VITE_FACEBOOK_REDIRECT_URI;
                else redirectUri = import.meta.env.VITE_INSTAGRAM_REDIRECT_URI;

                // Fallback to origin construction if env var missing
                if (!redirectUri) {
                    const defaultPath = isTikTok ? '/auth/tiktok/callback' : isFacebook ? '/auth/facebook/callback' : '/auth/instagram/callback';
                    redirectUri = window.location.origin + defaultPath;
                }

                const response = await fetch(apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        redirectUri,
                        code_verifier: isTikTok ? localStorage.getItem('tiktok_code_verifier') : undefined
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error?.message || data.error || 'Failed to exchange token');
                }

                const token = data.access_token;

                if (isTikTok) {
                    const tiktokUsername = data.creator_nickname || "Usuario de TikTok";
                    localStorage.setItem('tiktok_access_token', token);
                    localStorage.setItem('tiktok_open_id', data.open_id); // TikTok specific
                    localStorage.setItem('tiktok_username', tiktokUsername);
                    setStatus(`¡Conectado a TikTok como ${tiktokUsername}! Redirigiendo...`);
                } else if (location.pathname.includes('facebook')) {
                    // Facebook handling
                    // We don't get username directly from token exchange usually, but we can assume success.
                    // We might want to fetch user profile, but for now let's just store token.
                    localStorage.setItem('facebook_access_token', token);
                    setStatus(`¡Conectado a Facebook! Redirigiendo...`);
                } else {
                    const accountData = await getInstagramAccountId(token);
                    localStorage.setItem('instagram_access_token', token);
                    localStorage.setItem('instagram_account_id', accountData.id);
                    localStorage.setItem('instagram_username', accountData.username);
                    setStatus(`¡Conectado a Instagram como ${accountData.username}! Redirigiendo...`);
                }

                const pendingAssetId = localStorage.getItem('pending_asset_detail_id');
                if (pendingAssetId) {
                    localStorage.removeItem('pending_asset_detail_id'); // Clear it to avoid loops
                    setTimeout(() => navigate(`/asset/${pendingAssetId}`), 1500);
                } else {
                    setTimeout(() => navigate('/compose'), 1500);
                }

            } catch (err) {
                console.error(err);
                setStatus("Error al conectar: " + err.message);
                // Allow retrying if it failed
                processedRef.current = false;
            }
        };

        processCode();
    }, [location, navigate]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' }}>
            <h2>Conectando con {location.pathname.includes('tiktok') ? 'TikTok' : location.pathname.includes('facebook') ? 'Facebook' : 'Instagram'}</h2>
            <p>{status}</p>
        </div>
    );
};

export default AuthCallback;
