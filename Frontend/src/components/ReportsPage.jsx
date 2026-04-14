import React, { useState, useEffect, useMemo } from "react";
import Header from "./Header";
import {
  FileText,
  Download,
  ChevronDown,
  AlertTriangle,
  Users,
  Building2,
  Anchor,
  LayoutGrid,
  List,
  ArrowRight,
  Waves,
  Home,
  Share,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip as LeafletTooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useToast } from "../contexts/useToast";
import { useRiskStore } from "../store/riskStore";
import { dataService } from "../services/dataService";

const toRiskBucket = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    normalized.includes("critical") ||
    normalized.includes("severe") ||
    normalized.includes("extreme") ||
    normalized.includes("شديد") ||
    normalized.includes("كارث") ||
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
};

const toInformalExposureLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    normalized.includes("critical") ||
    normalized.includes("severe") ||
    normalized.includes("extreme") ||
    normalized.includes("high") ||
    normalized.includes("مرتفع") ||
    normalized.includes("شديد") ||
    normalized.includes("كارث")
  ) {
    return "مرتفع";
  }

  if (normalized.includes("medium") || normalized.includes("moderate") || normalized.includes("متوسط")) {
    return "متوسط";
  }

  return "منخفض";
};

const QISM_COORDINATES = {
  "al gomrok": [31.206, 29.884],
  gomrok: [31.206, 29.884],
  "الجمرك": [31.206, 29.884],
  dekheila: [31.152, 29.828],
  "الدخيلة": [31.152, 29.828],
  "al montaza": [31.275, 30.015],
  "al montazah": [31.275, 30.015],
  "المنتزه": [31.275, 30.015],
  anfoushi: [31.213, 29.885],
  "الأنفوشي": [31.213, 29.885],
  "abu qir": [31.317, 30.062],
  "أبو قير": [31.317, 30.062],
  "حي شرق": [31.225, 29.95],
  "حي وسط": [31.198, 29.908],
};

const getQismCoordinates = (qismName, index) => {
  const key = String(qismName || "").trim().toLowerCase();
  const base = QISM_COORDINATES[key] || [31.2001, 29.9187];
  const latShift = ((index % 3) - 1) * 0.004;
  const lngShift = ((index % 4) - 1.5) * 0.003;

  return [base[0] + latShift, base[1] + lngShift];
};

const getRiskColor = (bucket) => {
  if (bucket === "extreme") return "#EF4444";
  if (bucket === "high") return "#F97316";
  if (bucket === "medium") return "#F59E0B";
  return "#22C55E";
};

const getRiskLabelAr = (bucket) => {
  if (bucket === "extreme") return "حرج";
  if (bucket === "high") return "مرتفع";
  if (bucket === "medium") return "متوسط";
  return "منخفض";
};

