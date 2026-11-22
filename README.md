# FASTapp

A prototype of the Familiar Auditory Sensory Training (FAST) app.
Family members record personal stories for a loved one with a disorder of consciousness, in 4 story sets of about 10 minutes each (2 happy, 2 challenging), which are later played to the patient.

- **Live app:** https://fast-app-cs499.web.app
- **Dev app** (its own database and accounts, for trying changes): https://fast-app-cs499-dev.web.app
- **Design canvas** (every screen on phone and computer, the design decisions, and the sign-in and care team screens): https://claude.ai/artifact/CquXcpcqKMESpw2XEK8N9W
- **UI guide** (an annotated walkthrough of each screen): https://claude.ai/artifact/PTAsrDbXoU1zTCmvN1wXZq

## What works

- Sign in with Google, or with an email address and a password (with password reset and email confirmation).
- Start a care team for a patient, invite family and friends with a link, and switch between care teams.
  The team owner selects their relationship to the patient and, if they are a caregiver, whether a clinician will participate. When they invite a clinician, the app creates a link to share; it does not send email automatically. Existing team owners are prompted to complete missing setup.
  `groups/{groupId}` stores `ownerRole` (`caregiver` or `clinician`) and `clinicianParticipation` (`yes`, `no`, or `null` while unanswered/not applicable); these do not change member access. Older groups may lack both fields.
  For a new team, the name and setup answers are entered before the team is created. The team is created on Finish setup, or on Complete immediately before creating a clinician invite. If that invite fails, retrying uses the same team; after leaving, its owner can resume from Home.
The lead caregiver who started the team and administrators can invite and remove people.
Members can record and edit stories or play sets according to their access level.
Players cannot open Listen, but the database allows them to read the story audio used for set playback.
Only a care team's members can see or change its stories, which the database's security rules enforce.
- Record a story in 3 steps: the patient's name said 3 times, the story (up to 5:00, counting the name), then its details.
- Track each set toward its 9:00 to 11:00 target.
- Fix a story that runs long with a simple editor: trim the ends, shorten long pauses, or speed up or cut a part.
- Listen to whole sets or single stories, seek within them, and move or swap stories between sets, even from happy to challenging.
- Works on phones and on computers (with a sidebar layout at 960 px and wider), in light and dark mode.

The eligibility survey and clinician approval are not built yet.

