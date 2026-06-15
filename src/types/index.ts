export type RockShape = 'round' | 'sharp' | 'flat' | 'submerged';

export interface Rock {
  id: string;
  x: number;
  y: number;
  radius: number;
  shape: RockShape;
  height: number;
}

export interface Reach {
  id: string;
  name: string;
  length: number;
  width: number;
  location: string;
  baseFlow: number;
  drop: number;
  gradient: number;
  rocks: Rock[];
  createdAt: number;
  updatedAt: number;
}

export type WaterFeatureType = 'wave' | 'hole' | 'eddy' | 'current' | 'chute';

export interface WaterFeature {
  id: string;
  reachId: string;
  type: WaterFeatureType;
  x: number;
  y: number;
  width: number;
  height: number;
  flowSpeed: number;
  direction: number;
  intensity: 1 | 2 | 3 | 4 | 5;
  flowRange: [number, number];
}

export type DangerLevel = 'low' | 'medium' | 'high' | 'extreme';
export type RiskType = 'capsize' | 'pin' | 'flush' | 'windowshade';

export interface DangerZone {
  id: string;
  featureId: string;
  level: DangerLevel;
  description: string;
  riskTypes: RiskType[];
}

export type GateType = 'upstream' | 'downstream';
export type StrokeType = 'forward' | 'backward' | 'support';

export interface GateStrokeRhythm {
  strokes: number;
  cadence: number;
}

export interface GateDriftOffset {
  lateral: number;
  leadRequired: number;
}

export interface GateSwitchPoint {
  type: StrokeType;
  position: { x: number; y: number };
}

export interface Gate {
  id: string;
  number: number;
  type: GateType;
  x: number;
  y: number;
  angle: number;
  entryAngle: number;
  exitDirection: number;
  strokeRhythm: GateStrokeRhythm;
  driftOffset: GateDriftOffset;
  energyLoss: number;
  switchPoint: GateSwitchPoint | null;
}

export interface GateConfig {
  id: string;
  reachId: string;
  name: string;
  flowRate: number;
  gates: Gate[];
  createdAt: number;
}

export interface GatePass {
  gateId: string;
  time: number;
  targetTime: number;
  deviation: number;
  entryAngle: number;
  touches: boolean;
}

export type MistakeType = 'touch' | 'miss' | 'capsize' | 'wrong_gate' | 'line_error';

export interface Mistake {
  id: string;
  timestamp: number;
  position: { x: number; y: number };
  type: MistakeType;
  severity: 1 | 2 | 3;
  readingJudgment: string;
  correction: string;
}

export interface TrainingSession {
  id: string;
  reachId: string;
  gateConfigId: string;
  athleteId: string;
  boatId: string;
  date: number;
  totalTime: number;
  gatePasses: GatePass[];
  mistakes: Mistake[];
  notes: string;
}

export type BoatType = 'K1' | 'C1' | 'C2';

export interface Boat {
  id: string;
  model: string;
  type: BoatType;
  length: number;
  width: number;
  weight: number;
  displacement: number;
}

export interface Athlete {
  id: string;
  name: string;
  weight: number;
  height: number;
  skillLevel: 1 | 2 | 3 | 4 | 5;
}

export interface LineSegment {
  id: string;
  startGate: number;
  endGate: number;
  description: string;
  keyPoints: Array<{ x: number; y: number; note: string }>;
  waterFeatures: string[];
}

export interface LineLibrary {
  id: string;
  name: string;
  reachId: string;
  gateConfigId: string;
  bestTime: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  flowRange: [number, number];
  segments: LineSegment[];
  tags: string[];
  athleteRating: number;
  createdAt: number;
}

export interface WeightRecommendation {
  athleteId: string;
  boatId: string;
  totalWeight: number;
  additionalWeight: number;
  draft: number;
  centerOfGravity: { x: number; y: number };
}

export type RiskLevel = 'normal' | 'warning' | 'danger';

export interface WaterLevelRisk {
  reachId: string;
  currentLevel: number;
  thresholdLevel: number;
  riskLevel: RiskLevel;
  affectedSegments: string[];
  recommendations: string[];
}

export interface AppState {
  currentReachId: string | null;
  currentGateConfigId: string | null;
  currentFlowRate: number;
  selectedFeatureId: string | null;
  selectedGateId: string | null;
}

export const FEATURE_TYPE_LABELS: Record<WaterFeatureType, string> = {
  wave: '翻滚浪',
  hole: '浪洞',
  eddy: '回流区',
  current: '斜流',
  chute: '激流槽',
};

export const DANGER_LEVEL_COLORS: Record<DangerLevel, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  extreme: '#ef4444',
};

export const DANGER_LEVEL_LABELS: Record<DangerLevel, string> = {
  low: '低危',
  medium: '中危',
  high: '高危',
  extreme: '极高危',
};

export const GATE_TYPE_LABELS: Record<GateType, string> = {
  upstream: '逆水门',
  downstream: '顺水门',
};

export const MISTAKE_TYPE_LABELS: Record<MistakeType, string> = {
  touch: '碰门',
  miss: '漏门',
  capsize: '翻艇',
  wrong_gate: '错门',
  line_error: '路线错误',
};

export const BOAT_TYPE_LABELS: Record<BoatType, string> = {
  K1: '单人皮艇',
  C1: '单人划艇',
  C2: '双人划艇',
};
