/** Where the MediaPipe WASM runtime is served from (copied on postinstall). */
export const WASM_BASE_PATH = "/mediapipe/wasm";

/** Hand landmark model, hosted by Google. ~7.5 MB, cached by the browser. */
export const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export const MAX_HANDS = 2;

/** Frames are downscaled to this width before being sent to the model. */
export const TRACKING_FRAME_WIDTH = 640;

export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 60 },
  },
};
