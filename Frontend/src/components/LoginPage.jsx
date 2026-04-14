import React, { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Lock, LogIn, Mail, Waves } from "lucide-react";
import { useAuth } from "../contexts/useAuth";
import { useToast } from "../contexts/useToast";

const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const backgroundImage = useMemo(() => {
    return `${import.meta.env.BASE_URL}assets/login-bg.png`;
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        email: trimmedEmail,
        password,
      });

      addToast("تم تسجيل الدخول بنجاح", "success");
      navigate("/home", { replace: true });
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "تعذر تسجيل الدخول. حاول مرة أخرى.";
      setError(message);
      addToast("فشل تسجيل الدخول", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-100"
      dir="rtl"
    >
      <div className="relative hidden lg:flex items-end p-12 overflow-hidden">
        <img
          src={backgroundImage}
          alt="Alexandria coast"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-800/40 to-sky-500/30" />
        <div className="relative z-10 text-white space-y-4">
          <span className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur">
            <Waves className="w-3 h-3" />
            نظام إدارة تنبؤات الفيضان
          </span>
          <h1 className="text-4xl font-extrabold leading-tight max-w-lg">
            منصة الإسكندرية لتوقع المخاطر الساحلية
          </h1>
          <p className="text-sm text-slate-100 max-w-md">
            ادخل إلى لوحة التحكم لمراجعة التوقعات، التحليلات، والتقارير المعتمدة على
            البيانات الفعلية.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-3xl p-8 md:p-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
              تسجيل الدخول
            </h2>
            <p className="text-sm text-slate-500">
              استخدم حسابك للوصول إلى بيانات النظام الحية.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  placeholder="********"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error ? (
              <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              {isSubmitting ? "جار تسجيل الدخول..." : "دخول"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600 text-center">
            ليس لديك حساب؟{" "}
            <Link
              to="/register"
              className="text-sky-600 hover:text-sky-700 font-bold"
            >
              إنشاء حساب جديد
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
