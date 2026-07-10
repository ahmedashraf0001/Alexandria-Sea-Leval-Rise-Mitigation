import { useMemo, useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Popup,
  ZoomControl,
  LayersControl,
  LayerGroup,
  CircleMarker,
  Tooltip,
  GeoJSON,
  useMapEvents
} from "react-leaflet";
import { useRiskStore } from "../store/riskStore";
import L, { LatLngExpression } from "leaflet";
import { twMerge } from "tailwind-merge";
import { Layers, Map as MapIcon } from "lucide-react";

// Enhanced GeoJSON-like polygons for Alexandria districts hugging the coastline for a more professional look
const DISTRICTS: { name: string; position: [number, number][] }[] = [
  {
    name: "الجمرك", // Central hook/peninsula (Anfoushi/Gomrok)
    position: [
      [31.196, 29.878],
      [31.210, 29.874],
      [31.215, 29.878],
      [31.219, 29.885],
      [31.214, 29.892],
      [31.206, 29.896],
      [31.198, 29.889],
    ],
  },
  {
    name: "الدخيلة", // West
    position: [
      [31.135, 29.790],
      [31.145, 29.805],
      [31.155, 29.820],
      [31.150, 29.835],
      [31.147, 29.845],
      [31.138, 29.840],
      [31.128, 29.810],
    ],
  },
  {
    name: "المكس", // West Central
    position: [
      [31.147, 29.845],
      [31.155, 29.855],
      [31.159, 29.865],
      [31.152, 29.875],
      [31.142, 29.865],
      [31.138, 29.850],
    ],
  },
  {
    name: "حي وسط", // Central coastline
    position: [
      [31.198, 29.889],
      [31.206, 29.896],
      [31.212, 29.905],
      [31.207, 29.920],
      [31.190, 29.930],
      [31.185, 29.915],
      [31.190, 29.895],
    ],
  },
  {
    name: "حي شرق", // East Central
    position: [
      [31.207, 29.920],
      [31.220, 29.935],
      [31.230, 29.945],
      [31.239, 29.955],
      [31.230, 29.970],
      [31.215, 29.955],
      [31.195, 29.930],
    ],
  },
  {
    name: "المنتزه", // Long stretch East
    position: [
      [31.239, 29.955],
      [31.265, 29.980],
      [31.285, 30.010],
      [31.315, 30.060],
      [31.295, 30.075],
      [31.275, 30.040],
      [31.240, 30.010],
      [31.225, 29.975],
    ],
  },
  {
    name: "أبو قير", // Tip of East
    position: [
      [31.315, 30.060],
      [31.328, 30.055],
      [31.334, 30.065],
      [31.328, 30.082],
      [31.315, 30.095],
      [31.300, 30.085],
    ],
  },
];

const DISTRICT_ALIASES: Record<string, string[]> = {
  "الجمرك": ["الجمرك", "al gomrok", "gomrok", "الأنفوشي", "المنشية", "المدينة القديمة"],
  "الدخيلة": ["الدخيلة", "dekheila", "dekhela"],
  "المكس": ["المكس", "max", "el max"],
  "حي وسط": ["حي وسط", "وسط", "wassat", "wasat", "central", "محرم بك"],
  "حي شرق": ["حي شرق", "شرق", "east", "eastern"],
  "المنتزه": ["المنتزه", "al montaza", "al montazah", "montaza", "montazah", "المعمورة"],
  "أبو قير": ["أبو قير", "abu qir", "aboukir", "abukir"],
};

const normalizeName = (value?: string): string => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

const isNameMatch = (left: string, right: string): boolean => {
  return left === right || left.includes(right) || right.includes(left);
};

export const getDistrictCenter = (districtName: string): [number, number] => {
  const d = DISTRICTS.find((x) => x.name === districtName);
  if (!d) return [31.2001, 29.9187];
  
  const lats = d.position.map(p => p[0]);
  const lngs = d.position.map(p => p[1]);
  return [
    lats.reduce((a, b) => a + b, 0) / lats.length,
    lngs.reduce((a, b) => a + b, 0) / lngs.length
  ];
};

