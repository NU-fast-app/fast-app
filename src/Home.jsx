import { useEffect, useState } from 'react';
import { localDay } from './playing.js';
import { playbackProgress, SESSION_GOAL } from './playbackProgress.js';
import { listSessions } from './sessions.js';
import NavBar from './NavBar.jsx';
import { SetGroups } from './StorySets.jsx';
import { HeadphonesIcon, PlayOutlineIcon } from './icons.jsx';
import { SETS, SET_MIN, setKey, setName, setStatus, tintClass } from './stories.js';

const MINUTE = 60_000;

// What to do next, e.g. "Next: Happy set 2 needs about 3 more minutes."
function nextStep(summary) {
  const next = SETS.find((s) => setStatus(summary[setKey(s.affect, s.setNumber)].total) === 'short');
  if (!next) return 'Every set has enough stories.';
  const minutes = Math.max(1, Math.ceil((SET_MIN - summary[setKey(next.affect, next.setNumber)].total) / MINUTE));
  return (
    <>
      Next: <strong>{setName(next.affect, next.setNumber)}</strong> needs about {minutes} more {minutes === 1 ? 'minute' : 'minutes'}.
    </>
  );
}

// The home screen: whose care team this is, progress on the 4 story sets, and the ways in:
// recording, listening, and playing stories to the patient.
// On a computer there's room to show the sets themselves too, each with its own Record button.
// `summary` is null while the stories load. `onRecord`, `onRecordInSet` and `onPlay` are null when
// the person's access level doesn't include them.
export default function Home({
  groupId, groupName, canSwitch, onSwitch, notice, summary, menuButton, onRecord, onRecordInSet, onListen, onPlay,
}) {
  const [progressState, setProgressState] = useState({ loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setProgressState({ loading: true });
    listSessions(groupId).then((sessions) => {
      if (active) setProgressState({ progress: playbackProgress(sessions, localDay()) });
    }).catch(() => {
      if (active) setProgressState({ error: true });
    });
    return () => { active = false; };
  }, [groupId, attempt]);

  const ready = summary
    ? SETS.filter((s) => setStatus(summary[setKey(s.affect, s.setNumber)].total) === 'complete').length
    : 0;
  const storyCount = summary ? Object.values(summary).reduce((sum, set) => sum + set.count, 0) : 0;

  return (
    <>
      <NavBar
        left={(
          <span className="wordmark">
            FAST<span>app</span>
          </span>
        )}
        right={menuButton}
      />
      <main className="content">
        <div className="title-block">
          <h1 className="page-title">Your story sets</h1>
          <p className="lead team-line">
            For {groupName}&apos;s care team
            {canSwitch && (
              <button className="link-button" onClick={onSwitch}>Switch</button>
            )}
          </p>
        </div>
        {notice && <p className="notice" role="status">{notice}</p>}

        <section className="card progress-card" aria-label="Progress">
          <div className="card-line">
            <strong>{summary ? `${ready} of ${SETS.length} sets ready` : 'Loading...'}</strong>
            {summary && <span>{storyCount} {storyCount === 1 ? 'story' : 'stories'}</span>}
          </div>
          <div className="segments">
            {SETS.map(({ affect, setNumber }) => {
              const total = summary ? summary[setKey(affect, setNumber)].total : 0;
              const filled = setStatus(total) === 'short' ? Math.min(total / SET_MIN, 1) : 1;
              return (
                <div key={setKey(affect, setNumber)} className={`bar ${tintClass(affect, total)}`}>
                  <div className="bar-fill" style={{ width: `${filled * 100}%` }} />
                </div>
              );
            })}
          </div>
          {summary && <p className="card-text">{nextStep(summary)}</p>}
        </section>

        <section className="card playback-progress" aria-labelledby="playback-heading">
          <h2 id="playback-heading">Playback progress</h2>
          {progressState.loading ? <p role="status">Loading playback progress...</p> : progressState.error ? (
            <div role="alert">
              <p className="error">Could not load playback progress. Please try again.</p>
              <button className="link-button" onClick={() => setAttempt((value) => value + 1)}>Try again</button>
            </div>
          ) : (
            <div className="playback-metrics">
              <div className="playback-metric">
                <div className="playback-ring">
                  <svg viewBox="0 0 120 120" aria-hidden="true">
                    <circle className="ring-track" cx="60" cy="60" r="54" />
                    {progressState.progress.today > 0 && (
                      <circle className="ring-fill" cx="60" cy="60" r="54" pathLength="100" strokeDasharray={`${progressState.progress.today / SETS.length * 100} 100`} />
                    )}
                  </svg>
                  <div><strong>{progressState.progress.today} of {SETS.length}</strong><span>today</span></div>
                </div>
                <span>Sets played today</span>
              </div>
              <div className="playback-metric">
                <div className="playback-gauge">
                  <svg viewBox="0 0 120 70" aria-hidden="true">
                    <path className="gauge-track" d="M 10 60 A 50 50 0 0 1 110 60" pathLength="100" />
                    {progressState.progress.total > 0 && (
                      <path className="gauge-fill" d="M 10 60 A 50 50 0 0 1 110 60" pathLength="100" strokeDasharray={`${Math.min(progressState.progress.total / SESSION_GOAL, 1) * 100} 100`} />
                    )}
                  </svg>
                  <div><strong>{progressState.progress.total} of {SESSION_GOAL}</strong><span>complete</span></div>
                </div>
                <span>Total sessions</span>
              </div>
              <div className="playback-metric">
                <div className="playback-ring">
                  <svg viewBox="0 0 120 120" aria-hidden="true">
                    <circle className="ring-track" cx="60" cy="60" r="54" />
                  </svg>
                  <div><strong>{progressState.progress.completedDays} {progressState.progress.completedDays === 1 ? 'day' : 'days'}</strong><span>all 4 sets played</span></div>
                </div>
                <span>Completed days</span>
              </div>
            </div>
          )}
        </section>

        {summary && (
          <div className="desktop-only">
            <SetGroups summary={summary} onRecord={onRecordInSet} />
          </div>
        )}

        <div className="actions home-actions">
          {onRecord && (
            <button className="pill pill-primary" onClick={onRecord}>
              <span className="record-dot soft" aria-hidden="true" />
              Record a story
            </button>
          )}
          <button className={`pill ${onRecord ? 'pill-white' : 'pill-primary'}`} onClick={onListen}>
            <HeadphonesIcon />
            {onRecord ? 'Listen and Edit Stories' : 'Listen to Stories'}
          </button>
          {onPlay && (
            <>
              <button className="pill pill-white" onClick={onPlay}>
                <PlayOutlineIcon />
                Play Stories
              </button>
              <p className="footnote">For testing, any set with stories can be played. Later, playing opens once all 4 sets are approved.</p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