## Run it

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev:local   # then open http://localhost:5173
```

`npm run dev:local` runs the app against Firestore and Auth emulators on your computer, filled with demo accounts and sample stories, so you can sign in, record, edit, move, delete and invite freely.
It needs Java 21 or newer.
The local data resets each time you stop it (Ctrl+C), and the emulators' own UI at http://127.0.0.1:4000 shows the database and the accounts.
On a Mac, the sample stories are spoken by the built-in voices, each starting with "Sam" said 3 times; the first run takes about 20 seconds to make them.
On other computers they're a voice-like hum.

The demo accounts all use the password `password`:

| Account | Care teams |
| --- | --- |
| `ann@example.com` | Leads Sam Smith's care team (11 sample stories), with Jeff as a member and invites waiting for Mia and dave@example.com |
| `jeff@example.com` | A member of Sam Smith's care team, and leads Family A (1 story) |
| `mia@example.com` | Leads Family B (1 story); the seed prints the link to her invite to Sam Smith's care team |

"Continue with Google" opens the Auth emulator's page, where you can add any made-up Google account.
Emails (confirming an address, resetting a password) aren't sent: the links appear in the Auth tab of the Emulator UI.

`npm run test:rules` runs the security rules tests in `tests/` against the Firestore emulator.
`npm run test:unit` runs the other tests, `npm run lint` checks the code with ESLint, and `npm run build` catches compile errors.

## Test a branch online

Besides the live project, there's a **dev Firebase project**, `fast-app-cs499-dev`, at https://fast-app-cs499-dev.web.app.
It has no connection to the live one: its own database (so its own stories and audio), its own accounts and its own site.
It starts with no data; sign in with Google or make an email account, and start a care team.
Its addresses are public, so record only test stories there, never real patient or family stories.

```bash
npm run dev:remote      # run the app on your computer, against the dev project
npm run deploy:branch   # deploy your branch to its own address on the dev project, for 7 days
npm run deploy:dev      # replace https://fast-app-cs499-dev.web.app, with the rules and indexes
```

`npm run deploy:branch` names the address after your git branch and prints it; put it in your pull request so others can try the change.
Branch addresses share the dev project's database and rules.
If your branch changes `firestore.rules` or `firestore.indexes.json`, deploy them with `npm run deploy:dev`, which changes them for everyone using the dev project.

To deploy, you need to be a member of the dev project: ask the repository owner to add your Google account in the Firebase console (Project settings, Users and permissions).
Run `npx firebase login` once first.

`npm run dev` and `npm run dev:mobile` use the live project instead.
The live project still runs the version from before sign-in, so use `npm run dev:local` or the dev project until it's moved over.

## CI and deploys

GitHub Actions (`.github/workflows/ci.yml`) runs on every pull request and every push to `main`:

1. **Check**: `npm run lint`, `npm run build`, `npm run test:unit`, `npm run test:rules` and `npm audit --omit=dev --audit-level=high`.
Any failure fails the run; lint warnings don't.
2. **Preview** (pull requests): once the checks pass, the branch is deployed to a 7-day preview address on the dev project, and a bot comments the address on the pull request.
Like `npm run deploy:branch`, it shares the dev project's database and deployed rules.
3. **Deploy dev** (pushes to `main`, which includes merging a pull request): once the checks pass, `npm run deploy:dev` deploys the site, `firestore.rules` and `firestore.indexes.json` to https://fast-app-cs499-dev.web.app.
Deploys run one at a time, in order.

The live project is never deployed from CI.
Dependabot (`.github/dependabot.yml`) opens pull requests for dependency and GitHub Actions updates every Monday; review and merge them like any other pull request.

### Before merging a pull request

`main` isn't protected: GitHub lets anyone with write access merge a pull request even if its checks failed, or push to `main` directly.
Every change that reaches `main` is deployed to the dev site, its rules and its indexes automatically, so check each pull request before merging it:

- The **check** job passed (a green check on the pull request).
- You tried the preview address the bot commented, especially for anything a person sees or does.
- The changes are what the pull request says, and a rules change has tests.

### Setup (already done)

The deploy steps use a Google service account that can deploy to the dev project, stored as the repository secret `FIREBASE_SERVICE_ACCOUNT_FAST_APP_CS499_DEV`.
Without the secret (as on Dependabot's and forks' pull requests), the checks still run and the deploys are skipped, with a notice on the run.
This is how it was set up, in case it has to be done again:

1. In a terminal (it asks questions, so not from a tool that can't answer them), run `npx firebase init hosting:github --project fast-app-cs499-dev`.
Without `--project` it uses the default project, which is the live one.
Choose the `NU-fast-app/fast-app` repository, and answer No to every question after that.
It creates a service account (`github-action-...@fast-app-cs499-dev.iam.gserviceaccount.com`) and saves the secret.
2. Undo what it changes in the folder: delete the `.github/workflows/firebase-hosting-*.yml` files it writes (`ci.yml` already does their job), and run `git checkout .firebaserc`, which it switches to the dev project.
3. Give the service account two more roles on `fast-app-cs499-dev`, so `deploy-dev` can deploy rules and indexes: **Firebase Rules Admin** and **Cloud Datastore Index Admin** (Google Cloud console, IAM and admin, IAM; or `gcloud projects add-iam-policy-binding`).

## Use your own Firebase project

To run a fork on your own Firebase project:

1. Create a project in the [Firebase console](https://console.firebase.google.com), add a web app to it, and create a Cloud Firestore database (Standard edition).
In Authentication, turn on the Google and Email/Password sign-in providers.
2. Copy `.env` to `.env.local` and fill in your web app's config.
`.env.local` isn't committed and overrides `.env`.
3. Deploy the security rules, indexes and the app:

```bash
npx firebase login
npm run build
npx firebase deploy --only firestore,hosting --project your-project-id
```

The free Spark plan is enough.

## Dependency notes

**The `@grpc/grpc-js` override.**
`package.json` has an `overrides` entry that forces `@grpc/grpc-js` to 1.14 or newer.
It's there because Firebase, even 13.4.0, depends on `@grpc/grpc-js` 1.9, which `npm audit` reports as a high-severity vulnerability (fixed in 1.13.6).
gRPC only runs in Firebase's Node build, which the seed script and the rules tests use; the app in the browser talks to Firestore over HTTPS and never loads it.
The seed and all rules tests pass with the newer version.

Remove the override once a Firebase release depends on `@grpc/grpc-js` 1.13.6 or newer (check with `npm view @firebase/firestore dependencies`): delete it, run `npm install`, and make sure `npm audit --omit=dev` still finds nothing.
If the seed or the rules tests ever fail with gRPC errors after a Firebase update, suspect this override first.

## Built with

React, Vite and Firebase (Authentication, Cloud Firestore and Hosting).
The story editor uses [SoundTouchJS](https://github.com/cutterbl/SoundTouchJS) (LGPL-2.1), [wasm-media-encoders](https://github.com/arseneyr/wasm-media-encoders) (MIT, with the LGPL LAME encoder), and [Transformers.js](https://github.com/huggingface/transformers.js) with the [Whisper tiny English model](https://huggingface.co/Xenova/whisper-tiny.en) for on-device transcripts.

## For contributors and coding agents

Start with [AGENTS.md](AGENTS.md): the project's rules, data model, commands, deploy steps and working conventions.
`CLAUDE.md` is a symlink to the same file.

More depth is in `docs/`:
- [Requirements](docs/requirements.md): what the FAST app must do, summarized from the project doc, with what's built so far.
- [Architecture](docs/architecture.md): how the code works, its pitfalls, and how to test changes.
- [Design](docs/design.md): the look, the wording, and the reasons behind the design decisions.
- [Roadmap](docs/roadmap.md): what's left to build, with suggested approaches.
