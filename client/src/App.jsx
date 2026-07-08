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
      <footer className="footer">JANIxFlix • Premium Streaming Portal</footer>
    </>
  );
}
