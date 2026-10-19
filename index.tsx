import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const SafeKidsApp = lazy(() => import("@/components/SafeKidsApp"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SafeKids — Free Parental Control" },
      {
        name: "description",
        content:
          "Free parental control: live GPS, safe zones, screen time, app blocker, web filter, SOS alerts and consent-based camera & screen sharing.",
      },
      { property: "og:title", content: "SafeKids — Free Parental Control" },
      {
        property: "og:description",
        content:
          "Live GPS, safe zones, screen time, app blocking, safe browsing and SOS alerts — 100% free.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      SafeKids…
    </div>
  );
}

function Index() {
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <SafeKidsApp />
      </Suspense>
    </ClientOnly>
  );
}
