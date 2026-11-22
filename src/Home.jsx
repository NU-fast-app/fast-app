import { useEffect, useState } from 'react';
import { localDay } from './playing.js';
import { playbackProgress, SESSION_GOAL } from './playbackProgress.js';
import { listSessions } from './sessions.js';
import NavBar from './NavBar.jsx';
import { SetGroups } from './StorySets.jsx';
import { HeadphonesIcon, PlayOutlineIcon } from './icons.jsx';
import { SETS } from './stories.js';

// The home screen: whose care team this is, playback progress, and the ways in:
// recording, listening, and playing stories to the patient.
// On a computer there's room to show the sets themselves too, each with its own Record button.
// `summary` is null while the stories load. `onRecord`, `onRecordInSet` and `onPlay` are null when
// the person's access level doesn't include them.
export default function Home({
  groupId, groupName, canSwitch, onSwitch, notice, summary, menuButton, onRecord, onRecordInSet, onListen, onPlay, onSetup,
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
          <h1 className="page-title">Home</h1>
          <p className="lead team-line">
            For {groupName}&apos;s care team
            {canSwitch && (
              <button className="link-button" onClick={onSwitch}>Switch</button>
            )}
          </p>
        </div>
        {notice && <p className="notice" role="status">{notice}</p>}
        {onSetup && <section className="card setup-alert" aria-labelledby="setup-heading">
          <h2 id="setup-heading">Complete your care team setup</h2>
          <p>Tell us about your role and whether a clinician will be involved in your loved one&apos;s care.</p>
          <button className="pill pill-primary" onClick={onSetup}>Continue setup</button>
        </section>}

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
          {onListen && (
            <button className={`pill ${onRecord ? 'pill-white' : 'pill-primary'}`} onClick={onListen}>
              <HeadphonesIcon />
              Listen and Edit Stories
            </button>
          )}
          {onPlay && (
            <>
              <button className={`pill ${onRecord || onListen ? 'pill-white' : 'pill-primary'}`} onClick={onPlay}>
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
