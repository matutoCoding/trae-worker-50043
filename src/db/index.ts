import Dexie, { Table } from 'dexie';
import type {
  Reach,
  WaterFeature,
  DangerZone,
  GateConfig,
  TrainingSession,
  Athlete,
  Boat,
  LineLibrary,
} from '../types';

export class WhitewaterDatabase extends Dexie {
  reaches!: Table<Reach, string>;
  waterFeatures!: Table<WaterFeature, string>;
  dangerZones!: Table<DangerZone, string>;
  gateConfigs!: Table<GateConfig, string>;
  trainingSessions!: Table<TrainingSession, string>;
  athletes!: Table<Athlete, string>;
  boats!: Table<Boat, string>;
  lineLibrary!: Table<LineLibrary, string>;

  constructor() {
    super('whitewater-analytics');

    this.version(1).stores({
      reaches: 'id, name, createdAt, updatedAt',
      waterFeatures: 'id, reachId, type',
      dangerZones: 'id, featureId, level',
      gateConfigs: 'id, reachId, name, createdAt',
      trainingSessions: 'id, reachId, date, athleteId',
      athletes: 'id, name',
      boats: 'id, model, type',
      lineLibrary: 'id, reachId, difficulty, bestTime, createdAt',
    });
  }
}

export const db = new WhitewaterDatabase();

export async function seedInitialData(): Promise<void> {
  const athleteCount = await db.athletes.count();
  if (athleteCount === 0) {
    await db.athletes.bulkAdd([
      {
        id: 'athlete-1',
        name: '张三',
        weight: 75,
        height: 180,
        skillLevel: 4,
      },
      {
        id: 'athlete-2',
        name: '李四',
        weight: 70,
        height: 175,
        skillLevel: 3,
      },
      {
        id: 'athlete-3',
        name: '王五',
        weight: 80,
        height: 185,
        skillLevel: 5,
      },
    ]);
  }

  const boatCount = await db.boats.count();
  if (boatCount === 0) {
    await db.boats.bulkAdd([
      {
        id: 'boat-1',
        model: 'Nelo K1',
        type: 'K1',
        length: 5.2,
        width: 0.6,
        weight: 12,
        displacement: 95,
      },
      {
        id: 'boat-2',
        model: 'Vajda C1',
        type: 'C1',
        length: 4.1,
        width: 0.75,
        weight: 16,
        displacement: 110,
      },
    ]);
  }

  const reachCount = await db.reaches.count();
  if (reachCount === 0) {
    const now = Date.now();
    await db.reaches.add({
      id: 'reach-demo',
      name: '示例训练河段',
      length: 300,
      width: 25,
      location: '训练基地1号赛道',
      baseFlow: 15,
      drop: 4.5,
      gradient: 15,
      rocks: [
        { id: 'r1', x: 200, y: 300, radius: 40, shape: 'sharp', height: 0.8 },
        { id: 'r2', x: 500, y: 250, radius: 55, shape: 'round', height: 0.6 },
        { id: 'r3', x: 750, y: 400, radius: 35, shape: 'flat', height: 0.3 },
        { id: 'r4', x: 350, y: 500, radius: 45, shape: 'submerged', height: 0 },
        { id: 'r5', x: 600, y: 600, radius: 50, shape: 'sharp', height: 1.0 },
      ],
      createdAt: now,
      updatedAt: now,
    });
  }
}
