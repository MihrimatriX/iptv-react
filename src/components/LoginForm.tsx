"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  AlertCircle,
  ChevronDown,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Play,
  Server,
  Sparkles,
  Tv,
  User,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { STATIC_EXPORT } from "@/lib/deploy";

const inputClass =
  "w-full min-w-0 rounded-xl border border-white/10 bg-slate-950/60 py-3 pl-10 pr-4 text-base text-white placeholder-slate-500 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

function Field({
  id,
  label,
  hint,
  icon,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          {icon}
        </span>
        {children}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function LoginForm() {
  const { configureIPTV, enterDemo } = useAuth();
  const [form, setForm] = useState({
    apiBase: "",
    username: "",
    password: "",
    sessionCookie: "",
    userAgent: "",
    streamReferer: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const bind = (key: keyof typeof form) => ({
    id: key,
    value: form[key],
    onChange: (e: { target: { value: string } }) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      new URL(form.apiBase.trim());
    } catch {
      setError("Geçerli bir API Base URL giriniz (ör. http://sunucu.com:8080)");
      return;
    }
    configureIPTV({
      apiBase: form.apiBase.trim(),
      username: form.username.trim(),
      password: form.password.trim(),
      sessionCookie: form.sessionCookie.trim() || undefined,
      userAgent: form.userAgent.trim() || undefined,
      streamReferer: form.streamReferer.trim() || undefined,
    });
  };

  const canSubmit = form.apiBase && form.username && form.password;

  return (
    <div className="flex h-dvh overflow-y-auto overscroll-contain">
      <div className="m-auto w-full max-w-md px-4 py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
            <Tv className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            React IPTV Client
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {STATIC_EXPORT ? "Demo sürümü" : "Xtream Codes hesabınızla bağlanın"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6">
          {STATIC_EXPORT ? (
            <p className="mb-5 rounded-xl border border-accent/20 bg-accent/10 p-3 text-sm leading-relaxed text-slate-200">
              Bu GitHub Pages sürümü yalnızca demo modunda açılır. Kendi Xtream hesabınızı
              bağlamak için uygulamayı Docker ya da <code>npm run start</code> ile kendi
              sunucunuzda çalıştırın. Yayın proxy&apos;si yalnızca orada çalışır.
            </p>
          ) : (
            <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              id="apiBase"
              label="Sunucu adresi"
              hint="/player_api.php yoksa otomatik eklenir"
              icon={<Server className="h-4 w-4" />}
            >
              <input
                {...bind("apiBase")}
                type="url"
                inputMode="url"
                autoComplete="url"
                className={inputClass}
                placeholder="http://sunucu.com:8080"
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="username" label="Kullanıcı adı" icon={<User className="h-4 w-4" />}>
                <input
                  {...bind("username")}
                  autoComplete="username"
                  autoCapitalize="none"
                  className={inputClass}
                  required
                />
              </Field>
              <Field id="password" label="Şifre" icon={<Lock className="h-4 w-4" />}>
                <input
                  {...bind("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={`${inputClass} pr-11`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:text-slate-200"
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </Field>
            </div>

            <details className="group rounded-xl border border-white/5 bg-white/[0.02]">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm text-slate-400 transition hover:text-slate-200">
                Gelişmiş ayarlar
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              <div className="space-y-4 px-3 pb-3">
                <Field
                  id="sessionCookie"
                  label="Session cookie"
                  hint="Panel erişim kısıtlıyorsa tarayıcıdan alınan cookie"
                  icon={<Lock className="h-4 w-4" />}
                >
                  <input {...bind("sessionCookie")} className={inputClass} placeholder="name_session=..." />
                </Field>
                <Field id="userAgent" label="User-Agent" icon={<Globe className="h-4 w-4" />}>
                  <input {...bind("userAgent")} className={inputClass} placeholder="Varsayılan kullanılır" />
                </Field>
                <Field
                  id="streamReferer"
                  label="Yayın referer"
                  hint="Boşsa yayın sunucusunun adresi kullanılır"
                  icon={<Globe className="h-4 w-4" />}
                >
                  <input {...bind("streamReferer")} type="url" className={inputClass} placeholder="http://sunucu.com/" />
                </Field>
              </div>
            </details>

            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-white shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:shadow-none"
            >
              <Play className="h-4 w-4" />
              Bağlan
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-white/10" />
            veya
            <span className="h-px flex-1 bg-white/10" />
          </div>
            </>
          )}

          <button
            type="button"
            onClick={enterDemo}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 font-medium text-slate-200 transition hover:border-primary/50 hover:bg-primary/10"
          >
            <Sparkles className="h-4 w-4 text-accent" />
            Demo ile dene
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">
            Giriş bilgisi olmadan örnek kanallar ve açık test yayınlarıyla arayüzü keşfedin
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Bilgileriniz yalnızca bu tarayıcıda saklanır. Yalnızca yasal aboneliklerle kullanın.
        </p>
        <p className="mt-2 text-center text-xs">
          <Link href="/docs/" className="text-primary hover:underline">
            Nasıl çalışır? Kullanım ve proje yapısı
          </Link>
        </p>
      </div>
    </div>
  );
}
