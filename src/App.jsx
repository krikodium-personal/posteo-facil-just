
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AssetDetail from './pages/AssetDetail';
import Compose from './pages/Compose';
import AuthCallback from './pages/AuthCallback';
import CountrySelector from './pages/CountrySelector';
import './App.css';

const APP_VERSION = `v${import.meta.env.PACKAGE_VERSION}`;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CountrySelector />} />
        <Route path="/home" element={<Home />} />
        <Route path="/asset/:id" element={<AssetDetail />} />
        <Route path="/compose" element={<Compose />} />
        <Route path="/auth/instagram/callback" element={<AuthCallback />} />
        <Route path="/auth/tiktok/callback" element={<AuthCallback />} />
        <Route path="/auth/facebook/callback" element={<AuthCallback />} />
      </Routes>
      <div style={{ position: 'fixed', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', zIndex: 9999 }}>
        {APP_VERSION}
      </div>
    </Router>
  );
}

export default App;
