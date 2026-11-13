"use client";

import { useEffect, useRef, useState } from "react";
import { unlockAudio } from "@/audio/unlock";
import { moduleHost } from "@/modules/host";
import { getModule } from "@/modules/registry";
import { useHandTracking } from "@/pipeline/useHandTracking";
import { useAppStore, type AppErrorKind } from "@/store/app";
import HandCanvas from "./HandCanvas";
import ModuleSwitcher from "./ModuleSwitcher";
import DebugToggle from "./DebugToggle";
import StatsBadge from "./StatsBadge";

const ERROR_TITLES: Record<AppErrorKind, string> = {
  "insecure-context": "Secure connection needed",
  unsupported: "Browser not supported",
  "permission-denied": "Camera is blocked",
  "no-camera": "No camera found",
  "in-use": "Camera is busy",
  tracking: "Hand tracking failed",
  unknown: "Something went wrong",
};

export default function Stage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const activeModuleId = useAppStore((s) => s.activeModuleId);
  const { start: startTracking } = useHandTracking(videoRef);

  // Must run inside the click handler: browsers only unlock audio on a gesture.
  const start = () => {
    unlockAudio();
    void startTracking();
  };

  // The active module only runs while tracking is running.
  useEffect(() => {
    if (status !== "running") return;
    void moduleHost.activate(activeModuleId);
  }, [status, activeModuleId]);
  useEffect(() => {
    if (status === "running") return;
    moduleHost.deactivate();
  }, [status]);
  useEffect(() => () => moduleHost.deactivate(), []);
  const [aspect, setAspect] = useState(16 / 9);

  // Keep the stage the same shape as the camera image, so landmarks (0..1)
  // map straight onto the canvas without any cropping maths.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () => {
      if (video.videoWidth && video.videoHeight) {
        setAspect(video.videoWidth / video.videoHeight);
      }
    };
    video.addEventListener("loadedmetadata", update);
    video.addEventListener("resize", update);
    return () => {
      video.removeEventListener("loadedmetadata", update);
      video.removeEventListener("resize", update);
    };
  }, []);

  const live = status === "running" || status === "loading-model";

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center overflow-hidden bg-black">
      <div
        className="relative overflow-hidden bg-zinc-950 sm:rounded-2xl"
        style={{
          aspectRatio: aspect,
          width: `min(100vw, calc(100dvh * ${aspect}))`,
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 h-full w-full -scale-x-100 object-cover transition-opacity duration-500 ${live ? "opacity-100" : "opacity-0"}`}
        />
        {live && <HandCanvas />}
        {status === "running" && <StatsBadge />}
        {status === "running" && <DebugToggle />}
        {status === "running" && <ModuleSwitcher />}
        {status === "running" && <ModuleControls moduleId={activeModuleId} />}

        {status === "loading-model" && (
          <div className="absolute inset-x-0 bottom-6 flex justify-center">
            <p className="rounded-full bg-black/60 px-4 py-2 text-sm text-white backdrop-blur">
              Loading hand tracking…
            </p>
          </div>
        )}

        {(status === "idle" || status === "requesting-camera") && (
          <Panel>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Hand Duet
            </h1>
            <p className="max-w-sm text-balance text-zinc-400">
              Play music with your hands, together from anywhere. Your camera
              video stays on your device.
            </p>
            <button
              type="button"
              onClick={start}
              disabled={status === "requesting-camera"}
              className="rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:opacity-60"
            >
              {status === "requesting-camera"
                ? "Waiting for camera…"
                : "Start camera"}
            </button>
          </Panel>
        )}

        {status === "error" && error && (
          <Panel>
            <h1 className="text-2xl font-semibold text-white">
              {ERROR_TITLES[error.kind]}
            </h1>
            <p role="alert" className="max-w-sm text-balance text-zinc-400">
              {error.message}
            </p>
            <button
              type="button"
              onClick={start}
              className="rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200"
            >
              Try again
            </button>
          </Panel>
        )}
      </div>
    </main>
  );
}

/** The active module's own settings (if it has any), under the Debug button. */
function ModuleControls({ moduleId }: { moduleId: string }) {
  const Controls = getModule(moduleId)?.Controls;
  if (!Controls) return null;
  return (
    <div className="absolute right-3 top-12">
      <Controls />
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center">
      {children}
    </div>
  );
}
