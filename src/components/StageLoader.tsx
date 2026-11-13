"use client";

import dynamic from "next/dynamic";

// Camera, tracking and canvas only exist in the browser, so skip SSR entirely.
const Stage = dynamic(() => import("./Stage"), {
  ssr: false,
  loading: () => <div className="min-h-dvh flex-1 bg-black" />,
});

export default function StageLoader() {
  return <Stage />;
}