const ReportsPage = () => {
  const { addToast } = useToast();
  const { selectedScenario, selectedYear } = useRiskStore();

  const [floodData, setFloodData] = useState([]);
  const [populationData, setPopulationData] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [mapRiskData, setMapRiskData] = useState(null);
  const [populationRiskData, setPopulationRiskData] = useState(null);
  const [infrastructureFacilities, setInfrastructureFacilities] = useState([]);
  const [selectedQism, setSelectedQism] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchReportData = async () => {
      setIsLoading(true);

      try {
        const [stats, dashboard, mapRisk, populationRisk, facilities] = await Promise.all([
          dataService.getReportStatistics(selectedScenario, selectedYear),
          dataService.getDashboardData(selectedScenario, selectedYear),
          dataService.getMapRiskData(selectedScenario, selectedYear),
          dataService.getPopulationRisk(selectedScenario, selectedYear),
          dataService.getInfrastructureFacilities(selectedScenario, selectedYear),
        ]);

        if (!isMounted) {
          return;
        }

        setFloodData(stats.floodData || []);
        setPopulationData(stats.populationData || []);
        setDashboardData(dashboard || null);
        setMapRiskData(mapRisk || null);
        setPopulationRiskData(populationRisk || null);
        setInfrastructureFacilities(facilities || []);
      } catch (error) {
        console.error("Failed to fetch report statistics", error);
        if (isMounted) {
          setFloodData([]);
          setPopulationData([]);
          setDashboardData(null);
          setMapRiskData(null);
          setPopulationRiskData(null);
          setInfrastructureFacilities([]);
          addToast("تعذر تحميل بيانات التقرير", "error");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchReportData();

    return () => {
      isMounted = false;
    };
  }, [selectedScenario, selectedYear, addToast]);

  useEffect(() => {
    if (selectedQism === "all") {
      return;
    }

    const exists = (populationRiskData?.qisms || []).some(
      (qism) => qism.name === selectedQism,
    );

    if (!exists) {
      setSelectedQism("all");
    }
  }, [populationRiskData, selectedQism]);

  const qismOptions = useMemo(() => {
    return Array.from(
      new Set((populationRiskData?.qisms || []).map((qism) => qism.name)),
    );
  }, [populationRiskData]);

  const exposedPopulation =
    populationData.find((item) =>
      String(item.name || "").toLowerCase().includes("exposed"),
    )?.value ?? null;

  const floodedArea =
    floodData.find((item) =>
      String(item.name || "").toLowerCase().includes("flooded area"),
    )?.value ?? null;

  const predictedSeaLevel =
    floodData.find((item) =>
      String(item.name || "").toLowerCase().includes("predicted sea level"),
    )?.value ?? null;

  const baselineThreshold =
    floodData.find((item) =>
      String(item.name || "").toLowerCase().includes("baseline threshold"),
    )?.value ?? null;

  const totalPopulation =
    populationData.find((item) =>
      String(item.name || "").toLowerCase().includes("total population"),
    )?.value ?? null;

  const exposedPopulationRatio =
    exposedPopulation !== null && totalPopulation && Number(totalPopulation) > 0
      ? (Number(exposedPopulation) / Number(totalPopulation)) * 100
      : null;

  const mapRiskBucket = mapRiskData?.riskLevel
    ? toRiskBucket(mapRiskData.riskLevel)
    : null;
  const mapRiskLabel = mapRiskBucket ? getRiskLabelAr(mapRiskBucket) : "غير متوفر";

  const mapRiskBadgeClasses =
    mapRiskBucket === "extreme"
      ? "text-red-700 bg-red-50"
      : mapRiskBucket === "high"
        ? "text-orange-700 bg-orange-50"
        : mapRiskBucket === "medium"
          ? "text-yellow-700 bg-yellow-50"
          : mapRiskBucket === "low"
            ? "text-green-700 bg-green-50"
            : "text-gray-700 bg-gray-100";

  const generatedAtLabel = useMemo(
    () =>
      new Date().toLocaleDateString("ar-EG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  const sortedFloodData = useMemo(() => {
    return [...floodData].sort((a, b) => Number(b.value) - Number(a.value));
  }, [floodData]);

  const filteredQisms = (populationRiskData?.qisms || []).filter((qism) =>
    selectedQism === "all" ? true : qism.name === selectedQism,
  );

  const informalDensityPoints = useMemo(() => {
    const rawPoints = filteredQisms.map((qism, index) => {
      const [lat, lng] = getQismCoordinates(qism.name, index);
      const exposedPopulation = Number(qism.exposedPopulation || 0);
      const riskBucket = toRiskBucket(qism.riskLevel);

      return {
        id: `${qism.name}-${index}`,
        name: qism.name,
        lat,
        lng,
        exposedPopulation,
        riskBucket,
      };
    });

    const maxExposedPopulation = rawPoints.reduce(
      (max, point) => Math.max(max, point.exposedPopulation),
      0,
    );

    return rawPoints.map((point) => ({
      ...point,
      radius:
        maxExposedPopulation > 0
          ? 6 + (point.exposedPopulation / maxExposedPopulation) * 12
          : 8,
    }));
  }, [filteredQisms]);

  const informalMapCenter = useMemo(() => {
    if (informalDensityPoints.length === 0) {
      return [31.2001, 29.9187];
    }

    const totals = informalDensityPoints.reduce(
      (acc, point) => ({
        lat: acc.lat + point.lat,
        lng: acc.lng + point.lng,
      }),
      { lat: 0, lng: 0 },
    );

    return [
      totals.lat / informalDensityPoints.length,
      totals.lng / informalDensityPoints.length,
    ];
  }, [informalDensityPoints]);

  const informalRiskCounts = useMemo(() => {
    return informalDensityPoints.reduce(
      (acc, point) => {
        if (point.riskBucket === "extreme") acc.extreme += 1;
        else if (point.riskBucket === "high") acc.high += 1;
        else if (point.riskBucket === "medium") acc.medium += 1;
        else acc.low += 1;

        return acc;
      },
      {
        extreme: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    );
  }, [informalDensityPoints]);

  const informalTotalExposed = useMemo(() => {
    return informalDensityPoints.reduce(
      (sum, point) => sum + point.exposedPopulation,
      0,
    );
  }, [informalDensityPoints]);

  const topInformalPoint = useMemo(() => {
    if (informalDensityPoints.length === 0) {
      return null;
    }

    return [...informalDensityPoints].sort(
      (left, right) => right.exposedPopulation - left.exposedPopulation,
    )[0];
  }, [informalDensityPoints]);

  // Changed from "highRisk" strictly over index thresholds to "top exposed"
  // to align with the "threatened areas" language in AnalyticsPage
  const topExposedQisms = [...filteredQisms]
    .sort((a, b) => Number(b.exposedPopulation || 0) - Number(a.exposedPopulation || 0));

  const topAreaNames =
    topExposedQisms.map((qism) => qism.name).slice(0, 3).join("، ") ||
    (dashboardData?.highRiskAreas || []).slice(0, 3).join("، ") ||
    "لا توجد بيانات كافية";

  const filteredInfrastructure = (infrastructureFacilities || []).filter((facility) =>
    selectedQism === "all" ? true : facility.qism === selectedQism,
  );

  const criticalAssets = filteredInfrastructure.filter((facility) => {
    const bucket = toRiskBucket(facility?.risk);
    return bucket === "high" || bucket === "extreme";
  });

  const impactedQismsCount = new Set(criticalAssets.map((facility) => facility.qism)).size;
  const criticalImpactedSectorsCount = new Set(criticalAssets.map((facility) => facility.type)).size;
  const impactedSectorsCount = new Set(filteredInfrastructure.map((facility) => facility.type)).size;

  const criticalAssetsNames =
    criticalAssets.map((facility) => facility.name).slice(0, 2).join("، ") ||
    "لا توجد بيانات كافية";

  const averageCriticalFloodDepth = useMemo(() => {
    if (criticalAssets.length === 0) {
      return 0;
    }

    const totalDepth = criticalAssets.reduce(
      (sum, facility) => sum + (Number.parseFloat(facility.floodDepth) || 0),
      0,
    );

    return totalDepth / criticalAssets.length;
  }, [criticalAssets]);

  const exposedPopulationSeverity = useMemo(() => {
    if (exposedPopulationRatio === null) {
      return { label: "غير متوفر", classes: "text-gray-700 bg-gray-100 border-gray-200" };
    }

    if (exposedPopulationRatio >= 3) {
      return { label: "حرج", classes: "text-red-700 bg-red-50 border-red-100" };
    }

    if (exposedPopulationRatio >= 1.5) {
      return { label: "مرتفع", classes: "text-orange-700 bg-orange-50 border-orange-100" };
    }

    if (exposedPopulationRatio >= 0.7) {
      return { label: "متوسط", classes: "text-yellow-700 bg-yellow-50 border-yellow-100" };
    }

    return { label: "منخفض", classes: "text-green-700 bg-green-50 border-green-100" };
  }, [exposedPopulationRatio]);

  const infrastructureImpactSeverity = useMemo(() => {
    if (criticalAssets.length === 0) {
      return { label: "منخفض", classes: "text-green-700 bg-green-50 border-green-100" };
    }

    if (criticalAssets.length >= 4 || averageCriticalFloodDepth >= 1.0) {
      return { label: "حرج", classes: "text-red-700 bg-red-50 border-red-100" };
    }

    if (criticalAssets.length >= 2 || averageCriticalFloodDepth >= 0.5) {
      return { label: "مرتفع", classes: "text-orange-700 bg-orange-50 border-orange-100" };
    }

    return { label: "مراقبة", classes: "text-blue-700 bg-blue-50 border-blue-100" };
  }, [criticalAssets, averageCriticalFloodDepth]);

  const informalExposureLabel = toInformalExposureLabel(
    populationRiskData?.informalSettlementsExposure,
  );

  const informalSettlementsText =
    informalExposureLabel === "مرتفع"
      ? "الأحياء العشوائية الساحلية تواجه تعرضا مرتفعا وتحتاج خطط تدخل عاجلة."
      : informalExposureLabel === "متوسط"
        ? "الأحياء العشوائية تظهر تعرضا متوسطا وتحتاج تعزيز الحماية والإنذار المبكر."
        : "التعرض الحالي منخفض نسبيا مع الحاجة لاستمرار الرصد الميداني.";

  const handleExportCSV = () => {
    // Generate CSV content
    const headers = [
      "Year",
      "Flood Risk (%)",
      "Population Group",
      "Percentage",
    ];
    const rows = [
      ...sortedFloodData.map((d) => [d.name, d.value, "", ""]),
      ...populationData.map((d) => ["", "", d.name, d.value]),
      ["Threatened Qisms", topExposedQisms.length, "", ""],
      ["Critical Assets", criticalAssets.length, "", ""],
      ["Informal Settlements Exposure", informalExposureLabel, "", ""],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      headers.join(",") +
      "\n" +
      rows.map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "alexandria_risk_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("تم تصدير التقرير بنجاح", "success");
  };

  const handlePrintPDF = () => {
    window.print();
    addToast("تم فتح نافذة الطباعة. اختر Save as PDF لحفظ التقرير", "info");
  };

  const handleShareReport = async () => {
    const summary = `تقرير المخاطر - ${selectedScenario} (${selectedYear})\nالأحياء المهددة: ${topExposedQisms.length}\nالأصول الحيوية المتأثرة: ${criticalAssets.length}`;
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "تقرير مخاطر الإسكندرية",
          text: summary,
          url,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${summary}\n${url}`);
        addToast("تم نسخ ملخص التقرير والرابط", "success");
        return;
      }

      addToast("المشاركة غير مدعومة في هذا المتصفح", "error");
    } catch (error) {
      console.error("Failed to share report", error);
      addToast("تعذر مشاركة التقرير", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900" dir="rtl">
      <Header active="reports" />

      <main className="container mx-auto px-6 py-8 space-y-8 print:py-0 print:px-0">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              تقارير المخاطر ورؤى السياسات
            </h1>
            <p className="text-gray-500 max-w-2xl">
              تقييم شامل لضعف السواحل في محافظة الإسكندرية، مصر، لدعم اتخاذ
              القرارات والتخطيط الحضري.
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-bold shadow-sm transition-colors">
            <FileText className="w-4 h-4" />
            عرض المنهجية
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col xl:flex-row items-center justify-between gap-4 shadow-sm animate-slide-up delay-100 print:hidden">
          {/* Filters Group */}
          <div className="flex flex-wrap gap-4 w-full xl:w-auto">
            <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 min-w-[200px] hover:border-blue-500/50 transition-all">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                المستوى الإداري
              </span>
              <div className="relative">
                <select
                  value={selectedQism}
                  onChange={(event) => setSelectedQism(event.target.value)}
                  className="w-full appearance-none bg-transparent text-gray-900 text-sm font-bold focus:outline-none pr-0"
                >
                  <option value="all">كل الأقسام</option>
                  {qismOptions.map((qism) => (
                    <option key={qism} value={qism}>
                      {qism}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Action Buttons Group */}
          <div className="flex gap-3 w-full xl:w-auto justify-end">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              تصدير CSV
            </button>
            <button
              onClick={handleShareReport}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-bold shadow-sm transition-colors"
            >
              <Share className="w-4 h-4" />
              مشاركة
            </button>
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-600/20 transition-colors"
            >
              <FileText className="w-4 h-4" />
              تحميل PDF
            </button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up delay-100">
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                المساحة المغمورة المتوقعة
              </h3>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-3xl font-extrabold text-gray-900 mb-1">
              {isLoading
                ? "--"
                : floodedArea !== null
                  ? `${Number(floodedArea).toFixed(2)} كم²`
                  : "--"}
            </div>
            <div className={`flex items-center gap-2 text-xs font-bold px-2 py-1 rounded w-fit ${mapRiskBadgeClasses}`}>
              <span>
                {isLoading
                  ? "--"
                  : `مستوى الخطر: ${mapRiskLabel}`}
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm group hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                السكان المعرضون للخطر
              </h3>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-extrabold text-gray-900 mb-1">
              {isLoading
                ? "--"
                : exposedPopulation !== null
                  ? Number(exposedPopulation).toLocaleString()
                  : "--"}
            </div>
            <div className={`flex items-center gap-2 text-xs font-bold px-2 py-1 rounded w-fit border ${exposedPopulationSeverity.classes}`}>
              <Users className="w-3 h-3" />
              <span>شدة التعرض: {isLoading ? "--" : exposedPopulationSeverity.label}</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm group hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                الأحياء المهددة
              </h3>
              <LayoutGrid className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-extrabold text-gray-900 mb-1">
              {isLoading ? "--" : `${topExposedQisms.length} أحياء`}
            </div>
            <p className="text-xs text-gray-500 truncate">{topAreaNames}</p>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm group hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                الأصول الحيوية
              </h3>
              <Anchor className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-extrabold text-gray-900 mb-1">
              {isLoading ? "--" : criticalAssets.length}
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit">
              <span>{criticalAssetsNames}</span>
            </div>
          </div>
        </div>

        {/* Detailed Analysis Title */}
        <div className="flex justify-between items-center pt-8 animate-slide-up delay-200">
          <h2 className="text-2xl font-bold text-gray-900">
            تحليل التقرير المفصل
          </h2>
          <div className="flex bg-white border border-gray-200 rounded-lg p-1">
            <button className="p-2 hover:bg-gray-50 rounded">
              <LayoutGrid className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-50 rounded">
              <List className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Detailed Analysis Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up delay-200">
          {/* Analysis Card 1: Coastal Flood Risk */}
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Waves className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  مخاطر الفيضانات الساحلية
                </h3>
              </div>
              <span className="bg-red-50 text-red-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-red-100">
                {mapRiskLabel}
              </span>
            </div>

            <div className="h-48 w-full bg-gray-50 rounded-xl mb-6 relative overflow-hidden flex items-center justify-center">
              {sortedFloodData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedFloodData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e5e7eb"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "#e0f2fe" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-gray-400 text-sm">
                  انتظار البيانات...
                </span>
              )}
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-sm text-gray-600 font-medium">
                {floodedArea !== null
                  ? `المساحة المغمورة المتوقعة تبلغ ${Number(floodedArea).toFixed(2)} كم² ضمن سيناريو ${selectedScenario} في عام ${selectedYear}.`
                  : "لا توجد بيانات كافية لعرض تفاصيل الفيضانات حالياً."}
              </p>
              <ul className="space-y-2">
                <li className="flex gap-2 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                  مستوى البحر المتوقع: {predictedSeaLevel !== null
                    ? `${Number(predictedSeaLevel).toFixed(0)} مم`
                    : "--"}
                </li>
                <li className="flex gap-2 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                  خط الأساس المرجعي: {baselineThreshold !== null
                    ? `${Number(baselineThreshold).toFixed(0)} مم`
                    : "--"}
                </li>
              </ul>
            </div>

            <button className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider group-hover:gap-3 transition-all">
              استكشاف البيانات <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Analysis Card 2: Population Exposure */}
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  التعرض السكاني
                </h3>
              </div>
              <span className="bg-yellow-50 text-yellow-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-yellow-100">
                {isLoading ? "--" : exposedPopulationSeverity.label}
              </span>
            </div>

            <div className="flex justify-center mb-6 h-48 relative">
              {populationData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={populationData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {populationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-3xl font-extrabold text-slate-800">
                      {exposedPopulationRatio !== null
                        ? `${exposedPopulationRatio.toFixed(1)}%`
                        : "--"}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      من إجمالي السكان
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-xl">
                  <span className="text-gray-400 text-sm">
                    انتظار البيانات...
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-sm text-gray-600 font-medium">
                {exposedPopulation !== null
                  ? `يعيش حوالي ${Number(exposedPopulation).toLocaleString()} ساكناً في مناطق معرضة للخطر ضمن سيناريو ${selectedScenario}.`
                  : "لا توجد بيانات كافية لعرض تفاصيل التعرض السكاني."}
              </p>
              <ul className="space-y-2">
                <li className="flex gap-2 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                  أعلى الأحياء المعرضة: {topAreaNames}
                </li>
                <li className="flex gap-2 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                  النسبة من إجمالي السكان: {exposedPopulationRatio !== null
                    ? `${exposedPopulationRatio.toFixed(1)}%`
                    : "--"}
                </li>
              </ul>
            </div>

            <button className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider group-hover:gap-3 transition-all">
              التوزيع الديموغرافي <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Analysis Card 3: Infrastructure Impact */}
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  تأثير البنية التحتية
                </h3>
              </div>
              <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                {isLoading ? "--" : infrastructureImpactSeverity.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="text-xs text-gray-500 font-bold mb-1">
                  الأصول عالية التأثير
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {isLoading ? "--" : criticalAssets.length}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="text-xs text-gray-500 font-bold mb-1">
                  قطاعات عالية التأثير
                </div>
                <div className="text-2xl font-bold text-orange-500">
                  {isLoading ? "--" : criticalImpactedSectorsCount}
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-sm text-gray-600 font-medium">
                {criticalAssets.length > 0
                  ? `تم تحديد ${criticalAssets.length} أصول حيوية عالية المخاطر موزعة على ${impactedQismsCount} أقسام.`
                  : "لا توجد أصول حيوية عالية المخاطر ضمن المرشحات الحالية."}
              </p>
              <ul className="space-y-2">
                <li className="flex gap-2 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                  إجمالي القطاعات المتأثرة (كل المنشآت المرئية): {impactedSectorsCount}
                </li>
                <li className="flex gap-2 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                  الأصول المتأثرة: {criticalAssetsNames}
                </li>
                <li className="flex gap-2 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                  متوسط عمق الغمر للأصول المتأثرة: {criticalAssets.length > 0
                    ? `${averageCriticalFloodDepth.toFixed(2)} م`
                    : "--"}
                </li>
              </ul>
            </div>

            <button className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider group-hover:gap-3 transition-all">
              جرد الأصول <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Analysis Card 4: Informal Settlements */}
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Home className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  المناطق العشوائية
                </h3>
              </div>
              <span
                className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border ${
                  informalExposureLabel === "مرتفع"
                    ? "bg-red-50 text-red-600 border-red-100"
                    : informalExposureLabel === "متوسط"
                      ? "bg-yellow-50 text-yellow-700 border-yellow-100"
                      : "bg-green-50 text-green-700 border-green-100"
                }`}
              >
                {isLoading ? "--" : informalExposureLabel}
              </span>
            </div>

            <div className="h-40 w-full rounded-xl mb-6 overflow-hidden border border-gray-200 relative z-0">
              {informalDensityPoints.length > 0 ? (
                <MapContainer
                  center={informalMapCenter}
                  zoom={11}
                  scrollWheelZoom={false}
                  zoomControl={false}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {informalDensityPoints.map((point) => (
                    <CircleMarker
                      key={point.id}
                      center={[point.lat, point.lng]}
                      radius={point.radius}
                      pathOptions={{
                        color: getRiskColor(point.riskBucket),
                        fillColor: getRiskColor(point.riskBucket),
                        fillOpacity: 0.65,
                        weight: 1.5,
                      }}
                    >
                      <LeafletTooltip direction="top" opacity={0.95}>
                        <div dir="rtl" className="text-right text-xs leading-5">
                          <div className="font-bold">{point.name}</div>
                          <div>
                            السكان المعرضون: {point.exposedPopulation.toLocaleString()}
                          </div>
                          <div>شدة الخطر: {getRiskLabelAr(point.riskBucket)}</div>
                          <div>
                            الحصة من الإجمالي: {informalTotalExposed > 0
                              ? `${((point.exposedPopulation / informalTotalExposed) * 100).toFixed(1)}%`
                              : "--"}
                          </div>
                        </div>
                      </LeafletTooltip>
                    </CircleMarker>
                  ))}
                </MapContainer>
              ) : (
                <div className="h-full w-full bg-slate-100 flex items-center justify-center text-gray-400 text-sm font-bold">
                  لا توجد بيانات كافية لعرض الخريطة
                </div>
              )}

              <div className="absolute top-2 right-2 bg-white/95 border border-gray-200 rounded-md px-2 py-1 text-[10px] text-gray-700 shadow-sm">
                نطاقات مرئية: {informalDensityPoints.length}
              </div>

              <div className="absolute bottom-2 right-2 bg-white/95 border border-gray-200 rounded-md px-2 py-1 text-[10px] text-gray-600 shadow-sm">
                حجم النقطة = كثافة أعلى
              </div>

              <div className="absolute bottom-2 left-2 bg-white/95 border border-gray-200 rounded-md px-2 py-1 text-[10px] text-gray-700 shadow-sm">
                إجمالي المعرضين: {informalTotalExposed.toLocaleString()}
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-sm text-gray-600 font-medium">
                {informalSettlementsText}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-red-50 border border-red-100 rounded-md px-2 py-1 text-red-700">
                  خطر حرج: {informalRiskCounts.extreme}
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-md px-2 py-1 text-orange-700">
                  خطر مرتفع: {informalRiskCounts.high}
                </div>
                <div className="bg-yellow-50 border border-yellow-100 rounded-md px-2 py-1 text-yellow-700">
                  خطر متوسط: {informalRiskCounts.medium}
                </div>
                <div className="bg-green-50 border border-green-100 rounded-md px-2 py-1 text-green-700">
                  خطر منخفض: {informalRiskCounts.low}
                </div>
              </div>

              <ul className="space-y-2">
                <li className="flex gap-2 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                  مستوى التعرض الحالي: {informalExposureLabel}
                </li>
                <li className="flex gap-2 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                  السكان المعرضون: {populationRiskData?.exposedPopulation
                    ? Number(populationRiskData.exposedPopulation).toLocaleString()
                    : "--"}
                </li>
                <li className="flex gap-2 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                  أعلى نقطة هشاشة: {topInformalPoint
                    ? `${topInformalPoint.name} (${topInformalPoint.exposedPopulation.toLocaleString()})`
                    : "--"}
                </li>
              </ul>
            </div>

            <button className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider group-hover:gap-3 transition-all">
              إرشادات السياسة الحضرية <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer / Methodology */}
        <div className="bg-slate-900 rounded-3xl p-8 md:p-12 text-white animate-fade-in mt-12">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="max-w-xl">
              <h3 className="text-xl font-bold mb-4 border-r-4 border-blue-500 pr-4">
                المنهجية ومصادر البيانات
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                يستخدم هذا التقييم نماذج المناخ العالمية CMIP6 المصغرة لحوض
                البحر الأبيض المتوسط. يتم استخلاص بيانات الارتفاع من مسوحات
                LiDAR بدقة 1 متر التي أجريت في عام 2023.
              </p>
              <p className="text-slate-600 text-[10px] mt-6 italic">
                إخلاء مسؤولية: هذا التقرير لأغراض التخطيط الحضري ومحاكاة
                السياسات فقط. قد تختلف أحداث الفيضانات الفعلية بناءً على الظروف
                الجوية المحلية وأداء الجدران البحرية.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">
                  نسخة النموذج
                </div>
                <div className="font-mono text-blue-400 font-bold">
                  Alex-CVI v4.2.1
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">
                  آخر تحديث
                </div>
                <div className="font-mono text-white">{generatedAtLabel}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">
                  موثوقية البيانات
                </div>
                <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
                  <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
                  غير متوفر
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
