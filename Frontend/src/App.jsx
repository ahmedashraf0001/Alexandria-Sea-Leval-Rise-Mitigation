import React, { Suspense, lazy } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { useAuth } from "./contexts/useAuth";

// Lazy loading components for better performance
const ReportsPage = lazy(() => import("./components/ReportsPage"));
const HomePage = lazy(() => import("./components/HomePage"));
const PredictionsPage = lazy(() => import("./components/PredictionsPage"));
const AnalyticsPage = lazy(() => import("./components/AnalyticsPage"));
const InfrastructurePage = lazy(
  () => import("./components/InfrastructurePage"),
);
const LoginPage = lazy(() => import("./components/LoginPage"));
const RegisterPage = lazy(() => import("./components/RegisterPage"));

// Loading Component
const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-gray-500 font-bold text-sm animate-pulse">
      جاري تحميل البيانات...
    </p>
  </div>
);

const RootRedirect = () => {
  const { isAuthenticated, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return <PageLoader />;
  }

  return <Navigate to={isAuthenticated ? "/home" : "/login"} replace />;
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <div className="App">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />

          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/infrastructure"
            element={
              <ProtectedRoute>
                <InfrastructurePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/predictions"
            element={
              <ProtectedRoute>
                <PredictionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </Suspense>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
