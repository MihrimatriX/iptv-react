import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Github, Play, Tv } from "lucide-react";

export const metadata: Metadata = {
  title: "Nasıl çalışır? | React IPTV Client",
  description: "React IPTV Client ne işe yarar, nasıl kullanılır ve nasıl kurulur",
};

const REPO_URL = "https://github.com/MihrimatriX/iptv-react";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4">
      <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="scrollbar-thin overflow-x-auto rounded-xl border border-white/10 bg-slate-950/80 p-4 text-sm leading-relaxed text-slate-200">
      <code>{children}</code>
    </pre>
  );
}

const STRUCTURE = `src/
  app/
    page.tsx              Ana ekran: giriş formu ya da kanal tarayıcı
    docs/page.tsx         Bu sayfa
    api/xtream/           POST: kategori ve kanal listesini panelden çeker
    api/proxy/stream/     HLS proxy'si (playlist adreslerini yeniden yazar)
  components/             LoginForm, ChannelBrowser, VideoPlayer ve diğerleri
  contexts/AuthContext    Giriş bilgileri ve demo oturumu (localStorage)
  hooks/useFavorites      Favoriler için paylaşılan tek store
  lib/
    xtream.ts             player_api.php istemcisi (yalnızca sunucuda)
    demoCatalog.ts        Demo kategorileri ve açık test yayınları
    search.ts             Türkçe karakterlere duyarsız arama
    deploy.ts             GitHub Pages build ayarları
public/                   manifest.json, sw.js, ikonlar
mobile/                   Flutter ile yazılmış Android ve iOS uygulaması`;

