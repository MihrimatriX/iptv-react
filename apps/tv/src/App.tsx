import { useState } from "react";
import type { SeriesItem, VodItem } from "@iptv/core";
import { SessionProvider, useSession } from "./data/session";
import { PlayerProvider, usePlayer } from "./player/PlayerContext";
import { Player } from "./player/Player";
import { Rail, SECTIONS, type Section } from "./components/Rail";
import { Layer, useKeys } from "./keys";
import { canExit, exitApp } from "./platform";
import { useNow } from "./data/hooks";
import { clock } from "./format";
import { Login } from "./screens/Login";
import { LiveTv } from "./screens/LiveTv";
import { MediaBrowser } from "./screens/MediaBrowser";
import { MovieDetail, SeriesDetail } from "./screens/Details";
import { Search } from "./screens/Search";
import { Settings } from "./screens/Settings";

export function App() {
  return (
    <SessionProvider>
      <PlayerProvider>
        <Root />
        <Player />
      </PlayerProvider>
    </SessionProvider>
  );
}

function Root() {
  const { source } = useSession();
  if (!source) return <Login />;
  return <Shell key={source.mode} />;
}

type Detail = { kind: "movie"; item: VodItem } | { kind: "series"; item: SeriesItem } | null;

function Shell() {
  const { source } = useSession();
  const player = usePlayer();
  const [section, setSection] = useState<Section>("live");
  const [railFocus, setRailFocus] = useState(0);
  const [zone, setZone] = useState<"rail" | "content">("content");
  const [detail, setDetail] = useState<Detail>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const now = useNow(30_000);
  const playerFull = player.mode === "full";

  const open = (next: Section) => {
    setSection(next);
    setDetail(null);
    setZone("content");
  };
  const openItem = (item: VodItem | SeriesItem) => setDetail(item.kind === "movie" ? { kind: "movie", item } : { kind: "series", item });
  const toRail = () => {
    setRailFocus(SECTIONS.findIndex((s) => s.id === section));
    setZone("rail");
  };

  const contentActive = zone === "content" && !detail && !playerFull && !confirmExit;
  const screen = { active: contentActive, onExitLeft: toRail };

  return (
    <div className="shell">
      <Rail
        section={section}
        focused={railFocus}
        active={zone === "rail" && !playerFull && !confirmExit}
        onFocus={setRailFocus}
        onOpen={open}
        onEnterContent={() => setZone("content")}
        onBack={() => (canExit ? setConfirmExit(true) : setZone("content"))}
      />
      <main className="content">
        <header className="topbar">
          {source?.mode === "demo" && <span className="badge badge--demo">DEMO</span>}
          <span className="topbar__clock">{clock(now)}</span>
        </header>
        {section === "live" && <LiveTv {...screen} />}
        {section === "movies" && <MediaBrowser kind="movie" {...screen} onOpen={openItem} />}
        {section === "series" && <MediaBrowser kind="series" {...screen} onOpen={openItem} />}
        {section === "search" && <Search {...screen} onOpen={openItem} />}
        {section === "settings" && <Settings {...screen} />}
      </main>
      {detail && (
        <div className="detail-layer">
          {detail.kind === "movie" ? (
            <MovieDetail item={detail.item} active={!playerFull && !confirmExit} onBack={() => setDetail(null)} />
          ) : (
            <SeriesDetail item={detail.item} active={!playerFull && !confirmExit} onBack={() => setDetail(null)} />
          )}
        </div>
      )}
      {confirmExit && <ExitDialog onCancel={() => setConfirmExit(false)} />}
    </div>
  );
}

function ExitDialog({ onCancel }: { onCancel(): void }) {
  const [focused, setFocused] = useState(1);
  useKeys((action) => {
    if (action === "left") return setFocused(0), true;
    if (action === "right") return setFocused(1), true;
    if (action === "back") return onCancel(), true;
    if (action === "ok") return focused === 0 ? void exitApp() : onCancel(), true;
    return true;
  }, Layer.modal);
  return (
    <div className="modal">
      <div className="modal__box">
        <p className="modal__title">Uygulamadan çıkılsın mı?</p>
        <div className="actions">
          <button type="button" tabIndex={-1} className={`button ${focused === 0 ? "is-focused" : ""}`} onClick={() => void exitApp()}>
            Çık
          </button>
          <button type="button" tabIndex={-1} className={`button button--primary ${focused === 1 ? "is-focused" : ""}`} onClick={onCancel}>
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
