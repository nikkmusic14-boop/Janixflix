import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Detail from './pages/Detail.jsx';
import Watch from './pages/Watch.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie/:id" element={<Detail />} />
        <Route path="/watch/:id" element={<Watch />} />
      </Routes>
      <footer className="footer">JANIxFlix • Premium Streaming Portal</footer>
    </>
  );
}
