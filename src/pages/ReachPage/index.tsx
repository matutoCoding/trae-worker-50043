import { useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  MousePointer2,
  Circle,
  Move,
  Plus,
  Trash2,
  Save,
  MapPin,
  Waves,
  ArrowDownUp,
  Ruler,
  AlertTriangle,
} from 'lucide-react';
import ReachCanvas from '@/components/Canvas/ReachCanvas';
import { useAppStore } from '@/store/useAppStore';
import type { Reach, Rock, RockShape } from '@/types';

const ROCK_SHAPE_LABELS: Record<RockShape, string> = {
  round: '圆形',
  sharp: '尖形',
  flat: '扁平',
  submerged: '水下暗礁',
};

const ROCK_SHAPE_ICONS: Record<RockShape, string> = {
  round: '●',
  sharp: '◆',
  flat: '■',
  submerged: '○',
};

type ToolType = 'select' | 'rock' | 'pan';

export default function ReachPage() {
  const {
    reaches,
    currentReachId,
    addReach,
    updateReach,
    deleteReach,
    setCurrentReachId,
    loadReachData,
  } = useAppStore();

  const [tool, setTool] = useState<ToolType>('select');
  const [rockShape, setRockShape] = useState<RockShape>('round');
  const [selectedRock, setSelectedRock] = useState<Rock | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentReach = useMemo(
    () => reaches.find((r) => r.id === currentReachId) || null,
    [reaches, currentReachId]
  );

  const handleCreateReach = useCallback(async () => {
    const now = Date.now();
    const newReach: Reach = {
      id: uuidv4(),
      name: `新河段 ${reaches.length + 1}`,
      length: 300,
      width: 25,
      location: '',
      baseFlow: 15,
      drop: 4.5,
      gradient: 15,
      rocks: [],
      createdAt: now,
      updatedAt: now,
    };
    await addReach(newReach);
    setCurrentReachId(newReach.id);
    await loadReachData(newReach.id);
    setSelectedRock(null);
  }, [reaches.length, addReach, setCurrentReachId, loadReachData]);

  const handleDeleteReach = useCallback(
    async (id: string) => {
      if (reaches.length <= 1) {
        alert('至少需要保留一个河段');
        return;
      }
      if (confirm('确定要删除这个河段吗？相关数据将被永久删除。')) {
        await deleteReach(id);
        setSelectedRock(null);
      }
    },
    [reaches.length, deleteReach]
  );

  const handleSwitchReach = useCallback(
    async (id: string) => {
      setCurrentReachId(id);
      await loadReachData(id);
      setSelectedRock(null);
    },
    [setCurrentReachId, loadReachData]
  );

  const handleUpdateReachField = useCallback(
    <K extends keyof Reach>(field: K, value: Reach[K]) => {
      if (!currentReach) return;
      const updated: Reach = {
        ...currentReach,
        [field]: value,
        updatedAt: Date.now(),
      };
      updateReach(updated);
    },
    [currentReach, updateReach]
  );

  const handleSaveReach = useCallback(async () => {
    if (!currentReach) return;
    setIsSaving(true);
    try {
      await updateReach({ ...currentReach, updatedAt: Date.now() });
      setTimeout(() => setIsSaving(false), 500);
    } catch (error) {
      console.error('Save error:', error);
      setIsSaving(false);
    }
  }, [currentReach, updateReach]);

  const handleRockAdd = useCallback(
    async (rockData: Omit<Rock, 'id'>) => {
      if (!currentReach) return;
      const newRock: Rock = {
        ...rockData,
        id: uuidv4(),
      };
      const updatedReach: Reach = {
        ...currentReach,
        rocks: [...currentReach.rocks, newRock],
        updatedAt: Date.now(),
      };
      await updateReach(updatedReach);
      setSelectedRock(newRock);
    },
    [currentReach, updateReach]
  );

  const handleRockMove = useCallback(
    async (rock: Rock) => {
      if (!currentReach) return;
      const updatedRocks = currentReach.rocks.map((r) =>
        r.id === rock.id ? rock : r
      );
      const updatedReach: Reach = {
        ...currentReach,
        rocks: updatedRocks,
        updatedAt: Date.now(),
      };
      await updateReach(updatedReach);
      setSelectedRock(rock);
    },
    [currentReach, updateReach]
  );

  const handleRockSelect = useCallback((rock: Rock | null) => {
    setSelectedRock(rock);
  }, []);

  const handleUpdateRock = useCallback(
    <K extends keyof Rock>(field: K, value: Rock[K]) => {
      if (!selectedRock || !currentReach) return;
      const updatedRock: Rock = {
        ...selectedRock,
        [field]: value,
      };
      const updatedRocks = currentReach.rocks.map((r) =>
        r.id === selectedRock.id ? updatedRock : r
      );
      const updatedReach: Reach = {
        ...currentReach,
        rocks: updatedRocks,
        updatedAt: Date.now(),
      };
      updateReach(updatedReach);
      setSelectedRock(updatedRock);
    },
    [selectedRock, currentReach, updateReach]
  );

  const handleDeleteRock = useCallback(async () => {
    if (!selectedRock || !currentReach) return;
    const updatedRocks = currentReach.rocks.filter(
      (r) => r.id !== selectedRock.id
    );
    const updatedReach: Reach = {
      ...currentReach,
      rocks: updatedRocks,
      updatedAt: Date.now(),
    };
    await updateReach(updatedReach);
    setSelectedRock(null);
  }, [selectedRock, currentReach, updateReach]);

  return (
    <div className="min-h-screen bg-deep-sea-950 text-gray-100">
      <div className="flex flex-col lg:flex-row h-screen">
        <div className="w-full lg:w-96 bg-deep-sea-900 border-r border-deep-sea-700/50 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-deep-sea-700/50">
            <h1 className="text-xl font-display font-bold text-white">
              河段录入
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              管理激流赛道的河段信息与岩石分布
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b border-deep-sea-700/50">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                  河段列表
                </h2>
                <button
                  onClick={handleCreateReach}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-rapid-500 hover:bg-rapid-600 text-white rounded transition-colors"
                >
                  <Plus size={14} />
                  新增
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {reaches.map((reach) => (
                  <div
                    key={reach.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                      reach.id === currentReachId
                        ? 'bg-deep-sea-700 border border-deep-sea-500'
                        : 'bg-deep-sea-800/50 border border-transparent hover:bg-deep-sea-800'
                    }`}
                    onClick={() => handleSwitchReach(reach.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {reach.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {reach.location || '未设置位置'} · {reach.rocks.length} 个岩石
                      </p>
                    </div>
                    {reaches.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReach(reach.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {reaches.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <AlertTriangle size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无河段数据</p>
                    <p className="text-xs">点击上方新增按钮创建</p>
                  </div>
                )}
              </div>
            </div>

            {currentReach && (
              <>
                <div className="p-4 border-b border-deep-sea-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                      基本信息
                    </h2>
                    <button
                      onClick={handleSaveReach}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-deep-sea-600 hover:bg-deep-sea-500 disabled:opacity-50 text-white rounded transition-colors"
                    >
                      <Save size={14} className={isSaving ? 'animate-spin' : ''} />
                      {isSaving ? '保存中...' : '保存'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        河段名称
                      </label>
                      <input
                        type="text"
                        value={currentReach.name}
                        onChange={(e) =>
                          handleUpdateReachField('name', e.target.value)
                        }
                        className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rapid-500 transition-colors"
                        placeholder="输入河段名称"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          位置
                        </span>
                      </label>
                      <input
                        type="text"
                        value={currentReach.location}
                        onChange={(e) =>
                          handleUpdateReachField('location', e.target.value)
                        }
                        className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rapid-500 transition-colors"
                        placeholder="输入河段位置"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          <span className="flex items-center gap-1">
                            <Ruler size={12} />
                            长度 (m)
                          </span>
                        </label>
                        <input
                          type="number"
                          value={currentReach.length}
                          onChange={(e) =>
                            handleUpdateReachField(
                              'length',
                              Number(e.target.value)
                            )
                          }
                          min="0"
                          className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rapid-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          <span className="flex items-center gap-1">
                            <Ruler size={12} />
                            宽度 (m)
                          </span>
                        </label>
                        <input
                          type="number"
                          value={currentReach.width}
                          onChange={(e) =>
                            handleUpdateReachField(
                              'width',
                              Number(e.target.value)
                            )
                          }
                          min="0"
                          className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rapid-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-b border-deep-sea-700/50">
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                    水文参数
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        <span className="flex items-center gap-1">
                          <Waves size={12} />
                          基准流量 (m³/s)
                        </span>
                      </label>
                      <input
                        type="number"
                        value={currentReach.baseFlow}
                        onChange={(e) =>
                          handleUpdateReachField(
                            'baseFlow',
                            Number(e.target.value)
                          )
                        }
                        min="0"
                        step="0.1"
                        className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rapid-500 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          <span className="flex items-center gap-1">
                            <ArrowDownUp size={12} />
                            落差 (m)
                          </span>
                        </label>
                        <input
                          type="number"
                          value={currentReach.drop}
                          onChange={(e) =>
                            handleUpdateReachField(
                              'drop',
                              Number(e.target.value)
                            )
                          }
                          min="0"
                          step="0.1"
                          className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rapid-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          <span className="flex items-center gap-1">
                            <ArrowDownUp size={12} />
                            坡度 (%)
                          </span>
                        </label>
                        <input
                          type="number"
                          value={currentReach.gradient}
                          onChange={(e) =>
                            handleUpdateReachField(
                              'gradient',
                              Number(e.target.value)
                            )
                          }
                          min="0"
                          step="0.1"
                          className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rapid-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {selectedRock && (
                  <div className="p-4 bg-rapid-500/10 border-b border-rapid-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold text-rapid-400 uppercase tracking-wide">
                        选中岩石
                      </h2>
                      <button
                        onClick={handleDeleteRock}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          形状
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {(
                            ['round', 'sharp', 'flat', 'submerged'] as RockShape[]
                          ).map((shape) => (
                            <button
                              key={shape}
                              onClick={() => handleUpdateRock('shape', shape)}
                              className={`p-2 rounded text-center text-xs transition-all ${
                                selectedRock.shape === shape
                                  ? 'bg-rapid-500 text-white'
                                  : 'bg-deep-sea-700 text-gray-300 hover:bg-deep-sea-600'
                              }`}
                            >
                              <span className="text-lg block">
                                {ROCK_SHAPE_ICONS[shape]}
                              </span>
                              {ROCK_SHAPE_LABELS[shape]}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            半径 (px)
                          </label>
                          <input
                            type="number"
                            value={selectedRock.radius}
                            onChange={(e) =>
                              handleUpdateRock(
                                'radius',
                                Math.max(5, Math.min(100, Number(e.target.value)))
                              )
                            }
                            min="5"
                            max="100"
                            className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rapid-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            高度 (m)
                          </label>
                          <input
                            type="number"
                            value={selectedRock.height}
                            onChange={(e) =>
                              handleUpdateRock(
                                'height',
                                Math.max(0, Number(e.target.value))
                              )
                            }
                            min="0"
                            step="0.1"
                            className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rapid-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            X 坐标
                          </label>
                          <input
                            type="number"
                            value={Math.round(selectedRock.x)}
                            onChange={(e) =>
                              handleUpdateRock('x', Number(e.target.value))
                            }
                            className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rapid-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Y 坐标
                          </label>
                          <input
                            type="number"
                            value={Math.round(selectedRock.y)}
                            onChange={(e) =>
                              handleUpdateRock('y', Number(e.target.value))
                            }
                            className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rapid-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-deep-sea-950 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-deep-sea-900/80 border-b border-deep-sea-700/50">
            <div className="flex items-center gap-2">
              <div className="flex bg-deep-sea-800 rounded-lg p-1">
                <button
                  onClick={() => setTool('select')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
                    tool === 'select'
                      ? 'bg-deep-sea-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-deep-sea-700'
                  }`}
                >
                  <MousePointer2 size={16} />
                  选择
                </button>
                <button
                  onClick={() => setTool('rock')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
                    tool === 'rock'
                      ? 'bg-deep-sea-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-deep-sea-700'
                  }`}
                >
                  <Circle size={16} />
                  岩石
                </button>
                <button
                  onClick={() => setTool('pan')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
                    tool === 'pan'
                      ? 'bg-deep-sea-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-deep-sea-700'
                  }`}
                >
                  <Move size={16} />
                  平移
                </button>
              </div>

              {tool === 'rock' && (
                <div className="flex bg-deep-sea-800 rounded-lg p-1 ml-2">
                  {(
                    ['round', 'sharp', 'flat', 'submerged'] as RockShape[]
                  ).map((shape) => (
                    <button
                      key={shape}
                      onClick={() => setRockShape(shape)}
                      className={`px-3 py-1.5 rounded text-sm transition-all flex items-center gap-1 ${
                        rockShape === shape
                          ? 'bg-rapid-500 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-deep-sea-700'
                      }`}
                    >
                      <span>{ROCK_SHAPE_ICONS[shape]}</span>
                      {ROCK_SHAPE_LABELS[shape]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-sm text-gray-400">
              {currentReach ? (
                <span>
                  当前: <span className="text-white">{currentReach.name}</span> ·{' '}
                  <span className="text-rapid-400">
                    {currentReach.rocks.length}
                  </span>{' '}
                  个岩石
                </span>
              ) : (
                <span>请选择或创建一个河段</span>
              )}
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
            {currentReach ? (
              <ReachCanvas
                reach={currentReach}
                editable={true}
                tool={tool}
                rockShape={rockShape}
                selectedRockId={selectedRock?.id || null}
                onRockAdd={handleRockAdd}
                onRockMove={handleRockMove}
                onRockSelect={handleRockSelect}
                flowVelocity={currentReach.baseFlow / 5}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-deep-sea-800 flex items-center justify-center">
                    <Waves size={32} className="text-deep-sea-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-300 mb-2">
                    暂无河段
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    请在左侧创建或选择一个河段开始编辑
                  </p>
                  <button
                    onClick={handleCreateReach}
                    className="px-4 py-2 bg-rapid-500 hover:bg-rapid-600 text-white rounded-lg transition-colors"
                  >
                    创建新河段
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
