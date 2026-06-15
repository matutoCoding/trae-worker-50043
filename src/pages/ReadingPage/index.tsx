import { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReachCanvas from '@/components/Canvas/ReachCanvas';
import { useAppStore } from '@/store/useAppStore';
import { calculateWaterFeatures } from '@/engine/waterDynamics';
import type { WaterFeature, WaterFeatureType, DangerLevel, DangerZone, RiskType } from '@/types';
import { FEATURE_TYPE_LABELS, DANGER_LEVEL_COLORS, DANGER_LEVEL_LABELS } from '@/types';
import {
  MousePointer2,
  Waves,
  Droplets,
  RotateCcw,
  ArrowRight,
  Zap,
  Thermometer,
  AlertTriangle,
  Plus,
  Trash2,
  RefreshCw,
  Gauge,
  MapPin,
  Move,
  Eye,
  EyeOff,
} from 'lucide-react';

const FEATURE_ICONS: Record<WaterFeatureType, typeof Waves> = {
  wave: Waves,
  hole: Droplets,
  eddy: RotateCcw,
  current: ArrowRight,
  chute: Zap,
};

const RISK_TYPE_LABELS: Record<RiskType, string> = {
  capsize: '翻艇',
  pin: '卡艇',
  flush: '冲走',
  windowshade: '卷帘',
};

export default function ReadingPage() {
  const {
    currentReachId,
    currentFlowRate,
    selectedFeatureId,
    reaches,
    waterFeatures,
    dangerZones,
    setCurrentFlowRate,
    setSelectedFeatureId,
    addWaterFeature,
    updateWaterFeature,
    deleteWaterFeature,
    addDangerZone,
    updateDangerZone,
    deleteDangerZone,
    setWaterFeatures,
    setDangerZones,
    replaceWaterFeaturesAndDangers,
  } = useAppStore();

  const [tool, setTool] = useState<'select' | 'feature' | 'pan'>('select');
  const [featureType, setFeatureType] = useState<WaterFeatureType>('wave');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showDangerZones, setShowDangerZones] = useState(true);
  const [isAutoRecognizing, setIsAutoRecognizing] = useState(false);

  const currentReach = useMemo(
    () => reaches.find((r) => r.id === currentReachId) || null,
    [reaches, currentReachId]
  );

  const selectedFeature = useMemo(
    () => waterFeatures.find((f) => f.id === selectedFeatureId) || null,
    [waterFeatures, selectedFeatureId]
  );

  const selectedFeatureDanger = useMemo(
    () => dangerZones.find((d) => d.featureId === selectedFeatureId) || null,
    [dangerZones, selectedFeatureId]
  );

  const flowVelocity = useMemo(() => {
    if (!currentReach) return 3;
    const crossSectionArea = currentReach.width * 1.5;
    const gradient = currentReach.gradient;
    const hydraulicRadius = crossSectionArea / (2 * Math.sqrt(crossSectionArea / Math.PI) * 2);
    const shearVelocity = Math.sqrt(9.81 * hydraulicRadius * (gradient / 1000));
    const meanVelocity = (1 / 0.035) * Math.sqrt(9.81 * hydraulicRadius * (gradient / 1000));
    const directVelocity = currentFlowRate / crossSectionArea;
    return Math.max(meanVelocity, directVelocity) * 0.85;
  }, [currentReach, currentFlowRate]);

  const minFlow = currentReach ? currentReach.baseFlow * 0.3 : 5;
  const maxFlow = currentReach ? currentReach.baseFlow * 3 : 50;

  const handleAutoRecognize = useCallback(async () => {
    if (!currentReach || !currentReachId) return;

    setIsAutoRecognizing(true);
    try {
      const { features, dangers } = calculateWaterFeatures(currentReach, currentFlowRate);
      await replaceWaterFeaturesAndDangers(currentReachId, features, dangers);
      setSelectedFeatureId(null);
    } finally {
      setIsAutoRecognizing(false);
    }
  }, [currentReach, currentReachId, currentFlowRate, replaceWaterFeaturesAndDangers, setSelectedFeatureId]);

  const handleFeatureAdd = useCallback(
    async (feature: Omit<WaterFeature, 'id'>) => {
      const newFeature: WaterFeature = {
        ...feature,
        id: uuidv4(),
      };
      await addWaterFeature(newFeature);
      setSelectedFeatureId(newFeature.id);
    },
    [addWaterFeature, setSelectedFeatureId]
  );

  const handleFeatureSelect = useCallback(
    (feature: WaterFeature | null) => {
      setSelectedFeatureId(feature?.id || null);
    },
    [setSelectedFeatureId]
  );

  const handleFeatureUpdate = useCallback(
    async (updates: Partial<WaterFeature>) => {
      if (!selectedFeature) return;
      await updateWaterFeature({ ...selectedFeature, ...updates });
    },
    [selectedFeature, updateWaterFeature]
  );

  const handleFeatureDelete = useCallback(async () => {
    if (!selectedFeatureId) return;
    await deleteWaterFeature(selectedFeatureId);
    setSelectedFeatureId(null);
  }, [selectedFeatureId, deleteWaterFeature, setSelectedFeatureId]);

  const handleDangerUpdate = useCallback(
    async (updates: Partial<DangerZone>) => {
      if (!selectedFeature) return;

      if (selectedFeatureDanger) {
        await updateDangerZone({ ...selectedFeatureDanger, ...updates });
      } else {
        const newDanger: DangerZone = {
          id: uuidv4(),
          featureId: selectedFeature.id,
          level: 'medium',
          description: '',
          riskTypes: [],
          ...updates,
        };
        await addDangerZone(newDanger);
      }
    },
    [selectedFeature, selectedFeatureDanger, updateDangerZone, addDangerZone]
  );

  const handleDangerDelete = useCallback(async () => {
    if (!selectedFeatureDanger) return;
    await deleteDangerZone(selectedFeatureDanger.id);
  }, [selectedFeatureDanger, deleteDangerZone]);

  const handleFlowChange = useCallback(
    (value: number) => {
      setCurrentFlowRate(value);
    },
    [setCurrentFlowRate]
  );

  useEffect(() => {
    setSelectedFeatureId(null);
  }, [currentReachId, setSelectedFeatureId]);

  const featureTypeButtons: Array<{ type: WaterFeatureType; label: string; icon: typeof Waves }> = [
    { type: 'wave', label: '翻滚浪', icon: Waves },
    { type: 'hole', label: '浪洞', icon: Droplets },
    { type: 'eddy', label: '回流区', icon: RotateCcw },
    { type: 'current', label: '斜流', icon: ArrowRight },
    { type: 'chute', label: '激流槽', icon: Zap },
  ];

  const dangerLevelOptions: Array<{ level: DangerLevel; label: string; color: string }> = [
    { level: 'low', label: '低危', color: DANGER_LEVEL_COLORS.low },
    { level: 'medium', label: '中危', color: DANGER_LEVEL_COLORS.medium },
    { level: 'high', label: '高危', color: DANGER_LEVEL_COLORS.high },
    { level: 'extreme', label: '极高危', color: DANGER_LEVEL_COLORS.extreme },
  ];

  const riskTypeOptions: Array<{ type: RiskType; label: string }> = [
    { type: 'capsize', label: '翻艇' },
    { type: 'pin', label: '卡艇' },
    { type: 'flush', label: '冲走' },
    { type: 'windowshade', label: '卷帘' },
  ];

  return (
    <div className="flex flex-col h-full bg-deep-sea-950">
      <div className="flex items-center justify-between px-4 py-3 bg-deep-sea-900 border-b border-deep-sea-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTool('select')}
            className={`p-2 rounded-lg transition-all ${
              tool === 'select'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-deep-sea-700'
            }`}
            title="选择工具"
          >
            <MousePointer2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTool('pan')}
            className={`p-2 rounded-lg transition-all ${
              tool === 'pan'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-deep-sea-700'
            }`}
            title="平移工具"
          >
            <Move className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-deep-sea-700 mx-2" />
          <button
            onClick={() => setTool('feature')}
            className={`p-2 rounded-lg transition-all ${
              tool === 'feature'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-deep-sea-700'
            }`}
            title="添加水势特征"
          >
            <Plus className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1 ml-2">
            {featureTypeButtons.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => {
                  setFeatureType(type);
                  setTool('feature');
                }}
                className={`p-2 rounded-lg transition-all ${
                  featureType === type && tool === 'feature'
                    ? 'bg-deep-sea-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-deep-sea-800'
                }`}
                title={label}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              showHeatmap
                ? 'bg-deep-sea-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-deep-sea-800'
            }`}
          >
            <Thermometer className="w-4 h-4" />
            <span className="text-sm">流速热力图</span>
            {showHeatmap ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowDangerZones(!showDangerZones)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              showDangerZones
                ? 'bg-deep-sea-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-deep-sea-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">危险区</span>
            {showDangerZones ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <div className="w-px h-6 bg-deep-sea-700 mx-2" />
          <button
            onClick={handleAutoRecognize}
            disabled={isAutoRecognizing || !currentReach}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isAutoRecognizing ? 'animate-spin' : ''}`} />
            <span className="text-sm">自动识别</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          {currentReach ? (
            <ReachCanvas
              reach={currentReach}
              features={waterFeatures}
              dangers={showDangerZones ? dangerZones : []}
              showHeatmap={showHeatmap}
              showFlowArrows={true}
              editable={true}
              tool={tool}
              featureType={featureType}
              onFeatureAdd={handleFeatureAdd}
              onFeatureSelect={handleFeatureSelect}
              selectedFeatureId={selectedFeatureId}
              flowVelocity={flowVelocity}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>请先选择一个河段</p>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 bg-deep-sea-900 border-l border-deep-sea-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-deep-sea-700">
            <h2 className="text-lg font-semibold text-white">水势属性</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedFeature ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = FEATURE_ICONS[selectedFeature.type];
                      return <Icon className="w-5 h-5 text-blue-400" />;
                    })()}
                    <span className="text-white font-medium">
                      {FEATURE_TYPE_LABELS[selectedFeature.type]}
                    </span>
                  </div>
                  <button
                    onClick={handleFeatureDelete}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-all"
                    title="删除特征"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">类型</label>
                    <select
                      value={selectedFeature.type}
                      onChange={(e) => handleFeatureUpdate({ type: e.target.value as WaterFeatureType })}
                      className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      {featureTypeButtons.map(({ type, label }) => (
                        <option key={type} value={type}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">X 坐标</label>
                      <input
                        type="number"
                        value={Math.round(selectedFeature.x)}
                        onChange={(e) => handleFeatureUpdate({ x: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Y 坐标</label>
                      <input
                        type="number"
                        value={Math.round(selectedFeature.y)}
                        onChange={(e) => handleFeatureUpdate({ y: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">宽度</label>
                    <input
                      type="number"
                      value={Math.round(selectedFeature.width)}
                      onChange={(e) => handleFeatureUpdate({ width: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      强度 ({selectedFeature.intensity}/5)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={selectedFeature.intensity}
                      onChange={(e) =>
                        handleFeatureUpdate({ intensity: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>弱</span>
                      <span>强</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      流速: {selectedFeature.flowSpeed.toFixed(1)} m/s
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.1"
                      value={selectedFeature.flowSpeed}
                      onChange={(e) => handleFeatureUpdate({ flowSpeed: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      方向: {selectedFeature.direction}°
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={selectedFeature.direction}
                      onChange={(e) => handleFeatureUpdate({ direction: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">适用流量范围</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="number"
                          value={selectedFeature.flowRange[0]}
                          onChange={(e) =>
                            handleFeatureUpdate({
                              flowRange: [Number(e.target.value), selectedFeature.flowRange[1]],
                            })
                          }
                          className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
                          placeholder="最小"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={selectedFeature.flowRange[1]}
                          onChange={(e) =>
                            handleFeatureUpdate({
                              flowRange: [selectedFeature.flowRange[0], Number(e.target.value)],
                            })
                          }
                          className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
                          placeholder="最大"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-deep-sea-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-white">危险等级</h3>
                    {selectedFeatureDanger && (
                      <button
                        onClick={handleDangerDelete}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        移除标注
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {dangerLevelOptions.map(({ level, label, color }) => (
                      <button
                        key={level}
                        onClick={() => handleDangerUpdate({ level })}
                        className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                          selectedFeatureDanger?.level === level
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-deep-sea-900'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {selectedFeatureDanger && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">风险类型</label>
                        <div className="flex flex-wrap gap-2">
                          {riskTypeOptions.map(({ type, label }) => (
                            <button
                              key={type}
                              onClick={() => {
                                const currentTypes = selectedFeatureDanger.riskTypes;
                                const newTypes = currentTypes.includes(type)
                                  ? currentTypes.filter((t) => t !== type)
                                  : [...currentTypes, type];
                                handleDangerUpdate({ riskTypes: newTypes });
                              }}
                              className={`px-2 py-1 rounded text-xs transition-all ${
                                selectedFeatureDanger.riskTypes.includes(type)
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-deep-sea-700 text-gray-400 hover:bg-deep-sea-600'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">描述</label>
                        <textarea
                          value={selectedFeatureDanger.description}
                          onChange={(e) => handleDangerUpdate({ description: e.target.value })}
                          className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-600 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
                          rows={3}
                          placeholder="输入危险描述..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <MousePointer2 className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm">选择一个水势特征查看属性</p>
                <p className="text-xs text-gray-600 mt-2">
                  或使用工具栏添加新的特征
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-deep-sea-900 border-t border-deep-sea-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-300">流量</span>
          </div>
          <div className="flex-1">
            <input
              type="range"
              min={minFlow}
              max={maxFlow}
              step={0.5}
              value={currentFlowRate}
              onChange={(e) => handleFlowChange(Number(e.target.value))}
              className="w-full h-2 bg-deep-sea-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          <div className="flex items-center gap-2 min-w-[120px]">
            <input
              type="number"
              min={minFlow}
              max={maxFlow}
              step={0.5}
              value={currentFlowRate}
              onChange={(e) => handleFlowChange(Number(e.target.value))}
              className="w-20 px-3 py-1.5 bg-deep-sea-800 border border-deep-sea-600 rounded-lg text-white text-center focus:outline-none focus:border-blue-500"
            />
            <span className="text-sm text-gray-400">m³/s</span>
          </div>
          <div className="text-sm text-gray-500">
            基准流量: {currentReach?.baseFlow || '--'} m³/s
          </div>
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              currentFlowRate < (currentReach?.baseFlow || 0) * 0.6
                ? 'bg-yellow-900/50 text-yellow-400'
                : currentFlowRate > (currentReach?.baseFlow || 0) * 1.5
                  ? 'bg-red-900/50 text-red-400'
                  : 'bg-green-900/50 text-green-400'
            }`}
          >
            {currentFlowRate < (currentReach?.baseFlow || 0) * 0.6
              ? '低水位'
              : currentFlowRate > (currentReach?.baseFlow || 0) * 1.5
                ? '高水位'
                : '正常水位'}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
          <span>{minFlow.toFixed(1)}</span>
          <span>{((minFlow + maxFlow) / 2).toFixed(1)}</span>
          <span>{maxFlow.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
