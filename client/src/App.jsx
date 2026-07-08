import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Detail from './pages/Detail.jsx';
import Watch from './pages/Watch.jsx';

export default function App() {
  useEffect(() => {
    // Block context menu (right click)
    const blockContextMenu = (e) => e.preventDefault();

    // Block keyboard shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S)
    const blockShortcuts = (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I or Ctrl+Shift+J or Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'i' || e.key === 'j' || e.key === 'c')) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        return false;
      }
      // Ctrl+S (Save)
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        return false;
      }
    };

    // window.addEventListener('contextmenu', blockContextMenu);
    // window.addEventListener('keydown', blockShortcuts);

    return () => {
      // window.removeEventListener('contextmenu', blockContextMenu);
      // window.removeEventListener('keydown', blockShortcuts);
    };
  }, []);

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie/:id" element={<Detail />} />
        <Route path="/detail/:id" element={<Detail />} />
        <Route path="/watch/:id" element={<Watch />} />
      </Routes>
      <footer className="footer" style={{
        background: 'linear-gradient(180deg, rgba(10, 10, 15, 0) 0%, rgba(5, 5, 10, 0.95) 100%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '40px 24px 30px',
        marginTop: '60px',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '30px',
          marginBottom: '30px'
        }}>
          {/* Brand/About Column */}
          <div style={{ flex: '1 1 350px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              fontFamily: 'Outfit, sans-serif', 
              fontWeight: 800, 
              fontSize: '24px', 
              letterSpacing: '1px',
              marginBottom: '16px'
            }}>
              <span style={{ color: '#00f3ff', textShadow: '0 0 10px rgba(0, 243, 255, 0.5)' }}>JANI</span>
              <span style={{ color: '#ffffff', fontWeight: 300, fontSize: '20px', margin: '0 4px', fontStyle: 'italic' }}>x</span>
              <span style={{ color: '#ff0055', textShadow: '0 0 10px rgba(255, 0, 85, 0.5)' }}>FLIX</span>
            </div>
            <p style={{ color: '#888', fontSize: '13.5px', lineHeight: '1.6', margin: 0 }}>
              Welcome to <strong>JANIxFLIX</strong>, your ultimate ad-free premium streaming destination. We are committed to providing high-quality streaming links in Full HD (1080p) and HD (720p) completely free of charge. Experience movies, web series, TV shows, and anime without any subscription fees or annoying pop-up ads.
            </p>
          </div>

          {/* Disclaimer Column */}
          <div style={{ flex: '1 1 350px' }}>
            <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', borderBottom: '2px solid #ff0055', display: 'inline-block', paddingBottom: '4px' }}>
              Disclaimer
            </h4>
            <p style={{ color: '#888', fontSize: '13.5px', lineHeight: '1.6', margin: 0 }}>
              <strong>JANIxFLIX</strong> does not store any files on our server. All content is provided by non-affiliated third parties. We index external streaming links for educational and preview purposes only. If you own copyrighted materials and wish them to be removed, please contact the respective hosting providers.
            </p>
          </div>

          {/* Mission Column */}
          <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', borderBottom: '2px solid #00f3ff', display: 'inline-block', paddingBottom: '4px' }}>
              Our Mission
            </h4>
            <div style={{
              background: 'rgba(0, 243, 255, 0.05)',
              border: '1px solid rgba(0, 243, 255, 0.15)',
              padding: '12px 16px',
              borderRadius: '8px',
              color: '#00f3ff',
              fontSize: '12px',
              fontWeight: 'bold',
              lineHeight: '1.4',
              textShadow: '0 0 8px rgba(0, 243, 255, 0.3)'
            }}>
              💡 100% Free Streaming forever. No hidden charges.
            </div>
            <div style={{
              background: 'rgba(255, 0, 85, 0.05)',
              border: '1px solid rgba(255, 0, 85, 0.15)',
              padding: '12px 16px',
              borderRadius: '8px',
              color: '#ff0055',
              fontSize: '12px',
              fontWeight: 'bold',
              lineHeight: '1.4',
              textShadow: '0 0 8px rgba(255, 0, 85, 0.3)'
            }}>
              🚫 Ad-Free Experience. Zero pop-ups, zero trackers.
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '12px',
          color: '#555'
        }}>
          <span>&copy; {new Date().getFullYear()} JANIxFLIX. All rights reserved. Created with ❤️ for entertainment enthusiasts.</span>
        </div>
      </footer>
    </>
  );
}
