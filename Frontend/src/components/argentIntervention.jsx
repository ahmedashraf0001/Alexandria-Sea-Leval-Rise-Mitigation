import React, { useState, useEffect, useMemo } from "react";
import Header from "./Header";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  Circle,
  LayersControl,
  LayerGroup,
  GeoJSON,
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
  HeartPulse,
  GraduationCap,
  FerrisWheel,
  Palette,
  ShieldCheck,
  Landmark,
  Building2,
  Layers,
  Map as MapIcon,
  MapPin,
} from "lucide-react";
import { dataService } from "../services/dataService";
import { useToast } from "../contexts/useToast";
import { useRiskStore } from "../store/riskStore";
import {
  getDistrictRiskLevel,
  getFacilitiesInDistrict,
  stripQismPrefix,
} from "../utils/qismBoundaries";

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

const getRiskLabelAr = (risk) => {
  if (risk === "extreme") return "شديد";
  if (risk === "high") return "مرتفع";
  if (risk === "medium") return "متوسط";
  if (risk === "low") return "منخفض";
  return "غير متوفر";
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

const LAND_USE_CATEGORY_OPTIONS = [
  { key: "health", label: "صحي", icon: HeartPulse },
  { key: "educational", label: "تعليمي", icon: GraduationCap },
  { key: "leisure", label: "ترفيهي", icon: FerrisWheel },
  { key: "cultural", label: "ثقافي", icon: Palette },
  { key: "civil protection", label: "دفاع مدني", icon: ShieldCheck },
  { key: "heritage", label: "اثري", icon: Landmark },
  { key: "infrastructure", label: "مرافق عامه", icon: Building2 },
];

const LAND_USE_CATEGORY_COLORS = {
  health: "#ef4444",
  educational: "#16a34a",
  leisure: "#f59e0b",
  cultural: "#7c3aed",
  "civil protection": "#0ea5e9",
  heritage: "#db2777",
  infrastructure: "#14b8a6",
};

const getLandUseCategoryLabel = (category) => {
  const option = LAND_USE_CATEGORY_OPTIONS.find((item) => item.key === category);
  return option?.label || category || "غير معروف";
};

const getLandUseStyle = (feature) => {
  const category = feature?.properties?.category;
  return {
    color: LAND_USE_CATEGORY_COLORS[category] || "#64748b",
    weight: 2,
    fillColor: LAND_USE_CATEGORY_COLORS[category] || "#64748b",
    fillOpacity: 0.18,
    opacity: 0.8,
  };
};

// Elevation color ramp for the DEM layer (meters above/below sea level)
const DEM_COLOR_STOPS = [
  { max: 0, color: "#03045e" }, // below sea level - dark navy
  { max: 0.5, color: "#023e8a" },
  { max: 1, color: "#0077b6" },
  { max: 2, color: "#00b4d8" },
  { max: 3, color: "#90e0ef" },
  { max: 5, color: "#c77dff" },
  { max: 8, color: "#9d4edd" },
  { max: Infinity, color: "#5a189a" }, // highest ground - deep purple
];

const getElevationColor = (elevation) => {
  const value = Number(elevation);
  if (Number.isNaN(value)) return "#94a3b8";

  const stop = DEM_COLOR_STOPS.find((item) => value <= item.max);
  return stop ? stop.color : "#a50026";
};

const getDemStyle = (feature) => {
  const elevation = feature?.properties?.elevation_m;
  const color = getElevationColor(elevation);

  return {
    color,
    weight: 0,
    fillColor: color,
    fillOpacity: 0.2,
    stroke: false,
  };
};

const getDemPopupHtml = (feature) => {
  const elevation = feature?.properties?.elevation_m;
  const elevationText =
    elevation === undefined || elevation === null ? "غير متوفر" : `${Number(elevation).toFixed(2)} م`;

  return `<div dir="rtl" style="min-width:160px;line-height:1.5">
    <div style="font-weight:700;margin-bottom:4px;">ارتفاع سطح الأرض</div>
    <div><strong>القيمة:</strong> ${elevationText}</div>
  </div>`;
};

const DEM_LEGEND_ITEMS = [
  { label: "أقل من 0 م (تحت سطح البحر)", color: "#03045e" },
  { label: "0 - 0.5 م", color: "#023e8a" },
  { label: "0.5 - 1 م", color: "#0077b6" },
  { label: "1 - 2 م", color: "#00b4d8" },
  { label: "2 - 3 م", color: "#90e0ef" },
  { label: "3 - 4 م", color: "#c77dff" },
  { label: "4 - 5 م", color: "#9d4edd" },
  { label: "أكثر من 5 م", color: "#5a189a" },
];

const getLandUsePopupHtml = (feature) => {
  const props = feature?.properties || {};
  const title = props["name:ar"] || props.name || props["name:en"] || "مرفق";
  const details = [
    ["الفئة", getLandUseCategoryLabel(props.category)],
    ["المحافظة", props.province],
    ["الارتفاع الأدنى", props.elev_min],
    ["نوع المرفق", props.amenity || props.building || props.landuse || props.tourism || props.healthcare || props.power],
    ["التاريخ", props.historic],
    ["الموقع", props.website],
    ["مواعيد العمل", props.opening_hours],
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");

  return `<div dir="rtl" style="min-width:220px;line-height:1.5">
    <div style="font-weight:700;margin-bottom:6px;">${title}</div>
    ${details.map(([label, value]) => `<div><strong>${label}:</strong> ${value}</div>`).join("")}
  </div>`;
};

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

const FacilityOverlayLayer = ({ facilities, visible, title }) => {
  const map = useMap();

  useEffect(() => {
    if (!visible || !facilities || facilities.length === 0) {
      return;
    }

    const group = L.layerGroup();

    facilities.forEach((facility) => {
      const marker = L.marker([facility.lat, facility.lng], {
        icon: L.divIcon({
          className: "custom-marker",
          html: `<div style="background-color:${getRiskColor(normalizeRiskValue(facility.risk))};width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 4px 6px -1px rgba(0,0,0,0.2)"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
          popupAnchor: [0, -24],
        }),
      });

      marker.bindPopup(`<div dir="rtl"><strong>${facility.name}</strong><br/>${facility.typeLabel}<br/>${facility.qism}</div>`);
      group.addLayer(marker);
    });

    group.addTo(map);

    return () => {
      group.remove();
    };
  }, [facilities, map, visible, title]);

  return null;
};

const argentIntervention = () => {
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
  const qgisExtentBounds = [
    [30.34, 28.88], // South West
    [31.56, 31.23], // North East
  ];

  const [facilities, setFacilities] = useState([]);
  const [modelHighRiskAreas, setModelHighRiskAreas] = useState([]);
  const [admin2Boundaries, setAdmin2Boundaries] = useState(null);
  const [landUseData, setLandUseData] = useState(null);
  const [demData, setDemData] = useState(null);
  const [selectedLandUseCategories, setSelectedLandUseCategories] = useState(
    LAND_USE_CATEGORY_OPTIONS.map((option) => option.key),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isApiDataUnavailable, setIsApiDataUnavailable] = useState(false);
  const [mapRenderVersion, setMapRenderVersion] = useState(0);
  const [showFacilityIcons, setShowFacilityIcons] = useState(false);
  const [showRiskLayer, setShowRiskLayer] = useState(true);
  const [showDemLayer, setShowDemLayer] = useState(false);
  const [showLandUseLayer, setShowLandUseLayer] = useState(true);

  useEffect(() => {
    setShowFacilityIcons(false);
  }, [selectedSectors, selectedRisks]);

  useEffect(() => {
    let isMounted = true;

    const loadBoundaryData = async () => {
      try {
        const [admin2Response] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/alex_admin2.geojson`),
        ]);

        if (!admin2Response.ok) {
          throw new Error(`Failed to load admin2 boundaries (${admin2Response.status})`);
        }

        const admin2Data = await admin2Response.json();

        const alexandriaAdmin2Features = (admin2Data?.features || []).filter((feature) => {
          const properties = feature?.properties || {};
          const name = `${properties.adm1_name || ""} ${properties.adm1_name1 || ""}`.trim();
          return name.toLowerCase().includes("alexandria") || name.toLowerCase().includes("الاسكندرية");
        });

        if (isMounted) {
          setAdmin2Boundaries({
            ...admin2Data,
            features: alexandriaAdmin2Features,
          });
        }
      } catch (error) {
        console.error("Failed to load Alexandria ADM2 boundary data", error);
        if (isMounted) {
          setAdmin2Boundaries(null);
        }
      }
    };

    loadBoundaryData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadLandUseData = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/land_use_final.geojson`);

        if (!response.ok) {
          throw new Error(`Failed to load land use GeoJSON (${response.status})`);
        }

        const data = await response.json();
        if (isMounted) {
          setLandUseData(data);
        }
      } catch (error) {
        console.error("Failed to load land use data", error);
        if (isMounted) {
          setLandUseData(null);
        }
      }
    };

    const loadDemData = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/alexandria_DEM.geojson`);

        if (!response.ok) {
          throw new Error(`Failed to load DEM GeoJSON (${response.status})`);
        }

        const data = await response.json();
        if (isMounted) {
          setDemData(data);
        }
      } catch (error) {
        console.error("Failed to load DEM data", error);
        if (isMounted) {
          setDemData(null);
        }
      }
    };

    loadLandUseData();
    loadDemData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchFacilities = async () => {
      setIsLoading(true);

      try {
        const [facilityData, dashboardData] = await Promise.all([
          dataService.getInfrastructureFacilities(selectedScenario, selectedYear),
          dataService.getDashboardData(selectedScenario, selectedYear),
        ]);

        if (isMounted) {
          setFacilities(facilityData);
          setModelHighRiskAreas(dashboardData?.highRiskAreas || []);
          setIsApiDataUnavailable(false);
        }
      } catch (error) {
        console.error("Failed to fetch infrastructure data", error);
        if (isMounted) {
          setFacilities([]);
          setModelHighRiskAreas([]);
          setIsApiDataUnavailable(true);
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

  const createCustomIcon = (type, risk) => {
    const colorClass = getRiskColor(normalizeRiskValue(risk));
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
    const selectedSectorSet = new Set(
      selectedSectors.map((sector) => String(sector || "").trim().toLowerCase()),
    );

    return facilities.filter((facility) => {
      const facilityRisk = normalizeRiskValue(facility.risk);
      const facilitySector = String(facility.type || "").trim().toLowerCase();

      return selectedSectorSet.has(facilitySector) && selectedRisks.includes(facilityRisk);
    });
  }, [facilities, selectedSectors, selectedRisks]);

  const filteredLandUseFeatures = useMemo(() => {
    if (!landUseData?.features) return [];

    const selectedSet = new Set(selectedLandUseCategories);
    return landUseData.features.filter(
      (feature) => selectedSet.has(String(feature?.properties?.category || "").trim()),
    );
  }, [landUseData, selectedLandUseCategories]);

  const landUseLayerData = useMemo(() => {
    if (!landUseData) return null;
    return {
      ...landUseData,
      features: filteredLandUseFeatures,
    };
  }, [landUseData, filteredLandUseFeatures]);

  const facilitiesByType = useMemo(() => {
    const grouped = {
      ports: [],
      hospitals: [],
      transport: [],
      utilities: [],
    };

    filteredFacilities.forEach((facility) => {
      const type = String(facility.type || "").trim().toLowerCase();
      if (type in grouped) {
        grouped[type].push(facility);
      } else {
        grouped.utilities.push(facility);
      }
    });

    return grouped;
  }, [filteredFacilities]);

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

  const filterStateKey = useMemo(() => {
    return [
      selectedScenario,
      selectedYear,
      selectedSectors.join(","),
      selectedRisks.join(","),
      selectedLandUseCategories.join(","),
      filteredFacilities.map((facility) => `${facility.id}:${facility.risk}`).join("|"),
      (modelHighRiskAreas || []).join("|"),
    ].join("::");
  }, [filteredFacilities, modelHighRiskAreas, selectedRisks, selectedScenario, selectedSectors, selectedYear, selectedLandUseCategories]);

  const shouldRenderFacilityIcons = showFacilityIcons && filteredFacilities.length > 0;

  const qismBoundaryLayerKey = useMemo(() => {
    return [
      selectedScenario,
      selectedYear,
      filteredFacilities.map((facility) => `${facility.id}:${facility.risk}`).join("|"),
      (modelHighRiskAreas || []).join("|"),
      selectedLandUseCategories.join(","),
    ].join("::");
  }, [filteredFacilities, modelHighRiskAreas, selectedScenario, selectedYear, selectedLandUseCategories]);

  const getDistrictBoundaryStyle = (districtNameAr) => {
    const risk = getDistrictRiskLevel(
      districtNameAr,
      filteredFacilities,
      modelHighRiskAreas,
      normalizeRiskValue,
      getRiskPriority,
    );
    const color = risk ? getRiskColor(risk) : "#94a3b8";

    return {
      color,
      weight: risk ? 2 : 1,
      fillColor: color,
      fillOpacity: risk ? 0.2 : 0.05,
    };
  };

  const getDistrictNameFromFeature = (feature) => {
    const properties = feature?.properties || {};
    return (
      properties.adm2_name1 ||
      properties.adm2_ref_name ||
      properties.adm2_name ||
      ""
    );
  };

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
    setSelectedSectors((prev) => {
      const next = prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector];
      setMapRenderVersion((value) => value + 1);
      return next;
    });
  };

  const toggleRisk = (risk) => {
    setSelectedRisks((prev) => {
      const next = prev.includes(risk) ? prev.filter((r) => r !== risk) : [...prev, risk];
      setMapRenderVersion((value) => value + 1);
      return next;
    });
  };

  const toggleLandUseCategory = (category) => {
    setSelectedLandUseCategories((prev) => {
      const next = prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category];
      setMapRenderVersion((value) => value + 1);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
      <Header active="argentIntervention" />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <aside className="w-full lg:w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto z-10 shadow-lg">
          
          <div className="mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-800">نقاط المنشآت الحيوية</h2>
              <p className="text-[10px] text-gray-500 mt-1">عرض مواقع البنية التحتية والمرافق</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={showFacilityIcons}
                onChange={() => setShowFacilityIcons(!showFacilityIcons)}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="mb-8">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              فلاتر الاستخدام الأرضي
            </h2>
            <div className="space-y-3">
              {LAND_USE_CATEGORY_OPTIONS.map((option) => {
                const Icon = option.icon;
                const categoryColor = LAND_USE_CATEGORY_COLORS[option.key] || "#64748b";

                return (
                  <label
                    key={option.key}
                    className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLandUseCategories.includes(option.key)}
                      onChange={() => toggleLandUseCategory(option.key)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${categoryColor}1A`, color: categoryColor }}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              مفتاح ارتفاع سطح الأرض (DEM)
            </h2>
            <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
              فعّل طبقة «نموذج ارتفاع سطح الأرض (DEM)» من أداة طبقات الخريطة أعلى الخريطة لعرض ارتفاع الأرض في الإسكندرية.
            </p>
            <div className="space-y-1.5">
              {DEM_LEGEND_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-sm border border-black/10 flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  <span className="text-[11px] text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">ملخص التأثير</h3>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-3xl font-extrabold text-gray-900">
                {isLoading ? (
                  <div className="h-8 w-12 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  deeplyFloodedFacilities.length
                )}
              </span>
              <span className="text-sm font-bold text-gray-600 mb-1">منشأة حيوية</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              متوقع تعرضها للغمر &gt; 0.5م في ظل سيناريو {selectedScenario} بحلول عام {selectedYear}.
            </p>
            {!isLoading && (
              <p className="text-[11px] text-gray-400 mt-1">من إجمالي {filteredFacilities.length} منشأة مرئية.</p>
            )}
          </div>
        </aside>

        <div className="flex-1 relative flex flex-col">
          <div className="absolute top-4 left-4 z-[400] pointer-events-none">
            {/* <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-100 pointer-events-auto">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Home className="w-3 h-3" /> / تقييم البنية التحتية
              </div>
              <h1 className="text-xl font-bold text-gray-900">تقييم البنية التحتية والمرافق - الإسكندرية</h1>
            </div> */}

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

            <div className="flex gap-2 pointer-events-auto mt-3 bg-white/90 p-2 rounded-xl backdrop-blur-md border border-gray-200 shadow-md w-fit">
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
                onClick={() => setShowDemLayer(!showDemLayer)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                  showDemLayer 
                    ? "bg-purple-50 text-purple-700 border border-purple-200" 
                    : "bg-white text-gray-500 hover:bg-gray-50 border border-transparent"
                }`}
              >
                <MapIcon className="w-4 h-4" />
                الارتفاعات (DEM)
              </button>
              <button
                onClick={() => setShowLandUseLayer(!showLandUseLayer)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                  showLandUseLayer 
                    ? "bg-green-50 text-green-700 border border-green-200" 
                    : "bg-white text-gray-500 hover:bg-gray-50 border border-transparent"
                }`}
              >
                <Building2 className="w-4 h-4" />
                استخدامات الأراضي
              </button>
              <button
                onClick={() => setShowFacilityIcons(!showFacilityIcons)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                  showFacilityIcons 
                    ? "bg-blue-50 text-blue-700 border border-blue-200" 
                    : "bg-white text-gray-500 hover:bg-gray-50 border border-transparent"
                }`}
              >
                <MapPin className="w-4 h-4" />
                مواقع المنشآت
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
              key={mapRenderVersion}
              center={[31.2001, 29.9187]}
              zoom={12}
              scrollWheelZoom={true}
              className="flex-1 w-full h-full z-0"
              zoomControl={false}
              maxBounds={qgisExtentBounds}
              maxBoundsViscosity={1.0}
              minZoom={10}
            >
            <ZoomControl position="bottomright" />
            <LayersControl position="bottomleft">
              <LayersControl.BaseLayer
                checked name="OpenStreetMap Standard">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={19}
                />
              </LayersControl.BaseLayer>

              {/* External Custom Toggled Layers */}
              <LayerGroup key={`${filterStateKey}-admin2`}>
                {showRiskLayer && admin2Boundaries && (
                  <GeoJSON
                    data={admin2Boundaries}
                    style={(feature) => {
                      if (isApiDataUnavailable) {
                        return {
                          color: "#64748b",
                          weight: 1.1,
                          fillColor: "#94a3b8",
                          fillOpacity: 0.08,
                        };
                      }

                      const districtName = getDistrictNameFromFeature(feature);
                      return getDistrictBoundaryStyle(districtName);
                    }}
                    onEachFeature={(feature, layer) => {
                      const properties = feature?.properties || {};
                      const name =
                        properties.adm2_name1 ||
                        properties.adm2_ref_name ||
                        properties.adm2_name ||
                        "قسم";

                      const districtRisk = isApiDataUnavailable
                        ? null
                        : getDistrictRiskLevel(
                            name,
                            filteredFacilities,
                            modelHighRiskAreas,
                            normalizeRiskValue,
                            getRiskPriority,
                          );
                      const districtFacilities = getFacilitiesInDistrict(name, filteredFacilities);

                      layer.bindPopup(`
                        <div dir="rtl" style="min-width:180px">
                          <strong>${name}</strong><br/>
                          ${properties.adm1_name1 || properties.adm1_name || ""}<br/>
                          ${properties.adm0_name1 || properties.adm0_name || ""}<br/>
                          <strong>مستوى الخطر:</strong> ${getRiskLabelAr(districtRisk)}<br/>
                          <strong>المنشآت المرئية:</strong> ${districtFacilities.length}
                        </div>
                      `);
                    }}
                  />
                )}
              </LayerGroup>

              <LayerGroup key={`${filterStateKey}-landuse`}>
                {showLandUseLayer && landUseLayerData && landUseLayerData.features.length > 0 && (
                  <GeoJSON
                    key={`${filterStateKey}-landuse-geojson`}
                    data={landUseLayerData}
                    style={getLandUseStyle}
                    onEachFeature={(feature, layer) => {
                      layer.bindPopup(getLandUsePopupHtml(feature));
                    }}
                  />
                )}
              </LayerGroup>

              <LayerGroup key="dem-layer">
                {showDemLayer && demData && demData.features && demData.features.length > 0 && (
                  <GeoJSON
                    data={demData}
                    style={getDemStyle}
                    renderer={L.canvas({ padding: 0.5 })}
                    onEachFeature={(feature, layer) => {
                      layer.bindPopup(getDemPopupHtml(feature));
                    }}
                  />
                )}
              </LayerGroup>

              {shouldRenderFacilityIcons && (
                <>
                  <LayersControl.Overlay checked name="المواقع (الكل)">
                    <LayerGroup key={`${filterStateKey}-${shouldRenderFacilityIcons}-all-facilities`} />
                  </LayersControl.Overlay>
                  <FacilityOverlayLayer
                    facilities={filteredFacilities}
                    visible={shouldRenderFacilityIcons}
                    title="المواقع (الكل)"
                  />
                  {[
                    { key: "ports", label: "الموانئ", facilities: facilitiesByType.ports },
                    { key: "hospitals", label: "المستشفيات", facilities: facilitiesByType.hospitals },
                    { key: "transport", label: "النقل", facilities: facilitiesByType.transport },
                    { key: "utilities", label: "المرافق", facilities: facilitiesByType.utilities },
                  ]
                    .filter((layer) => layer.facilities.length > 0)
                    .map((layer) => (
                      <LayersControl.Overlay key={`${layer.key}-overlay`} name={layer.label}>
                        <LayerGroup key={`${filterStateKey}-${layer.key}-facilities`} />
                      </LayersControl.Overlay>
                    ))}
                  {[
                    { key: "ports", label: "الموانئ", facilities: facilitiesByType.ports },
                    { key: "hospitals", label: "المستشفيات", facilities: facilitiesByType.hospitals },
                    { key: "transport", label: "النقل", facilities: facilitiesByType.transport },
                    { key: "utilities", label: "المرافق", facilities: facilitiesByType.utilities },
                  ]
                    .filter((layer) => layer.facilities.length > 0)
                    .map((layer) => (
                      <FacilityOverlayLayer
                        key={`${layer.key}-overlay-layer`}
                        facilities={layer.facilities}
                        visible={shouldRenderFacilityIcons}
                        title={layer.label}
                      />
                    ))}
                </>
              )}
            </LayersControl>

            <FitFilteredFacilitiesBounds key={`${filterStateKey}-${mapRenderVersion}`} facilities={filteredFacilities} />

            {filteredFacilities.length === 0 && (
              <div className="leaflet-top leaflet-left">
                <div className="leaflet-control bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-xs font-bold text-gray-600 mt-2 ml-2">
                  لا توجد منشآت مطابقة للتصفية الحالية
                </div>
              </div>
            )}
          </MapContainer>

          <div className="absolute bottom-4 right-4 z-[400] bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl p-3 shadow-lg text-xs text-gray-700 space-y-2 max-w-[250px]">
            {isApiDataUnavailable && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-2 py-1 text-[10px] leading-4">
                تعذر جلب بيانات المخاطر من الخادم. يتم عرض الطبقات المحلية فقط بدون تلوين مخاطر حي.
              </div>
            )}
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

export default argentIntervention;
