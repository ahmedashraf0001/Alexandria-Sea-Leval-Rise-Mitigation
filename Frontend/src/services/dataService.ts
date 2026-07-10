const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

const AUTH_TOKEN_STORAGE_KEY = "sealevel_api_token";
const AUTH_SESSION_STORAGE_KEY = "sealevel_api_session";

export type ScenarioCode = "SSP126" | "SSP245" | "SSP370" | "SSP585";
export type Year = "2030" | "2050" | "2070" | "2100";

export interface ScenarioItem {
  id: ScenarioCode;
  label: string;
  description: string;
}

export interface DashboardData {
  populationAtRisk: number;
  floodedAreaKm2: number;
  highRiskAreas: string[];
}

export interface MapData {
  projectedSeaLevelMm: number;
  floodedAreaKm2: number;
  riskLevel: string;
  colorCode: string;
  description: string;
  zones: {
    name: string;
    thresholdMm: number;
  }[];
}

export interface PopulationData {
  totalPopulation: number;
  exposedPopulation: number;
  informalSettlementsExposure: string;
  qisms: {
    name: string;
    exposedPopulation: number;
    floodedAreaKm2: number;
    riskLevel: string;
  }[];
}

export interface InfrastructureData {
  categories: {
    [category: string]: {
      name: string;
      qism: string;
      riskLevel: string;
      impactDescription: string;
    }[];
  };
  facilities: InfrastructureFacility[];
}

export interface InfrastructureFacility {
  id: string;
  lat: number;
  lng: number;
  qism: string;
  type: string;
  risk: "extreme" | "high" | "medium" | "low" | string;
  riskLevel: string;
  riskLabel: string;
  name: string;
  typeLabel: string;
  floodDepth: string;
  status: "Critical" | "Warning" | "Stable" | string;
  description: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  username: string;
  expiresAtUtc: string;
  roles?: string[];
}

export interface AuthSession {
  token: string;
  email: string;
  username: string;
  expiresAtUtc: string;
  roles?: string[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  username: string;
}

export interface AnalyticsChartsResponse {
  housingData: Array<{
    value: number;
    color: string;
    name: string;
  }>;
  exposureData: Array<{
    year: string | number;
    ssp1: number;
    ssp5: number;
  }>;
  vulnerabilityIndex: number;
  vulnerabilityLevel: string;
}

export interface ChatMetricItem {
  date: string;
  windSpeedMs: number;
  temperatureC: number;
  relativeHumidityPct: number;
  seaLevelPressureHpa: number;
  predictedSeaLevelMm: number;
  value: number;
}

export interface ChatReferenceItem {
  id: string;
  title: string;
  detail: string;
}

export interface ChatResponse {
  reply: string;
  references?: ChatReferenceItem[];
}

export interface ReportStatisticsResponse {
  floodData: Array<{ name: string; value: number }>;
  populationData: Array<{ name: string; value: number; color: string }>;
}

function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore storage errors in non-browser contexts.
  }
}

function clearStoredToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage errors in non-browser contexts.
  }
}

