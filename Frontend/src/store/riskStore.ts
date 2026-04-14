import { create } from "zustand";
import {
  dataService,
  ScenarioCode,
  Year,
  DashboardData,
  MapData,
  PopulationData,
  InfrastructureData,
} from "../services/dataService";

interface RiskState {
  selectedScenario: ScenarioCode;
  selectedYear: Year;

  // Data
  dashboardData: DashboardData | null;
  mapData: MapData | null;
  populationData: PopulationData | null;
  infrastructureData: InfrastructureData | null;
  scenariosList: any[];

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  setScenario: (scenario: ScenarioCode) => void;
  setYear: (year: Year) => void;
  fetchData: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useRiskStore = create<RiskState>((set, get) => ({
  selectedScenario: "SSP245",
  selectedYear: "2030",

  dashboardData: null,
  mapData: null,
  populationData: null,
  infrastructureData: null,
  scenariosList: [],

  isLoading: false,
  error: null,

  setScenario: (scenario) => {
    set({ selectedScenario: scenario });
    get().fetchData();
  },

  setYear: (year) => {
    set({ selectedYear: year });
    get().fetchData();
  },

  fetchData: async () => {
    const { selectedScenario: scenario, selectedYear: year } = get();
    set({ isLoading: true, error: null });

    try {
      const [dashboard, map, population, infrastructure] = await Promise.all([
        dataService.getDashboardData(scenario, year),
        dataService.getMapRiskData(scenario, year),
        dataService.getPopulationRisk(scenario, year),
        dataService.getInfrastructureRisk(scenario, year),
      ]);

      set({
        dashboardData: dashboard,
        mapData: map,
        populationData: population,
        infrastructureData: infrastructure,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: "فشل تحميل البيانات. يرجى المحاولة مرة أخرى.",
        isLoading: false,
      });
    }
  },

  initialize: async () => {
    set({ isLoading: true });
    try {
      const scenarios = await dataService.getAllScenarios();
      set({ scenariosList: scenarios });
      await get().fetchData();
    } catch (err) {
      set({ error: "فشل تهيئة النظام", isLoading: false });
    }
  },
}));
