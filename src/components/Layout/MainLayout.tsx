import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from './Sidebar';

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-deep-sea-950">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-deep-sea-900/80 backdrop-blur-sm border-b border-deep-sea-700/50 flex items-center justify-between px-4">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 text-gray-400 hover:text-white hover:bg-deep-sea-800/50 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              <span className="text-deep-sea-400">●</span> 离线模式运行中
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