function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (
      typeof parsed.token === "string" &&
      typeof parsed.email === "string" &&
      typeof parsed.username === "string" &&
      typeof parsed.expiresAtUtc === "string"
    ) {
      return {
        token: parsed.token,
        email: parsed.email,
        username: parsed.username,
        expiresAtUtc: parsed.expiresAtUtc,
        roles: parsed.roles,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: AuthSession): void {
  try {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage errors in non-browser contexts.
  }
}

function clearStoredSession(): void {
  try {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage errors in non-browser contexts.
  }
}

function getActiveToken(): string | null {
  const session = readStoredSession();
  if (session?.token) {
    return session.token;
  }

  return readStoredToken();
}

function toAuthSession(payload: AuthResponse): AuthSession {
  return {
    token: payload.token,
    email: payload.email,
    username: payload.username,
    expiresAtUtc: payload.expiresAtUtc,
    roles: payload.roles,
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) {
    return `Request failed with status ${response.status}`;
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (typeof parsed.detail === "string") return parsed.detail;
    if (typeof parsed.error === "string") return parsed.error;
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    // Keep raw text fallback.
  }

  return text;
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
  requiresAuth = false,
): Promise<T> {
  const execute = async (token: string | null): Promise<Response> => {
    const headers = new Headers(init.headers || {});
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(buildApiUrl(path), {
      ...init,
      headers,
    });
  };

  const token = getActiveToken();
  if (requiresAuth && !token) {
    throw new Error("Authentication required. Please login first.");
  }

  let response = await execute(token);

  if (requiresAuth && response.status === 401) {
    clearStoredToken();
    clearStoredSession();

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sealevel:auth-expired"));
    }

    throw new Error("Session expired. Please login again.");
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function toRiskBucket(level: string): "extreme" | "high" | "medium" | "low" {
  const normalized = level.trim().toLowerCase();

  if (
    normalized.includes("critical") ||
    normalized.includes("severe") ||
    normalized.includes("extreme") ||
    normalized.includes("شديد") ||
    normalized.includes("كارثي") ||
    normalized.includes("جدًا") ||
    normalized.includes("جدا")
  ) {
    return "extreme";
  }

  if (normalized.includes("high") || normalized.includes("مرتفع")) {
    return "high";
  }

  if (normalized.includes("medium") || normalized.includes("moderate") || normalized.includes("متوسط")) {
    return "medium";
  }

  return "low";
}

function toInfrastructureLabels(category: string): { type: string; typeLabel: string } {
  if (category === "ports" || category === "ميناء") {
    return { type: "ports", typeLabel: "الموانئ" };
  }

  if (category === "hospitals" || category === "مستشفى") {
    return { type: "hospitals", typeLabel: "المستشفيات" };
  }

  if (category === "transport" || category === "مطار" || category === "طريق") {
    return { type: "transport", typeLabel: "النقل" };
  }

  if (category === "مياه" || category === "كهرباء") {
    return { type: "utilities", typeLabel: "المرافق" };
  }

  return { type: category, typeLabel: category };
}

function toRiskLabel(risk: "extreme" | "high" | "medium" | "low"): string {
  if (risk === "extreme") return "Extreme";
  if (risk === "high") return "High";
  if (risk === "medium") return "Medium";
  return "Low";
}

export function toFloodDepth(risk: "extreme" | "high" | "medium" | "low"): string {
  if (risk === "extreme") return "1.50 m";
  if (risk === "high") return "1.10 m";
  if (risk === "medium") return "0.70 m";
  return "0.30 m";
}

function toStatus(risk: "extreme" | "high" | "medium" | "low"): "Critical" | "Warning" | "Stable" {
  if (risk === "extreme" || risk === "high") return "Critical";
  if (risk === "medium") return "Warning";
  return "Stable";
}

export function getQismCoordinates(qism: string, index: number): { lat: number; lng: number } {
  const key = qism.trim().toLowerCase();
  const map: Record<string, { lat: number; lng: number }> = {
    "al gomrok": { lat: 31.206, lng: 29.884 },
    "dekheila": { lat: 31.152, lng: 29.828 },
    "al montaza": { lat: 31.275, lng: 30.015 },
    "al montazah": { lat: 31.275, lng: 30.015 },
    "anfoushi": { lat: 31.213, lng: 29.885 },
    "abu qir": { lat: 31.317, lng: 30.062 },
  };

  const base = map[key] ?? { lat: 31.2001, lng: 29.9187 };
  return {
    lat: base.lat + (index % 4) * 0.004,
    lng: base.lng + (index % 5) * 0.003,
  };
}

function normalizeInformalExposure(exposure: string): string {
  const normalized = (exposure || "").trim().toLowerCase();
  if (normalized === "moderate") return "Medium";
  if (normalized === "severe") return "High";
  return exposure;
}

export const dataService = {
  getStoredSession: (): AuthSession | null => {
    return readStoredSession();
  },

  setSession: (session: AuthSession): void => {
    writeStoredToken(session.token);
    writeStoredSession(session);
  },

  clearSession: (): void => {
    clearStoredToken();
    clearStoredSession();
  },

  isAuthenticated: (): boolean => {
    return Boolean(getActiveToken());
  },

  register: async (payload: RegisterPayload): Promise<AuthSession> => {
    const response = await requestJson<AuthResponse>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      false,
    );

    const session = toAuthSession(response);
    dataService.setSession(session);
    return session;
  },

  login: async (payload: LoginPayload): Promise<AuthSession> => {
    const response = await requestJson<AuthResponse>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      false,
    );

    const session = toAuthSession(response);
    dataService.setSession(session);
    return session;
  },

  logout: (): void => {
    dataService.clearSession();
  },

  getAllScenarios: async (): Promise<ScenarioItem[]> => {
    return requestJson<ScenarioItem[]>("/scenarios", {}, false);
  },

  getDashboardData: async (
    scenario: ScenarioCode,
    year: Year,
  ): Promise<DashboardData> => {
    return requestJson<DashboardData>(
      `/dashboard?scenario=${scenario}&year=${year}`,
    );
  },

  getMapRiskData: async (): Promise<MapData> => {
    const payload = await requestJson<MapData>("/map-risk");

    const bucket = toRiskBucket(payload.riskLevel);
    const riskLevel = toRiskLabel(bucket);

    return {
      ...payload,
      riskLevel,
    };
  },

  getPopulationRisk: async (
    scenario: ScenarioCode,
    year: Year,
  ): Promise<PopulationData> => {
    const payload = await requestJson<PopulationData>(
      `/population?scenario=${scenario}&year=${year}`,
    );

    return {
      ...payload,
      informalSettlementsExposure: normalizeInformalExposure(
        payload.informalSettlementsExposure,
      ),
      qisms: (payload.qisms || []).map((qism) => ({
        ...qism,
        riskLevel: toRiskLabel(toRiskBucket(qism.riskLevel)),
      })),
    };
  },

  getInfrastructureRisk: async (
    scenario: ScenarioCode,
    year: Year,
    sectors?: string[],
    risks?: string[],
  ): Promise<InfrastructureData> => {
    const query = new URLSearchParams({ scenario, year });
    if (sectors && sectors.length > 0) {
      query.set("sectors", sectors.join(","));
    }
    if (risks && risks.length > 0) {
      query.set("risks", risks.join(","));
    }

    return requestJson<InfrastructureData>(`/infrastructure?${query.toString()}`);
  },

  getInfrastructureFacilities: async (
    scenario: ScenarioCode,
    year: Year,
    sectors?: string[],
    risks?: string[],
  ): Promise<InfrastructureFacility[]> => {
    const data = await dataService.getInfrastructureRisk(
      scenario,
      year,
      sectors,
      risks,
    );

    return (data.facilities || []).map((fac: any) => {
      const { type, typeLabel } = toInfrastructureLabels(fac.type);
      const riskBucket = toRiskBucket(fac.riskLevel);
      return {
        ...fac,
        type,
        typeLabel: fac.typeLabel || typeLabel,
        risk: riskBucket,
        status: fac.status || toStatus(riskBucket)
      };
    });
  },

  getAnalyticsCharts: async (
    scenario: ScenarioCode,
    year: Year,
  ): Promise<AnalyticsChartsResponse> => {
    return requestJson<AnalyticsChartsResponse>(
      `/analytics/charts?scenario=${scenario}&year=${year}`,
    );
  },

  getChatMetrics: async (): Promise<ChatMetricItem[]> => {
    return requestJson<ChatMetricItem[]>("/chat/metrics");
  },

  sendChatMessage: async (
    message: string,
    context: { scenario: ScenarioCode; year: Year },
  ): Promise<ChatResponse> => {
    return requestJson<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({ 
        message, 
        context: {
          scenario: context.scenario,
          year: String(context.year)
        }
      }),
    });
  },

  getReportStatistics: async (
    scenario: ScenarioCode,
    year: Year,
  ): Promise<ReportStatisticsResponse> => {
    return requestJson<ReportStatisticsResponse>(
      `/reports/statistics?scenario=${scenario}&year=${year}`,
    );
  },

  exportReportCsv: async (
    scenario: ScenarioCode,
    year: Year,
  ): Promise<Blob> => {
    const token = getActiveToken();
    const headers = new Headers();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const response = await fetch(
      `${API_BASE_URL}/reports/export?scenario=${scenario}&year=${year}`,
      { headers }
    );
    if (!response.ok) {
      throw new Error("Failed to export predictions CSV");
    }
    return response.blob();
  },

  getUsers: async (): Promise<any[]> => {
    return requestJson<any[]>("/users", {}, true);
  },

  deleteUser: async (id: string): Promise<void> => {
    return requestJson<void>(`/users/${id}`, { method: "DELETE" }, true);
  },

  updateProfile: async (payload: { username: string }): Promise<void> => {
    return requestJson<void>(
      "/users/profile",
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      true,
    );
  },

  getMyForecastLogs: async (): Promise<any[]> => {
    return requestJson<any[]>("/forecast-logs/me", {}, true);
  },

  getAllForecastLogs: async (): Promise<any[]> => {
    return requestJson<any[]>("/forecast-logs", {}, true);
  },
};