const FLOW = `Tarayıcı ──POST /api/xtream──────▶ Next.js ──▶ panel/player_api.php
Oynatıcı ──GET /api/proxy/stream──▶ Next.js ──▶ yayın sunucusu (.m3u8, .ts)`;

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-12 px-4 py-10 leading-relaxed text-slate-300 sm:py-16">
      <header className="space-y-5">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Uygulamaya dön
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
            <Tv className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">React IPTV Client</h1>
        </div>
        <p className="text-lg text-slate-300">
          Xtream Codes hesabınızdaki canlı TV kanallarını tarayıcıdan izlemek için yazılmış bir web
          arayüzü. Kanallar kategorilere ayrılmış olarak gelir, içinde arama yapabilir, sık
          izlediklerinizi favorilere alabilirsiniz. Oynatıcı HLS yayınlarını hls.js ile açar.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition hover:brightness-110"
          >
            <Play className="h-4 w-4" />
            Demoyu aç
          </Link>
          <a
            href={REPO_URL}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            <Github className="h-4 w-4" />
            Kaynak kod
          </a>
        </div>
      </header>

      <Section id="amac" title="Ne işe yarar?">
        <p>
          IPTV sağlayıcılarının çoğu kanal listesini Xtream Codes paneli üzerinden,{" "}
          <code>player_api.php</code> adresinden verir. Uygulama bu adresten canlı kategorileri ve
          kanalları çeker, hepsini tek ekranda listeler ve seçtiğiniz kanalı yan taraftaki
          oynatıcıda açar. Telefonda da çalışır ve PWA olarak ana ekrana eklenebilir.
        </p>
        <p>
          Uygulama kendi başına içerik sunmaz. Kullanmak için yasal bir IPTV aboneliğiniz olmalı.
          Hesabınız yoksa demo modu arayüzü örnek kategorilerle doldurur ve Apple, Mux ve Unified
          Streaming&apos;in herkese açık test yayınlarını oynatır. Demodaki kanal adları yalnızca
          listeyi doldurmak için konmuş, arkalarında gerçek TV yayını yok.
        </p>
      </Section>

      <Section id="kullanim" title="Nasıl kullanılır?">
        <ol className="list-decimal space-y-3 pl-5 marker:text-slate-500">
          <li>
            Giriş ekranına panel adresini (ör. <code>http://sunucu.com:8080</code>), kullanıcı
            adınızı ve şifrenizi yazın. Adreste <code>/player_api.php</code> yoksa uygulama kendisi
            ekler.
          </li>
          <li>
            Bazı paneller tarayıcı dışından gelen istekleri kabul etmez. Böyle bir durumda
            &quot;Gelişmiş ayarlar&quot; bölümünden session cookie, User-Agent ya da yayın referer
            değeri girebilirsiniz.
          </li>
          <li>
            Soldaki menüden bir kategori seçin, açılan listeden kanala tıklayın. Arama büyük küçük
            harfe ve Türkçe karakterlere takılmaz: &quot;trt1&quot; yazınca &quot;TR | TRT 1 HD&quot;
            de çıkar.
          </li>
          <li>
            Kanalın yanındaki yıldız onu favorilere ekler. Listenin üstündeki yıldız da yalnızca
            favorileri gösterir.
          </li>
          <li>
            Oynatıcıda boşluk ya da K tuşu oynatır ve duraklatır, F tam ekrana geçer, M sesi kapatır.
            Resim içinde resim düğmesi de var.
          </li>
        </ol>
        <p>
          Kanal listesi beş dakika boyunca tarayıcıda önbellekte kalır. Menüdeki yenile düğmesi
          listeyi panelden baştan çeker. Yayın donarsa oynatıcı önce kendini toparlamaya çalışır,
          olmazsa yayını artan aralıklarla en fazla beş kez yeniden açar.
        </p>
      </Section>

      <Section id="github-pages" title="Bu sürüm neden yalnızca demo?">
        <p>
          GitHub Pages statik dosya sunar, sunucuda kod çalıştırmaz. Gerçek bir hesapla bağlanmak
          ise iki sunucu rotasına bağlı. <code>/api/xtream</code> kanal listesini panelden çeker,{" "}
          <code>/api/proxy/stream</code> de yayını tarayıcıya aktarır. Xtream panellerinin çoğu düz
          http üzerinden çalışır ve CORS başlığı göndermez. Tarayıcı https bir sayfadan bu
          adreslere doğrudan bağlanamadığı için proxy şart.
        </p>
        <p>
          Pages sürümü bu yüzden demo moduyla açılır ve test yayınlarını proxy olmadan doğrudan
          oynatır. Kendi hesabınızla kullanmak isterseniz uygulamayı aşağıdaki gibi kendi
          bilgisayarınızda ya da sunucunuzda çalıştırın.
        </p>
      </Section>

      <Section id="kurulum" title="Kurulum">
        <p>Node.js 20 veya üstüyle geliştirme sunucusu:</p>
        <Code>{`git clone ${REPO_URL}.git
cd iptv-react
npm install
npm run dev        # http://localhost:3000`}</Code>
        <p>
          Docker ile uygulama 3444 portunda açılır. Compose dosyası reverse proxy ile paylaşılan bir
          ağ bekliyor, onu bir kez oluşturmanız yeterli:
        </p>
        <Code>{`docker network create proxy-network
docker compose up -d   # http://localhost:3444`}</Code>
        <p>
          İsterseniz panel bilgilerini <code>.env</code> dosyasına da yazabilirsiniz, örneği{" "}
          <code>.env.example</code> içinde. Boş bırakırsanız bilgiler giriş ekranından alınır.
        </p>
      </Section>

      <Section id="yapi" title="Proje yapısı">
        <p>
          Next.js (App Router), React 19, TypeScript ve Tailwind CSS 4 ile yazıldı. Kod şöyle
          dağılıyor:
        </p>
        <Code>{STRUCTURE}</Code>
        <p>İstekler iki yoldan geçer:</p>
        <Code>{FLOW}</Code>
        <p>
          Proxy, playlist içindeki segment adreslerini kendi adresine çevirir. Böylece oynatıcı
          her parçayı yine proxy üzerinden ister ve gereken referer ile User-Agent her istekte
          gönderilir. 127.0.0.1, 192.168.x.x gibi yerel ve özel ağ adreslerine giden istekleri
          bilerek reddeder, yönlendirmelerde de aynı kontrolü tekrarlar. Bu yüzden evdeki ağda
          çalışan bir panel bu proxy&apos;den oynatılamaz.
        </p>
        <p>
          <code>mobile/</code> klasöründe aynı akışı kullanan bir Flutter uygulaması var. Android ve
          iOS&apos;ta çalışır, panele doğrudan bağlandığı için Next.js sunucusuna ihtiyaç duymaz.
        </p>
      </Section>

      <Section id="gizlilik" title="Gizlilik">
        <p>
          Giriş bilgileri yalnızca tarayıcınızın localStorage alanında saklanır. Kanal listesi
          istenirken kullanıcı adı ve şifre adres satırına değil POST isteğinin gövdesine konur,
          böylece sunucu loglarına düşmez. Sayfalar arama motorlarına kapalıdır (noindex).
        </p>
      </Section>

      <footer className="border-t border-white/10 pt-6 text-sm text-slate-500">
        Kişisel kullanım için yazıldı. Yalnızca yasal IPTV abonelikleriyle kullanın.
      </footer>
    </main>
  );
}
