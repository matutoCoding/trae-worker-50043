import { NavLink, useLocation } from 'react-router-dom';
import {
  Waves,
  Droplets,
  MapPin,
  Timer,
  Database,
  Settings,
  Download,
  Upload,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { path: '/reach', label: '河段录入', icon: MapPin },
  { path: '/reading', label: '读水标注', icon: Droplets },
  { path: '/gates', label: '门位编排', icon: Waves },
  { path: '/review', label: '失误回溯', icon: Timer },
  { path: '/library', label: '水势库', icon: Database },
];

export default function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation();
  const { reaches, currentReachId, setCurrentReachId, exportAllData, importData } = useAppStore();

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      if (window.electronAPI) {
        await window.electronAPI.exportData(data, `water-data-${Date.now()}.json`);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImport = async () => {
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.importData();
        if (data) {
          await importData(data);
        }
      }
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  return (
    <aside
      className={`h-screen bg-deep-sea-900 border-r border-deep-sea-700/50 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="p-4 border-b border-deep-sea-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-deep-sea-500 to-deep-sea-700 rounded-xl flex items-center justify-center shadow-glow">
            <Waves className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-display font-bold text-white text-lg leading-tight">激流解析</h1>
              <p className="text-xs text-gray-400">训练分析系统</p>
            </div>
          )}
        </div>
      </div>

      {!collapsed && reaches.length > 0 && (
        <div className="p-3 border-b border-deep-sea-700/50">
          <label className="text-xs text-gray-400 px-1 mb-1 block">当前河段</label>
          <select
            value={currentReachId || ''}
            onChange={(e) => setCurrentReachId(e.target.value)}
            className="select-field text-sm"
          >
            {reaches.map((reach) => (
              <option key={reach.id} value={reach.id}>
                {reach.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-deep-sea-300' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-deep-sea-700/50 space-y-2">
        {!collapsed ? (
          <div className="space-y-2">
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-deep-sea-800/50 rounded-lg transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              导出数据
            </button>
            <button
              onClick={handleImport}
              className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-deep-sea-800/50 rounded-lg transition-colors text-sm"
            >
              <Upload className="w-4 h-4" />
              导入数据
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-deep-sea-800/50 rounded-lg transition-colors text-sm"
            >
              <Settings className="w-4 h-4" />
              系统设置
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleExport}
              className="p-2 text-gray-400 hover:text-white hover:bg-deep-sea-800/50 rounded-lg transition-colors"
              title="导出数据"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleImport}
              className="p-2 text-gray-400 hover:text-white hover:bg-deep-sea-800/50 rounded-lg transition-colors"
              title="导入数据"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-gray-400 hover:text-white hover:bg-deep-sea-800/50 rounded-lg transition-colors"
              title="系统设置"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
