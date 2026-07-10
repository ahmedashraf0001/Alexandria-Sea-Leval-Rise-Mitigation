import React from "react";
import { LogOut, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import ScenarioYearFilter from "./ScenarioYearFilter";
import { useRiskStore } from "../store/riskStore";

const Header = ({ active = "home" }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { selectedScenario, selectedYear, setScenario, setYear } = useRiskStore();

  const handleLogout = () => {
    logout();
    navigate("/register", { replace: true });
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link to="/profile" className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-xl transition-colors">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
            <User className="w-6 h-6" />
          </div>
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-gray-900">
              {user?.username || "مستخدم النظام"}
            </p>
            <p className="text-[10px] text-gray-500">{user?.email || ""}</p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          title="تسجيل الخروج"
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Center: Navigation + Global Scenario Controls */}
      <div className="hidden lg:flex items-center gap-6">
        <nav className="flex items-center gap-6">
          <Link
            to="/home"
            className={`text-sm font-medium transition-colors ${active === "home"
              ? "text-blue-600 border-b-2 border-blue-600 pb-1 font-bold"
              : "text-gray-500 hover:text-blue-600"
              }`}
          >
            الرئيسية
          </Link>
          <Link
            to="/argentIntervention"
            className={`text-sm font-medium transition-colors ${active === "argentIntervention"
              ? "text-blue-600 border-b-2 border-blue-600 pb-1 font-bold"
              : "text-gray-500 hover:text-blue-600"
              }`}
          >
            تخطيط مستقبلي
          </Link>

          <Link
            to="/futurePlaning"
            className={`text-sm font-medium transition-colors ${active === "futurePlaning"
              ? "text-blue-600 border-b-2 border-blue-600 pb-1 font-bold"
              : "text-gray-500 hover:text-blue-600"
              }`}
          >
            تدخلات العاجله
          </Link>
          <Link
            to="/Analytics"
            className={`text-sm font-medium transition-colors ${active === "Analytics"
              ? "text-blue-600 border-b-2 border-blue-600 pb-1 font-bold"
              : "text-gray-500 hover:text-blue-600"
              }`}
          >
            التحليلات
          </Link>
          {user?.roles?.includes("Admin") && (
            <Link
              to="/admin"
              className={`text-sm font-medium transition-colors ${active === "admin"
                ? "text-blue-600 border-b-2 border-blue-600 pb-1 font-bold"
                : "text-gray-500 hover:text-blue-600"
                }`}
            >
              لوحة المسؤول
            </Link>
          )}
        </nav>

        <ScenarioYearFilter
          scenario={selectedScenario}
          year={selectedYear}
          onScenarioChange={setScenario}
          onYearChange={setYear}
          className="bg-gray-50 border border-gray-200 rounded-xl p-1"
        />
      </div>

      {/* Right: Ministry Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <h2 className="text-xs font-bold text-gray-900">AlexGuard</h2>
          <p className="text-[10px] text-gray-500">نظام إدارة تنبؤات الفيضان</p>
        </div>
        <img
          src="./public/Photos/logo_alexguard.png"
          alt="App Logo"
          className="w-10 h-auto"
        />
      </div>
    </header>
  );
};

export default Header;
