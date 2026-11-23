import { useEffect, useMemo, useRef, useState } from 'react';
import { decodeClip, SAMPLE_RATE } from './audioEdit.js';
import { transcribe } from './transcribe.js';

// Create an on-device, word-timed transcript for a story's name and story recordings.
export default function Transcript({ clips, position = 0, onSeek }) {
  const [words, setWords] = useState(null);
  const [status, setStatus] = useState({ state: 'loading', progress: null });
  const [attempt, setAttempt] = useState(0);
  const activeRequest = useRef(0);
  const validClips = useMemo(() => (clips ?? []).filter((clip) => clip?.blob), [clips]);
  const totalSamples = validClips.reduce((sum, clip) => sum + Math.round(clip.duration * SAMPLE_RATE / 1000), 0);

  useEffect(() => {
    if (!validClips.length) return undefined;
    let cancelled = false;
    const request = ++activeRequest.current;
    setWords(null);
    setStatus({ state: 'loading', progress: null });
    Promise.all(validClips.map((clip) => decodeClip(clip.blob))).then((parts) => {
      const samples = new Float32Array(parts.reduce((sum, part) => sum + part.length, 0));
      let offset = 0;
      for (const part of parts) {
        samples.set(part, offset);
        offset += part.length;
      }
      return transcribe(samples, SAMPLE_RATE, (event) => {
        if (cancelled || request !== activeRequest.current) return;
        if (event.status === 'progress') {
          setStatus({ state: 'loading', progress: Number.isFinite(event.progress) ? Math.round(event.progress) : null });
        } else if (event.status === 'transcribing') setStatus({ state: 'transcribing', progress: null });
      });
    }).then((result) => {
      if (cancelled || request !== activeRequest.current) return;
      if (!result.length) throw new Error('No speech was recognized.');
      setWords(result);
      setStatus({ state: 'ready', progress: null });
    }).catch((error) => {
      if (!cancelled && request === activeRequest.current) setStatus({ state: 'error', progress: null, message: error.message });
    });
    return () => { cancelled = true; };
  }, [validClips, attempt]);

  if (!validClips.length || totalSamples === 0) return null;
  const active = words?.findIndex((word) => position >= word.start * 1000 && position < word.end * 1000) ?? -1;
  return (
    <section className="card transcript-card" aria-label="Story transcript">
      <div className="transcript-heading">
        <strong>Transcript</strong>
        {status.state === 'loading' && <span className="transcript-status" role="status">{status.progress === null ? 'Preparing transcript...' : `Preparing transcript ${status.progress}%`}</span>}
        {status.state === 'transcribing' && <span className="transcript-status" role="status">Listening for words...</span>}
        {status.state === 'error' && <button className="action edit" onClick={() => setAttempt((n) => n + 1)}>Try again</button>}
      </div>
      {words ? (
        <p className="transcript-words" aria-label="Tap a word to play from that point">
          {words.map((word, index) => (
            <button key={`${word.start}-${index}`} className={`transcript-word${active === index ? ' active' : ''}`}
              aria-current={active === index ? 'true' : undefined} onClick={() => onSeek?.(word.start * 1000)}>
              {word.text}
            </button>
          ))}
        </p>
      ) : <p className="transcript-note">{status.state === 'error' ? `Could not create a transcript: ${status.message}` : 'The transcript will appear here.'}</p>}
    </section>
  );
}
