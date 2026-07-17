// face-api (with its TensorFlow runtime) is ~1.4 MB — loaded lazily so the
// portal itself stays light; the engine only downloads when a scan starts.
let faceapiPromise = null;
const getFaceApi = () => (faceapiPromise ??= import('@vladmandic/face-api'));

let modelsPromise = null;

/** Loads detector + landmarks + recognition nets once (served from /models). */
export function loadFaceModels() {
  if (!modelsPromise) {
    modelsPromise = getFaceApi().then((faceapi) =>
      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ])
    );
  }
  return modelsPromise;
}

/** Returns a 128-float descriptor for the face in the video frame, or null. */
export async function getDescriptor(video) {
  const faceapi = await getFaceApi();
  const result = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result ? Array.from(result.descriptor) : null;
}
