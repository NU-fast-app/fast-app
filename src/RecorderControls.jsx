import LiveWaveform from './LiveWaveform.jsx';
import { PauseIcon, PlayIcon, StopIcon } from './icons.jsx';
import { STORY_MAX, STORY_WARN, formatTime, recordingSetProgress } from './stories.js';

// The recorder's card and buttons, used to record a story (RecordStory) and to add a part to one
// (StoryEditor).

const STATUS = { idle: 'Ready to record', recording: 'Recording', paused: 'Paused' };
const WARN_BEFORE_LIMIT = STORY_MAX - STORY_WARN; // the bar turns yellow this long before the limit

// The recorder card: status, the big timer, the live waveform, and for the story a bar toward its
// limit. `length` is the story so far with its name clip, since the 5:00 cap counts the name.
// `room` is how much the set can still take before this recording.
// The limit is 5:00, or the set's room if that's less. Under the bar, one line says what's left:
// the same "Start wrapping up." near either limit, and "Finish your story now." past it.
export function RecorderCard({ tint, recorder, length, story, room }) {
  const { state } = recorder;
  const limit = Math.min(STORY_MAX, room);
  let level = 'ok';
  if (length > limit) level = 'long';
  else if (length >= limit - WARN_BEFORE_LIMIT) level = 'warn';

  const progress = story ? recordingSetProgress(room) : null;
  const left = formatTime(Math.ceil((limit - length) / 1000) * 1000); // rounded up, so it never says 0:00 too soon
  const hint = level === 'long' ? 'Finish your story now.'
    : `${left} left${progress?.show ? ' in this set' : ''}${level === 'warn' ? '. Start wrapping up.' : ''}`;
  const minimumPosition = progress ? `${(progress.minimum / STORY_MAX) * 100}%` : '0%';
  const maximumPosition = progress ? `${(progress.maximum / STORY_MAX) * 100}%` : '0%';

  return (
    <section className={`card recorder ${tint}`}>
      <span className={`status ${state}`} aria-live="polite">
        <span className="record-dot" aria-hidden="true" />
        {STATUS[state]}
      </span>
      <div className="timer">
        <strong>{formatTime(length)}</strong>
        {story && <span>of {formatTime(STORY_MAX)}</span>}
      </div>
      {/* Keeps its height when not recording, so the screen doesn't jump. */}
      <div className="waveform-slot">{state === 'recording' && <LiveWaveform stream={recorder.stream} />}</div>
      {story && (
        <div className="limit-bar">
          {progress.show && <div className="bar-labels marker-labels">
            <span className="marker-label" style={{ '--marker-position': minimumPosition }}>Min</span>
            <span className="marker-label" style={{ '--marker-position': maximumPosition }}>Max</span>
          </div>}
          <div className="bar bar-thick">
            <div className={`bar-fill ${level}`} style={{ width: `${Math.min(length / STORY_MAX, 1) * 100}%` }} />
            {progress.show && <>
              <div className="bar-marker" style={{ left: minimumPosition }} />
              <div className="bar-marker" style={{ left: maximumPosition }} />
            </>}
          </div>
          <div className="bar-labels">
            <span className="end-label">{formatTime(STORY_MAX)}</span>
          </div>
          <p className={`timer-hint ${level}`}>{hint}</p>
        </div>
      )}
    </section>
  );
}

// Start, then Finish and Pause (or Resume) while recording.
export function RecordButtons({ recorder, finishLabel, onStart, onStop }) {
  const { state } = recorder;
  if (state === 'idle') {
    return (
      <button className="pill pill-record" onClick={onStart}>
        <span className="record-dot" aria-hidden="true" />
        Start recording
      </button>
    );
  }
  const paused = state === 'paused';
  return (
    <>
      {/* Finish takes Start's place, so it waits a second: a double tap shouldn't end the recording. */}
      <button className="pill pill-record" onClick={onStop} disabled={recorder.elapsed < 1000}>
        <StopIcon />
        {finishLabel}
      </button>
      <button className="pill pill-white" onClick={paused ? recorder.resume : recorder.pause}>
        {paused ? <PlayIcon /> : <PauseIcon />}
        {paused ? 'Resume' : 'Pause'}
      </button>
    </>
  );
}
