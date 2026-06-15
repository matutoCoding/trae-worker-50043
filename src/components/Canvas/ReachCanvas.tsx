import { useEffect, useRef, useCallback, useState } from 'react';
import type { Reach, Rock, WaterFeature, Gate, DangerZone } from '../../types';
import { DANGER_LEVEL_COLORS, FEATURE_TYPE_LABELS } from '../../types';
import { generateHeatmapData } from '../../engine/waterDynamics';

interface ReachCanvasProps {
  reach: Reach | null;
  features?: WaterFeature[];
  gates?: Gate[];
  dangers?: DangerZone[];
  showHeatmap?: boolean;
  showFlowArrows?: boolean;
  editable?: boolean;
  onRockAdd?: (rock: Omit<Rock, 'id'>) => void;
  onRockMove?: (rock: Rock) => void;
  onRockSelect?: (rock: Rock | null) => void;
  onGateAdd?: (gate: Omit<Gate, 'id' | 'entryAngle' | 'exitDirection' | 'strokeRhythm' | 'driftOffset' | 'energyLoss' | 'switchPoint'>) => void;
  onGateMove?: (gate: Gate) => void;
  onGateSelect?: (gate: Gate | null) => void;
  onFeatureAdd?: (feature: Omit<WaterFeature, 'id'>) => void;
  onFeatureSelect?: (feature: WaterFeature | null) => void;
  selectedRockId?: string | null;
  selectedGateId?: string | null;
  selectedFeatureId?: string | null;
  flowVelocity?: number;
  tool?: 'select' | 'rock' | 'gate' | 'feature' | 'pan';
  rockShape?: Rock['shape'];
  gateType?: Gate['type'];
  featureType?: WaterFeature['type'];
  mistakes?: Array<{ position: { x: number; y: number }; type: string; severity: number }>;
  showLinePath?: boolean;
}

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;

