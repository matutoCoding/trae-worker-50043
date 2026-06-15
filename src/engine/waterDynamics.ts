import { v4 as uuidv4 } from 'uuid';
import type {
  Reach,
  Rock,
  WaterFeature,
  DangerZone,
  Gate,
  Boat,
  Athlete,
  WeightRecommendation,
  WaterLevelRisk,
  LineSegment,
} from '../types';

const GRAVITY = 9.81;
const FRICTION_COEFFICIENT = 0.035;
const BOAT_DRAG_COEFFICIENT = 0.45;
const WATER_DENSITY = 1000;

export function calculateFlowVelocity(
  flowRate: number,
  crossSectionArea: number,
  gradient: number
): number {
  const hydraulicRadius = crossSectionArea / (2 * Math.sqrt(crossSectionArea / Math.PI) * 2);
  const shearVelocity = Math.sqrt(GRAVITY * hydraulicRadius * (gradient / 1000));
  const meanVelocity = (1 / FRICTION_COEFFICIENT) * Math.sqrt(GRAVITY * hydraulicRadius * (gradient / 1000));
  const directVelocity = flowRate / crossSectionArea;
  return Math.max(meanVelocity, directVelocity) * 0.85;
}

export function calculateWaterFeatures(
  reach: Reach,
  flowRate: number
): { features: WaterFeature[]; dangers: DangerZone[] } {
  const features: WaterFeature[] = [];
  const dangers: DangerZone[] = [];
  const crossSectionArea = reach.width * 1.5;
  const baseVelocity = calculateFlowVelocity(flowRate, crossSectionArea, reach.gradient);

  const flowFactor = flowRate / reach.baseFlow;

  reach.rocks.forEach((rock) => {
    const relativeHeight = rock.height * (flowFactor > 1 ? 1 / flowFactor : 1);
    const obstructionFactor = (Math.PI * rock.radius * rock.radius) / (crossSectionArea * 10);

    if (rock.shape === 'sharp' && relativeHeight > 0.4) {
      const waveHeight = Math.min(2.5, obstructionFactor * baseVelocity * baseVelocity * 0.5);
      if (waveHeight > 0.3) {
        const feature: WaterFeature = {
          id: uuidv4(),
          reachId: reach.id,
          type: 'wave',
          x: rock.x + rock.radius * 1.5,
          y: rock.y,
          width: rock.radius * 3,
          height: waveHeight,
          flowSpeed: baseVelocity * (1 + obstructionFactor * 2),
          direction: 180,
          intensity: Math.min(5, Math.ceil(waveHeight * 2)) as 1 | 2 | 3 | 4 | 5,
          flowRange: [reach.baseFlow * 0.6, reach.baseFlow * 1.5],
        };
        features.push(feature);

        if (waveHeight > 1.2) {
          dangers.push({
            id: uuidv4(),
            featureId: feature.id,
            level: waveHeight > 1.8 ? 'extreme' : 'high',
            description: `翻滚浪高度 ${waveHeight.toFixed(1)}m，可能导致翻艇`,
            riskTypes: waveHeight > 1.8 ? ['capsize', 'windowshade'] : ['capsize'],
          });
        }
      }
    }

    if (rock.height > 0.5) {
      const holeDepth = Math.min(1.5, obstructionFactor * baseVelocity * 1.2);
      if (holeDepth > 0.4) {
        const feature: WaterFeature = {
          id: uuidv4(),
          reachId: reach.id,
          type: 'hole',
          x: rock.x,
          y: rock.y - rock.radius * 0.5,
          width: rock.radius * 2.5,
          height: holeDepth,
          flowSpeed: baseVelocity * 0.7,
          direction: 0,
          intensity: Math.min(5, Math.ceil(holeDepth * 3)) as 1 | 2 | 3 | 4 | 5,
          flowRange: [reach.baseFlow * 0.5, reach.baseFlow * 2.0],
        };
        features.push(feature);

        if (holeDepth > 0.8) {
          dangers.push({
            id: uuidv4(),
            featureId: feature.id,
            level: holeDepth > 1.2 ? 'extreme' : 'high',
            description: `浪洞深度 ${holeDepth.toFixed(1)}m，有卡艇风险`,
            riskTypes: ['pin', 'flush'],
          });
        }
      }
    }

    const eddySize = rock.radius * 2 * (1 + flowFactor * 0.3);
    if (eddySize > 30) {
      const feature: WaterFeature = {
        id: uuidv4(),
        reachId: reach.id,
        type: 'eddy',
        x: rock.x - rock.radius * 1.2,
        y: rock.y + rock.radius * 0.8,
        width: eddySize,
        height: 0.3,
        flowSpeed: baseVelocity * 0.2,
        direction: 270,
        intensity: Math.min(5, Math.ceil(eddySize / 30)) as 1 | 2 | 3 | 4 | 5,
        flowRange: [reach.baseFlow * 0.3, reach.baseFlow * 2.5],
      };
      features.push(feature);
    }
  });

  const chuteFeature: WaterFeature = {
    id: uuidv4(),
    reachId: reach.id,
    type: 'chute',
    x: reach.length * 3.33 / 2,
    y: reach.width * 20 / 2,
    width: 150,
    height: 0.5,
    flowSpeed: baseVelocity * 1.3,
    direction: 180,
    intensity: 3,
    flowRange: [reach.baseFlow * 0.4, reach.baseFlow * 3.0],
  };
  features.push(chuteFeature);

  for (let i = 0; i < 3; i++) {
    const currentFeature: WaterFeature = {
      id: uuidv4(),
      reachId: reach.id,
      type: 'current',
      x: 200 + i * 300,
      y: 200 + Math.sin(i * 1.5) * 150,
      width: 80,
      height: 0.2,
      flowSpeed: baseVelocity * (1.1 + i * 0.15),
      direction: 160 + i * 20,
      intensity: 2,
      flowRange: [reach.baseFlow * 0.5, reach.baseFlow * 2.0],
    };
    features.push(currentFeature);
  }

  return { features, dangers };
}

