import { CAMERA_CONSTRAINTS } from "./config";

export type CameraErrorKind =
  | "insecure-context"
  | "unsupported"
  | "permission-denied"
  | "no-camera"
  | "in-use"
  | "unknown";

export class CameraError extends Error {
  constructor(
    public readonly kind: CameraErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "CameraError";
  }
}

function toCameraError(err: unknown): CameraError {
  const name = err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return new CameraError(
        "permission-denied",
        "Camera access was blocked. Allow the camera for this site in your browser and try again.",
      );
    case "NotFoundError":
    case "OverconstrainedError":
      return new CameraError("no-camera", "No camera was found on this device.");
    case "NotReadableError":
    case "AbortError":
      return new CameraError(
        "in-use",
        "The camera is being used by another app. Close it and try again.",
      );
    default:
      return new CameraError(
        "unknown",
        err instanceof Error ? err.message : "Could not start the camera.",
      );
  }
}

/** Asks for the camera and returns the stream. Throws a CameraError. */
export async function openCamera(): Promise<MediaStream> {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    throw new CameraError(
      "insecure-context",
      "The camera only works over HTTPS or on localhost.",
    );
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraError(
      "unsupported",
      "This browser does not support camera access.",
    );
  }
  try {
    return await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
  } catch (err) {
    throw toCameraError(err);
  }
}

/** Attaches a stream to a video element and waits until it is playing. */
export async function attachStream(
  video: HTMLVideoElement,
  stream: MediaStream,
): Promise<void> {
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
    await new Promise<void>((resolve) => {
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
    });
  }
  await video.play();
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}
