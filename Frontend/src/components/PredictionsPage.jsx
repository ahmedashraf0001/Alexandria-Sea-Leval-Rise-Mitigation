import React, { useEffect } from "react";
import Header from "./Header";
import ChatPrediction from "./ChatPrediction";
import { useRiskStore } from "../store/riskStore";

const PredictionsPage = () => {
  const { initialize } = useRiskStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col" dir="rtl">
      <Header active="predictions" />

      <main className="flex-1 flex flex-col w-full h-full relative">
        <div className="flex-1 relative overflow-hidden">
          <ChatPrediction />
        </div>
      </main>
    </div>
  );
};

export default PredictionsPage;
