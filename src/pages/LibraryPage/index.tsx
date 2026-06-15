import { useState, useMemo, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Star,
  AlertTriangle,
  Weight,
  Tag,
  Plus,
  Trash2,
  Heart,
  Search,
  Filter,
  X,
  Edit2,
  Check,
  ChevronDown,
  ChevronUp,
  Droplets,
  MapPin,
  Clock,
  Activity,
  User,
  Ship,
  AlertCircle,
  Info,
  GripVertical,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { LineLibrary, LineSegment, WaterLevelRisk, WeightRecommendation, Athlete, Boat } from '@/types';
import { assessWaterLevelRisk, calculateWeightRecommendation } from '@/engine/waterDynamics';

const PRESET_TAGS = ['新手友好', '高手专属', '逆水密集', '技术型', '体能型'];

const DIFFICULTY_LABELS: Record<number, string> = {
  1: '入门',
  2: '简单',
  3: '中等',
  4: '困难',
  5: '专家',
};

const RISK_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  normal: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    label: '正常',
  },
  warning: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    label: '警告',
  },
  danger: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    label: '危险',
  },
};

interface EditingSegment {
  id: string | null;
  startGate: number;
  endGate: number;
  description: string;
  keyPoints: Array<{ x: number; y: number; note: string }>;
  waterFeatures: string[];
}

