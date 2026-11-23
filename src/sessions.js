import {
  addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore/lite';
import { auth, db } from './firebase.js';
import { isValidGroupId } from './group.js';

// Each time a set is played to the patient, it's saved as a session under the care team:
//
//   groups/{groupId}/sessions/{id}   playedBy, affect, setNumber, day, startedAt, prepared, awake,
//                                    endedAt once the set has played to the end,
//                                    and after once the questions after it are answered
//
// `day` is the date it counts toward ("YYYY-MM-DD", from localDay()), so a set isn't played
// twice in one day. `prepared` lists the checklist items ticked (PREPARE in playing.js) and
// `awake` the signs of being awake (AWAKE). A session is saved when the set starts playing; the only
// changes after that are adding `endedAt` when it plays to the end, so a set stopped partway has
// none, and then `after`: { changes: { AFTER key: "more", "same" or "less" }, agitated: true or false }.

const sessionsRef = (groupId) => collection(db, 'groups', groupId, 'sessions');

// All sessions for a care team, including those played by other members.
export async function listSessions(groupId) {
  if (!isValidGroupId(groupId)) throw new Error('Choose a valid care team first.');
  const snapshot = await getDocs(sessionsRef(groupId));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// The sessions played on `day`, oldest first.
export async function listSessionsOn(groupId, day) {
  if (!isValidGroupId(groupId)) throw new Error('Choose a valid care team first.');
  const snapshot = await getDocs(query(sessionsRef(groupId), where('day', '==', day)));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.startedAt.toMillis() - b.startedAt.toMillis());
}

// Save a session as played by the signed-in person, now. Returns its id.
export async function saveSession(groupId, { affect, setNumber, day, prepared, awake }) {
  if (!isValidGroupId(groupId)) throw new Error('Choose a valid care team first.');
  const sessionRef = await addDoc(sessionsRef(groupId), {
    playedBy: auth.currentUser.uid,
    affect,
    setNumber,
    day,
    startedAt: serverTimestamp(),
    prepared,
    awake,
  });
  return sessionRef.id;
}

// Mark a session as played to the end, now.
export function markSessionEnded(groupId, sessionId) {
  return updateDoc(doc(sessionsRef(groupId), sessionId), { endedAt: serverTimestamp() });
}

// Save the answers to the questions after a session, once it has been marked as ended.
// `changes` has a CHANGES key ("more", "same" or "less") for every AFTER key in playing.js.
export function saveAfter(groupId, sessionId, { changes, agitated }) {
  return updateDoc(doc(sessionsRef(groupId), sessionId), { after: { changes, agitated } });
}
