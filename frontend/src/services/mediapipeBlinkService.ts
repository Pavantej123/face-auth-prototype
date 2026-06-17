import "@mediapipe/face_mesh/face_mesh.js";

type Results = {
  multiFaceLandmarks?: Array<Array<{ x: number; y: number }>>;
};

type MediaPipeFaceMesh = {
  close(): Promise<void>;
  onResults(listener: (results: Results) => void): void;
  send(inputs: { image: HTMLVideoElement }): Promise<void>;
  setOptions(options: Record<string, unknown>): void;
};

const LEFT_EYE_LANDMARKS = {
  outer: 33,
  inner: 133,
  upper1: 159,
  upper2: 160,
  lower1: 145,
  lower2: 144,
};

const RIGHT_EYE_LANDMARKS = {
  outer: 362,
  inner: 263,
  upper1: 386,
  upper2: 387,
  lower1: 374,
  lower2: 373,
};

function distance(pointA: { x: number; y: number }, pointB: { x: number; y: number }) {
  const dx = pointA.x - pointB.x;
  const dy = pointA.y - pointB.y;
  return Math.hypot(dx, dy);
}

function getEAR(landmarks: any[], eye: typeof LEFT_EYE_LANDMARKS, width: number, height: number) {
  const outer = landmarks[eye.outer];
  const inner = landmarks[eye.inner];
  const upper1 = landmarks[eye.upper1];
  const upper2 = landmarks[eye.upper2];
  const lower1 = landmarks[eye.lower1];
  const lower2 = landmarks[eye.lower2];

  const pOuter = { x: outer.x * width, y: outer.y * height };
  const pInner = { x: inner.x * width, y: inner.y * height };
  const pUpper1 = { x: upper1.x * width, y: upper1.y * height };
  const pUpper2 = { x: upper2.x * width, y: upper2.y * height };
  const pLower1 = { x: lower1.x * width, y: lower1.y * height };
  const pLower2 = { x: lower2.x * width, y: lower2.y * height };

  const horizontal = distance(pOuter, pInner);
  const vertical1 = distance(pUpper1, pLower1);
  const vertical2 = distance(pUpper2, pLower2);
  return (vertical1 + vertical2) / (2 * horizontal);
}

function isEyeOpen(ear: number) {
  return ear >= 0.22;
}

function isEyeClosed(ear: number) {
  return ear <= 0.18;
}

function buildFaceMesh(): MediaPipeFaceMesh {
  const FaceMeshConstructor = (window as any).FaceMesh || (window as any).faceMesh;
  if (!FaceMeshConstructor) {
    throw new Error("MediaPipe FaceMesh is not available on window");
  }

  const faceMesh = new FaceMeshConstructor({
    locateFile: (file: string) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  }) as MediaPipeFaceMesh;

  faceMesh.setOptions({
    selfieMode: true,
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  return faceMesh;
}

function sendFrame(faceMesh: any, video: HTMLVideoElement): Promise<Results> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeout = window.setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error("MediaPipe frame timeout"));
      }
    }, 1500);

    faceMesh.onResults((results: Results) => {
      if (resolved) {
        return;
      }
      resolved = true;
      window.clearTimeout(timeout);
      resolve(results);
    });

    faceMesh
      .send({ image: video })
      .catch((error: unknown) => {
        if (!resolved) {
          resolved = true;
          window.clearTimeout(timeout);
          reject(error);
        }
      });
  });
}

function getAverageEAR(landmarks: any[], width: number, height: number) {
  const leftEAR = getEAR(landmarks, LEFT_EYE_LANDMARKS, width, height);
  const rightEAR = getEAR(landmarks, RIGHT_EYE_LANDMARKS, width, height);
  return (leftEAR + rightEAR) / 2;
}

export async function verifyBlinkWithMediaPipe(
  video: HTMLVideoElement,
  attempts = 5,
  delayMs = 250
): Promise<boolean> {
  const faceMesh = buildFaceMesh();

  try {
    const initialResults = await sendFrame(faceMesh, video);
    const initialLandmarks = initialResults.multiFaceLandmarks?.[0];
    if (!initialLandmarks || !video.videoWidth || !video.videoHeight) {
      return false;
    }

    const initialEAR = getAverageEAR(
      initialLandmarks,
      video.videoWidth,
      video.videoHeight
    );
    if (!isEyeOpen(initialEAR)) {
      return false;
    }

    let blinkStarted = false;
    for (let i = 0; i < attempts; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const nextResults = await sendFrame(faceMesh, video);
      const nextLandmarks = nextResults.multiFaceLandmarks?.[0];
      if (!nextLandmarks || !video.videoWidth || !video.videoHeight) {
        return false;
      }

      const nextEAR = getAverageEAR(
        nextLandmarks,
        video.videoWidth,
        video.videoHeight
      );

      if (!blinkStarted && isEyeClosed(nextEAR)) {
        blinkStarted = true;
        continue;
      }

      if (blinkStarted && isEyeOpen(nextEAR)) {
        return true;
      }
    }

    return false;
  } finally {
    faceMesh.close();
  }
}