export default function LibraryPage() {
  const {
    currentReachId,
    currentFlowRate,
    reaches,
    lineLibrary,
    trainingSessions,
    athletes,
    boats,
    addLineToLibrary,
    updateLineInLibrary,
    deleteLineFromLibrary,
  } = useAppStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterReachId, setFilterReachId] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<number | 'all'>('all');
  const [filterFlowMin, setFilterFlowMin] = useState<number | ''>('');
  const [filterFlowMax, setFilterFlowMax] = useState<number | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [favoriteLines, setFavoriteLines] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSegment, setEditingSegment] = useState<EditingSegment | null>(null);

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [selectedBoatId, setSelectedBoatId] = useState<string>('');
  const [weightRecommendation, setWeightRecommendation] = useState<WeightRecommendation | null>(null);

  const [newCustomTag, setNewCustomTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  const [newLineName, setNewLineName] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');

  const currentReach = useMemo(
    () => reaches.find((r) => r.id === currentReachId) || null,
    [reaches, currentReachId]
  );

  const filteredLines = useMemo(() => {
    return lineLibrary.filter((line) => {
      if (searchKeyword && !line.name.toLowerCase().includes(searchKeyword.toLowerCase())) {
        return false;
      }

      if (filterReachId !== 'all' && line.reachId !== filterReachId) {
        return false;
      }

      if (filterDifficulty !== 'all' && line.difficulty !== filterDifficulty) {
        return false;
      }

      if (filterFlowMin !== '' && line.flowRange[1] < filterFlowMin) {
        return false;
      }

      if (filterFlowMax !== '' && line.flowRange[0] > filterFlowMax) {
        return false;
      }

      return true;
    });
  }, [lineLibrary, searchKeyword, filterReachId, filterDifficulty, filterFlowMin, filterFlowMax]);

  const selectedLine = useMemo(
    () => lineLibrary.find((l) => l.id === selectedLineId) || null,
    [lineLibrary, selectedLineId]
  );

  const riskAssessment = useMemo((): WaterLevelRisk | null => {
    if (!selectedLine || !currentReach) return null;
    return assessWaterLevelRisk(currentReach, currentFlowRate, selectedLine.segments);
  }, [selectedLine, currentReach, currentFlowRate]);

  const availableSessions = useMemo(() => {
    return trainingSessions.filter(
      (s) => !lineLibrary.some((l) => l.gateConfigId === s.gateConfigId && l.reachId === s.reachId)
    );
  }, [trainingSessions, lineLibrary]);

  useEffect(() => {
    if (selectedAthleteId && selectedBoatId) {
      const athlete = athletes.find((a) => a.id === selectedAthleteId);
      const boat = boats.find((b) => b.id === selectedBoatId);
      if (athlete && boat) {
        const recommendation = calculateWeightRecommendation(athlete, boat);
        setWeightRecommendation(recommendation);
      }
    } else {
      setWeightRecommendation(null);
    }
  }, [selectedAthleteId, selectedBoatId, athletes, boats]);

  useEffect(() => {
    if (athletes.length > 0 && !selectedAthleteId) {
      setSelectedAthleteId(athletes[0].id);
    }
    if (boats.length > 0 && !selectedBoatId) {
      setSelectedBoatId(boats[0].id);
    }
  }, [athletes, boats, selectedAthleteId, selectedBoatId]);

  const handleToggleFavorite = useCallback((lineId: string) => {
    setFavoriteLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  }, []);

  const handleDeleteLine = useCallback(
    (lineId: string) => {
      if (window.confirm('确定要删除这条线路吗？')) {
        deleteLineFromLibrary(lineId);
        if (selectedLineId === lineId) {
          setSelectedLineId(null);
        }
      }
    },
    [deleteLineFromLibrary, selectedLineId]
  );

  const handleCreateLine = useCallback(() => {
    if (!newLineName.trim() || !selectedSessionId) return;

    const session = trainingSessions.find((s) => s.id === selectedSessionId);
    if (!session) return;

    const newLine: LineLibrary = {
      id: uuidv4(),
      name: newLineName.trim(),
      reachId: session.reachId,
      gateConfigId: session.gateConfigId,
      bestTime: session.totalTime,
      difficulty: 3,
      flowRange: [currentFlowRate * 0.8, currentFlowRate * 1.2] as [number, number],
      segments: [],
      tags: [],
      athleteRating: 0,
      createdAt: Date.now(),
    };

    addLineToLibrary(newLine);
    setNewLineName('');
    setSelectedSessionId('');
    setShowCreateModal(false);
    setSelectedLineId(newLine.id);
  }, [newLineName, selectedSessionId, trainingSessions, currentFlowRate, addLineToLibrary]);

  const handleAddSegment = useCallback(() => {
    if (!selectedLine) return;

    setEditingSegment({
      id: null,
      startGate: 1,
      endGate: 6,
      description: '',
      keyPoints: [],
      waterFeatures: [],
    });
  }, [selectedLine]);

  const handleEditSegment = useCallback(
    (segment: LineSegment) => {
      setEditingSegment({
        id: segment.id,
        startGate: segment.startGate,
        endGate: segment.endGate,
        description: segment.description,
        keyPoints: [...segment.keyPoints],
        waterFeatures: [...segment.waterFeatures],
      });
    },
    []
  );

  const handleSaveSegment = useCallback(() => {
    if (!selectedLine || !editingSegment) return;

    const newSegment: LineSegment = {
      id: editingSegment.id || uuidv4(),
      startGate: editingSegment.startGate,
      endGate: editingSegment.endGate,
      description: editingSegment.description,
      keyPoints: editingSegment.keyPoints,
      waterFeatures: editingSegment.waterFeatures,
    };

    let updatedSegments: LineSegment[];
    if (editingSegment.id) {
      updatedSegments = selectedLine.segments.map((s) =>
        s.id === editingSegment.id ? newSegment : s
      );
    } else {
      updatedSegments = [...selectedLine.segments, newSegment];
    }

    updateLineInLibrary({
      ...selectedLine,
      segments: updatedSegments,
    });

    setEditingSegment(null);
  }, [selectedLine, editingSegment, updateLineInLibrary]);

  const handleDeleteSegment = useCallback(
    (segmentId: string) => {
      if (!selectedLine) return;
      if (window.confirm('确定要删除这个分段吗？')) {
        const updatedSegments = selectedLine.segments.filter((s) => s.id !== segmentId);
        updateLineInLibrary({
          ...selectedLine,
          segments: updatedSegments,
        });
      }
    },
    [selectedLine, updateLineInLibrary]
  );

  const handleAddKeyPoint = useCallback(() => {
    if (!editingSegment) return;
    setEditingSegment({
      ...editingSegment,
      keyPoints: [...editingSegment.keyPoints, { x: 0, y: 0, note: '' }],
    });
  }, [editingSegment]);

  const handleUpdateKeyPoint = useCallback(
    (index: number, field: 'x' | 'y' | 'note', value: number | string) => {
      if (!editingSegment) return;
      const newKeyPoints = [...editingSegment.keyPoints];
      newKeyPoints[index] = { ...newKeyPoints[index], [field]: value };
      setEditingSegment({ ...editingSegment, keyPoints: newKeyPoints });
    },
    [editingSegment]
  );

  const handleDeleteKeyPoint = useCallback(
    (index: number) => {
      if (!editingSegment) return;
      const newKeyPoints = editingSegment.keyPoints.filter((_, i) => i !== index);
      setEditingSegment({ ...editingSegment, keyPoints: newKeyPoints });
    },
    [editingSegment]
  );

  const handleToggleTag = useCallback(
    (tag: string) => {
      if (!selectedLine) return;
      const newTags = selectedLine.tags.includes(tag)
        ? selectedLine.tags.filter((t) => t !== tag)
        : [...selectedLine.tags, tag];

      updateLineInLibrary({
        ...selectedLine,
        tags: newTags,
      });
    },
    [selectedLine, updateLineInLibrary]
  );

  const handleAddCustomTag = useCallback(() => {
    if (!selectedLine || !newCustomTag.trim()) return;
    const tag = newCustomTag.trim();
    if (!selectedLine.tags.includes(tag)) {
      updateLineInLibrary({
        ...selectedLine,
        tags: [...selectedLine.tags, tag],
      });
    }
    setNewCustomTag('');
    setShowTagInput(false);
  }, [selectedLine, newCustomTag, updateLineInLibrary]);

  const handleUpdateDifficulty = useCallback(
    (difficulty: 1 | 2 | 3 | 4 | 5) => {
      if (!selectedLine) return;
      updateLineInLibrary({
        ...selectedLine,
        difficulty,
      });
    },
    [selectedLine, updateLineInLibrary]
  );

  const handleUpdateFlowRange = useCallback(
    (index: 0 | 1, value: number) => {
      if (!selectedLine) return;
      const newFlowRange: [number, number] = [...selectedLine.flowRange] as [number, number];
      newFlowRange[index] = value;
      updateLineInLibrary({
        ...selectedLine,
        flowRange: newFlowRange,
      });
    },
    [selectedLine, updateLineInLibrary]
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const getReachName = (reachId: string) => {
    return reaches.find((r) => r.id === reachId)?.name || '未知河段';
  };

  const renderStars = (count: number, interactive: boolean = false, onSelect?: (n: number) => void) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`w-4 h-4 ${
              n <= count ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'
            } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            onClick={() => interactive && onSelect && onSelect(n as 1 | 2 | 3 | 4 | 5)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-deep-sea-950">
      <div className="p-4 bg-deep-sea-900 border-b border-deep-sea-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Droplets className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white">水势线路库</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={availableSessions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-deep-sea-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            从训练记录创建
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索线路名称..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters
                ? 'bg-deep-sea-600 text-white'
                : 'bg-deep-sea-800 text-gray-400 hover:bg-deep-sea-700 hover:text-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            筛选
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-deep-sea-800/50 rounded-lg border border-deep-sea-700/50 grid grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">河段</label>
              <select
                value={filterReachId}
                onChange={(e) => setFilterReachId(e.target.value)}
                className="w-full px-3 py-2 bg-deep-sea-700 border border-deep-sea-600 rounded-lg text-sm text-white"
              >
                <option value="all">全部河段</option>
                {reaches.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">难度</label>
              <select
                value={filterDifficulty.toString()}
                onChange={(e) =>
                  setFilterDifficulty(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="w-full px-3 py-2 bg-deep-sea-700 border border-deep-sea-600 rounded-lg text-sm text-white"
              >
                <option value="all">全部难度</option>
                {[1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">最小流量 (m³/s)</label>
              <input
                type="number"
                value={filterFlowMin}
                onChange={(e) =>
                  setFilterFlowMin(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full px-3 py-2 bg-deep-sea-700 border border-deep-sea-600 rounded-lg text-sm text-white"
                placeholder="不限"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">最大流量 (m³/s)</label>
              <input
                type="number"
                value={filterFlowMax}
                onChange={(e) =>
                  setFilterFlowMax(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full px-3 py-2 bg-deep-sea-700 border border-deep-sea-600 rounded-lg text-sm text-white"
                placeholder="不限"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 flex flex-col bg-deep-sea-900 border-r border-deep-sea-700/50 overflow-hidden">
          <div className="p-3 border-b border-deep-sea-700/50">
            <span className="text-sm text-gray-400">
              共 <span className="text-white font-medium">{filteredLines.length}</span> 条线路
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {filteredLines.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Droplets className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无符合条件的线路</p>
                <p className="text-sm mt-1">调整筛选条件或创建新线路</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredLines.map((line) => (
                  <div
                    key={line.id}
                    onClick={() => setSelectedLineId(line.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
                      selectedLineId === line.id
                        ? 'bg-deep-sea-700 border-cyan-500 shadow-cyan-500/20'
                        : 'bg-deep-sea-800 border-deep-sea-700/50 hover:bg-deep-sea-750 hover:border-deep-sea-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-white font-semibold truncate flex-1">{line.name}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(line.id);
                        }}
                        className="ml-2 p-1 hover:bg-deep-sea-600 rounded transition-colors"
                      >
                        <Heart
                          className={`w-4 h-4 transition-colors ${
                            favoriteLines.has(line.id)
                              ? 'text-red-400 fill-red-400'
                              : 'text-gray-500 hover:text-red-400'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-cyan-400 font-mono">
                          {formatTime(line.bestTime)}
                        </span>
                      </div>
                      {renderStars(line.difficulty)}
                    </div>

                    <div className="flex items-center gap-2 mb-2 text-xs">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-400">{getReachName(line.reachId)}</span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Droplets className="w-3 h-3 text-blue-400" />
                      <span className="text-xs text-blue-400">
                        {line.flowRange[0]} - {line.flowRange[1]} m³/s
                      </span>
                    </div>

                    {line.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {line.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-deep-sea-700 text-gray-300 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {line.tags.length > 3 && (
                          <span className="px-2 py-0.5 bg-deep-sea-700 text-gray-400 text-xs rounded-full">
                            +{line.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedLine ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-500">
              <div>
                <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">选择一条线路查看详情</p>
                <p className="text-sm mt-2">从左侧列表中选择线路，或创建新线路</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{selectedLine.name}</h2>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">
                        河段: <span className="text-white">{getReachName(selectedLine.reachId)}</span>
                      </span>
                      <span className="text-gray-400">
                        最佳成绩: <span className="text-cyan-400 font-mono">{formatTime(selectedLine.bestTime)}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteLine(selectedLine.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {riskAssessment && (
                  <div
                    className={`mb-6 p-4 rounded-lg border ${RISK_COLORS[riskAssessment.riskLevel].bg} ${RISK_COLORS[riskAssessment.riskLevel].border}`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className={`w-6 h-6 flex-shrink-0 mt-0.5 ${RISK_COLORS[riskAssessment.riskLevel].text}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`font-semibold ${RISK_COLORS[riskAssessment.riskLevel].text}`}>
                            当前流量风险评估: {RISK_COLORS[riskAssessment.riskLevel].label}
                          </h3>
                          <span className="text-sm text-gray-400">
                            当前流量: {currentFlowRate} m³/s
                          </span>
                        </div>
                        <div className="text-sm text-gray-300 space-y-1">
                          {riskAssessment.affectedSegments.length > 0 && (
                            <p>
                              受影响分段: {riskAssessment.affectedSegments.length} 个
                            </p>
                          )}
                          {riskAssessment.recommendations.map((rec, idx) => (
                            <p key={idx} className="flex items-center gap-2">
                              <Info className="w-4 h-4" />
                              {rec}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="p-4 bg-deep-sea-800 rounded-lg border border-deep-sea-700/50">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">难度等级</h3>
                    <div className="flex items-center gap-3">
                      {renderStars(selectedLine.difficulty, true, handleUpdateDifficulty)}
                      <span className="text-white font-medium">
                        {DIFFICULTY_LABELS[selectedLine.difficulty]}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-deep-sea-800 rounded-lg border border-deep-sea-700/50">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">适用流量范围</h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={selectedLine.flowRange[0]}
                        onChange={(e) => handleUpdateFlowRange(0, Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-deep-sea-700 border border-deep-sea-600 rounded text-sm text-white text-center"
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="number"
                        value={selectedLine.flowRange[1]}
                        onChange={(e) => handleUpdateFlowRange(1, Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-deep-sea-700 border border-deep-sea-600 rounded text-sm text-white text-center"
                      />
                      <span className="text-sm text-gray-400">m³/s</span>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Tag className="w-5 h-5 text-purple-400" />
                      标签
                    </h3>
                    <button
                      onClick={() => setShowTagInput(true)}
                      className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      添加自定义标签
                    </button>
                  </div>

                  {showTagInput && (
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newCustomTag}
                        onChange={(e) => setNewCustomTag(e.target.value)}
                        placeholder="输入标签名称..."
                        className="flex-1 px-3 py-2 bg-deep-sea-700 border border-deep-sea-600 rounded-lg text-sm text-white"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                        autoFocus
                      />
                      <button
                        onClick={handleAddCustomTag}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm"
                      >
                        添加
                      </button>
                      <button
                        onClick={() => {
                          setShowTagInput(false);
                          setNewCustomTag('');
                        }}
                        className="px-4 py-2 bg-deep-sea-700 hover:bg-deep-sea-600 text-gray-300 rounded-lg text-sm"
                      >
                        取消
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {[...PRESET_TAGS, ...selectedLine.tags.filter((t) => !PRESET_TAGS.includes(t))].map(
                      (tag) => {
                        const isSelected = selectedLine.tags.includes(tag);
                        const isPreset = PRESET_TAGS.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => isPreset && handleToggleTag(tag)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                              isSelected
                                ? 'bg-purple-600 text-white'
                                : isPreset
                                ? 'bg-deep-sea-700 text-gray-400 hover:bg-deep-sea-600 hover:text-gray-300'
                                : 'bg-deep-sea-700 text-white'
                            }`}
                          >
                            {isPreset && <Tag className="w-3 h-3" />}
                            {tag}
                            {!isPreset && (
                              <X
                                className="w-3 h-3 hover:text-red-400"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleTag(tag);
                                }}
                              />
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-orange-400" />
                      分段水势 ({selectedLine.segments.length})
                    </h3>
                    {!editingSegment && (
                      <button
                        onClick={handleAddSegment}
                        className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        添加分段
                      </button>
                    )}
                  </div>

                  {editingSegment && (
                    <div className="mb-4 p-4 bg-deep-sea-800 rounded-lg border border-cyan-500/30">
                      <h4 className="text-sm font-medium text-white mb-3">
                        {editingSegment.id ? '编辑分段' : '添加分段'}
                      </h4>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">起始门号</label>
                          <input
                            type="number"
                            value={editingSegment.startGate}
                            onChange={(e) =>
                              setEditingSegment({
                                ...editingSegment,
                                startGate: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 bg-deep-sea-700 border border-deep-sea-600 rounded text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">结束门号</label>
                          <input
                            type="number"
                            value={editingSegment.endGate}
                            onChange={(e) =>
                              setEditingSegment({
                                ...editingSegment,
                                endGate: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 bg-deep-sea-700 border border-deep-sea-600 rounded text-sm text-white"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="text-xs text-gray-400 mb-1 block">分段描述</label>
                        <textarea
                          value={editingSegment.description}
                          onChange={(e) =>
                            setEditingSegment({
                              ...editingSegment,
                              description: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 bg-deep-sea-700 border border-deep-sea-600 rounded text-sm text-white resize-none"
                          rows={2}
                          placeholder="描述这个分段的水势特点和过线要点..."
                        />
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs text-gray-400">关键点坐标</label>
                          <button
                            onClick={handleAddKeyPoint}
                            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            添加关键点
                          </button>
                        </div>
                        {editingSegment.keyPoints.length === 0 ? (
                          <p className="text-xs text-gray-500">暂无关键点</p>
                        ) : (
                          <div className="space-y-2">
                            {editingSegment.keyPoints.map((kp, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 p-2 bg-deep-sea-900/50 rounded"
                              >
                                <GripVertical className="w-4 h-4 text-gray-500" />
                                <input
                                  type="number"
                                  value={kp.x}
                                  onChange={(e) =>
                                    handleUpdateKeyPoint(idx, 'x', Number(e.target.value))
                                  }
                                  className="w-16 px-2 py-1 bg-deep-sea-700 border border-deep-sea-600 rounded text-xs text-white"
                                  placeholder="X"
                                />
                                <input
                                  type="number"
                                  value={kp.y}
                                  onChange={(e) =>
                                    handleUpdateKeyPoint(idx, 'y', Number(e.target.value))
                                  }
                                  className="w-16 px-2 py-1 bg-deep-sea-700 border border-deep-sea-600 rounded text-xs text-white"
                                  placeholder="Y"
                                />
                                <input
                                  type="text"
                                  value={kp.note}
                                  onChange={(e) => handleUpdateKeyPoint(idx, 'note', e.target.value)}
                                  className="flex-1 px-2 py-1 bg-deep-sea-700 border border-deep-sea-600 rounded text-xs text-white"
                                  placeholder="备注"
                                />
                                <button
                                  onClick={() => handleDeleteKeyPoint(idx)}
                                  className="p-1 text-gray-400 hover:text-red-400"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveSegment}
                          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm"
                        >
                          <Check className="w-4 h-4" />
                          保存
                        </button>
                        <button
                          onClick={() => setEditingSegment(null)}
                          className="px-4 py-2 bg-deep-sea-700 hover:bg-deep-sea-600 text-gray-300 rounded-lg text-sm"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedLine.segments.length === 0 && !editingSegment ? (
                    <div className="p-8 text-center text-gray-500 bg-deep-sea-800/50 rounded-lg border border-deep-sea-700/50">
                      <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>暂无分段信息</p>
                      <p className="text-sm mt-1">点击"添加分段"来管理水势特征</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedLine.segments.map((segment) => {
                        const isAffected = riskAssessment?.affectedSegments.includes(segment.id);
                        return (
                          <div
                            key={segment.id}
                            className={`p-4 rounded-lg border transition-colors ${
                              isAffected
                                ? 'bg-yellow-500/5 border-yellow-500/30'
                                : 'bg-deep-sea-800 border-deep-sea-700/50 hover:border-deep-sea-600'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="text-white font-medium flex items-center gap-2">
                                  {isAffected && (
                                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                  )}
                                  第 {segment.startGate}-{segment.endGate} 门
                                </h4>
                                <p className="text-sm text-gray-400 mt-1">{segment.description}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleEditSegment(segment)}
                                  className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSegment(segment.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {segment.keyPoints.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs text-gray-500 mb-2">关键点</p>
                                <div className="flex flex-wrap gap-2">
                                  {segment.keyPoints.map((kp, idx) => (
                                    <div
                                      key={idx}
                                      className="px-2 py-1 bg-deep-sea-700/50 rounded text-xs text-gray-300"
                                    >
                                      ({Math.round(kp.x)}, {Math.round(kp.y)})
                                      {kp.note && ` - ${kp.note}`}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {segment.waterFeatures.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs text-gray-500 mb-2">关联水势特征</p>
                                <div className="flex flex-wrap gap-2">
                                  {segment.waterFeatures.map((feature, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs"
                                    >
                                      {feature}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <Weight className="w-5 h-5 text-green-400" />
                    配重建议
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1">
                        <User className="w-3 h-3" />
                        运动员
                      </label>
                      <select
                        value={selectedAthleteId}
                        onChange={(e) => setSelectedAthleteId(e.target.value)}
                        className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-700 rounded-lg text-sm text-white"
                      >
                        {athletes.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.weight}kg)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1">
                        <Ship className="w-3 h-3" />
                        艇型
                      </label>
                      <select
                        value={selectedBoatId}
                        onChange={(e) => setSelectedBoatId(e.target.value)}
                        className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-700 rounded-lg text-sm text-white"
                      >
                        {boats.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.model} ({b.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {weightRecommendation ? (
                    <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-1">总重量</p>
                          <p className="text-2xl font-bold text-white">
                            {weightRecommendation.totalWeight.toFixed(1)}
                            <span className="text-sm text-gray-400 ml-1">kg</span>
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-1">需增加配重</p>
                          <p
                            className={`text-2xl font-bold ${
                              weightRecommendation.additionalWeight > 0
                                ? 'text-yellow-400'
                                : 'text-green-400'
                            }`}
                          >
                            {weightRecommendation.additionalWeight}
                            <span className="text-sm text-gray-400 ml-1">kg</span>
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-1">吃水深度</p>
                          <p className="text-2xl font-bold text-cyan-400">
                            {weightRecommendation.draft}
                            <span className="text-sm text-gray-400 ml-1">cm</span>
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-1">重心位置</p>
                          <p className="text-2xl font-bold text-purple-400">
                            ({weightRecommendation.centerOfGravity.x.toFixed(0)},{' '}
                            {weightRecommendation.centerOfGravity.y.toFixed(0)})
                          </p>
                        </div>
                      </div>

                      {weightRecommendation.additionalWeight > 0 && (
                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
                          <p className="text-sm text-yellow-400 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            建议增加 {weightRecommendation.additionalWeight}kg 配重以达到理想吃水深度
                          </p>
                        </div>
                      )}

                      {weightRecommendation.additionalWeight === 0 && (
                        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded">
                          <p className="text-sm text-green-400 flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            当前配置已达到理想吃水深度，无需额外配重
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 bg-deep-sea-800/50 rounded-lg border border-deep-sea-700/50">
                      <Weight className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>选择运动员和艇型以获取配重建议</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-deep-sea-900 rounded-xl border border-deep-sea-700 p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">从训练记录创建线路</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">线路名称</label>
                <input
                  type="text"
                  value={newLineName}
                  onChange={(e) => setNewLineName(e.target.value)}
                  placeholder="输入线路名称..."
                  className="w-full px-4 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">选择训练记录</label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full px-4 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">请选择训练记录...</option>
                  {availableSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {getReachName(session.reachId)} - {formatTime(session.totalTime)} -{' '}
                      {new Date(session.date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                {availableSessions.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    暂无可用于创建的训练记录（所有训练记录都已关联线路）
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-deep-sea-700 hover:bg-deep-sea-600 text-gray-300 rounded-lg text-sm transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateLine}
                disabled={!newLineName.trim() || !selectedSessionId}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-deep-sea-700 disabled:text-gray-500 text-white rounded-lg text-sm transition-colors"
              >
                创建线路
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