export function calculateGateStrategy(
  gate: Omit<Gate, 'entryAngle' | 'exitDirection' | 'strokeRhythm' | 'driftOffset' | 'energyLoss' | 'switchPoint'>,
  prevGate: Gate | null,
  features: WaterFeature[],
  flowVelocity: number
): Omit<Gate, 'entryAngle' | 'exitDirection' | 'strokeRhythm' | 'driftOffset' | 'energyLoss' | 'switchPoint'> & {
  entryAngle: number;
  exitDirection: number;
  strokeRhythm: { strokes: number; cadence: number };
  driftOffset: { lateral: number; leadRequired: number };
  energyLoss: number;
  switchPoint: { type: 'forward' | 'backward' | 'support'; position: { x: number; y: number } } | null;
} {
  const nearbyFeatures = features.filter(
    (f) => Math.sqrt(Math.pow(f.x - gate.x, 2) + Math.pow(f.y - gate.y, 2)) < 150
  );

  const mainCurrent = nearbyFeatures.find((f) => f.type === 'current') || nearbyFeatures.find((f) => f.type === 'chute');
  const hasEddy = nearbyFeatures.some((f) => f.type === 'eddy');

  const currentDirection = mainCurrent ? mainCurrent.direction : 180;
  const currentSpeed = mainCurrent ? mainCurrent.flowSpeed : flowVelocity;

  let entryAngle: number;
  if (gate.type === 'upstream') {
    entryAngle = currentDirection - 180 + 25;
  } else {
    entryAngle = currentDirection - 15;
  }
  entryAngle = ((entryAngle % 360) + 360) % 360;

  const exitDirection = gate.type === 'upstream'
    ? currentDirection + 10
    : currentDirection;

  const distance = prevGate
    ? Math.sqrt(Math.pow(gate.x - prevGate.x, 2) + Math.pow(gate.y - prevGate.y, 2))
    : 100;

  const strokes = Math.max(2, Math.round(distance / 30));
  const cadence = gate.type === 'upstream' ? 75 : 90;

  const crossFlowComponent = Math.sin((currentDirection - gate.angle) * Math.PI / 180) * currentSpeed;
  const passageTime = distance / 5;
  const lateralDrift = crossFlowComponent * passageTime;
  const leadRequired = lateralDrift * 1.2;

  let energyLoss = 0;
  if (prevGate) {
    const speedChange = Math.abs(currentSpeed - flowVelocity) / flowVelocity;
    const directionChange = Math.abs(gate.angle - prevGate.angle) / 180;
    energyLoss = speedChange * 0.4 + directionChange * 0.3 + (hasEddy ? 0.2 : 0);
  }

  let switchPoint = null;
  if (gate.type === 'upstream' && hasEddy) {
    const eddy = nearbyFeatures.find((f) => f.type === 'eddy');
    if (eddy) {
      switchPoint = {
        type: 'backward',
        position: {
          x: eddy.x,
          y: eddy.y - eddy.width * 0.3,
        },
      };
    }
  } else if (nearbyFeatures.some((f) => f.type === 'wave' && f.intensity >= 3)) {
    const wave = nearbyFeatures.find((f) => f.type === 'wave' && f.intensity >= 3);
    if (wave) {
      switchPoint = {
        type: 'support',
        position: {
          x: wave.x - wave.width * 0.5,
          y: wave.y,
        },
      };
    }
  }

  return {
    ...gate,
    entryAngle,
    exitDirection,
    strokeRhythm: { strokes, cadence },
    driftOffset: { lateral: lateralDrift, leadRequired },
    energyLoss: Math.min(1, energyLoss),
    switchPoint,
  };
}

