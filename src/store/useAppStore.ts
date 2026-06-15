import { create } from 'zustand';
import type {
  Reach,
  WaterFeature,
  DangerZone,
  GateConfig,
  TrainingSession,
  Athlete,
  Boat,
  LineLibrary,
  AppState,
} from '../types';
import { db, seedInitialData } from '../db';

interface AppStore extends AppState {
  reaches: Reach[];
  waterFeatures: WaterFeature[];
  dangerZones: DangerZone[];
  gateConfigs: GateConfig[];
  trainingSessions: TrainingSession[];
  athletes: Athlete[];
  boats: Boat[];
  lineLibrary: LineLibrary[];
  isLoading: boolean;
  init: () => Promise<void>;
  setCurrentReachId: (id: string | null) => void;
  setCurrentGateConfigId: (id: string | null) => void;
  setCurrentFlowRate: (rate: number) => void;
  setSelectedFeatureId: (id: string | null) => void;
  setSelectedGateId: (id: string | null) => void;
  addReach: (reach: Reach) => Promise<void>;
  updateReach: (reach: Reach) => Promise<void>;
  deleteReach: (id: string) => Promise<void>;
  addWaterFeature: (feature: WaterFeature) => Promise<void>;
  updateWaterFeature: (feature: WaterFeature) => Promise<void>;
  deleteWaterFeature: (id: string) => Promise<void>;
  addDangerZone: (zone: DangerZone) => Promise<void>;
  updateDangerZone: (zone: DangerZone) => Promise<void>;
  deleteDangerZone: (id: string) => Promise<void>;
  addGateConfig: (config: GateConfig) => Promise<void>;
  updateGateConfig: (config: GateConfig) => Promise<void>;
  deleteGateConfig: (id: string) => Promise<void>;
  addTrainingSession: (session: TrainingSession) => Promise<void>;
  updateTrainingSession: (session: TrainingSession) => Promise<void>;
  deleteTrainingSession: (id: string) => Promise<void>;
  addLineToLibrary: (line: LineLibrary) => Promise<void>;
  updateLineInLibrary: (line: LineLibrary) => Promise<void>;
  deleteLineFromLibrary: (id: string) => Promise<void>;
  setWaterFeatures: (features: WaterFeature[]) => void;
  setDangerZones: (zones: DangerZone[]) => void;
  loadReachData: (reachId: string) => Promise<void>;
  exportAllData: () => Promise<unknown>;
  importData: (data: unknown) => Promise<boolean>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  currentReachId: null,
  currentGateConfigId: null,
  currentFlowRate: 15,
  selectedFeatureId: null,
  selectedGateId: null,
  reaches: [],
  waterFeatures: [],
  dangerZones: [],
  gateConfigs: [],
  trainingSessions: [],
  athletes: [],
  boats: [],
  lineLibrary: [],
  isLoading: true,

  init: async () => {
    try {
      await seedInitialData();
      const [reaches, athletes, boats, lineLibrary] = await Promise.all([
        db.reaches.toArray(),
        db.athletes.toArray(),
        db.boats.toArray(),
        db.lineLibrary.toArray(),
      ]);
      set({
        reaches,
        athletes,
        boats,
        lineLibrary,
        isLoading: false,
        currentReachId: reaches.length > 0 ? reaches[0].id : null,
      });
      if (reaches.length > 0) {
        await get().loadReachData(reaches[0].id);
      }
    } catch (error) {
      console.error('Init error:', error);
      set({ isLoading: false });
    }
  },

  setCurrentReachId: (id) => set({ currentReachId: id }),
  setCurrentGateConfigId: (id) => set({ currentGateConfigId: id }),
  setCurrentFlowRate: (rate) => set({ currentFlowRate: rate }),
  setSelectedFeatureId: (id) => set({ selectedFeatureId: id }),
  setSelectedGateId: (id) => set({ selectedGateId: id }),

  addReach: async (reach) => {
    await db.reaches.add(reach);
    const reaches = await db.reaches.toArray();
    set({ reaches });
  },

  updateReach: async (reach) => {
    await db.reaches.put(reach);
    const reaches = await db.reaches.toArray();
    set({ reaches });
  },

  deleteReach: async (id) => {
    await db.transaction('rw', db.reaches, db.waterFeatures, db.dangerZones, db.gateConfigs, db.trainingSessions, db.lineLibrary, async () => {
      await db.reaches.delete(id);
      await db.waterFeatures.where('reachId').equals(id).delete();
      await db.dangerZones.where('featureId').anyOf(
        (await db.waterFeatures.where('reachId').equals(id).primaryKeys())
      ).delete();
      await db.gateConfigs.where('reachId').equals(id).delete();
      await db.trainingSessions.where('reachId').equals(id).delete();
      await db.lineLibrary.where('reachId').equals(id).delete();
    });
    const reaches = await db.reaches.toArray();
    set({
      reaches,
      currentReachId: reaches.length > 0 ? reaches[0].id : null,
    });
  },

  addWaterFeature: async (feature) => {
    await db.waterFeatures.add(feature);
    const waterFeatures = await db.waterFeatures.where('reachId').equals(feature.reachId).toArray();
    set({ waterFeatures });
  },

  updateWaterFeature: async (feature) => {
    await db.waterFeatures.put(feature);
    const waterFeatures = await db.waterFeatures.where('reachId').equals(feature.reachId).toArray();
    set({ waterFeatures });
  },

  deleteWaterFeature: async (id) => {
    const feature = await db.waterFeatures.get(id);
    if (feature) {
      await db.waterFeatures.delete(id);
      await db.dangerZones.where('featureId').equals(id).delete();
      const waterFeatures = await db.waterFeatures.where('reachId').equals(feature.reachId).toArray();
      const dangerZones = await db.dangerZones.toArray();
      set({ waterFeatures, dangerZones });
    }
  },