export default function ReachCanvas({
  reach,
  features = [],
  gates = [],
  dangers = [],
  showHeatmap = false,
  showFlowArrows = true,
  editable = false,
  onRockAdd,
  onRockMove,
  onRockSelect,
  onGateAdd,
  onGateMove,
  onGateSelect,
  onFeatureAdd,
  onFeatureSelect,
  selectedRockId,
  selectedGateId,
  selectedFeatureId,
  flowVelocity = 3,
  tool = 'select',
  rockShape = 'round',
  gateType = 'downstream',
  featureType = 'wave',
  mistakes = [],
  showLinePath = false,
}: ReachCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedItem, setDraggedItem] = useState<{ type: 'rock' | 'gate'; id: string } | null>(null);

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offset.x) / scale,
      y: (clientY - rect.top - offset.y) / scale,
    };
  }, [offset, scale]);

  const drawHeatmap = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!showHeatmap || features.length === 0) return;

    const heatmapData = generateHeatmapData(CANVAS_WIDTH, CANVAS_HEIGHT, features, flowVelocity);
    const maxVelocity = Math.max(...heatmapData.flat(), flowVelocity * 1.5);
    const cellSize = 20;

    heatmapData.forEach((row, y) => {
      row.forEach((velocity, x) => {
        const intensity = Math.min(1, velocity / maxVelocity);
        const hue = 200 - intensity * 180;
        ctx.fillStyle = `hsla(${hue}, 80%, 50%, ${0.3 + intensity * 0.3})`;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      });
    });
  }, [showHeatmap, features, flowVelocity]);

  const drawRiver = useCallback((ctx: CanvasRenderingContext2D) => {
    const riverGradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
    riverGradient.addColorStop(0, '#0c4a6e');
    riverGradient.addColorStop(0.3, '#0369a1');
    riverGradient.addColorStop(0.5, '#0284c7');
    riverGradient.addColorStop(0.7, '#0369a1');
    riverGradient.addColorStop(1, '#0c4a6e');

    ctx.fillStyle = riverGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let i = 0; i < 20; i++) {
      const x = (i / 20) * CANVAS_WIDTH;
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.1 + Math.random() * 0.15})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y < CANVAS_HEIGHT; y += 10) {
        ctx.lineTo(x + Math.sin(y * 0.02 + i) * 15, y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= CANVAS_WIDTH; x += 50) {
      ctx.lineTo(x, 30 + Math.sin(x * 0.01) * 15);
    }
    ctx.lineTo(CANVAS_WIDTH, 0);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT);
    for (let x = 0; x <= CANVAS_WIDTH; x += 50) {
      ctx.lineTo(x, CANVAS_HEIGHT - 30 + Math.sin(x * 0.015) * 15);
    }
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }, []);

  const drawRock = useCallback((ctx: CanvasRenderingContext2D, rock: Rock, isSelected: boolean) => {
    const { x, y, radius, shape, height } = rock;

    ctx.save();
    ctx.translate(x, y);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    if (shape === 'submerged') {
      gradient.addColorStop(0, 'rgba(100, 116, 139, 0.6)');
      gradient.addColorStop(1, 'rgba(71, 85, 105, 0.4)');
    } else {
      gradient.addColorStop(0, '#78716c');
      gradient.addColorStop(0.7, '#57534e');
      gradient.addColorStop(1, '#44403c');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    if (shape === 'round') {
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
    } else if (shape === 'sharp') {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const r = radius * (0.8 + Math.sin(i * 2.5) * 0.3);
        if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
    } else if (shape === 'flat') {
      ctx.ellipse(0, 0, radius, radius * 0.6, 0, 0, Math.PI * 2);
    } else {
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
    }
    ctx.fill();

    if (shape !== 'submerged' && height > 0) {
      ctx.fillStyle = '#a8a29e';
      ctx.beginPath();
      ctx.arc(-radius * 0.2, -radius * 0.2, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isSelected) {
      ctx.strokeStyle = '#ff6B35';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, []);

  const drawFeature = useCallback((ctx: CanvasRenderingContext2D, feature: WaterFeature, isSelected: boolean, danger?: DangerZone) => {
    const { x, y, width, type, intensity, direction } = feature;

    ctx.save();
    ctx.translate(x, y);

    if (type === 'wave') {
      const waveColor = `rgba(56, 189, 248, ${0.3 + intensity * 0.1})`;
      ctx.fillStyle = waveColor;
      ctx.beginPath();
      for (let i = 0; i <= width; i += 5) {
        const waveY = Math.sin(i * 0.1) * (10 + intensity * 3);
        if (i === 0) ctx.moveTo(i - width / 2, waveY);
        else ctx.lineTo(i - width / 2, waveY);
      }
      ctx.lineTo(width / 2, 20);
      ctx.lineTo(-width / 2, 20);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= width; i += 5) {
        const waveY = Math.sin(i * 0.1) * (10 + intensity * 3);
        if (i === 0) ctx.moveTo(i - width / 2, waveY);
        else ctx.lineTo(i - width / 2, waveY);
      }
      ctx.stroke();
    } else if (type === 'hole') {
      const holeGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, width / 2);
      holeGradient.addColorStop(0, 'rgba(30, 41, 59, 0.9)');
      holeGradient.addColorStop(0.6, 'rgba(15, 23, 42, 0.7)');
      holeGradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = holeGradient;
      ctx.beginPath();
      ctx.arc(0, 0, width / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(100, 116, 139, ${0.5 + intensity * 0.1})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, width / 4 + i * 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (type === 'eddy') {
      ctx.strokeStyle = `rgba(147, 197, 253, ${0.4 + intensity * 0.1})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        for (let t = 0; t < Math.PI * 4; t += 0.1) {
          const spiralR = (t / (Math.PI * 4)) * (width / 2);
          const px = Math.cos(t + i) * spiralR;
          const py = Math.sin(t + i) * spiralR;
          if (t === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    } else if (type === 'current' || type === 'chute') {
      ctx.rotate((direction * Math.PI) / 180);
      const arrowColor = type === 'chute' ? '#f97316' : '#38bdf8';
      ctx.fillStyle = arrowColor;
      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 3;

      const arrowLength = width;
      const arrowWidth = 15 + intensity * 3;

      ctx.beginPath();
      ctx.moveTo(-arrowLength / 2, 0);
      ctx.lineTo(arrowLength / 2 - arrowWidth, 0);
      ctx.moveTo(arrowLength / 2, 0);
      ctx.lineTo(arrowLength / 2 - arrowWidth, -arrowWidth / 2);
      ctx.lineTo(arrowLength / 2 - arrowWidth, arrowWidth / 2);
      ctx.closePath();
      ctx.fill();

      for (let i = 0; i < intensity; i++) {
        ctx.beginPath();
        ctx.moveTo(-arrowLength / 2 + i * 20, -8);
        ctx.lineTo(-arrowLength / 2 + i * 20 + 10, 0);
        ctx.lineTo(-arrowLength / 2 + i * 20, 8);
        ctx.stroke();
      }
    }

    if (danger) {
      ctx.strokeStyle = DANGER_LEVEL_COLORS[danger.level];
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, width / 2 + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (isSelected) {
      ctx.strokeStyle = '#ff6B35';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(width / 2, 30) + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = 'white';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(FEATURE_TYPE_LABELS[type], 0, Math.max(width / 2, 20) + 15);

    ctx.restore();
  }, []);

  const drawGate = useCallback((ctx: CanvasRenderingContext2D, gate: Gate, isSelected: boolean) => {
    const { x, y, angle, number, type, entryAngle, exitDirection, switchPoint } = gate;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);

    const gateWidth = 50;
    const poleRadius = 4;

    ctx.strokeStyle = type === 'upstream' ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-gateWidth / 2, -poleRadius);
    ctx.lineTo(gateWidth / 2, -poleRadius);
    ctx.stroke();

    const leftPoleGradient = ctx.createLinearGradient(-gateWidth / 2 - poleRadius, 0, -gateWidth / 2 + poleRadius, 0);
    leftPoleGradient.addColorStop(0, type === 'upstream' ? '#166534' : '#991b1b');
    leftPoleGradient.addColorStop(0.5, type === 'upstream' ? '#22c55e' : '#ef4444');
    leftPoleGradient.addColorStop(1, type === 'upstream' ? '#166534' : '#991b1b');

    ctx.fillStyle = leftPoleGradient;
    ctx.beginPath();
    ctx.arc(-gateWidth / 2, 0, poleRadius + 2, 0, Math.PI * 2);
    ctx.fill();

    const rightPoleGradient = ctx.createLinearGradient(gateWidth / 2 - poleRadius, 0, gateWidth / 2 + poleRadius, 0);
    rightPoleGradient.addColorStop(0, type === 'upstream' ? '#166534' : '#991b1b');
    rightPoleGradient.addColorStop(0.5, type === 'upstream' ? '#22c55e' : '#ef4444');
    rightPoleGradient.addColorStop(1, type === 'upstream' ? '#166534' : '#991b1b');

    ctx.fillStyle = rightPoleGradient;
    ctx.beginPath();
    ctx.arc(gateWidth / 2, 0, poleRadius + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate((-angle * Math.PI) / 180);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(Math.cos(((entryAngle - 90) * Math.PI) / 180) * 60, Math.sin(((entryAngle - 90) * Math.PI) / 180) * 60);
    ctx.lineTo(0, 0);
    ctx.lineTo(Math.cos(((exitDirection - 90) * Math.PI) / 180) * 60, Math.sin(((exitDirection - 90) * Math.PI) / 180) * 60);
    ctx.stroke();
    ctx.setLineDash([]);

    if (switchPoint) {
      ctx.fillStyle = switchPoint.type === 'backward' ? '#a855f7' : '#06b6d4';
      ctx.beginPath();
      ctx.arc(switchPoint.position.x - x, switchPoint.position.y - y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(switchPoint.type === 'backward' ? '倒' : switchPoint.type === 'support' ? '支' : '正', switchPoint.position.x - x, switchPoint.position.y - y);
    }

    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Roboto Slab';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(number.toString(), 0, -30);
    ctx.shadowBlur = 0;

    if (isSelected) {
      ctx.strokeStyle = '#ff6B35';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, 45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, []);

  const drawMistake = useCallback((ctx: CanvasRenderingContext2D, mistake: { position: { x: number; y: number }; type: string; severity: number }, index: number) => {
    const { x, y } = mistake.position;
    const colors = ['#22c55e', '#eab308', '#ef4444'];
    const color = colors[Math.min(mistake.severity - 1, 2)];

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = `${color}40`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 15 + index * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', 0, 0);

    ctx.restore();
  }, []);

  const drawLinePath = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!showLinePath || gates.length < 2) return;

    const sortedGates = [...gates].sort((a, b) => a.number - b.number);

    ctx.strokeStyle = 'rgba(255, 107, 53, 0.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);

    ctx.beginPath();
    sortedGates.forEach((gate, index) => {
      if (index === 0) {
        ctx.moveTo(gate.x, gate.y);
      } else {
        ctx.lineTo(gate.x, gate.y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }, [gates, showLinePath]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    drawRiver(ctx);
    drawHeatmap(ctx);
    drawLinePath(ctx);

    features.forEach((feature) => {
      const danger = dangers.find((d) => d.featureId === feature.id);
      drawFeature(ctx, feature, feature.id === selectedFeatureId, danger);
    });

    reach?.rocks.forEach((rock) => {
      drawRock(ctx, rock, rock.id === selectedRockId);
    });

    gates.forEach((gate) => {
      drawGate(ctx, gate, gate.id === selectedGateId);
    });

    mistakes.forEach((mistake, index) => {
      drawMistake(ctx, mistake, index);
    });

    ctx.restore();
  }, [reach, features, gates, dangers, offset, scale, drawRiver, drawHeatmap, drawRock, drawFeature, drawGate, drawMistake, drawLinePath, selectedRockId, selectedGateId, selectedFeatureId, mistakes]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editable) return;

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    if (tool === 'rock' && onRockAdd) {
      onRockAdd({
        x,
        y,
        radius: 35,
        shape: rockShape,
        height: rockShape === 'submerged' ? 0 : 0.5,
      });
    } else if (tool === 'gate' && onGateAdd) {
      const nextNumber = gates.length > 0 ? Math.max(...gates.map((g) => g.number)) + 1 : 1;
      onGateAdd({
        number: nextNumber,
        type: gateType,
        x,
        y,
        angle: 0,
      });
    } else if (tool === 'feature' && onFeatureAdd && reach) {
      onFeatureAdd({
        reachId: reach.id,
        type: featureType,
        x,
        y,
        width: 80,
        height: 0.5,
        flowSpeed: flowVelocity,
        direction: 180,
        intensity: 3,
        flowRange: [reach.baseFlow * 0.5, reach.baseFlow * 2.0],
      });
    } else if (tool === 'select') {
      let found = false;

      for (const rock of reach?.rocks || []) {
        const dist = Math.sqrt(Math.pow(x - rock.x, 2) + Math.pow(y - rock.y, 2));
        if (dist < rock.radius + 10) {
          onRockSelect?.(rock);
          onGateSelect?.(null);
          onFeatureSelect?.(null);
          found = true;
          break;
        }
      }

      if (!found) {
        for (const gate of gates) {
          const dist = Math.sqrt(Math.pow(x - gate.x, 2) + Math.pow(y - gate.y, 2));
          if (dist < 45) {
            onGateSelect?.(gate);
            onRockSelect?.(null);
            onFeatureSelect?.(null);
            found = true;
            break;
          }
        }
      }

      if (!found) {
        for (const feature of features) {
          const dist = Math.sqrt(Math.pow(x - feature.x, 2) + Math.pow(y - feature.y, 2));
          if (dist < feature.width / 2 + 15) {
            onFeatureSelect?.(feature);
            onRockSelect?.(null);
            onGateSelect?.(null);
            found = true;
            break;
          }
        }
      }

      if (!found) {
        onRockSelect?.(null);
        onGateSelect?.(null);
        onFeatureSelect?.(null);
      }
    }
  }, [editable, tool, getCanvasCoords, onRockAdd, onGateAdd, onFeatureAdd, reach, rockShape, gateType, featureType, gates, features, flowVelocity, onRockSelect, onGateSelect, onFeatureSelect]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editable) return;

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    if (tool === 'pan') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }

    if (tool === 'select') {
      for (const rock of reach?.rocks || []) {
        const dist = Math.sqrt(Math.pow(x - rock.x, 2) + Math.pow(y - rock.y, 2));
        if (dist < rock.radius + 10) {
          setDraggedItem({ type: 'rock', id: rock.id });
          setIsDragging(true);
          return;
        }
      }

      for (const gate of gates) {
        const dist = Math.sqrt(Math.pow(x - gate.x, 2) + Math.pow(y - gate.y, 2));
        if (dist < 45) {
          setDraggedItem({ type: 'gate', id: gate.id });
          setIsDragging(true);
          return;
        }
      }
    }
  }, [editable, tool, getCanvasCoords, reach, gates, offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    if (tool === 'pan') {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else if (draggedItem && tool === 'select') {
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);

      if (draggedItem.type === 'rock') {
        const rock = reach?.rocks.find((r) => r.id === draggedItem.id);
        if (rock && onRockMove) {
          onRockMove({ ...rock, x, y });
        }
      } else if (draggedItem.type === 'gate') {
        const gate = gates.find((g) => g.id === draggedItem.id);
        if (gate && onGateMove) {
          onGateMove({ ...gate, x, y });
        }
      }
    }
  }, [isDragging, tool, dragStart, draggedItem, getCanvasCoords, reach, gates, onRockMove, onGateMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedItem(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.max(0.5, Math.min(2, s * delta)));
  }, []);

  return (
    <div ref={containerRef} className="canvas-container w-full h-full">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="cursor-crosshair"
        style={{
          cursor: tool === 'pan' ? (isDragging ? 'grabbing' : 'grab') : tool === 'select' ? (isDragging ? 'grabbing' : 'pointer') : 'crosshair',
        }}
      />

      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-deep-sea-900/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-deep-sea-700/50">
        <button
          onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
          className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-white hover:bg-deep-sea-700/50 rounded transition-colors"
        >
          −
        </button>
        <span className="text-sm text-gray-300 w-16 text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(2, s + 0.1))}
          className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-white hover:bg-deep-sea-700/50 rounded transition-colors"
        >
          +
        </button>
        <button
          onClick={() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}
          className="ml-2 px-3 py-1 text-xs text-gray-300 hover:text-white hover:bg-deep-sea-700/50 rounded transition-colors"
        >
          重置视图
        </button>
      </div>
    </div>
  );
}
