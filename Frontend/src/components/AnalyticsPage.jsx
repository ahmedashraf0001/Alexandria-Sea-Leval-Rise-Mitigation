import React, { useEffect, useMemo } from "react";
import Header from "./Header";
import { useRiskStore } from "../store/riskStore";
import { dataService } from "../services/dataService";
import { RiskMap } from "./RiskMap";
import {
  Users,
  Building2,
  AlertTriangle,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

const AnalyticsPage = () => {
  const {
    selectedScenario,
    selectedYear,
    dashboardData,
    mapData,
    populationData,
    initialize,
  } = useRiskStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // State for Chart Data
  const [housingData, setHousingData] = React.useState([]);
  const [exposureData, setExposureData] = React.useState([]);
  const [vulnerabilityIndex, setVulnerabilityIndex] = React.useState(null);
  const [vulnerabilityLevel, setVulnerabilityLevel] = React.useState("--");

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const response = await dataService.getAnalyticsCharts(
          selectedScenario,
          selectedYear,
        );
        setHousingData(response.housingData || []);
        setExposureData(response.exposureData || []);

        const indexValue = Number(response.vulnerabilityIndex);
        setVulnerabilityIndex(Number.isFinite(indexValue) ? indexValue : null);
        setVulnerabilityLevel(response.vulnerabilityLevel || "--");
      } catch (error) {
        console.error("Failed to fetch analytics charts", error);
        setHousingData([]);
        setExposureData([]);
        setVulnerabilityIndex(null);
        setVulnerabilityLevel("--");
      }
    };

    fetchChartData();
  }, [selectedScenario, selectedYear]);

  const districtsData = useMemo(() => {
    const qisms = populationData?.qisms || [];

    return [...qisms]
      .sort(
        (left, right) =>
          Number(right.exposedPopulation || 0) -
          Number(left.exposedPopulation || 0),
      )
      .map((q, i) => ({
        rank: i + 1,
        name: q.name,
        pop: Number(q.exposedPopulation || 0).toLocaleString(),
        risk: (() => {
          const risk = String(q.riskLevel || "").toLowerCase();
          if (
            risk.includes("high") ||
            risk.includes("شديد") ||
            risk.includes("مرتفع")
          ) {
            return "high";
          }
          if (
            risk.includes("medium") ||
            risk.includes("moderate") ||
            risk.includes("متوسط")
          ) {
            return "med";
          }
          return "low";
        })(),
        vy: q.riskLevel,
      }));
  }, [populationData]);

  const topExposedQism = useMemo(() => {
    const qisms = populationData?.qisms || [];
    if (qisms.length === 0) {
      return null;
    }

    return [...qisms].sort(
      (left, right) => Number(right.exposedPopulation || 0) - Number(left.exposedPopulation || 0),
    )[0];
  }, [populationData]);

  const exposedShare = useMemo(() => {
    const total = Number(populationData?.totalPopulation || 0);
    const exposed = Number(populationData?.exposedPopulation || 0);

    if (!total || exposed <= 0) {
      return null;
    }

    return (exposed / total) * 100;
  }, [populationData]);

  const mapRiskLabel = useMemo(() => {
    const value = String(mapData?.riskLevel || "").toLowerCase();

    if (
      value.includes("critical") ||
      value.includes("severe") ||
      value.includes("extreme") ||
      value.includes("شديد") ||
      value.includes("كارث")
    ) {
      return "حرج";
    }

    if (value.includes("high") || value.includes("مرتفع")) {
      return "مرتفع";
    }

    if (value.includes("medium") || value.includes("moderate") || value.includes("متوسط")) {
      return "متوسط";
    }

    if (value) {
      return "منخفض";
    }

    return "غير متوفر";
  }, [mapData?.riskLevel]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
      <Header active="analytics" />

      <main className="container mx-auto px-6 py-8">
        {/* Top Header Section */}
        <div className="mb-8 animate-slide-up">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              تحليل ضعف السكان
            </h1>
            <p className="text-gray-500 text-sm">
              تصور تأثيرات ارتفاع مستوى سطح البحر (SLR) على توزيع السكان تحت
              سيناريوهات IPCC SSP.
            </p>
          </div>
        </div>

        {/* Main Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full animate-slide-up delay-100">
          {/* Map Section (Main visual) - Takes 8 columns */}
          <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative min-h-[500px]">
            {/* Leaflet Risk Map */}
            <div className="absolute inset-0 z-0">
              <RiskMap
                className="h-full rounded-none border-0"
                showLegend={false}
                defaultDensityVisible={false}
                showStatsOverlay={true}
              />
            </div>

            {/* Map Floating Card */}
            <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur shadow-lg rounded-xl p-4 max-w-xs border border-gray-100">
              <h3 className="font-bold text-sm text-gray-800 mb-2">
                حالة الخطر الحالية ({selectedYear})
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">السيناريو</span>
                  <span className="font-bold">{selectedScenario}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">مستوى الخطر</span>
                  <span className="font-bold text-orange-600">{mapRiskLabel}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">المناطق المهددة</span>
                  <span className="font-bold text-red-600">
                    {dashboardData?.highRiskAreas.length || 0} مناطق
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">أعلى قسم تعرضا</span>
                  <span className="font-bold text-gray-800 truncate max-w-[110px]">
                    {topExposedQism?.name || "--"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">نسبة التعرض السكاني</span>
                  <span className="font-bold text-blue-600">
                    {exposedShare !== null ? `${exposedShare.toFixed(1)}%` : "--"}
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <span>منخفض</span>
                  <div className="h-2 w-full rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500"></div>
                  <span>مرتفع</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Side Stats Panel - Takes 4 columns */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Stat Card 1: Total Exposed Population */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden group hover:border-blue-500/30 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-xs font-bold uppercase mb-1">
                    إجمالي السكان المعرضين للخطر
                  </p>
                  <h3 className="text-4xl font-extrabold text-gray-900 mb-2">
                    {dashboardData?.populationAtRisk.toLocaleString() || "--"}
                  </h3>
                  <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded flex items-center w-fit gap-1">
                    متزايد سنوياً ↗
                  </span>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Stat Card 2: Critical Infrastructure */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 group hover:border-yellow-500/30 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-xs font-bold uppercase mb-1">
                    المساحة المغمورة (كم²)
                  </p>
                  <h3 className="text-4xl font-extrabold text-gray-900 mb-2">
                    {dashboardData?.floodedAreaKm2 || "--"}
                  </h3>
                  <span className="bg-yellow-50 text-yellow-700 text-xs font-bold px-2 py-1 rounded flex items-center w-fit gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    مؤشر خطير
                  </span>
                </div>
                <div className="bg-yellow-50 p-3 rounded-xl text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Chart Card: Housing Vulnerability */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">ضعف الإسكان</h3>
                <button className="text-gray-400 hover:text-gray-600">
                  •••
                </button>
              </div>

              <div className="flex-1 min-h-[180px] relative flex justify-center items-center">
                {housingData.length > 0 ? (
                  <>
                    {/* Donut Chart Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-extrabold text-gray-900">
                        {vulnerabilityIndex !== null ? `${vulnerabilityIndex.toFixed(1)}%` : "--"}
                      </span>
                      <span className="text-xs font-bold text-gray-500 uppercase">
                        {vulnerabilityLevel !== "--" ? `مستوى ${vulnerabilityLevel}` : "مؤشر الضعف"}
                      </span>
                    </div>

                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={housingData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {housingData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <div className="text-gray-400 text-sm">
                    لا توجد بيانات (بانتظار الربط)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row - Analysis Charts */}
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Exposure Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800">
                  التعرض حسب السيناريو (2030-2100)
                </h3>
              </div>
              {/* Line Chart for Exposure Data */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  {exposureData.length > 0 ? (
                    <LineChart data={exposureData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e5e7eb"
                      />
                      <XAxis
                        dataKey="year"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="ssp1"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ fill: "#2563eb", r: 4 }}
                        name="SSP1-2.6"
                      />
                      <Line
                        type="monotone"
                        dataKey="ssp5"
                        stroke="#ef4444"
                        strokeWidth={3}
                        dot={{ fill: "#ef4444", r: 4 }}
                        name="SSP5-8.5"
                      />
                    </LineChart>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                      لا توجد بيانات تاريخية متاحة
                    </div>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* District Ranking Table */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800">
                  تصنيف الأحياء (تأثر الأقسام)
                </h3>
                <button className="text-blue-600 text-xs font-bold hover:underline">
                  تصدير CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-3 text-xs font-bold text-gray-500">
                        الترتيب
                      </th>
                      <th className="pb-3 text-xs font-bold text-gray-500">
                        اسم القسم
                      </th>
                      <th className="pb-3 text-xs font-bold text-gray-500">
                        السكان المتأثرين
                      </th>
                      <th className="pb-3 text-xs font-bold text-gray-500">
                        مؤشر الضعف
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {districtsData.length > 0 ? (
                      districtsData.map((district) => (
                        <tr
                          key={district.rank}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 font-bold text-gray-900">
                            {district.rank}
                          </td>
                          <td className="py-3 text-gray-700">
                            {district.name}
                          </td>
                          <td className="py-3 font-mono font-bold">
                            {district.pop}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-bold ${
                                district.risk === "high"
                                  ? "bg-red-50 text-red-600"
                                  : district.risk === "med"
                                    ? "bg-orange-50 text-orange-600"
                                    : "bg-green-50 text-green-600"
                              }`}
                            >
                              {district.risk === "high"
                                ? "عالي"
                                : district.risk === "med"
                                  ? "متوسط"
                                  : "منخفض"}{" "}
                              ({district.vy})
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center py-4 text-gray-500"
                        >
                          جاري تحميل البيانات...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AnalyticsPage;
