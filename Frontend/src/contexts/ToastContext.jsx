import React, { useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { ToastContext } from "./toastContextValue";

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 3 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 left-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-slide-up transition-all ${
              toast.type === "success"
                ? "bg-white border-green-200 text-green-700"
                : toast.type === "error"
                  ? "bg-white border-red-200 text-red-700"
                  : "bg-white border-blue-200 text-blue-700"
            }`}
          >
            {toast.type === "success" && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            {toast.type === "error" && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            {toast.type === "info" && (
              <Info className="w-5 h-5 text-blue-500" />
            )}

            <span className="text-sm font-bold">{toast.message}</span>

            <button
              onClick={() => removeToast(toast.id)}
              className="hover:bg-gray-100 rounded-full p-1 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
