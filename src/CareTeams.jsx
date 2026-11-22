import { useState } from 'react';
import { Avatar, InviteSomeone } from './CareTeam.jsx';
import NavBar from './NavBar.jsx';
import { createGroup, createInvite, inviteLink, listInvites, listMembers, normalizeEmail, setOwnerSetup } from './group.js';
import { CheckIcon, ChevronIcon, PlusIcon } from './icons.jsx';

// Your care teams: everyone you record stories for. Picking one makes it the current team.
// `message` explains why this screen opened instead of the one asked for, e.g. a link to another team.
export default function YourCareTeams({ user, groups, currentId, message, backButton, menuButton, onSelect, onStart }) {
  return (
    <>
      <NavBar left={backButton} right={menuButton} />
      <main className="content team-page">
        <h1 className="page-title">Your care teams</h1>
        <p className="lead">Pick whose stories to work on.</p>
        {message && <p className="error" role="alert">{message}</p>}
        <div className="story-list">
          {groups.map((group, i) => (
            <button key={group.id} className="person-row" onClick={() => onSelect(group.id)}>
              <Avatar name={group.name} index={i + 1} />
              <span className="person-text">
                <strong>{group.name}</strong>
                <span>{group.ownerId === user.uid ? 'Lead caregiver' : 'Member'}</span>
              </span>
              {group.id === currentId ? (
                <span className="current-mark">
                  <CheckIcon />
                  Open
                </span>
              ) : (
                <span className="row-chevron"><ChevronIcon /></span>
              )}
            </button>
          ))}
        </div>
        <div className="actions">
          <button className="pill pill-primary" onClick={onStart}>
            <PlusIcon />
            Start a new care team
          </button>
          <p className="footnote">Joining someone else&apos;s care team? Open the invite link you were sent.</p>
        </div>
      </main>
    </>
  );
}

// Starting a care team for a patient, led by the signed-in person.
// `first` when they're on no care team yet, so this is the whole app for now: no Back, but Sign out.
export function StartCareTeam({ user, first, notice, backButton, menuButton, onSignOut, onCreated }) {
  const [name, setName] = useState('');
  const [step, setStep] = useState('name');
  const [createdGroup, setCreatedGroup] = useState(null);

  async function ensureGroup(role) {
    if (createdGroup) return createdGroup;
    const id = await createGroup(user, name, role);
    const group = { id, name: name.trim(), ownerId: user.uid, ownerRole: role, clinicianParticipation: null };
    setCreatedGroup(group);
    return group;
  }

  return (
    <>
      <div className="setup-step" hidden={step !== 'name'}>
      <NavBar
        left={first ? (
          <span className="wordmark">
            FAST<span>app</span>
          </span>
        ) : backButton}
        right={first ? <button className="nav-button" onClick={onSignOut}>Sign out</button> : menuButton}
      />
      <main className="content team-page">
        <h1 className="page-title">Start a care team</h1>
        <p className="lead">
          A care team is the family and friends recording stories for one person, and later playing them.
          You&apos;ll lead it, and you can invite others next.
        </p>
        {notice && <p className="notice" role="status">{notice}</p>}
        <form className="sign-in-form" onSubmit={(event) => { event.preventDefault(); setStep('setup'); }}>
          <label className="field">
            <span className="field-label">Your loved one&apos;s name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" autoComplete="off" maxLength={100} disabled={!!createdGroup} required />
          </label>
          <button className="pill pill-primary" type="submit" disabled={!name.trim()}>Continue</button>
        </form>
        {first && (
          <p className="footnote">
            Joining someone else&apos;s care team instead? Ask them for an invite link, and open it on this device.
            You&apos;re signed in as {user.email}.
          </p>
        )}
      </main>
      </div>
      <div className="setup-step" hidden={step !== 'setup'}>
        <CareTeamSetup
          user={user}
          group={createdGroup ?? { id: null, name: name.trim() }}
          ensureGroup={ensureGroup}
          backButton={<button className="nav-button" onClick={() => setStep('name')} disabled={!!createdGroup}>Back</button>}
          menuButton={first ? <button className="nav-button" onClick={onSignOut}>Sign out</button> : menuButton}
          onSaved={async () => {}}
          onDone={(id) => onCreated(id ?? createdGroup.id)}
        />
      </div>
    </>
  );
}

function RoleChoice({ value, onChange, disabled = false }) {
  return <fieldset className="checklist" disabled={disabled}>
    <legend className="field-label">What is your relationship to the patient?</legend>
    {['caregiver', 'clinician'].map((role) => (
      <label key={role} className={`check-row${value === role ? ' on' : ''}`}>
        <input type="radio" name="owner-role" checked={value === role} onChange={() => onChange(role)} />
        <span className="check-box round" aria-hidden="true"><CheckIcon /></span>
        <span>{role === 'caregiver' ? 'Caregiver' : 'Clinician'}</span>
      </label>
    ))}
  </fieldset>;
}

