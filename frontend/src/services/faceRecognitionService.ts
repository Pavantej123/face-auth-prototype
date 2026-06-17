import * as faceapi from "face-api.js";

export type FaceQualityStatus =
  | "Face ready"
  | "Move closer"
  | "Move farther"
  | "Center your face"
  | "No face detected"
  | "Multiple faces detected";

const detectorOptions = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,
  scoreThreshold: 0.5,
});

export async function getFaceDescriptor(
  image: HTMLImageElement
): Promise<Float32Array | null> {
  const detection = await faceapi
    .detectSingleFace(image, detectorOptions)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    return null;
  }

  return detection.descriptor;
}

export async function getFaceQualityStatus(
  video: HTMLVideoElement
): Promise<FaceQualityStatus> {
  const detections = await faceapi.detectAllFaces(video, detectorOptions);
  if (!detections || detections.length === 0) {
    return "No face detected";
  }

  if (detections.length > 1) {
    return "Multiple faces detected";
  }

  const detection = detections[0];
  const frameWidth = video.videoWidth;
  const frameHeight = video.videoHeight;
  if (!frameWidth || !frameHeight) {
    return "Center your face";
  }

  const { x, width } = detection.box;
  const ratio = width / frameWidth;
  if (ratio < 0.22) {
    return "Move closer";
  }
  if (ratio > 0.5) {
    return "Move farther";
  }

  const centerX = x + width / 2;
  const offsetX = Math.abs(centerX - frameWidth / 2) / frameWidth;

  if (offsetX > 0.12) {
    return "Center your face";
  }

  return "Face ready";
}

export async function getFaceDetectionSummary(
  video: HTMLVideoElement
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  const detection = await faceapi
    .detectSingleFace(video, detectorOptions)
    .withFaceLandmarks();

  if (!detection) {
    return null;
  }

  return {
    x: detection.detection.box.x,
    y: detection.detection.box.y,
    width: detection.detection.box.width,
    height: detection.detection.box.height,
  };
}

export function hasLiveMotion(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number }
): boolean {
  const dx = Math.abs(first.x - second.x);
  const dy = Math.abs(first.y - second.y);
  const dw = Math.abs(first.width - second.width);
  const dh = Math.abs(first.height - second.height);
  const reference = Math.max(first.width, first.height);

  const centerChange = Math.sqrt((dx / reference) ** 2 + (dy / reference) ** 2);
  return centerChange > 0.035 || dw / reference > 0.03 || dh / reference > 0.03;
}

export async function verifyFaceMotion(
  video: HTMLVideoElement,
  checks = 2,
  delayMs = 700
): Promise<boolean> {
  const initial = await getFaceDetectionSummary(video);
  if (!initial) {
    return false;
  }

  for (let i = 1; i < checks; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    const next = await getFaceDetectionSummary(video);
    if (!next) {
      return false;
    }

    if (hasLiveMotion(initial, next)) {
      return true;
    }
  }

  return false;
}

export function getFaceSampleInstruction(sampleNumber: number): string {
  switch (sampleNumber) {
    case 1:
      return "Look at the camera naturally.";
    case 2:
      return "Move slightly closer to the camera.";
    case 3:
      return "Move slightly farther from the camera.";
    case 4:
      return "Turn your head slightly left.";
    case 5:
      return "Turn your head slightly right.";
    default:
      return "All samples collected. Click Register.";
  }
}

export function getFaceSampleName(sampleNumber: number): string {
  switch (sampleNumber) {
    case 1:
      return "Front-facing pose";
    case 2:
      return "Slight left pose";
    case 3:
      return "Slight right pose";
    case 4:
      return "Slightly closer pose";
    case 5:
      return "Slightly farther pose";
    default:
      return "Registration complete";
  }
}

export type FaceSampleValidation = {
  ready: boolean;
  message: string;
};

export async function getSamplePoseStatus(
  _sampleNumber: number,
  video: HTMLVideoElement
): Promise<FaceSampleValidation> {
  const detections = await faceapi.detectAllFaces(video, detectorOptions);

  if (!detections || detections.length === 0) {
    return { ready: false, message: "No face detected" };
  }

  if (detections.length > 1) {
    return { ready: false, message: "Multiple faces detected" };
  }

  const detection = detections[0];
  const frameWidth = video.videoWidth;
  const frameHeight = video.videoHeight;
  if (!frameWidth || !frameHeight) {
    return { ready: false, message: "Move closer" };
  }

  const box = detection.box;
  const ratio = box.width / frameWidth;
  const centerX = box.x + box.width / 2;
  const offsetX = Math.abs(centerX - frameWidth / 2) / frameWidth;

  const isCentered = offsetX <= 0.12;
  const isWithinSize = ratio >= 0.22 && ratio <= 0.5;

  if (!isWithinSize) {
    if (ratio < 0.22) {
      return { ready: false, message: "Move closer" };
    }
    return { ready: false, message: "Move farther" };
  }

  if (!isCentered) {
    return { ready: false, message: "Center your face" };
  }

  return { ready: true, message: "Perfect alignment" };
}
