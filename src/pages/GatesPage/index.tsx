import { useState, useMemo, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Trash2, GripVertical, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Zap, Target, Waves, ArrowRightLeft, Activity } from 'lucide-react';
import ReachCanvas from '@/components/Canvas/ReachCanvas';
import { useAppStore } from '@/store/useAppStore';
import type { Gate, GateType } from '@/types';
import { GATE_TYPE_LABELS } from '@/types';
import {
  calculateGateStrategy,
  calculateEnergyLossBetweenGates,
  calculateFlowVelocity,
} from '@/engine/waterDynamics';

const ENERGY_LOSS_THRESHOLD = 0.6;
const BOAT_MASS = 80;

interface DragState {
  isDragging: boolean;
  dragIndex: number | null;
  dragOverIndex: number | null;
}

interface EnergyWarning {
  gateId: string;
  loss: number;
  warning: string | null;
}

export default function GatesPage() {
  const {
    currentReachId,
    currentGateConfigId,
    currentFlowRate,
    selectedGateId,
    setSelectedGateId,
    reaches,
    waterFeatures,
    gateConfigs,
    updateGateConfig,
  } = useAppStore();

  const [tool, setTool] = useState<'select' | 'gate' | 'pan'>('select');
  const [gateTypeToAdd, setGateTypeToAdd] = useState<GateType>('downstream');
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragIndex: null,
    dragOverIndex: null,
  });
  const [expandedGateId, setExpandedGateId] = useState<string | null>(null);
  const [energyWarnings, setEnergyWarnings] = useState<EnergyWarning[]>([]);

  const currentReach = useMemo(
    () => reaches.find((r) => r.id === currentReachId) || null,
    [reaches, currentReachId]
  );

  const currentGateConfig = useMemo(
    () => gateConfigs.find((c) => c.id === currentGateConfigId) || null,
    [gateConfigs, currentGateConfigId]
  );

  const gates = useMemo(
    () => currentGateConfig?.gates || [],
    [currentGateConfig]
  );

  const selectedGate = useMemo(
    () => gates.find((g) => g.id === selectedGateId) || null,
    [gates, selectedGateId]
  );

  const flowVelocity = useMemo(() => {
    if (!currentReach) return 3;
    const crossSectionArea = currentReach.width * 1.5;
    return calculateFlowVelocity(currentFlowRate, crossSectionArea, currentReach.gradient);
  }, [currentReach, currentFlowRate]);

  const sortedGates = useMemo(
    () => [...gates].sort((a, b) => a.number - b.number),
    [gates]
  );

  useEffect(() => {
    const warnings: EnergyWarning[] = [];
    
    for (let i = 1; i < sortedGates.length; i++) {
      const prevGate = sortedGates[i - 1];
      const currentGate = sortedGates[i];
      
      const result = calculateEnergyLossBetweenGates(
        prevGate,
        currentGate,
        BOAT_MASS,
        flowVelocity,
        flowVelocity
      );

      if (currentGate.energyLoss > ENERGY_LOSS_THRESHOLD || result.loss > 15) {
        warnings.push({
          gateId: currentGate.id,
          loss: Math.max(currentGate.energyLoss, result.loss / 100),
          warning: result.warning,
        });
      }
    }
    
    setEnergyWarnings(warnings);
  }, [sortedGates, flowVelocity]);

  const recalculateAllGates = useCallback(() => {
    if (!currentGateConfig || !currentReach) return;

    const recalculatedGates = sortedGates.map((gate, index) => {
      const prevGate = index > 0 ? sortedGates[index - 1] : null;
      return calculateGateStrategy(
        {
          id: gate.id,
          number: gate.number,
          type: gate.type,
          x: gate.x,
          y: gate.y,
          angle: gate.angle,
        },
        prevGate,
        waterFeatures,
        flowVelocity
      ) as Gate;
    });

    updateGateConfig({
      ...currentGateConfig,
      gates: recalculatedGates,
      updatedAt: Date.now(),
    });
  }, [currentGateConfig, currentReach, sortedGates, waterFeatures, flowVelocity, updateGateConfig]);

  const handleGateAdd = useCallback(
    (gateData: Omit<Gate, 'id' | 'entryAngle' | 'exitDirection' | 'strokeRhythm' | 'driftOffset' | 'energyLoss' | 'switchPoint'>) => {
      if (!currentGateConfig || !currentReach) return;

      const prevGate = sortedGates.length > 0 ? sortedGates[sortedGates.length - 1] : null;
      
      const newGate = calculateGateStrategy(
        {
          ...gateData,
          id: uuidv4(),
        },
        prevGate,
        waterFeatures,
        flowVelocity
      ) as Gate;

      updateGateConfig({
        ...currentGateConfig,
        gates: [...currentGateConfig.gates, newGate],
        updatedAt: Date.now(),
      });
    },
    [currentGateConfig, currentReach, sortedGates, waterFeatures, flowVelocity, updateGateConfig]
  );

  const handleGateMove = useCallback(
    (updatedGate: Gate) => {
      if (!currentGateConfig || !currentReach) return;

      const updatedGates = currentGateConfig.gates.map((g) =>
        g.id === updatedGate.id ? updatedGate : g
      );

      const gateIndex = sortedGates.findIndex((g) => g.id === updatedGate.id);
      const prevGate = gateIndex > 0 ? sortedGates[gateIndex - 1] : null;

      const recalculatedGate = calculateGateStrategy(
        {
          id: updatedGate.id,
          number: updatedGate.number,
          type: updatedGate.type,
          x: updatedGate.x,
          y: updatedGate.y,
          angle: updatedGate.angle,
        },
        prevGate,
        waterFeatures,
        flowVelocity
      ) as Gate;

      const finalGates = updatedGates.map((g) =>
        g.id === updatedGate.id ? recalculatedGate : g
      );

      updateGateConfig({
        ...currentGateConfig,
        gates: finalGates,
        updatedAt: Date.now(),
      });
    },
    [currentGateConfig, currentReach, sortedGates, waterFeatures, flowVelocity, updateGateConfig]
  );

  const handleGateSelect = useCallback(
    (gate: Gate | null) => {
      setSelectedGateId(gate?.id || null);
      if (gate) {
        setExpandedGateId(gate.id);
      }
    },
    [setSelectedGateId]
  );

  const handleGateDelete = useCallback(
    (gateId: string) => {
      if (!currentGateConfig) return;

      const gateToDelete = currentGateConfig.gates.find((g) => g.id === gateId);
      if (!gateToDelete) return;

      const remainingGates = currentGateConfig.gates
        .filter((g) => g.id !== gateId)
        .map((g) => {
          if (g.number > gateToDelete.number) {
            return { ...g, number: g.number - 1 };
          }
          return g;
        });

      updateGateConfig({
        ...currentGateConfig,
        gates: remainingGates,
        updatedAt: Date.now(),
      });

      if (selectedGateId === gateId) {
        setSelectedGateId(null);
        setExpandedGateId(null);
      }
    },
    [currentGateConfig, selectedGateId, setSelectedGateId, updateGateConfig]
  );

  const handleGateTypeChange = useCallback(
    (gateId: string, newType: GateType) => {
      if (!currentGateConfig || !currentReach) return;

      const updatedGates = currentGateConfig.gates.map((g) => {
        if (g.id === gateId) {
          const gateIndex = sortedGates.findIndex((sg) => sg.id === gateId);
          const prevGate = gateIndex > 0 ? sortedGates[gateIndex - 1] : null;

          return calculateGateStrategy(
            {
              id: g.id,
              number: g.number,
              type: newType,
              x: g.x,
              y: g.y,
              angle: g.angle,
            },
            prevGate,
            waterFeatures,
            flowVelocity
          ) as Gate;
        }
        return g;
      });

      updateGateConfig({
        ...currentGateConfig,
        gates: updatedGates,
        updatedAt: Date.now(),
      });
    },
    [currentGateConfig, currentReach, sortedGates, waterFeatures, flowVelocity, updateGateConfig]
  );

  const handleDragStart = (index: number) => {
    setDragState({
      isDragging: true,
      dragIndex: index,
      dragOverIndex: null,
    });
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragState.dragIndex !== index) {
      setDragState((prev) => ({ ...prev, dragOverIndex: index });
    }
  };

  const handleDragEnd = () => {
    if (
      dragState.dragIndex !== null &&
      dragState.dragOverIndex !== null &&
      dragState.dragIndex !== dragState.dragOverIndex &&
      currentGateConfig
    ) {
      const newGates = [...sortedGates];
      const [removed] = newGates.splice(dragState.dragIndex, 1);
      newGates.splice(dragState.dragOverIndex, 0, removed);

      const renumberedGates = newGates.map((g, idx) => ({
        ...g,
        number: idx + 1,
      }));

      const recalculatedGates = renumberedGates.map((gate, index) => {
        const prevGate = index > 0 ? renumberedGates[index - 1] : null;
        return calculateGateStrategy(
          {
            id: gate.id,
            number: gate.number,
            type: gate.type,
            x: gate.x,
            y: gate.y,
            angle: gate.angle,
          },
          prevGate,
          waterFeatures,
          flowVelocity
        ) as Gate;
      });

      updateGateConfig({
        ...currentGateConfig,
        gates: recalculatedGates,
        updatedAt: Date.now(),
      });
    }

    setDragState({
      isDragging: false,
      dragIndex: null,
      dragOverIndex: null,
    });
  };

  const getEnergyLossColor = (loss: number) => {
    if (loss < 0.3) return 'bg-green-500';
    if (loss < 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getEnergyLossBg = (loss: number) => {
    if (loss < 0.3) return 'from-green-500/20 to-green-600/20';
    if (loss < 0.6) return 'from-yellow-500/20 to-yellow-600/20';
    return 'from-red-500/20 to-red-600/20';
  };

  const hasHighEnergyWarning = (gateId: string) => {
    return energyWarnings.some((w) => w.gateId === gateId);
  };

  const getGateWarning = (gateId: string) => {
    return energyWarnings.find((w) => w.gateId === gateId);
  };

  return (
    <div className="h-full flex flex-col bg-deep-sea-950">
      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 flex flex-col bg-deep-sea-900 border-r border-deep-sea-700/50">
          <div className="p-4 border-b border-deep-sea-700/50">
            <h2 className="text-lg font-semibold text-white mb-4">门位编排</h2>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTool('select')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  tool === 'select'
                    ? 'bg-deep-sea-600 text-white'
                    : 'bg-deep-sea-800 text-gray-400 hover:bg-deep-sea-700 hover:text-gray-300'
                }`}
              >
                选择
              </button>
              <button
                onClick={() => setTool('gate')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  tool === 'gate'
                    ? 'bg-deep-sea-600 text-white'
                    : 'bg-deep-sea-800 text-gray-400 hover:bg-deep-sea-700 hover:text-gray-300'
                }`}
              >
                添加门
              </button>
              <button
                onClick={() => setTool('pan')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  tool === 'pan'
                    ? 'bg-deep-sea-600 text-white'
                    : 'bg-deep-sea-800 text-gray-400 hover:bg-deep-sea-700 hover:text-gray-300'
                }`}
              >
                平移
              </button>
            </div>

            {tool === 'gate' && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setGateTypeToAdd('downstream')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    gateTypeToAdd === 'downstream'
                      ? 'bg-red-600 text-white'
                      : 'bg-deep-sea-800 text-gray-400 hover:bg-deep-sea-700 hover:text-gray-300'
                  }`}
                >
                  顺水门
                </button>
                <button
                  onClick={() => setGateTypeToAdd('upstream')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    gateTypeToAdd === 'upstream'
                      ? 'bg-green-600 text-white'
                      : 'bg-deep-sea-800 text-gray-400 hover:bg-deep-sea-700 hover:text-gray-300'
                  }`}
                >
                  逆水门
                </button>
              </div>
            )}

            <button
              onClick={recalculateAllGates}
              disabled={gates.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-deep-sea-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重新计算所有策略
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sortedGates.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无门位</p>
              <p className="text-sm mt-1">点击"添加门"后在画布上放置</p>
            </div>
          ) : (
            <div className="p-2">
              {sortedGates.map((gate, index) => {
                const warning = getGateWarning(gate.id);
                const isExpanded = expandedGateId === gate.id;
                const isSelected = selectedGateId === gate.id;
                const isDragging = dragState.dragIndex === index;
                const isDragOver = dragState.dragOverIndex === index;

                return (
                  <div
                    key={gate.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`mb-2 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-deep-sea-700 border-orange-500'
                        : 'bg-deep-sea-800 border-deep-sea-700/50 hover:bg-deep-sea-750'
                    } ${isDragging ? 'opacity-50' : ''} ${
                      isDragOver ? 'border-orange-400 border-dashed' : ''}`}
                  >
                    <div
                      className="flex items-center gap-2 p-3 cursor-pointer"
                      onClick={() => handleGateSelect(gate)}
                    >
                      <div className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          gate.type === 'upstream'
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {gate.number}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {GATE_TYPE_LABELS[gate.type]}
                        </div>
                        <div className="text-xs text-gray-400">
                          位置: ({Math.round(gate.x)}, {Math.round(gate.y)})
                        </div>
                      </div>

                      {hasHighEnergyWarning(gate.id) && (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedGateId(isExpanded ? null : gate.id);
                        }}
                        className="p-1 text-gray-400 hover:text-white"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGateDelete(gate.id);
                        }}
                        className="p-1 text-gray-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0">
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">类型</label>
                            <select
                              value={gate.type}
                              onChange={(e) =>
                                handleGateTypeChange(gate.id, e.target.value as GateType)
                              }
                              className="w-full px-2 py-1.5 bg-deep-sea-700 border border-deep-sea-600 rounded text-sm text-white"
                            >
                              <option value="downstream">顺水门</option>
                              <option value="upstream">逆水门</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">角度</label>
                            <input
                              type="number"
                              value={gate.angle}
                              onChange={(e) => {
                                const newAngle = Number(e.target.value);
                                handleGateMove({ ...gate, angle: newAngle });
                              }}
                              className="w-full px-2 py-1.5 bg-deep-sea-700 border border-deep-sea-600 rounded text-sm text-white"
                            />
                          </div>
                        </div>

                        <div className={`p-2 bg-deep-sea-900/50 rounded">
                          <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-400">能量损耗</span>
                          <span
                            className={`font-medium ${
                              gate.energyLoss > ENERGY_LOSS_THRESHOLD
                                ? 'text-red-400'
                                : gate.energyLoss > 0.3
                                ? 'text-yellow-400'
                                : 'text-green-400'
                            }`}
                          >
                            {(gate.energyLoss * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-deep-sea-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getEnergyLossColor(gate.energyLoss)} transition-all`}
                            style={{ width: `${Math.min(100, gate.energyLoss * 100)}%` }}
                          />
                        </div>
                      </div>

                      {warning?.warning && (
                        <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                          <p className="text-xs text-yellow-400">{warning.warning}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>

    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-12 bg-deep-sea-900 border-b border-deep-sea-700/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            门位数量: <span className="text-white font-medium">{gates.length}</span>
          </span>
          <span className="text-sm text-gray-400">
            当前流量: <span className="text-white font-medium">{currentFlowRate} m³/s</span>
          </span>
          <span className="text-sm text-gray-400">
            流速: <span className="text-white font-medium">{flowVelocity.toFixed(2)} m/s</span>
          </span>
        </div>
        {energyWarnings.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-yellow-400">
              {energyWarnings.length} 个能量损耗警告
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 relative">
        <ReachCanvas
          reach={currentReach}
          features={waterFeatures}
          gates={sortedGates}
          editable={true}
          onGateAdd={handleGateAdd}
          onGateMove={handleGateMove}
          onGateSelect={handleGateSelect}
          selectedGateId={selectedGateId}
          flowVelocity={flowVelocity}
          tool={tool}
          gateType={gateTypeToAdd}
          showLinePath={true}
          showFlowArrows={true}
        />
      </div>
    </div>

    <div className="w-96 flex flex-col bg-deep-sea-900 border-l border-deep-sea-700/50 overflow-y-auto">
      <div className="p-4 border-b border-deep-sea-700/50">
        <h2 className="text-lg font-semibold text-white">计算结果</h2>
      </div>

      {!selectedGate ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>选择一个门位查看详细计算结果</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className={`p-4 rounded-lg bg-gradient-to-br ${getEnergyLossBg(selectedGate.energyLoss)} border border-deep-sea-700/50`}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                  selectedGate.type === 'upstream'
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                }`}
              >
                {selectedGate.number}
              </div>
              <div>
                <h3 className="text-white font-semibold">
                  第 {selectedGate.number} 道 - {GATE_TYPE_LABELS[selectedGate.type]}
                </h3>
                <p className="text-sm text-gray-400">
                  位置: ({Math.round(selectedGate.x)}, {Math.round(selectedGate.y)})
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">能量损耗系数</span>
                <span
                  className={`font-semibold ${
                    selectedGate.energyLoss > ENERGY_LOSS_THRESHOLD
                      ? 'text-red-400'
                      : selectedGate.energyLoss > 0.3
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }`}
                >
                  {(selectedGate.energyLoss * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-deep-sea-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getEnergyLossColor(selectedGate.energyLoss)} transition-all`}
                  style={{ width: `${Math.min(100, selectedGate.energyLoss * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>低</span>
                <span>中</span>
                <span>高</span>
              </div>
            </div>
          </div>

          {getGateWarning(selectedGate.id)?.warning && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-400">
                {getGateWarning(selectedGate.id)?.warning}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-deep-sea-800 rounded-lg border border-deep-sea-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400">进门角度</span>
              </div>
              <p className="text-xl font-bold text-white">
                {selectedGate.entryAngle.toFixed(1)}°
              </p>
            </div>

            <div className="p-3 bg-deep-sea-800 rounded-lg border border-deep-sea-700/50">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRightLeft className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-400">出门方向</span>
              </div>
              <p className="text-xl font-bold text-white">
                {selectedGate.exitDirection.toFixed(1)}°
              </p>
            </div>

            <div className="p-3 bg-deep-sea-800 rounded-lg border border-deep-sea-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Waves className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-gray-400">划水节奏</span>
              </div>
              <p className="text-xl font-bold text-white">
                {selectedGate.strokeRhythm.strokes} 桨
              </p>
              <p className="text-xs text-gray-400">
                {selectedGate.strokeRhythm.cadence} 桨/分钟
              </p>
            </div>

            <div className="p-3 bg-deep-sea-800 rounded-lg border border-deep-sea-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-gray-400">横推偏移</span>
              </div>
              <p className="text-xl font-bold text-white">
                {selectedGate.driftOffset.lateral.toFixed(1)} m
              </p>
              <p className="text-xs text-gray-400">
                提前量: {selectedGate.driftOffset.leadRequired.toFixed(1)} m
              </p>
            </div>
          </div>

          {selectedGate.switchPoint && (
            <div className="p-4 bg-deep-sea-800 rounded-lg border border-deep-sea-700/50">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-white">
                  最优切换点
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    selectedGate.switchPoint.type === 'backward'
                      ? 'bg-purple-600'
                      : selectedGate.switchPoint.type === 'support'
                      ? 'bg-cyan-600'
                      : 'bg-green-600'
                  }`}
                >
                  {selectedGate.switchPoint.type === 'backward'
                    ? '倒'
                    : selectedGate.switchPoint.type === 'support'
                    ? '支'
                    : '正'}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {selectedGate.switchPoint.type === 'backward'
                      ? '倒桨支撑'
                      : selectedGate.switchPoint.type === 'support'
                      ? '支撑划'
                      : '正划'}
                  </p>
                  <p className="text-xs text-gray-400">
                    位置: ({Math.round(selectedGate.switchPoint.position.x)},{' '}
                    {Math.round(selectedGate.switchPoint.position.y)})
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 bg-deep-sea-800 rounded-lg border border-deep-sea-700/50">
            <h4 className="text-sm font-medium text-white mb-3">路线参数</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">门位角度</span>
                <span className="text-white">{selectedGate.angle.toFixed(1)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">X 坐标</span>
                <span className="text-white">{selectedGate.x.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Y 坐标</span>
                <span className="text-white">{selectedGate.y.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">门类型</span>
                <span className="text-white">
                  {GATE_TYPE_LABELS[selectedGate.type]}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {sortedGates.length >= 2 && (
        <div className="p-4 border-t border-deep-sea-700/50">
          <h3 className="text-sm font-medium text-white mb-3">全段统计</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">总门数</span>
              <span className="text-white">{sortedGates.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">顺水门</span>
              <span className="text-red-400">
                {sortedGates.filter((g) => g.type === 'downstream').length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">逆水门</span>
              <span className="text-green-400">
                {sortedGates.filter((g) => g.type === 'upstream').length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">平均能量损耗</span>
              <span
                className={`font-medium ${
                  sortedGates.reduce((sum, g) => sum + g.energyLoss, 0) /
                    sortedGates.length >
                  ENERGY_LOSS_THRESHOLD
                    ? 'text-red-400'
                    : 'text-green-400'
                }`}
              >
                {(
                  (sortedGates.reduce((sum, g) => sum + g.energyLoss, 0) /
                  sortedGates.length *
                  100
                ).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">总桨数估算</span>
              <span className="text-white">
                {sortedGates.reduce((sum, g) => sum + g.strokeRhythm.strokes, 0)} 桨
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">能量警告数</span>
              <span className={energyWarnings.length > 0 ? 'text-yellow-400' : 'text-green-400'}>
                {energyWarnings.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
</div>
  );
}
