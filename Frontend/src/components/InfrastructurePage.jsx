import React, { useState, useEffect, useMemo } from "react";
import Header from "./Header";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
  Circle,
  LayersControl,
  LayerGroup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  Share,
  Download,
  Anchor,
  Zap,
  Droplets,
  Activity,
  Info,
  ChevronDown,
  Home,
} from "lucide-react";
import { dataService } from "../services/dataService";
import { useToast } from "../contexts/useToast";
import { useRiskStore } from "../store/riskStore";

// Fix for default Leaflet marker icon
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const normalizeRiskValue = (risk) => {
  const value = String(risk || "").trim().toLowerCase();
  if (value === "critical" || value === "severe") {
    return "extreme";
  }

  if (value === "moderate") {
    return "medium";
  }

  return value;
};

const getRiskColor = (risk) => {
  if (risk === "extreme") return "#EF4444";
  if (risk === "high") return "#F97316";
  if (risk === "medium") return "#EAB308";
  return "#22C55E";
};

const getImpactRadiusMeters = (risk) => {
  if (risk === "extreme") return 950;
  if (risk === "high") return 700;
  if (risk === "medium") return 450;
  return 260;
};

const getRiskPriority = (risk) => {
  if (risk === "extreme") return 4;
  if (risk === "high") return 3;
  if (risk === "medium") return 2;
  return 1;
};

// Styled Google roads tiles with generic POIs hidden to reduce map clutter.
const GOOGLE_ROADS_NO_POI_TILE_URL =
  "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" +
  "&style=feature:poi%7Cvisibility:off" +
  "&style=feature:poi.business%7Cvisibility:off" +
  "&style=feature:poi.park%7Cvisibility:off" +
  "&style=feature:transit.station%7Cvisibility:off" +
  "&style=feature:road%7Celement:labels.icon%7Cvisibility:off";

const FitFilteredFacilitiesBounds = ({ facilities }) => {
  const map = useMap();

  useEffect(() => {
    if (!facilities || facilities.length === 0) {
      return;
    }

    const bounds = L.latLngBounds(
      facilities.map((facility) => [facility.lat, facility.lng]),
    );

    map.fitBounds(bounds.pad(0.2), {
      animate: true,
      duration: 0.8,
    });
  }, [facilities, map]);

  return null;
};