export function calculateEnergyLossBetweenGates(
  gate1: Gate,
  gate2: Gate,
  boatMass: number,
  velocity1: number,
  velocity2: number
): { loss: number; warning: string | null } {
  const distance = Math.sqrt(
    Math.pow(gate2.x - gate1.x, 2) + Math.pow(gate2.y - gate1.y, 2)
  );
  const heightChange = (gate2.y - gate1.y) * 0.01;

  const kineticEnergy1 = 0.5 * boatMass * velocity1 * velocity1;
  const kineticEnergy2 = 0.5 * boatMass * velocity2 * velocity2;
  const potentialEnergyChange = boatMass * GRAVITY * heightChange;

  const theoreticalEnergy = kineticEnergy1 - potentialEnergyChange;
  const actualEnergy = kineticEnergy2;
  const energyLoss = theoreticalEnergy - actualEnergy;
  const lossPercentage = (energyLoss / kineticEnergy1) * 100;

  let warning = null;
  if (lossPercentage > 25) {
    warning = '能量损耗过大，建议调整路线减少方向变化';
  } else if (lossPercentage > 15) {
    warning = '能量损耗偏高，注意划水效率';
  }

  return { loss: lossPercentage, warning };
}

export function calculateWeightRecommendation(
  athlete: Athlete,
  boat: Boat,
  targetDraft: number = 15
): WeightRecommendation {
  const totalDisplacement = WATER_DENSITY * (boat.length * boat.width * targetDraft / 100);
  const currentWeight = athlete.weight + boat.weight;
  const additionalWeight = Math.max(0, (totalDisplacement / 1000 * 0.9) - currentWeight);

  return {
    athleteId: athlete.id,
    boatId: boat.id,
    totalWeight: currentWeight + additionalWeight,
    additionalWeight: Math.round(additionalWeight),
    draft: targetDraft,
    centerOfGravity: {
      x: boat.length * 0.45,
      y: boat.width * 0.5,
    },
  };
}

export function assessWaterLevelRisk(
  reach: Reach,
  currentFlow: number,
  segments: LineSegment[]
): WaterLevelRisk {
  const flowRatio = currentFlow / reach.baseFlow;
  let riskLevel: 'normal' | 'warning' | 'danger' = 'normal';
  const affectedSegments: string[] = [];
  const recommendations: string[] = [];

  if (flowRatio > 1.5) {
    riskLevel = 'danger';
    recommendations.push('流量过大，部分路线可能被淹没');
    recommendations.push('建议降低训练难度或更换河段');
  } else if (flowRatio > 1.2) {
    riskLevel = 'warning';
    recommendations.push('流量偏高，注意水势变化');
  } else if (flowRatio < 0.6) {
    riskLevel = 'warning';
    recommendations.push('流量偏低，礁石可能露出');
  }

  segments.forEach((segment) => {
    const segmentRisk = flowRatio > 1.3 || flowRatio < 0.7;
    if (segmentRisk) {
      affectedSegments.push(segment.id);
    }
  });

  if (riskLevel === 'warning' && affectedSegments.length > 0) {
    recommendations.push(`${affectedSegments.length} 个分段可能受影响`);
  }

  return {
    reachId: reach.id,
    currentLevel: currentFlow,
    thresholdLevel: reach.baseFlow * 1.5,
    riskLevel,
    affectedSegments,
    recommendations,
  };
}

export function generateHeatmapData(
  width: number,
  height: number,
  features: WaterFeature[],
  flowVelocity: number
): number[][] {
  const gridSize = 20;
  const cols = Math.ceil(width / gridSize);
  const rows = Math.ceil(height / gridSize);
  const data: number[][] = [];

  for (let y = 0; y < rows; y++) {
    data[y] = [];
    for (let x = 0; x < cols; x++) {
      const worldX = x * gridSize;
      const worldY = y * gridSize;

      let velocity = flowVelocity * 0.8;

      features.forEach((feature) => {
        const dist = Math.sqrt(
          Math.pow(worldX - feature.x, 2) + Math.pow(worldY - feature.y, 2)
        );
        const influenceRadius = feature.width;

        if (dist < influenceRadius) {
          const factor = 1 - dist / influenceRadius;
          if (feature.type === 'chute' || feature.type === 'current') {
            velocity += feature.flowSpeed * factor * 0.5;
          } else if (feature.type === 'eddy') {
            velocity -= feature.flowSpeed * factor * 0.3;
          } else if (feature.type === 'wave') {
            velocity += feature.flowSpeed * factor * 0.2;
          } else if (feature.type === 'hole') {
            velocity -= feature.flowSpeed * factor * 0.4;
          }
        }
      });

      data[y][x] = Math.max(0, velocity);
    }
  }

  return data;
}
