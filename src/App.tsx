import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import ReachPage from '@/pages/ReachPage';
import ReadingPage from '@/pages/ReadingPage';
import GatesPage from '@/pages/GatesPage';
import ReviewPage from '@/pages/ReviewPage';
import LibraryPage from '@/pages/LibraryPage';
import { useAppStore } from '@/store/useAppStore';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { init, isLoading } = useAppStore();

  useEffect(() => {
    init();
  }, [init]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-deep-sea-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-deep-sea-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">正在加载数据...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/reach" replace />} />
        <Route element={<MainLayout />}>
          <Route path="/reach" element={<ReachPage />} />
          <Route path="/reading" element={<ReadingPage />} />
          <Route path="/gates" element={<GatesPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/library" element={<LibraryPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
