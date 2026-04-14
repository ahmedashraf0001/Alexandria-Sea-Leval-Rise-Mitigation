import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRiskStore } from "../store/riskStore";
import { RiskMap } from "./RiskMap";
import { dataService } from "../services/dataService";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Wind,
  Droplets,
  Thermometer,
  Gauge,
} from "lucide-react";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from "recharts";

const markdownComponents = {
  h2: ({ children }) => (
    <h2 className="text-sm font-black text-gray-800 mt-1 mb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xs font-extrabold text-gray-700 mt-2 mb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <div className="text-sm leading-relaxed text-gray-700 mb-2 last:mb-0 break-words">{children}</div>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside mx-5 text-sm text-gray-700 space-y-1 mb-2 last:mb-0 break-words">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside mx-5 text-sm text-gray-700 space-y-1 mb-2 last:mb-0 break-words">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ inline, children }) =>
    inline ? (
      <code className="px-1 py-0.5 rounded bg-gray-100 text-gray-800 text-[12px]">
        {children}
      </code>
    ) : (
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-[11px] overflow-x-auto mb-2">
        <code>{children}</code>
      </pre>
    ),
  blockquote: ({ children }) => (
    <blockquote className="border-r-2 border-blue-300 pr-3 text-xs text-gray-500 mb-2">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => <strong className="font-black text-gray-800">{children}</strong>,
};

const MIN_CHAT_PANEL_WIDTH = 320;
const MAX_CHAT_PANEL_WIDTH = 760;
const MIN_MAP_PANEL_WIDTH = 360;

const ChatPrediction = () => {
  const { selectedScenario, selectedYear } = useRiskStore();
  const [chartData, setChartData] = useState([]);
  const layoutRef = useRef(null);
  const isResizingRef = useRef(false);
  const [chatPanelWidth, setChatPanelWidth] = useState(400);

  const clampChatWidth = useCallback((requestedWidth, containerWidth) => {
    const maxWidthByContainer = Math.max(
      MIN_CHAT_PANEL_WIDTH,
      containerWidth - MIN_MAP_PANEL_WIDTH,
    );
    const upperBound = Math.min(MAX_CHAT_PANEL_WIDTH, maxWidthByContainer);

    return Math.min(Math.max(requestedWidth, MIN_CHAT_PANEL_WIDTH), upperBound);
  }, []);

  const updateChatWidthFromPointer = useCallback(
    (clientX) => {
      if (!layoutRef.current) return;

      const layoutRect = layoutRef.current.getBoundingClientRect();
      const requestedWidth = layoutRect.right - clientX;
      const nextWidth = clampChatWidth(requestedWidth, layoutRect.width);

      setChatPanelWidth(nextWidth);
    },
    [clampChatWidth],
  );

  const handleResizePointerDown = useCallback(
    (event) => {
      if (window.innerWidth < 1024) return;

      event.preventDefault();
      isResizingRef.current = true;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      updateChatWidthFromPointer(event.clientX);
    },
    [updateChatWidthFromPointer],
  );

  useEffect(() => {
    const stopResizing = () => {
      if (!isResizingRef.current) return;

      isResizingRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    const handlePointerMove = (event) => {
      if (!isResizingRef.current) return;
      updateChatWidthFromPointer(event.clientX);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
      stopResizing();
    };
  }, [updateChatWidthFromPointer]);

  useEffect(() => {
    const syncWidthWithViewport = () => {
      if (window.innerWidth < 1024 || !layoutRef.current) return;

      const layoutRect = layoutRef.current.getBoundingClientRect();
      setChatPanelWidth((currentWidth) =>
        clampChatWidth(currentWidth, layoutRect.width),
      );
    };

    window.addEventListener("resize", syncWidthWithViewport);
    syncWidthWithViewport();

    return () => {
      window.removeEventListener("resize", syncWidthWithViewport);
    };
  }, [clampChatWidth]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const metrics = await dataService.getChatMetrics();

        const normalized = (metrics || [])
          .map((item, index) => {
            const parsedDate = item.date ? new Date(item.date) : null;
            const hasValidDate =
              parsedDate && !Number.isNaN(parsedDate.getTime());

            return {
              index: index + 1,
              dateTs: hasValidDate ? parsedDate.getTime() : index,
              label: hasValidDate
                ? parsedDate.toLocaleDateString("ar-EG", {
                    month: "short",
                    day: "numeric",
                  })
                : `#${index + 1}`,
              windSpeedMs: Number(item.windSpeedMs ?? 0),
              temperatureC: Number(item.temperatureC ?? 0),
              relativeHumidityPct: Number(item.relativeHumidityPct ?? 0),
              seaLevelPressureHpa: Number(item.seaLevelPressureHpa ?? 0),
              predictedSeaLevelMm: Number(
                item.predictedSeaLevelMm ?? item.value ?? 0,
              ),
            };
          })
          .sort((a, b) => a.dateTs - b.dateTs);

        setChartData(normalized);
      } catch (error) {
        console.error("Failed to fetch chat metrics", error);
        setChartData([]);
      }
    };

    fetchMetrics();
  }, []);
  const [messages, setMessages] = useState([
    {
      type: "bot",
      text: "مرحباً. أنا مساعدك الذكي للتنبؤ بمخاطر الغرق. يمكنك سؤالي عن سيناريوهات محددة (مثل SSP5-8.5) أو سنوات مستقبلية (مثل 2050).",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { type: "user", text: inputValue }]);
    const userText = inputValue;
    setInputValue("");
    setIsTyping(true);

    const sendMessageToBot = async () => {
      try {
        const response = await dataService.sendChatMessage(userText, {
          scenario: selectedScenario,
          year: selectedYear,
        });

        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            text: response.reply,
            references: response.references || [],
          },
        ]);
      } catch (error) {
        console.error("Chat Error", error);
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            text: "تعذر الوصول إلى خدمة المساعد حالياً. حاول مرة أخرى.",
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    };

    sendMessageToBot();
  };

  const latestPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;

  const weatherMetricCards = [
    {
      key: "windSpeedMs",
      title: "سرعة الرياح",
      unit: "م/ث",
      color: "#10b981",
      icon: Wind,
    },
    {
      key: "temperatureC",
      title: "درجة الحرارة",
      unit: "°م",
      color: "#f97316",
      icon: Thermometer,
    },
    {
      key: "relativeHumidityPct",
      title: "الرطوبة النسبية",
      unit: "%",
      color: "#3b82f6",
      icon: Droplets,
    },
    {
      key: "seaLevelPressureHpa",
      title: "ضغط سطح البحر",
      unit: "hPa",
      color: "#6366f1",
      icon: Gauge,
    },
  ];

  const formatMetric = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue.toFixed(1) : "--";
  };

  return (
    <div
      ref={layoutRef}
      className="absolute inset-0 flex flex-col lg:flex-row bg-gray-50 overflow-hidden animate-fade-in"
    >
      {/* Left Side: Interactive Map & Dashboard */}
      <div className="flex-1 min-w-0 flex flex-col h-[60%] lg:h-full relative z-0">
        {/* Map Container */}
        <div className="flex-1 relative bg-gray-100">
          <RiskMap className="h-full w-full rounded-none border-0" />

          {/* Overlay Stats - Subtle */}
          <div className="absolute top-4 left-4 z-[400] flex gap-2">
            <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 text-xs font-bold text-gray-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              محاكاة حية
            </div>

            {latestPoint && (
              <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 text-xs font-bold text-gray-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                آخر توقع مستوى البحر {formatMetric(latestPoint.predictedSeaLevelMm)} مم
              </div>
            )}
          </div>
        </div>

        {/* Bottom Metrics Dashboard */}
        <div className="h-56 bg-white/80 backdrop-blur-md border-t border-gray-200 p-4 grid grid-cols-2 xl:grid-cols-4 gap-3 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-10">
          {chartData.length > 0 ? (
            <>
              {weatherMetricCards.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div
                    key={metric.key}
                    className="flex flex-col relative hover:bg-white transition-all p-3 rounded-xl border border-transparent hover:border-gray-200 hover:shadow-sm group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black" style={{ color: metric.color }}>
                        {latestPoint ? `${formatMetric(latestPoint[metric.key])} ${metric.unit}` : `-- ${metric.unit}`}
                      </span>
                      <div className="flex items-center gap-2 justify-end">
                        <h4 className="font-bold text-gray-700 text-xs text-right">
                          {metric.title}
                        </h4>
                        <Icon className="w-3 h-3" style={{ color: metric.color }} />
                      </div>
                    </div>

                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient
                              id={`color-${metric.key}`}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop offset="5%" stopColor={metric.color} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                            </linearGradient>
                          </defs>

                          <Area
                            type="monotone"
                            dataKey={metric.key}
                            stroke={metric.color}
                            fillOpacity={1}
                            fill={`url(#color-${metric.key})`}
                            strokeWidth={2}
                          />

                          <Tooltip
                            labelFormatter={(label) => `التاريخ: ${label}`}
                            formatter={(value) => [
                              `${formatMetric(value)} ${metric.unit}`,
                              metric.title,
                            ]}
                            contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="col-span-2 xl:col-span-4 flex items-center justify-center text-gray-500 text-sm">
              بانتظار بيانات الطقس الحديثة...
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onPointerDown={handleResizePointerDown}
        className="hidden lg:flex w-2 shrink-0 cursor-col-resize items-center justify-center bg-transparent hover:bg-blue-50 transition-colors"
        aria-label="Resize chatbot panel"
        title="Drag to resize chatbot panel"
      >
        <span className="h-16 w-1 rounded-full bg-gray-300 hover:bg-blue-400 transition-colors"></span>
      </button>

      {/* Right Side: Chat Panel */}
      <div
        style={{ "--chat-panel-width": `${chatPanelWidth}px` }}
        className="w-full lg:w-[var(--chat-panel-width)] lg:min-w-[320px] lg:max-w-[760px] lg:shrink-0 h-[40%] lg:h-full bg-white border-t lg:border-t-0 lg:border-r border-gray-200 flex flex-col shadow-2xl z-20"
      >
        {/* Chat Header */}
        <div className="bg-white/80 backdrop-blur p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">
                مساعد التنبؤ الذكي
              </h3>
              <p className="text-[10px] text-green-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                متصل الآن
              </p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 bg-gray-50/50 p-4 overflow-y-auto space-y-6">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 animate-fade-in ${
                msg.type === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                  msg.type === "user"
                    ? "bg-white border-gray-200"
                    : "bg-blue-600 border-blue-600"
                }`}
              >
                {msg.type === "user" ? (
                  <User className="w-4 h-4 text-gray-600" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>

              <div
                className={`max-w-[80%] min-w-0 flex flex-col space-y-1 ${
                  msg.type === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`px-4 py-3 rounded-2xl text-sm shadow-sm leading-relaxed overflow-hidden break-words w-full ${
                    msg.type === "user"
                      ? "bg-gray-900 text-white rounded-tr-none"
                      : "bg-white border border-gray-200 text-gray-700 rounded-tl-none"
                  }`}
                >
                  {msg.type === "bot" ? (
                    <div dir="auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.text
                  )}

                  {msg.type === "bot" &&
                    Array.isArray(msg.references) &&
                    msg.references.length > 0 && (
                      <div className="mt-3 border-t border-gray-100 pt-2 space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          Analysis References
                        </p>
                        {msg.references.map((reference, referenceIndex) => (
                          <p
                            key={`${reference.id}-${referenceIndex}`}
                            className="text-[11px] text-gray-500 leading-relaxed"
                          >
                            <span className="font-semibold text-gray-600">
                              [{reference.id}]
                            </span>{" "}
                            {reference.title}: {reference.detail}
                          </p>
                        ))}
                      </div>
                    )}
                </div>
                <span className="text-[10px] text-gray-400 px-1">
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 bg-white border-t border-gray-100"
        >
          <div className="relative group">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="اكتب استفسارك هنا..."
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white text-right shadow-inner text-sm transition-all text-gray-800 placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all hover:scale-105 shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-center text-gray-400 mt-2">
            يمكن لنموذج الذكاء الاصطناعي ارتكاب أخطاء. يرجى مراجعة البيانات
            المهمة.
          </p>
        </form>
      </div>
    </div>
  );
};

export default ChatPrediction;

