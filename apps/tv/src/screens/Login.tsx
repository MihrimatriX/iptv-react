import { useRef, useState } from "react";
import { XtreamClient, XtreamError } from "@iptv/core";
import { useSession } from "../data/session";
import { useKeys } from "../keys";
import { TextField } from "../components/TextField";
import { apiFetch, platform, platformLabel, setProxyBase, transformApiUrl } from "../platform";

type Field = "server" | "username" | "password" | "proxy" | "submit" | "demo";
const ORDER: Field[] = ["server", "username", "password", "proxy", "submit", "demo"];

/** Accepts an M3U link (get.php?username=…&password=…) in the server field and splits it. */
function fromM3uLink(value: string) {
  try {
    const url = new URL(value.trim());
    const username = url.searchParams.get("username");
    const password = url.searchParams.get("password");
    if (!username || !password) return null;
    return { server: `${url.protocol}//${url.host}`, username, password };
  } catch {
    return null;
  }
}

export function Login() {
  const { signIn, startDemo, credentials, settings, updateSettings } = useSession();
  const [server, setServer] = useState(credentials?.apiBase ?? "");
  const [username, setUsername] = useState(credentials?.username ?? "");
  const [password, setPassword] = useState("");
  const [proxy, setProxy] = useState(settings.proxy);
  const [focus, setFocus] = useState<Field>("server");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = {
    server: useRef<HTMLInputElement>(null),
    username: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    proxy: useRef<HTMLInputElement>(null),
  };

  const move = (delta: number) => {
    const next = ORDER[Math.max(0, Math.min(ORDER.length - 1, ORDER.indexOf(focus) + delta))];
    (document.activeElement as HTMLElement | null)?.blur?.();
    setFocus(next);
  };

  const submit = async () => {
    if (busy) return;
    const apiBase = server.trim();
    if (!apiBase || !username.trim() || !password) {
      setError("Sunucu adresi, kullanıcı adı ve şifre gerekli.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const creds = { apiBase, username: username.trim(), password };
      setProxyBase(proxy);
      // Check the account before saving, so a typo doesn't land on an empty screen.
      await new XtreamClient(creds, { fetch: apiFetch, transformUrl: transformApiUrl }).getAccount();
      updateSettings({ proxy: proxy.trim() });
      signIn(creds);
    } catch (e) {
      setError(
        e instanceof XtreamError && e.status === 401
          ? "Kullanıcı adı veya şifre hatalı."
          : `Sunucuya bağlanılamadı. ${e instanceof Error ? e.message : ""}`
      );
    } finally {
      setBusy(false);
    }
  };

  const activate = (field: Field) => {
    if (field === "submit") return void submit();
    if (field === "demo") return startDemo();
    const input = inputs[field].current;
    if (document.activeElement === input) input?.blur();
    else input?.focus();
  };

  useKeys((action) => {
    if (action === "up") return move(-1), true;
    if (action === "down") return move(1), true;
    if (action === "ok") return activate(focus), true;
    if (action === "left" && focus === "demo") return setFocus("submit"), true;
    if (action === "right" && focus === "submit") return setFocus("demo"), true;
    if (action === "back") return (document.activeElement as HTMLElement | null)?.blur?.(), true;
    return false;
  });

  const onServer = (value: string) => {
    const parsed = fromM3uLink(value);
    if (parsed) {
      setServer(parsed.server);
      setUsername(parsed.username);
      setPassword(parsed.password);
    } else setServer(value);
  };

  return (
    <div className="login">
      <div className="login__hero">
        <div className="login__logo">A</div>
        <h1>AFU IPTV</h1>
        <p className="muted">Xtream Codes hesabınla canlı TV, filmler ve diziler. {platformLabel[platform]} sürümü.</p>
        <ul className="login__tips muted">
          <li>Sunucu adresi örneği: http://sunucu.com:8080</li>
          <li>M3U bağlantını (get.php?username=…) yapıştırırsan bilgiler otomatik dolar.</li>
          <li>OK tuşu klavyeyi açar, ▲▼ alanlar arasında gezinir.</li>
          <li>Panelin bağlantıyı reddederse kendi sunucundaki web uygulamasını proxy olarak yaz.</li>
        </ul>
      </div>
      <div className="login__form">
        <TextField ref={inputs.server} label="Sunucu adresi" type="url" value={server} onChange={onServer} focused={focus === "server"} onHover={() => setFocus("server")} placeholder="http://sunucu.com:8080" />
        <TextField ref={inputs.username} label="Kullanıcı adı" value={username} onChange={setUsername} focused={focus === "username"} onHover={() => setFocus("username")} />
        <TextField ref={inputs.password} label="Şifre" type="password" value={password} onChange={setPassword} focused={focus === "password"} onHover={() => setFocus("password")} />
        <TextField ref={inputs.proxy} label="Proxy sunucusu (isteğe bağlı)" type="url" value={proxy} onChange={setProxy} focused={focus === "proxy"} onHover={() => setFocus("proxy")} placeholder="https://iptv.alanadin.com" />
        {error && <p className="login__error">{error}</p>}
        <div className="actions">
          <button type="button" tabIndex={-1} className={`button button--primary ${focus === "submit" ? "is-focused" : ""}`} onClick={() => void submit()} onMouseEnter={() => setFocus("submit")}>
            {busy ? "Bağlanılıyor…" : "Giriş yap"}
          </button>
          <button type="button" tabIndex={-1} className={`button ${focus === "demo" ? "is-focused" : ""}`} onClick={startDemo} onMouseEnter={() => setFocus("demo")}>
            Demo ile dene
          </button>
        </div>
      </div>
    </div>
  );
}
