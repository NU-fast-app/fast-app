// Transcription runs in the browser. Only the model files are downloaded, and the recording
// itself stays on the device.
async function atWhisperRate(samples, sampleRate) {
  const length = Math.ceil(samples.length * 16_000 / sampleRate);
  const output = new Float32Array(length);
  const ratio = sampleRate / 16_000;
  for (let i = 0; i < length; i++) {
    const sourceAt = i * ratio;
    const before = Math.floor(sourceAt);
    const after = Math.min(before + 1, samples.length - 1);
    const fraction = sourceAt - before;
    output[i] = samples[before] * (1 - fraction) + samples[after] * fraction;
  }
  return output;
}

let transcriberPromise;

function loadTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = import('@huggingface/transformers').then(({ pipeline, env }) => {
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      return pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
        progress_callback: (event) => self.postMessage({ type: 'progress', event }),
      });
    }).catch((error) => {
      transcriberPromise = null;
      throw error;
    });
  }
  return transcriberPromise;
}

self.onmessage = async ({ data }) => {
  try {
    const transcriber = await loadTranscriber();
    if (data.type === 'preload') {
      self.postMessage({ type: 'ready', id: data.id });
      return;
    }
    self.postMessage({ type: 'progress', id: data.id, event: { status: 'transcribing' } });
    const audio = await atWhisperRate(data.samples, data.sampleRate);
    const result = await transcriber(audio, {
      return_timestamps: 'word',
      chunk_length_s: 30,
      stride_length_s: 5,
    });
    const words = (result.chunks ?? [])
      .filter(({ text, timestamp }) => text?.trim() && Number.isFinite(timestamp?.[0]) && Number.isFinite(timestamp?.[1]))
      .map(({ text, timestamp }) => ({ text: text.trim(), start: timestamp[0], end: timestamp[1] }));
    self.postMessage({ type: 'result', id: data.id, words });
  } catch (error) {
    self.postMessage({ type: 'error', id: data.id, message: error.message || 'Unknown transcription error.' });
  }
};