export function CareTeamSetup({ user, group, ensureGroup, backButton, menuButton, onSaved, onDone }) {
  const draftKey = group.id ? `fastapp.setup.${group.id}` : null;
  const [draft] = useState(() => {
    try {
      const value = draftKey && localStorage.getItem(draftKey);
      return value?.startsWith('{') ? JSON.parse(value) : { choice: value };
    } catch { return {}; }
  });
  const [role, setRole] = useState(group.ownerRole ?? draft?.role ?? '');
  const [choice, setChoice] = useState(draft?.choice === 'yes' || draft?.choice === 'no' ? draft.choice : '');
  const [email, setEmail] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function remember(nextRole, nextChoice) {
    try { if (draftKey) localStorage.setItem(draftKey, JSON.stringify({ role: nextRole, choice: nextChoice })); } catch { /* Storage is optional. */ }
  }
  function clearDraft() {
    try { if (draftKey) localStorage.removeItem(draftKey); } catch { /* Storage is optional. */ }
  }
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (role === 'clinician' || choice === 'no') { setConfirming(true); return; }
    setBusy(true);
    const address = normalizeEmail(email);
    try {
      const targetGroup = ensureGroup ? await ensureGroup('caregiver') : group;
      const [members, invites] = await Promise.all([listMembers(targetGroup), listInvites(targetGroup.id)]);
      if (members.some((member) => member.email === address)) throw new Error(`${address} is already on the care team.`);
      const existing = invites.find((invite) => invite.email === address);
      if (existing && existing.access !== 'clinician') throw new Error(`${address} already has a pending invite with different access. Cancel it before creating a clinician invite.`);
      const inviteId = existing?.id ?? await createInvite(targetGroup, user, address, 'clinician', true);
      if (existing) await setOwnerSetup(targetGroup.id, 'caregiver', 'yes');
      await onSaved();
      clearDraft();
      setLink({ email: address, url: inviteLink(targetGroup.id, inviteId) });
    } catch (err) { setError(`Could not create the invite: ${err.message}`); }
    finally { setBusy(false); }
  }
  async function finish() {
    setBusy(true);
    setError('');
    try {
      const targetGroup = ensureGroup ? await ensureGroup(role) : group;
      await setOwnerSetup(targetGroup.id, role, role === 'clinician' ? null : 'no');
      await onSaved();
      clearDraft();
      await onDone(targetGroup.id);
    } catch (err) { setError(`Could not save your choice: ${err.message}`); }
    finally { setBusy(false); }
  }

  if (link) return <InviteSomeone user={user} group={group} initialLink={link} onDone={() => onDone(group.id)} />;
  return <>
    <NavBar left={confirming ? <button className="nav-button" onClick={() => { setConfirming(false); setError(''); }} disabled={busy}>Back</button> : backButton} right={menuButton} />
    <main className="content team-page setup-page">
      <h1 className="page-title">Set up your care team</h1>
      {confirming ? <div className="setup-confirm">
        <p className="lead">{role === 'clinician' ? 'As the clinician, you will complete the initial assessment.' : 'You will take the clinician role and complete the initial assessment.'}</p>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="pill pill-primary" onClick={finish} disabled={busy}>Finish setup</button>
      </div> : <form className="sign-in-form setup-form" onSubmit={submit}>
        <RoleChoice value={role} onChange={(value) => { setRole(value); remember(value, choice); setError(''); }} />
        {role === 'caregiver' && <fieldset className="checklist setup-question">
          <legend className="field-label">Do you have a clinician who will participate in the study and complete the initial assessment?</legend>
          {['yes', 'no'].map((answer) => <label key={answer} className={`check-row${choice === answer ? ' on' : ''}`}>
            <input type="radio" name="clinician-participation" checked={choice === answer} onChange={() => { setChoice(answer); remember(role, answer); setError(''); }} />
            <span className="check-box round" aria-hidden="true"><CheckIcon /></span><span>{answer === 'yes' ? 'Yes' : 'No'}</span>
          </label>)}
        </fieldset>}
        {role === 'caregiver' && choice === 'yes' && <label className="field setup-question">
          <span className="field-label">Clinician&apos;s email address</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" autoCapitalize="none" spellCheck="false" required />
          <span className="hint">They sign in with this address to join.</span>
        </label>}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="pill pill-primary" type="submit" disabled={busy || !role || (role === 'caregiver' && (!choice || (choice === 'yes' && !email.trim())))}>{role === 'caregiver' && choice === 'yes' ? 'Complete' : 'Continue'}</button>
      </form>}
    </main>
  </>;
}