const InfrastructurePage = () => {
  const { addToast } = useToast();
  const { selectedScenario, selectedYear } = useRiskStore();
  const [selectedSectors, setSelectedSectors] = useState([
    "ports",
    "hospitals",
    "transport",
    "utilities",
  ]);
  const [selectedRisks, setSelectedRisks] = useState([
    "extreme",
    "high",
    "medium",
    "low",
  ]);

  // State for facilities
  const [facilities, setFacilities] = useState([]);
  const [modelHighRiskAreas, setModelHighRiskAreas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchFacilities = async () => {
      setIsLoading(true);

      try {
        // Fetch facility-level and model-level area context for the same scenario/year.
        // Facilities are filtered client-side, while modelHighRiskAreas provides cross-page area scope alignment.
        const [facilityData, dashboardData] = await Promise.all([
          dataService.getInfrastructureFacilities(selectedScenario, selectedYear),
          dataService.getDashboardData(selectedScenario, selectedYear),
        ]);

        if (isMounted) {
          setFacilities(facilityData);
          setModelHighRiskAreas(dashboardData?.highRiskAreas || []);
        }
      } catch (error) {
        console.error("Failed to fetch infrastructure data", error);
        if (isMounted) {
          setFacilities([]);
          setModelHighRiskAreas([]);
          addToast("تعذر تحميل بيانات البنية التحتية", "error");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchFacilities();

    return () => {
      isMounted = false;
    };
  }, [selectedScenario, selectedYear, addToast]);

  // Helper to create custom colored icons
  const createCustomIcon = (type, risk) => {
    const colorClass = getRiskColor(normalizeRiskValue(risk));

    // Creating HTML string for DivIcon
    // Note: In a real app we might use ReactDOMServer to render React icons to string
    // Here we use simple SVG strings or just colored markers div

    // Simplification: We will use standard markers but color filter them or use a simpler DivIcon approach
    // For this prototype, let's return a simple colored dot with valid HTML

    // Mapping Lucide Icons to simplified SVG strings
    let svgIcon = "";
    if (type === "ports")
      svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`;
    else if (type === "hospitals")
      svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
    else if (type === "transport")
      svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
    else
      svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;

    return L.divIcon({
      className: "custom-marker",
      html: `<div style="
        background-color: ${colorClass};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      ">${svgIcon}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  const riskCounts = useMemo(() => {
    const counts = {
      extreme: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    facilities.forEach((facility) => {
      const risk = normalizeRiskValue(facility.risk);
      if (risk in counts) {
        counts[risk] += 1;
      }
    });

    return counts;
  }, [facilities]);

  const filteredFacilities = useMemo(() => {
    return facilities.filter((facility) => {
      const facilityRisk = normalizeRiskValue(facility.risk);
      return (
        selectedSectors.includes(facility.type) &&
        selectedRisks.includes(facilityRisk)
      );
    });
  }, [facilities, selectedSectors, selectedRisks]);

  const highImpactFacilities = useMemo(() => {
    return filteredFacilities.filter((facility) => {
      const risk = normalizeRiskValue(facility.risk);
      return risk === "extreme" || risk === "high";
    });
  }, [filteredFacilities]);

  const deeplyFloodedFacilities = useMemo(() => {
    return filteredFacilities.filter(
      (facility) => (Number.parseFloat(facility.floodDepth) || 0) > 0.5,
    );
  }, [filteredFacilities]);

  const filteredRiskCounts = useMemo(() => {
    const counts = {
      extreme: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    filteredFacilities.forEach((facility) => {
      const risk = normalizeRiskValue(facility.risk);
      if (risk in counts) {
        counts[risk] += 1;
      }
    });

    return counts;
  }, [filteredFacilities]);

  const sectorCounts = useMemo(() => {
    return filteredFacilities.reduce(
      (acc, facility) => {
        const type = facility.type;
        if (type in acc) {
          acc[type] += 1;
        }
        return acc;
      },
      { ports: 0, hospitals: 0, transport: 0, utilities: 0 },
    );
  }, [filteredFacilities]);

  const topCriticalFacility = useMemo(() => {
    if (highImpactFacilities.length === 0) {
      return null;
    }

    return [...highImpactFacilities].sort((left, right) => {
      const riskDiff = getRiskPriority(normalizeRiskValue(right.risk)) - getRiskPriority(normalizeRiskValue(left.risk));
      if (riskDiff !== 0) {
        return riskDiff;
      }

      return (Number.parseFloat(right.floodDepth) || 0) - (Number.parseFloat(left.floodDepth) || 0);
    })[0];
  }, [highImpactFacilities]);

  const facilityCoveredQismsCount = useMemo(() => {
    return new Set(filteredFacilities.map((facility) => facility.qism)).size;
  }, [filteredFacilities]);

  const modelCoveredQismsCount = useMemo(() => {
    return new Set((modelHighRiskAreas || []).filter(Boolean)).size;
  }, [modelHighRiskAreas]);

  const averageFloodDepth = useMemo(() => {
    if (filteredFacilities.length === 0) {
      return 0;
    }

    const totalDepth = filteredFacilities.reduce((sum, facility) => {
      return sum + (Number.parseFloat(facility.floodDepth) || 0);
    }, 0);

    return totalDepth / filteredFacilities.length;
  }, [filteredFacilities]);

  const toCsvCell = (value) => {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };

  const handleDownloadReport = () => {
    if (filteredFacilities.length === 0) {
      addToast("لا توجد بيانات مطابقة للتصفية الحالية", "error");
      return;
    }

    const headers = [
      "Facility",
      "Qism",
      "Sector",
      "Risk",
      "FloodDepth",
      "Status",
      "Latitude",
      "Longitude",
      "Description",
    ];

    const rows = filteredFacilities.map((facility) => [
      facility.name,
      facility.qism,
      facility.typeLabel,
      facility.riskLabel,
      facility.floodDepth,
      facility.status,
      facility.lat.toFixed(5),
      facility.lng.toFixed(5),
      facility.description,
    ]);

    const csv =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) => row.map((value) => toCsvCell(value)).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `infrastructure-risk-${selectedScenario}-${selectedYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast("تم تنزيل تقرير البنية التحتية", "success");
  };

  const handleShare = async () => {
    const shareText = `تقييم البنية التحتية - ${selectedScenario} (${selectedYear})\nعدد المنشآت المطابقة: ${filteredFacilities.length}`;
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "تقييم البنية التحتية - الإسكندرية",
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        addToast("تم نسخ ملخص التقرير والرابط", "success");
        return;
      }

      addToast("المشاركة غير مدعومة في هذا المتصفح", "error");
    } catch (error) {
      console.error("Share failed", error);
      addToast("تعذر مشاركة التقرير", "error");
    }
  };

  const toggleSector = (sector) => {
    setSelectedSectors((prev) =>
      prev.includes(sector)
        ? prev.filter((s) => s !== sector)
        : [...prev, sector],
    );
  };

  const toggleRisk = (risk) => {
    setSelectedRisks((prev) =>
      prev.includes(risk) ? prev.filter((r) => r !== risk) : [...prev, risk],
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
      <Header active="infrastructure" />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar - Filters */}
        <aside className="w-full lg:w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto z-10 shadow-lg">
          <div className="mb-8">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              القطاعات الحيوية
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={selectedSectors.includes("ports")}
                  onChange={() => toggleSector("ports")}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md">
                  <Anchor className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  الموانئ والنقل البحري
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={selectedSectors.includes("hospitals")}
                  onChange={() => toggleSector("hospitals")}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="p-1.5 bg-red-100 text-red-600 rounded-md">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  المستشفيات
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={selectedSectors.includes("transport")}
                  onChange={() => toggleSector("transport")}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="p-1.5 bg-yellow-100 text-yellow-600 rounded-md">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  النقل
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={selectedSectors.includes("utilities")}
                  onChange={() => toggleSector("utilities")}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="p-1.5 bg-cyan-100 text-cyan-700 rounded-md">
                  <Droplets className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  المرافق (مياه وكهرباء)
                </span>
              </label>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              شدة المخاطر
            </h2>
            <div className="space-y-2">
              <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRisks.includes("extreme")}
                    onChange={() => toggleRisk("extreme")}
                    className="w-4 h-4 text-red-500 rounded focus:ring-red-400 border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    خطر حرج
                  </span>
                </div>
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {riskCounts.extreme}
                </span>
              </label>

              <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRisks.includes("high")}
                    onChange={() => toggleRisk("high")}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400 border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    خطر مرتفع
                  </span>
                </div>
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {riskCounts.high}
                </span>
              </label>
              <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRisks.includes("medium")}
                    onChange={() => toggleRisk("medium")}
                    className="w-4 h-4 text-yellow-500 rounded focus:ring-yellow-400 border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    خطر متوسط
                  </span>
                </div>
                <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {riskCounts.medium}
                </span>
              </label>
              <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRisks.includes("low")}
                    onChange={() => toggleRisk("low")}
                    className="w-4 h-4 text-green-500 rounded focus:ring-green-400 border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    خطر منخفض
                  </span>
                </div>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {riskCounts.low}
                </span>
              </label>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">
              ملخص التأثير
            </h3>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-3xl font-extrabold text-gray-900">
                {isLoading ? (
                  <div className="h-8 w-12 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  deeplyFloodedFacilities.length
                )}
              </span>
              <span className="text-sm font-bold text-gray-600 mb-1">
                منشأة حيوية
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              متوقع تعرضها للغمر &gt; 0.5م في ظل سيناريو {selectedScenario}{" "}
              بحلول عام {selectedYear}.
            </p>
            {!isLoading && (
              <p className="text-[11px] text-gray-400 mt-1">
                من إجمالي {filteredFacilities.length} منشأة مرئية.
              </p>
            )}
          </div>
        </aside>

        {/* Main Content - Map */}
        <div className="flex-1 relative flex flex-col">
          {/* Map Header Overlay */}
          <div className="absolute top-4 right-4 left-4 z-[400] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pointer-events-none">
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-100 pointer-events-auto">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Home className="w-3 h-3" /> / تقييم البنية التحتية
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                تقييم البنية التحتية والمرافق - الإسكندرية
              </h1>
            </div>

            <div className="flex gap-2 pointer-events-auto">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-bold shadow-lg border border-gray-100 transition-colors"
              >
                <Share className="w-4 h-4" />
                مشاركة
              </button>
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-600/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                تحميل التقرير
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="absolute inset-0 z-[500] bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold text-gray-700 shadow">
                جاري تحديث خريطة المنشآت...
              </div>
            </div>
          )}

          <MapContainer
            center={[31.2001, 29.9187]}
            zoom={12}
            scrollWheelZoom={true}
            className="flex-1 w-full h-full z-0"
            zoomControl={false}
          >
            <ZoomControl position="bottomright" />
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="خريطة الطرق">
                <TileLayer
                  attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                  url={GOOGLE_ROADS_NO_POI_TILE_URL}
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="قمر صناعي">
                <TileLayer
                  attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                  url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                />
              </LayersControl.BaseLayer>

              <LayersControl.Overlay name="نطاق التأثير المتوقع">
                <LayerGroup>
                  {highImpactFacilities.map((facility) => {
                    const normalizedRisk = normalizeRiskValue(facility.risk);
                    const ringColor = getRiskColor(normalizedRisk);

                    return (
                      <Circle
                        key={`${facility.id}-impact`}
                        center={[facility.lat, facility.lng]}
                        radius={getImpactRadiusMeters(normalizedRisk)}
                        pathOptions={{
                          color: ringColor,
                          fillColor: ringColor,
                          fillOpacity: 0.12,
                          weight: 1.5,
                        }}
                      />
                    );
                  })}
                </LayerGroup>
              </LayersControl.Overlay>

              <LayersControl.Overlay checked name="المنشآت الحيوية">
                <LayerGroup>
                  {filteredFacilities.map((facility) => (
                    <Marker
                      key={facility.id}
                      position={[facility.lat, facility.lng]}
                      icon={createCustomIcon(facility.type, facility.risk)}
                    >
                      <Popup className="font-arabic custom-popup">
                        <div className="p-1 min-w-[200px]" dir="rtl">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-bold text-gray-900 text-base">
                                {facility.name}
                              </h3>
                              <span className="text-xs text-gray-500">
                                {facility.typeLabel}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                facility.risk === "extreme"
                                  ? "bg-red-100 text-red-600"
                                  : facility.risk === "high"
                                    ? "bg-orange-100 text-orange-600"
                                    : facility.risk === "medium"
                                      ? "bg-yellow-100 text-yellow-600"
                                      : "bg-green-100 text-green-600"
                              }`}
                            >
                              {facility.riskLabel}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <div>
                              <span className="text-[10px] text-gray-500 block">
                                عمق الغمر
                              </span>
                              <span className="font-bold text-sm text-gray-800">
                                {facility.floodDepth}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-500 block">
                                الحالة
                              </span>
                              <span
                                className={`font-bold text-sm ${
                                  facility.status === "Critical"
                                    ? "text-red-600"
                                    : facility.status === "Warning"
                                      ? "text-orange-500"
                                      : "text-green-600"
                                }`}
                              >
                                {facility.status}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-gray-500 mb-2">
                            القسم: <span className="font-bold text-gray-700">{facility.qism}</span>
                          </p>

                          <div className="grid grid-cols-2 gap-2 mb-2 text-[11px] text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-2">
                            <div>
                              إحداثيات: <span className="font-bold">{facility.lat.toFixed(4)}, {facility.lng.toFixed(4)}</span>
                            </div>
                            <div>
                              نطاق التأثير: <span className="font-bold">{getImpactRadiusMeters(normalizeRiskValue(facility.risk))}م</span>
                            </div>
                            <div className="col-span-2">
                              سيناريو العرض: <span className="font-bold">{selectedScenario} - {selectedYear}</span>
                            </div>
                          </div>

                          <p className="text-xs text-gray-600 mb-3 bg-white p-2 border border-gray-100 rounded">
                            <Info className="w-3 h-3 inline ml-1 text-blue-500" />
                            {facility.description}
                          </p>

                          <button className="w-full flex items-center justify-center gap-1 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-blue-600 rounded-lg text-xs font-bold transition-colors shadow-sm">
                            عرض التحليل الكامل
                            <ChevronDown className="w-3 h-3 rotate-90" />
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </LayerGroup>
              </LayersControl.Overlay>
            </LayersControl>

            <FitFilteredFacilitiesBounds facilities={filteredFacilities} />

            {filteredFacilities.length === 0 && (
              <div className="leaflet-top leaflet-left">
                <div className="leaflet-control bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-xs font-bold text-gray-600 mt-2 ml-2">
                  لا توجد منشآت مطابقة للتصفية الحالية
                </div>
              </div>
            )}
          </MapContainer>

          <div className="absolute bottom-4 right-4 z-[400] bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl p-3 shadow-lg text-xs text-gray-700 space-y-2 max-w-[250px]">
            <div className="font-bold text-gray-900">ملخص الخريطة</div>
            <div className="flex justify-between">
              <span>منشآت مرئية</span>
              <span className="font-bold">{filteredFacilities.length}</span>
            </div>
            <div className="flex justify-between">
              <span>منشآت عالية التأثير</span>
              <span className="font-bold text-red-600">{highImpactFacilities.length}</span>
            </div>
            <div className="flex justify-between">
              <span>الأقسام المتأثرة (النموذج)</span>
              <span className="font-bold">{modelCoveredQismsCount}</span>
            </div>
            <div className="flex justify-between">
              <span>أقسام المنشآت المرئية</span>
              <span className="font-bold">{facilityCoveredQismsCount}</span>
            </div>
            <div className="flex justify-between">
              <span>متوسط عمق الغمر</span>
              <span className="font-bold">{averageFloodDepth.toFixed(2)} م</span>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <div className="text-[11px] font-bold text-gray-800 mb-1">توزيع القطاعات</div>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-600">
                <div className="bg-blue-50 rounded px-2 py-1 text-center">موانئ: {sectorCounts.ports}</div>
                <div className="bg-red-50 rounded px-2 py-1 text-center">مستشفيات: {sectorCounts.hospitals}</div>
                <div className="bg-yellow-50 rounded px-2 py-1 text-center">نقل: {sectorCounts.transport}</div>
                <div className="bg-cyan-50 rounded px-2 py-1 text-center">مرافق: {sectorCounts.utilities}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span>حرج ({filteredRiskCounts.extreme})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                <span>مرتفع ({filteredRiskCounts.high})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                <span>متوسط ({filteredRiskCounts.medium})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                <span>منخفض ({filteredRiskCounts.low})</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-600 leading-5">
              {topCriticalFacility ? (
                <>
                  منشأة حرجة حاليا: <span className="font-bold text-gray-800">{topCriticalFacility.name}</span>
                </>
              ) : (
                <>لا توجد منشأة حرجة حاليا</>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InfrastructurePage;

