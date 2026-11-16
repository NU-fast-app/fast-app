// Keep one worker for the site session so it can download and cache the model in the background.
let worker;
let nextRequestId = 1;
let preloadPromise;
const requests = new Map();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./transcribe.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (data.type === 'progress') {
      const listeners = data.id === undefined
        ? [...requests.values()]
        : [requests.get(data.id)].filter(Boolean);
      listeners.forEach((request) => request.onProgress?.(data.event));
      return;
    }
    const request = requests.get(data.id);
    if (!request) return;
    requests.delete(data.id);
    if (data.type === 'error') request.reject(new Error(data.message));
    else request.resolve(data.words);
  };
  worker.onerror = (event) => {
    const failed = worker;
    worker = null;
    requests.forEach((request) => request.reject(new Error(event.message || 'The speech model stopped unexpectedly.')));
    requests.clear();
    failed?.terminate();
  };
  return worker;
}

function send(type, payload = {}, onProgress) {
  const id = nextRequestId++;
  return new Promise((resolve, reject) => {
    requests.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({ type, id, ...payload }, payload.samples ? [payload.samples.buffer] : []);
  });
}

export function preloadTranscriber() {
  if (!preloadPromise) {
    preloadPromise = send('preload').catch((error) => {
      preloadPromise = null;
      throw error;
    });
  }
  return preloadPromise;
}

export function transcribe(samples, sampleRate, onProgress) {
  return send('transcribe', { samples: samples.slice(), sampleRate }, onProgress);
}
