import * as faceapi from "face-api.js";

export async function loadModels(): Promise<boolean> {
  try {
    const modelUrl = "/models";

    await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
    await faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl);

    return true;
  } catch (error) {
    console.error("Failed to load face-api models:", error);
    return false;
  }
}
