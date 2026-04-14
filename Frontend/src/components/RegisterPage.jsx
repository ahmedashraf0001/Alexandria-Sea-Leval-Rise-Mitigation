import React, { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Lock, Mail, User, UserPlus, Waves } from "lucide-react";
import { useAuth } from "../contexts/useAuth";
import { useToast } from "../contexts/useToast";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, register } = useAuth();
  const { addToast } = useToast();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername || !trimmedEmail || !password || !confirmPassword) {
      setError("يرجى تعبئة جميع الحقول المطلوبة.");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        username: trimmedUsername,
        email: trimmedEmail,
        password,
      });

      addToast("تم إنشاء الحساب بنجاح", "success");
      navigate("/home", { replace: true });
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "تعذر إنشاء الحساب. حاول مرة أخرى.";
      setError(message);
      addToast("فشل إنشاء الحساب", "error");
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
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-800/40 to-cyan-500/30" />
        <div className="relative z-10 text-white space-y-4">
          <span className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur">
            <Waves className="w-3 h-3" />
            إنشاء حساب جديد
          </span>
          <h1 className="text-4xl font-extrabold leading-tight max-w-lg">
            ابدأ الآن في منصة تقييم مخاطر السواحل
          </h1>
          <p className="text-sm text-slate-100 max-w-md">
            بعد إنشاء الحساب ستتمكن من استعراض التوقعات المكانية، التحليلات، وتقارير
            البنية التحتية.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-3xl p-8 md:p-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
              إنشاء حساب
            </h2>
            <p className="text-sm text-slate-500">أنشئ حسابك للوصول إلى النظام.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                اسم المستخدم
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  placeholder="alex-user"
                  autoComplete="username"
                />
              </div>
            </div>

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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  placeholder="********"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                تأكيد كلمة المرور
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  placeholder="********"
                  autoComplete="new-password"
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
              className="w-full inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              {isSubmitting ? "جار إنشاء الحساب..." : "إنشاء الحساب"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600 text-center">
            لديك حساب بالفعل؟{" "}
            <Link to="/login" className="text-cyan-600 hover:text-cyan-700 font-bold">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
