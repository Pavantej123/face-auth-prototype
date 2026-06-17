import * as faceapi from "face-api.js";

export async function loadModels(): Promise<boolean> {
  try {
    const modelUrl = "/models";

    console.log("Loading TinyFaceDetector...");
    await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
    console.log("TinyFaceDetector loaded");

    console.log("Loading FaceLandmark68...");
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
    console.log("FaceLandmark68 loaded");

    console.log("Loading FaceRecognition...");
    await faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl);
    console.log("FaceRecognition loaded");

    return true;
  } catch (error) {
    console.error("FAILED MODEL:", error);
    return false;
  }
}