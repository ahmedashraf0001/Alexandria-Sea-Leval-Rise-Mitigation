import React from "react";
import { ChevronDown } from "lucide-react";
import { SCENARIO_OPTIONS, YEAR_OPTIONS } from "../constants/scenarioConfig";

const ScenarioYearFilter = ({
  scenario,
  year,
  onScenarioChange,
  onYearChange,
  className = "",
  layout = "inline",
  scenarioLabel = "السيناريو",
  yearLabel = "السنة",
}) => {
  const isInline = layout === "inline";

  return (
    <div className={`${isInline ? "flex flex-wrap gap-3" : "space-y-3"} ${className}`}>
      <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 min-w-[190px] hover:border-blue-500/50 transition-all">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
          {scenarioLabel}
        </span>
        <div className="relative">
          <select
            value={scenario}
            onChange={(event) => onScenarioChange(event.target.value)}
            className="w-full appearance-none bg-transparent text-gray-900 text-sm font-bold focus:outline-none pr-0"
          >
            {SCENARIO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 min-w-[160px] hover:border-blue-500/50 transition-all">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
          {yearLabel}
        </span>
        <div className="relative">
          <select
            value={year}
            onChange={(event) => onYearChange(event.target.value)}
            className="w-full appearance-none bg-transparent text-gray-900 text-sm font-bold focus:outline-none pr-0"
          >
            {YEAR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default ScenarioYearFilter;
