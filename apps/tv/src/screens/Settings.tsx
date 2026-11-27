import { useState } from "react";
import { normalizeXtreamApiBase } from "@iptv/core";
import { useSession, useSource } from "../data/session";
import { useAsync } from "../data/hooks";
import { FocusList } from "../components/FocusList";
import { longDate } from "../format";
import { platform, platformLabel } from "../platform";
import type { Settings as SettingsShape } from "../storage";
import type { ScreenProps } from "./types";

interface Row {
  id: string;
  label: string;
  value: string;
  run?(): void;
}

const ENGINE_LABEL: Record<SettingsShape["engine"], string> = {
  auto: "Otomatik",
  native: "Cihazın oynatıcısı",
  hlsjs: "hls.js",
};
const ENGINES: SettingsShape["engine"][] = ["auto", "native", "hlsjs"];

const hostOf = (apiBase?: string) => {
  try {
    return apiBase ? new URL(normalizeXtreamApiBase(apiBase)).host : "-";
  } catch {
    return apiBase ?? "-";
  }
};

export function Settings({ active, onExitLeft }: ScreenProps) {
  const source = useSource();
  const { settings, updateSettings, signOut, credentials } = useSession();
  const account = useAsync(() => source.account(), [source]);
  const [index, setIndex] = useState(0);
  const info = account.data;

  const rows: Row[] = [
    {
      id: "engine",
      label: "Oynatıcı",
      value: ENGINE_LABEL[settings.engine],
      run: () => updateSettings({ engine: ENGINES[(ENGINES.indexOf(settings.engine) + 1) % ENGINES.length] }),
    },
    {
      id: "format",
      label: "Canlı yayın formatı",
      value: settings.liveFormat === "m3u8" ? "HLS (m3u8)" : "MPEG-TS (ts)",
      run: () => updateSettings({ liveFormat: settings.liveFormat === "m3u8" ? "ts" : "m3u8" }),
    },
    {
      id: "preview",
      label: "Kanal önizlemesi",
      value: settings.preview ? "Açık" : "Kapalı",
      run: () => updateSettings({ preview: !settings.preview }),
    },
    { id: "server", label: "Sunucu", value: source.mode === "demo" ? "Demo modu" : hostOf(credentials?.apiBase) },
    { id: "proxy", label: "Proxy", value: settings.proxy ? settings.proxy.replace(/^https?:\/\//, "") : "Yok (doğrudan)" },
    { id: "user", label: "Kullanıcı", value: info?.username ?? (source.mode === "demo" ? "-" : "…") },
    {
      id: "expires",
      label: "Abonelik bitişi",
      value: info ? (info.expiresAt ? longDate(info.expiresAt) : "Süresiz") : "-",
    },
    {
      id: "connections",
      label: "Bağlantı",
      value: info?.maxConnections != null ? `${info.activeConnections ?? 0} / ${info.maxConnections}` : "-",
    },
    { id: "platform", label: "Cihaz", value: `${platformLabel[platform]} · sürüm ${__APP_VERSION__}` },
    { id: "logout", label: source.mode === "demo" ? "Demodan çık" : "Çıkış yap", value: "", run: signOut },
  ];

  return (
    <div className="settings">
      <h1 className="page-title">Ayarlar</h1>
      <FocusList
        className="settings__list"
        items={rows}
        itemHeight={5.25}
        focusedIndex={index}
        active={active}
        onFocusIndex={setIndex}
        onSelect={(row) => row.run?.()}
        onKey={(action) => {
          if (action === "left" || action === "back") return onExitLeft(), true;
          return false;
        }}
        getKey={(row) => row.id}
        renderItem={(row, _i, focused) => (
          <div className={`row row--setting ${focused ? "is-focused" : ""} ${row.run ? "" : "row--static"}`}>
            <span className="row__label">{row.label}</span>
            <span className="row__value">{row.value}</span>
          </div>
        )}
      />
      <p className="muted settings__note">
        Görüntü gelmeyen kanallarda önce Oynatıcı'yı, sonra Canlı yayın formatı'nı değiştirmeyi dene.
      </p>
    </div>
  );
}
