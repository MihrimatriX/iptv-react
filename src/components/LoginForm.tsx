"use client";

import { useState, type FormEvent } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  User,
  AlertCircle,
  Server,
  Globe,
  Settings,
} from "lucide-react";
import { useAuth, type IPTVCredentials } from "@/contexts/AuthContext";

export function LoginForm() {
  const [apiBase, setApiBase] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sessionCookie, setSessionCookie] = useState("");
  const [userAgent, setUserAgent] = useState("");
  const [streamReferer, setStreamReferer] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { configureIPTV } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!apiBase.trim() || !username.trim() || !password.trim()) {
        setError("API Base URL, kullanıcı adı ve şifre gereklidir");
        return;
      }

      try {
        new URL(apiBase);
      } catch {
        setError("Geçerli bir API Base URL giriniz");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      const credentials: IPTVCredentials = {
        apiBase: apiBase.trim(),
        username: username.trim(),
        password: password.trim(),
        sessionCookie: sessionCookie.trim() || undefined,
        userAgent: userAgent.trim() || undefined,
        streamReferer: streamReferer.trim() || undefined,
      };

      configureIPTV(credentials);
    } catch (err) {
      setError("Konfigürasyon kaydedilirken bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-4">
            <Settings className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            React IPTV Client
          </h1>
          <p className="text-slate-400">
            IPTV servis bilgilerinizi yapılandırın
          </p>
        </div>

        {/* Configuration Form */}
        <div className="bg-slate-800/50 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* API Base URL Field */}
            <div>
              <label
                htmlFor="apiBase"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                API Base URL *
              </label>
              <div className="relative">
                <Server className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="apiBase"
                  type="url"
                  value={apiBase}
                  onChange={(e) => setApiBase(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                  placeholder="http://server.com:8080/player_api.php"
                  required
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Xtream Codes API endpoint URL&apos;i
              </p>
            </div>

            {/* Username Field */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Kullanıcı Adı *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                  placeholder="IPTV kullanıcı adınız"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Şifre *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                  placeholder="IPTV şifreniz"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Session Cookie Field */}
            <div>
              <label
                htmlFor="sessionCookie"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Session Cookie (Opsiyonel)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="sessionCookie"
                  type="text"
                  value={sessionCookie}
                  onChange={(e) => setSessionCookie(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                  placeholder="capp_name_session=..."
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Erişim kısıtlaması varsa tarayıcıdan alınan session cookie
              </p>
            </div>

            {/* User Agent Field */}
            <div>
              <label
                htmlFor="userAgent"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                User Agent (Opsiyonel)
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="userAgent"
                  type="text"
                  value={userAgent}
                  onChange={(e) => setUserAgent(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                  placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Özel User-Agent string (boş bırakılırsa varsayılan kullanılır)
              </p>
            </div>

            {/* Stream Referer Field */}
            <div>
              <label
                htmlFor="streamReferer"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Stream Referer (Opsiyonel)
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="streamReferer"
                  type="url"
                  value={streamReferer}
                  onChange={(e) => setStreamReferer(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                  placeholder="http://server.com/"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Stream istekleri için referer URL&apos;i
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !apiBase || !username || !password}
              className="w-full py-3 bg-primary hover:bg-primary/80 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Yapılandırılıyor...
                </>
              ) : (
                "IPTV'yi Yapılandır"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Bilgileriniz güvenli bir şekilde tarayıcınızda saklanır
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
