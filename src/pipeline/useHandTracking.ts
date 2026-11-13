"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { attachStream, CameraError, openCamera, stopStream } from "@/core/camera";
import { FpsMeter } from "@/core/fps";
import { HandSmoother } from "@/core/smoothing";
import { HandTracker } from "@/core/tracker";
import { GestureEngine } from "@/gestures";
import { moduleHost } from "@/modules/host";
import { useAppStore } from "@/store/app";
import { useHandsStore } from "@/store/hands";

/** How often the (React-visible) stats are refreshed. */
const STATS_INTERVAL_MS = 500;

/**
 * Owns the whole input pipeline for a <video> element:
 * camera -> tracking worker -> smoothing -> gestures -> hands store + active module.
 * Status and errors go to the app store.
 */
export function useHandTracking(videoRef: RefObject<HTMLVideoElement | null>) {
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  // Incremented on every start/stop so stale async work can detect it was superseded.
  const sessionRef = useRef(0);

  const stop = useCallback(() => {
    sessionRef.current++;
    trackerRef.current?.stop();
    trackerRef.current = null;
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    useHandsStore.getState().clear();
  }, [videoRef]);

  const start = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    stop();
    const session = sessionRef.current;
    const app = useAppStore.getState();
    const isCurrent = () => sessionRef.current === session;

    app.setStatus("requesting-camera");
    let stream: MediaStream;
    try {
      stream = await openCamera();
      if (!isCurrent()) {
        stopStream(stream);
        return;
      }
      streamRef.current = stream;
      await attachStream(video, stream);
    } catch (err) {
      if (!isCurrent()) return;
      stop();
      const error =
        err instanceof CameraError
          ? { kind: err.kind, message: err.message }
          : { kind: "unknown" as const, message: "Could not start the camera." };
      useAppStore.getState().setError(error);
      return;
    }
    if (!isCurrent()) return;

    // Camera unplugged or permission revoked while running.
    stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      if (!isCurrent()) return;
      stop();
      useAppStore.getState().setError({
        kind: "no-camera",
        message: "The camera was disconnected.",
      });
    });

    app.setStatus("loading-model");
    const fps = new FpsMeter();
    const smoother = new HandSmoother();
    const gestureEngine = new GestureEngine();
    let inferenceAvg = 0;
    let lastStats = 0;

    const tracker = new HandTracker(video, {
      onReady: (delegate) => {
        if (!isCurrent()) return;
        const state = useAppStore.getState();
        state.setDelegate(delegate);
        state.setStatus("running");
      },
      onFrame: (frame) => {
        if (!isCurrent()) return;
        const hands = smoother.apply(frame.hands, frame.timestamp);
        const aspect =
          video.videoWidth && video.videoHeight
            ? video.videoWidth / video.videoHeight
            : 16 / 9;
        const gestures = gestureEngine.update(hands, frame.timestamp, aspect);
        useHandsStore.getState().setFrame({
          hands,
          gestures,
          timestamp: frame.timestamp,
        });
        moduleHost.frame(hands, gestures, { timestamp: frame.timestamp, aspect });

        const now = performance.now();
        const currentFps = fps.tick(now);
        inferenceAvg =
          inferenceAvg === 0
            ? frame.inferenceMs
            : inferenceAvg * 0.9 + frame.inferenceMs * 0.1;
        if (now - lastStats > STATS_INTERVAL_MS) {
          lastStats = now;
          useAppStore.getState().setStats({
            fps: Math.round(currentFps),
            inferenceMs: Math.round(inferenceAvg),
            handCount: frame.hands.length,
          });
        }
      },
      onError: (message, fatal) => {
        if (!isCurrent()) return;
        if (!fatal) {
          console.warn("[tracking]", message);
          return;
        }
        stop();
        useAppStore.getState().setError({
          kind: "tracking",
          message: `Hand tracking could not start: ${message}`,
        });
      },
    });
    trackerRef.current = tracker;
    tracker.start();
  }, [stop, videoRef]);

  useEffect(() => stop, [stop]);

  return { start, stop };
}