  addDangerZone: async (zone) => {
    await db.dangerZones.add(zone);
    const dangerZones = await db.dangerZones.toArray();
    set({ dangerZones });
  },

  updateDangerZone: async (zone) => {
    await db.dangerZones.put(zone);
    const dangerZones = await db.dangerZones.toArray();
    set({ dangerZones });
  },

  deleteDangerZone: async (id) => {
    await db.dangerZones.delete(id);
    const dangerZones = await db.dangerZones.toArray();
    set({ dangerZones });
  },

  addGateConfig: async (config) => {
    await db.gateConfigs.add(config);
    const gateConfigs = await db.gateConfigs.where('reachId').equals(config.reachId).toArray();
    set({ gateConfigs });
  },

  updateGateConfig: async (config) => {
    await db.gateConfigs.put(config);
    const gateConfigs = await db.gateConfigs.where('reachId').equals(config.reachId).toArray();
    set({ gateConfigs });
  },

  deleteGateConfig: async (id) => {
    const config = await db.gateConfigs.get(id);
    if (config) {
      await db.gateConfigs.delete(id);
      await db.trainingSessions.where('gateConfigId').equals(id).delete();
      await db.lineLibrary.where('gateConfigId').equals(id).delete();
      const gateConfigs = await db.gateConfigs.where('reachId').equals(config.reachId).toArray();
      set({
        gateConfigs,
        currentGateConfigId: gateConfigs.length > 0 ? gateConfigs[0].id : null,
      });
    }
  },

  addTrainingSession: async (session) => {
    await db.trainingSessions.add(session);
    const trainingSessions = await db.trainingSessions.where('reachId').equals(session.reachId).reverse().sortBy('date');
    set({ trainingSessions });
  },

  updateTrainingSession: async (session) => {
    await db.trainingSessions.put(session);
    const trainingSessions = await db.trainingSessions.where('reachId').equals(session.reachId).reverse().sortBy('date');
    set({ trainingSessions });
  },

  deleteTrainingSession: async (id) => {
    const session = await db.trainingSessions.get(id);
    if (session) {
      await db.trainingSessions.delete(id);
      const trainingSessions = await db.trainingSessions.where('reachId').equals(session.reachId).reverse().sortBy('date');
      set({ trainingSessions });
    }
  },

  addLineToLibrary: async (line) => {
    await db.lineLibrary.add(line);
    const lineLibrary = await db.lineLibrary.toArray();
    set({ lineLibrary });
  },

  updateLineInLibrary: async (line) => {
    await db.lineLibrary.put(line);
    const lineLibrary = await db.lineLibrary.toArray();
    set({ lineLibrary });
  },

  deleteLineFromLibrary: async (id) => {
    await db.lineLibrary.delete(id);
    const lineLibrary = await db.lineLibrary.toArray();
    set({ lineLibrary });
  },

  setWaterFeatures: (features) => set({ waterFeatures: features }),
  setDangerZones: (zones) => set({ dangerZones: zones }),

  loadReachData: async (reachId) => {
    const [waterFeatures, dangerZones, gateConfigs, trainingSessions] = await Promise.all([
      db.waterFeatures.where('reachId').equals(reachId).toArray(),
      db.dangerZones.toArray(),
      db.gateConfigs.where('reachId').equals(reachId).toArray(),
      db.trainingSessions.where('reachId').equals(reachId).reverse().sortBy('date'),
    ]);
    const allFeatureIds = waterFeatures.map(f => f.id);
    const filteredDangerZones = dangerZones.filter(z => allFeatureIds.includes(z.featureId));
    set({
      waterFeatures,
      dangerZones: filteredDangerZones,
      gateConfigs,
      trainingSessions,
      currentGateConfigId: gateConfigs.length > 0 ? gateConfigs[0].id : null,
    });
  },

  exportAllData: async () => {
    const [reaches, waterFeatures, dangerZones, gateConfigs, trainingSessions, athletes, boats, lineLibrary] = await Promise.all([
      db.reaches.toArray(),
      db.waterFeatures.toArray(),
      db.dangerZones.toArray(),
      db.gateConfigs.toArray(),
      db.trainingSessions.toArray(),
      db.athletes.toArray(),
      db.boats.toArray(),
      db.lineLibrary.toArray(),
    ]);
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        reaches,
        waterFeatures,
        dangerZones,
        gateConfigs,
        trainingSessions,
        athletes,
        boats,
        lineLibrary,
      },
    };
  },

  importData: async (data: unknown) => {
    try {
      const importData = data as {
        version: string;
        data: {
          reaches: Reach[];
          waterFeatures: WaterFeature[];
          dangerZones: DangerZone[];
          gateConfigs: GateConfig[];
          trainingSessions: TrainingSession[];
          athletes: Athlete[];
          boats: Boat[];
          lineLibrary: LineLibrary[];
        };
      };

      await db.transaction('rw', db.reaches, db.waterFeatures, db.dangerZones, db.gateConfigs, db.trainingSessions, db.athletes, db.boats, db.lineLibrary, async () => {
        await Promise.all([
          db.reaches.bulkPut(importData.data.reaches),
          db.waterFeatures.bulkPut(importData.data.waterFeatures),
          db.dangerZones.bulkPut(importData.data.dangerZones),
          db.gateConfigs.bulkPut(importData.data.gateConfigs),
          db.trainingSessions.bulkPut(importData.data.trainingSessions),
          db.athletes.bulkPut(importData.data.athletes),
          db.boats.bulkPut(importData.data.boats),
          db.lineLibrary.bulkPut(importData.data.lineLibrary),
        ]);
      });

      await get().init();
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  },
}));
