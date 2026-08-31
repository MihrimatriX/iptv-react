import { ChannelBrowser } from "@/components/ChannelBrowser";
import { AuthWrapper } from "@/components/AuthWrapper";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <AuthWrapper>
        <ChannelBrowser />
      </AuthWrapper>
    </main>
  );
}