type RiskMapProps = {
  className?: string;
};

export const RiskMap = ({
  className,
}: RiskMapProps) => {
  const { mapData, populationData, infrastructureData, isLoading, selectedScenario, selectedYear } =
    useRiskStore();

  const [showDem, setShowDem] = useState(false);
  const [showRiskLayer, setShowRiskLayer] = useState(true);
  const [demData, setDemData] = useState<any>(null);
  const [loadingDem, setLoadingDem] = useState(false);

  useEffect(() => {
    if (showDem && !demData && !loadingDem) {
      setLoadingDem(true);
      const baseUrl = import.meta.env.BASE_URL || "/";
      fetch(`${baseUrl}data/alexandria_DEM.geojson`)
        .then((res) => {
          if (!res.ok) throw new Error(`Status: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setDemData(data);
          setLoadingDem(false);
        })
        .catch((err) => {
          console.error("Failed to load DEM geojson:", err);
          setLoadingDem(false);
        });
    }
  }, [showDem, demData, loadingDem]);

  const canvasRenderer = useMemo(() => L.canvas(), []);

  const getDemColor = (elev: number) => {
    if (elev <= 0) return "#03045e";
    if (elev <= 0.5) return "#023e8a";
    if (elev <= 1.0) return "#0077b6";
    if (elev <= 2.0) return "#00b4d8";
    if (elev <= 3.0) return "#90e0ef";
    if (elev <= 5.0) return "#c77dff";
    if (elev <= 8.0) return "#9d4edd";
    return "#5a189a";
  };

  const demStyle = (feature: any) => {
    const elev = feature?.properties?.elevation_m ?? 0;
    return {
      fillColor: getDemColor(elev),
      fillOpacity: 0.45,
      weight: 0, // performance optimization
      color: "transparent",
      renderer: canvasRenderer,
    };
  };

  const onEachDemFeature = (feature: any, layer: any) => {
    const elev = feature?.properties?.elevation_m;
    if (elev !== undefined) {
      layer.bindPopup(
        `<div class="font-arabic text-right text-xs leading-5" dir="rtl">
           <strong>منسوب الارتفاع:</strong> ${elev.toFixed(2)} متر
         </div>`
      );
    }
  };

  const MapEvents = () => {
    useMapEvents({
      overlayadd(e) {
        if (e.name === "الارتفاعات الرقمية (DEM)") {
          setShowDem(true);
        }
      },
      overlayremove(e) {
        if (e.name === "الارتفاعات الرقمية (DEM)") {
          setShowDem(false);
        }
      },
    });
    return null;
  };

  type RiskLevel = "critical" | "high" | "medium" | "low";

  const normalizeRisk = (riskLevel?: string): RiskLevel => {
    const value = String(riskLevel || "").trim().toLowerCase();

    if (!value) return "low";

    if (
      value.includes("critical") ||
      value.includes("extreme") ||
      value.includes("severe") ||
      value.includes("catastrophic") ||
      value.includes("كارث") ||
      value.includes("شديد") ||
      value.includes("حرج") ||
      value.includes("very high") ||
      value.includes("very-high") ||
      value.includes("جدًا") ||
      value.includes("جدا")
    ) {
      return "critical";
    }

    if (value.includes("high") || value.includes("مرتفع")) {
      return "high";
    }

    if (
      value.includes("medium") ||
      value.includes("moderate") ||
      value.includes("متوسط") ||
      value.includes("warning")
    ) {
      return "medium";
    }

    if (
      value.includes("low") ||
      value.includes("منخفض") ||
      value.includes("stable") ||
      value.includes("safe")
    ) {
      return "low";
    }

    return "low";
  };

  const riskColor = (risk: RiskLevel) => {
    if (risk === "critical") return "#EF4444";
    if (risk === "high") return "#F97316";
    if (risk === "medium") return "#EAB308";
    return "#22C55E";
  };

  const districtPathOptions = (risk: RiskLevel) => {
    const baseOptions = { lineJoin: "round" as const, lineCap: "round" as const, smoothFactor: 1.5 };
    
    if (risk === "critical") {
      return {
        ...baseOptions,
        color: "#B91C1C",
        fillColor: "#EF4444",
        fillOpacity: 0.32,
        weight: 2.8,
        dashArray: "8, 8",
        opacity: 0.95,
      };
    }

    if (risk === "high") {
      return {
        ...baseOptions,
        color: "#C2410C",
        fillColor: "#F97316",
        fillOpacity: 0.28,
        weight: 2.4,
        opacity: 0.92,
      };
    }

    if (risk === "medium") {
      return {
        ...baseOptions,
        color: "#B45309",
        fillColor: "#EAB308",
        fillOpacity: 0.22,
        weight: 2.0,
        opacity: 0.9,
      };
    }

    return {
      ...baseOptions,
      color: "#166534",
      fillColor: "#22C55E",
      fillOpacity: 0.18,
      weight: 1.8,
      opacity: 0.88,
    };
  };

  const popupRiskBadgeClasses = (risk: RiskLevel) => {
    if (risk === "critical") return "bg-red-100 text-red-700";
    if (risk === "high") return "bg-orange-100 text-orange-700";
    if (risk === "medium") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  const riskLabelAr = (riskLevel?: string) => {
    if (!riskLevel) return "بيانات غير متوفرة";

    const risk = normalizeRisk(riskLevel);
    if (risk === "critical") return "شديد";
    if (risk === "high") return "مرتفع";
    if (risk === "medium") return "متوسط";
    return "منخفض";
  };

  const districtMetrics = useMemo(() => {
    const qisms = populationData?.qisms || [];

    const raw = DISTRICTS.map((district) => {
      const aliases = (DISTRICT_ALIASES[district.name] || [district.name]).map(
        (alias) => normalizeName(alias),
      );

      const matchedQisms = qisms.filter((qism) => {
        const qismName = normalizeName(qism.name);
        return aliases.some((alias) => isNameMatch(qismName, alias));
      });

      const exposedPopulation = matchedQisms.reduce(
        (sum, q) => sum + Number(q.exposedPopulation || 0),
        0
      );
      const floodedAreaKm2 = matchedQisms.reduce(
        (sum, q) => sum + Number(q.floodedAreaKm2 || 0),
        0
      );
      
      // Determine the highest risk from matched qisms
      let highestRiskScore = -1;
      let riskLevelStr = mapData?.riskLevel || "";
      
      matchedQisms.forEach((q) => {
          const r = normalizeRisk(q.riskLevel);
          const score = r === "critical" ? 4 : r === "high" ? 3 : r === "medium" ? 2 : r === "low" ? 1 : 0;
          if (score > highestRiskScore) {
              highestRiskScore = score;
              riskLevelStr = q.riskLevel;
          }
      });

      const risk = normalizeRisk(riskLevelStr);

      return {
        name: district.name,
        position: district.position,
        risk,
        riskLabel: riskLabelAr(riskLevelStr),
        color: riskColor(risk),
        exposedPopulation,
        floodedAreaKm2,
      };
    });

    return raw;
  }, [mapData?.riskLevel, populationData]);

  const districtMetricsWithRank = useMemo(() => {
    const totalExposed = districtMetrics.reduce(
      (sum, district) => sum + district.exposedPopulation,
      0,
    );

    const rankMap = new Map(
      [...districtMetrics]
        .sort((left, right) => right.exposedPopulation - left.exposedPopulation)
        .map((district, index) => [district.name, index + 1]),
    );

    return districtMetrics.map((district) => ({
      ...district,
      rank: rankMap.get(district.name) || districtMetrics.length,
      exposureShare:
        totalExposed > 0 ? (district.exposedPopulation / totalExposed) * 100 : 0,
    }));
  }, [districtMetrics]);

  // Center on Alexandria
  const position: LatLngExpression = [31.2001, 29.9187];

  const getFacilitiesInDistrict = (districtName: string) => {
    if (!infrastructureData || !infrastructureData.categories) return [];
    
    const aliases = (DISTRICT_ALIASES[districtName] || [districtName]).map(
      (alias) => normalizeName(alias),
    );
    
    const facilities: any[] = [];
    Object.values(infrastructureData.categories).forEach((categoryList) => {
      categoryList.forEach((fac) => {
        const facQism = normalizeName(fac.qism || "");
        if (aliases.some((alias) => isNameMatch(facQism, alias))) {
          facilities.push(fac);
        }
      });
    });
    
    return facilities.slice(0, 3); // max 3 to not overflow popup
  };

  return (
    <div className={twMerge("relative w-full h-full bg-slate-50 rounded-xl overflow-hidden", className)}>
      
      <div className="absolute top-4 left-4 z-[400] flex gap-2 pointer-events-auto bg-white/90 p-2 rounded-xl backdrop-blur-md border border-gray-200 shadow-md">
        <button
          onClick={() => setShowRiskLayer(!showRiskLayer)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
            showRiskLayer 
              ? "bg-red-50 text-red-700 border border-red-200" 
              : "bg-white text-gray-500 hover:bg-gray-50 border border-transparent"
          }`}
        >
          <Layers className="w-4 h-4" />
          مستوى الخطر
        </button>
        <button
          onClick={() => setShowDem(!showDem)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
            showDem 
              ? "bg-purple-50 text-purple-700 border border-purple-200" 
              : "bg-white text-gray-500 hover:bg-gray-50 border border-transparent"
          }`}
        >
          <MapIcon className="w-4 h-4" />
          الارتفاعات (DEM)
        </button>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-white/50 z-[1000] flex items-center justify-center backdrop-blur-sm">
          <span className="text-blue-600 font-bold loading-text">
            جاري تحديث الخريطة...
          </span>
        </div>
      )}

      {loadingDem && (
        <div className="absolute top-14 left-4 bg-white/95 border border-gray-200 rounded-lg px-3 py-1.5 z-[1000] flex items-center gap-2 shadow-md backdrop-blur-sm">
          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-600 animate-infinite"></div>
          <span className="text-[11px] text-gray-700 font-bold font-arabic">
            جاري تحميل بيانات الارتفاعات الرقمية...
          </span>
        </div>
      )}

      {showDem && demData && (
        <div className="absolute bottom-4 right-4 bg-white/95 border border-gray-200 rounded-xl p-3 z-[1000] shadow-lg max-w-[200px] font-arabic text-right leading-5" dir="rtl">
          <h4 className="text-[11px] font-bold text-gray-900 mb-2 border-b border-gray-100 pb-1">
            مستويات الارتفاع الرقمية (DEM)
          </h4>
          <div className="space-y-1 text-[10px]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm block shrink-0" style={{ backgroundColor: "#2563EB" }}></span>
              <span className="text-gray-700">≤ 0 م (تحت مستوى البحر)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm block shrink-0" style={{ backgroundColor: "#EF4444" }}></span>
              <span className="text-gray-700">0.1 - 0.5 م (خطورة فائقة)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm block shrink-0" style={{ backgroundColor: "#F97316" }}></span>
              <span className="text-gray-700">0.6 - 1.0 م (خطورة مرتفعة)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm block shrink-0" style={{ backgroundColor: "#FBBF24" }}></span>
              <span className="text-gray-700">1.1 - 2.0 م (خطورة متوسطة)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm block shrink-0" style={{ backgroundColor: "#34D399" }}></span>
              <span className="text-gray-700">2.1 - 5.0 م (خطورة منخفضة)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm block shrink-0" style={{ backgroundColor: "#059669" }}></span>
              <span className="text-gray-700">&gt; 5.0 م (مناطق آمنة)</span>
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={position}
        zoom={11}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <ZoomControl position="bottomleft" />
        
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="خريطة الطرق">
            <TileLayer
              attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="قمر صناعي">
            <TileLayer
              attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
              url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            />
          </LayersControl.BaseLayer>

          <LayerGroup>
            {showRiskLayer && districtMetricsWithRank.map((district) => (
              <Polygon
                key={`poly-${district.name}`}
                positions={district.position}
                pathOptions={districtPathOptions(district.risk)}
              >
                <Popup className="font-arabic custom-popup">
                  <div className="p-1 min-w-[220px]" dir="rtl">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">{district.name}</h3>
                        <span className="text-[11px] text-gray-500">
                          تقييم مخاطر المناطق الساحلية
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${popupRiskBadgeClasses(
                          district.risk,
                        )}`}
                      >
                        {district.riskLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-500 block">السكان المعرضون</span>
                        <span className="font-bold text-sm text-gray-800">
                          {district.exposedPopulation.toLocaleString("ar-EG")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">المساحة المغمورة</span>
                        <span className="font-bold text-sm text-gray-800">
                          {district.floodedAreaKm2.toFixed(1)} كم²
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">الترتيب</span>
                        <span className="font-bold text-sm text-gray-800">
                          #{district.rank} / {districtMetricsWithRank.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">درجة الخطورة</span>
                        <span className="font-bold text-sm" style={{ color: district.color }}>
                          {district.riskLabel}
                        </span>
                      </div>
                    </div>

                    {getFacilitiesInDistrict(district.name).length > 0 && (
                      <div className="mb-3 p-2 bg-red-50 border border-red-100 rounded-lg">
                        <span className="text-[10px] text-red-600 font-bold block mb-1">
                          مرافق حيوية مهددة
                        </span>
                        <ul className="text-[11px] text-gray-700 list-disc list-inside px-3 space-y-0.5">
                          {getFacilitiesInDistrict(district.name).map((fac, idx) => (
                              <li key={idx}>{fac.name} - <span className="text-gray-500">{fac.qism}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex justify-between text-[11px] text-gray-600 bg-white border border-gray-100 rounded-lg p-2 leading-5">
                      <div>
                        السيناريو: <span className="font-bold text-gray-800">{selectedScenario}</span>
                      </div>
                      <div>
                        السنة: <span className="font-bold text-gray-800">{selectedYear}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Polygon>
            ))}
          </LayerGroup>

          <LayersControl.Overlay checked name="النقاط الحرجة (المرافق)">
            <LayerGroup>
              {infrastructureData?.facilities?.map((facility, idx) => {
                if (!facility.lat || !facility.lng) return null;

                const facilityRisk = normalizeRisk(
                  facility.riskLevel || facility.riskLabel || facility.risk || facility.status,
                );

                const color =
                  facilityRisk === "critical"
                    ? "#B91C1C"
                    : facilityRisk === "high"
                      ? "#C2410C"
                      : facilityRisk === "medium"
                        ? "#B45309"
                        : "#166534";

                const fillColor =
                  facilityRisk === "critical"
                    ? "#EF4444"
                    : facilityRisk === "high"
                      ? "#FB923C"
                      : facilityRisk === "medium"
                        ? "#FBBF24"
                        : "#22C55E";

                return (
                  <CircleMarker
                    key={`facility-${facility.id || idx}`}
                    center={[facility.lat, facility.lng]}
                    radius={facilityRisk === "critical" ? 8 : facilityRisk === "high" ? 7 : 6}
                    pathOptions={{ color, fillColor, fillOpacity: 0.8, weight: 2 }}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                      <span className="font-arabic text-xs font-bold" style={{ color }}>
                        {facility.name} - {facility.typeLabel}
                      </span>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </LayerGroup>
          </LayersControl.Overlay>

          <LayerGroup>
            {showDem && demData && (
              <GeoJSON
                data={demData}
                style={demStyle}
                onEachFeature={onEachDemFeature}
              />
            )}
          </LayerGroup>
        </LayersControl>
      </MapContainer>
    </div>
  );
};
