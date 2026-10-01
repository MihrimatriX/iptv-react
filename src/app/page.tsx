import { ChannelBrowser } from "@/components/ChannelBrowser";
import { AuthWrapper } from "@/components/AuthWrapper";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="h-dvh w-screen overflow-hidden">
      <AuthWrapper>
        <ChannelBrowser />
      </AuthWrapper>
    </div>
  );
}
