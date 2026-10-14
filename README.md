# SCORM Test Kit

A small, self-hosted SCORM player for testing e-learning packages. No SCORM Cloud and no LMS needed.

Drop a SCORM `.zip` into `packages/`, start the server, and open the course in your browser. The player:

- runs the course using [scorm-again](https://github.com/jcputney/scorm-again)
- shows every SCORM call live in a side panel
- saves learner progress, so closing a course and coming back resumes it

It runs locally with Node.js and deploys to Vercel as-is.

---

## Contents

- [Supported SCORM versions](#supported-scorm-versions)
- [Quick start](#quick-start)
- [Using the app](#using-the-app)
- [Adding a SCORM package](#adding-a-scorm-package)
- [Example: Rustici "Golf Examples"](#example-rustici-golf-examples)
- [Creating your own SCORM course](#creating-your-own-scorm-course)
- [Tagging courses](#tagging-courses)
- [How progress is saved](#how-progress-is-saved)
- [Deploying to Vercel](#deploying-to-vercel)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)

---

## Supported SCORM versions

| Version | Supported | Notes |
|---|---|---|
| **SCORM 1.2** | ✅ Yes | The course finds `window.API` |
| **SCORM 2004** (2nd, 3rd, 4th edition) | ✅ Yes | The course finds `window.API_1484_11` |
| SCORM 1.1 | ❌ No | |
| AICC, xAPI (Tin Can), cmi5 | ❌ No | |

The version is read from `<schemaversion>` in `imsmanifest.xml`. If it contains `1.2`, the course runs as SCORM 1.2. Anything else runs as SCORM 2004.

**Limitations**

- **Only the first SCO is launched.** A multi-SCO package opens only its first launchable item.
- **SCORM 2004 sequencing and navigation rules are not run.** This covers `imsss` and `adlnav`, including "Continue", "Previous" and choice navigation between SCOs. Packages that depend on them load their first SCO only.

This kit is for testing how a course talks to the LMS: initialize, get and set values, commit, terminate, and resume. It is not a full LMS.

---

## Quick start

Requires **Node.js 20 or newer**.

```bash
npm install
npm start
```

Open **http://localhost:3000**.

`npm start` does two things:

1. `npm run build` (`scripts/build.js`):
   - unzips every package in `packages/` into `public/courses/`
   - copies scorm-again into `public/lib/`
   - writes the course list to `courses.json`
2. `node server.js` starts the server on port 3000. Set `PORT=4000 npm start` to use another port.

Stop the server with `Ctrl+C`.

---

## Using the app

1. **Enter your name.** You get a unique learner ID (a UUID). The name and ID are remembered in this browser.
2. **Pick a course** from *All courses* and click **Start**.
3. The **player** shows:
   - a details bar: learner, user ID, live status, score, and session (new or resumed)
   - the course, in a frame
   - a **SCORM calls** log of every value the course sets, plus Initialize, Commit and Terminate
4. **Leave the course.** Either click the course's own **Exit** button, or close the tab. The player saves progress, and after Exit it returns you to the course list.
5. Back on the list, **Your progress** shows each course you started:
   - name, user ID and course
   - status and score
   - started at and completed at
   - a **Resume** button that continues where you left off

Click **Not you?** to switch to a different learner. This forgets the current ID in this browser.

---

## Adding a SCORM package

1. Put the `.zip` file in the **`packages/`** folder.
2. Run `npm start` again locally, or redeploy on Vercel.

The course then appears in the list.

### Rules for the zip

- **`imsmanifest.xml` must be at the root of the zip**, not inside a sub-folder. Check with:
  ```bash
  unzip -l packages/my-course.zip | grep imsmanifest.xml
  ```
  You want `imsmanifest.xml` on its own, not `my-course/imsmanifest.xml`.
- **The file name becomes the course ID.** `packages/fire-safety.zip` becomes the course `fire-safety`, served at `/courses/fire-safety/`. Use only letters, numbers, `-` and `_`.
- **Keep the same file name when you update a course.** Saved progress is stored per course ID. Renaming the zip starts everyone from scratch.

Every build deletes and re-extracts each zip, so replacing a zip in `packages/` is all you need to update a course.

---

## Example: Rustici "Golf Examples"

Rustici Software publishes free, open SCORM test packages called the **Golf Examples**:
https://scorm.com/scorm-explained/technical-scorm/golf-examples/

### Already included

`packages/RuntimeBasicCalls_SCORM20043rdEdition.zip` is the *SCORM 2004 3rd Edition Basic Run-time* example. It appears in the list as **Golf Explained - Run-time Basic Calls** (SCORM 2004). Start it to see a real-world course:

- it sets `cmi.location` as you move between pages
- it asks *"Would you like to save your progress to resume later?"* when you click **Exit**
- after that, the player saves and returns you to the list, where **Resume** takes you back to the same page

### Download and add another one

For example, the SCORM 1.2 version of the same course:

```bash
curl -L -o packages/RuntimeBasicCalls_SCORM12.zip \
  https://scorm.com/wp-content/assets/golf_examples/PIFS/RuntimeBasicCalls_SCORM12.zip

npm start
```

You can also download it in the browser from the Golf Examples page and save it into `packages/`.

It appears as **Golf Explained - Run-time Basic Calls** with a **SCORM 1.2** badge. It has the same title as the 2004 one, so use the badge to tell them apart, or [tag it](#tagging-courses).

### Which Golf Examples work here

| Package | Works? |
|---|---|
| `RuntimeBasicCalls_SCORM12.zip`, `RuntimeBasicCalls_SCORM20043rdEdition.zip` | ✅ Single SCO, full course **(recommended)** |
| `RunTimeAdvancedCalls_SCORM20043rdEdition.zip` | ✅ Single SCO |
| `RuntimeMinimumCalls_*.zip` | ⚠️ First SCO only (each page is a separate SCO, 18 in total) |
| `ContentPackagingOneFilePerSCO_*.zip` | ⚠️ First SCO only |
| `Sequencing*.zip` | ⚠️ First SCO only; sequencing rules are ignored |
| `ContentPackagingSingleSCO_*.zip`, `ContentPackagingMetadata_*.zip` | ⚠️ These make no SCORM calls (Rustici marks them "not functional"), so nothing is tracked |
| `*_SCORM11.zip` | ❌ SCORM 1.1 is not supported |

All of them follow the same URL pattern:
`https://scorm.com/wp-content/assets/golf_examples/PIFS/<file name>.zip`

---

## Creating your own SCORM course

A SCORM package is a zip containing your web content (HTML, JS, CSS, images) and an `imsmanifest.xml` that tells the LMS what to launch.

### Start from the samples

`samples/` holds the source of the two sample courses. Each is a 7-page *General Knowledge Basics* course, tagged *AI generated* in the list:

- welcome page
- three lesson pages
- two quiz pages with 10 easy questions
- a results page with score and review

```
samples/sample-scorm12/        samples/sample-scorm2004/
├── imsmanifest.xml   ← SCORM 1.2 manifest   ├── imsmanifest.xml  ← SCORM 2004 manifest
├── index.html        ← pages (sections)     ├── index.html       ┐
├── course.js         ← SCORM logic + quiz   ├── course.js        ├ identical to the 1.2 copy
└── course.css                               └── course.css       ┘
```

`course.js` detects SCORM 1.2 or 2004 by itself. The two folders differ **only** in `imsmanifest.xml`.

To make your own course:

```bash
# 1. copy a sample
cp -r samples/sample-scorm2004 samples/my-course

# 2. edit the content:
#    - samples/my-course/index.html: pages
#    - samples/my-course/course.js: QUESTIONS and PASS_MARK
#    - samples/my-course/imsmanifest.xml: titles, identifier, file list

# 3. zip it, with imsmanifest.xml at the root
cd samples/my-course && zip -r ../../packages/my-course.zip . && cd -

# 4. run it
npm start
```

> Editing files in `samples/` has no effect until you zip them into `packages/`. The build only reads `packages/*.zip`.

### Minimal course from scratch

The smallest working package is two files.

**`imsmanifest.xml`, SCORM 1.2**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="com.example.my-course" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>My Course</title>
      <item identifier="ITEM-1" identifierref="RES-1">
        <title>My Course</title>
        <adlcp:masteryscore>60</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>
```

**`imsmanifest.xml`, SCORM 2004**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="com.example.my-course" version="1"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>My Course</title>
      <item identifier="ITEM-1" identifierref="RES-1">
        <title>My Course</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormType="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>
```

Note the spelling: SCORM 1.2 uses `adlcp:scormtype`, while SCORM 2004 uses `adlcp:scormType`.

**`index.html`, SCORM 2004 shown**

```html
<!doctype html>
<html>
<body>
  <h1>My Course</h1>
  <button onclick="finish(100)">Complete with 100%</button>

  <script>
    // 1. Find the LMS API (the player puts it on a parent window)
    function findAPI(win) {
      for (var i = 0; win && i < 10; i++, win = win.parent) {
        if (win.API_1484_11) return win.API_1484_11;  // SCORM 2004
        if (win.parent === win) break;
      }
      return null;
    }
    var api = findAPI(window);

    // 2. Start the session
    api.Initialize("");
    api.SetValue("cmi.completion_status", "incomplete");
    api.Commit("");

    // 3. Report the result and end the session
    function finish(score) {
      api.SetValue("cmi.score.raw", String(score));
      api.SetValue("cmi.score.scaled", String(score / 100));
      api.SetValue("cmi.completion_status", "completed");
      api.SetValue("cmi.success_status", score >= 60 ? "passed" : "failed");
      api.SetValue("cmi.exit", "suspend");
      api.Commit("");
      api.Terminate("");
    }
  </script>
</body>
</html>
```

### SCORM 1.2 and 2004 equivalents

| What | SCORM 1.2 (`window.API`) | SCORM 2004 (`window.API_1484_11`) |
|---|---|---|
| Start / end | `LMSInitialize("")` / `LMSFinish("")` | `Initialize("")` / `Terminate("")` |
| Read / write | `LMSGetValue(k)` / `LMSSetValue(k, v)` | `GetValue(k)` / `SetValue(k, v)` |
| Save now | `LMSCommit("")` | `Commit("")` |
| Learner name | `cmi.core.student_name` | `cmi.learner_name` |
| Bookmark (page) | `cmi.core.lesson_location` | `cmi.location` |
| Saved state (string) | `cmi.suspend_data` (max 4,096 chars) | `cmi.suspend_data` (max 64,000 chars) |
| Status | `cmi.core.lesson_status`: `incomplete`, `completed`, `passed`, `failed` | `cmi.completion_status` + `cmi.success_status` |
| Score | `cmi.core.score.raw` / `.min` / `.max` | `cmi.score.raw` / `.min` / `.max` / `.scaled` (0–1) |
| Resume next time | `cmi.core.exit = "suspend"` | `cmi.exit = "suspend"` |
| Time spent | `cmi.core.session_time = "0000:05:30.00"` | `cmi.session_time = "PT5M30S"` |

### Tips

- **List every file** in the manifest's `<resource>` with a `<file href="..."/>` entry.
- **Use relative paths** inside the course, for example `images/logo.png` and not `/images/logo.png`.
- **Set `exit = "suspend"`** before Terminate if you want the learner to resume later.
- **Handle closing the tab** with a `pagehide` listener that saves and terminates. See `samples/*/course.js`.
- **Check the SCORM calls panel** in the player while testing. It shows every value the course sets.

---

## Tagging courses

To show a badge next to a course title on the list page (for example *AI generated*), edit **`packages/tags.json`**:

```json
{
  "sample-scorm12": ["AI generated"],
  "sample-scorm2004": ["AI generated"],
  "RuntimeBasicCalls_SCORM12": ["Rustici", "Golf example"]
}
```

- The key is the course ID, which is the zip file name without `.zip`.
- A course can have several tags.
- Tags are read at build time, so run `npm start` again or redeploy after editing.

---

## How progress is saved

The course saves through scorm-again, which sends each commit to the server:

| Endpoint | Purpose |
|---|---|
| `GET  /api/courses` | All courses (from `courses.json`) |
| `GET  /api/courses/:id` | One course: title, version, launch file |
| `GET  /api/progress/:courseId/:userId` | Saved CMI data for resume |
| `POST /api/progress/:courseId/:userId` | Called on every commit. Also records `startedAt`, `completedAt` and `savedAt` |
| `GET  /api/users/:userId/progress` | One row per started course, for the *Your progress* table |

Where progress is stored:

- **Locally:** in `data/<courseId>__<userId>.json`, one readable JSON file per learner and course.
- **On Vercel:** in **Upstash Redis**. Vercel's filesystem is read-only, so files can't be used there.

`progress-store.js` chooses automatically. If Redis variables are set it uses Redis, otherwise it uses `data/`.

To use your Vercel Redis while running locally, create `.env` from `.env.example`:

```bash
UPSTASH_REDIS_REST_URL=https://<your-db>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your-token>   # the read-write token, not READ_ONLY
```

Then run:

```bash
npm run build
node --env-file=.env server.js
```

The startup line should say `progress: Upstash Redis`.

> The learner ID is remembered only in the browser (localStorage). On another device, or after clearing site data, the learner gets a new ID.

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it at **https://vercel.com/new**. No settings need changing: Vercel detects Express and runs `npm run build`.
3. In the Vercel project, open **Storage**, choose **Upstash (Redis)**, and connect it to the project. This adds the `KV_REST_API_URL` / `KV_REST_API_TOKEN` variables. A custom prefix such as `scorm_test_KV_REST_API_URL` is detected automatically.
4. **Redeploy** so the new variables are picked up.

On Vercel, `public/` (the player, the courses and scorm-again) is served from the CDN, and `server.js` runs as a single serverless function for `/api/*`.

To add a course to the live site, put the zip in `packages/`, commit and push. Vercel rebuilds.

---

## Project structure

```
scorm-test-kit/
├── packages/            ← put SCORM .zip files here
│   ├── *.zip
│   └── tags.json        ← optional badges per course
├── samples/             ← editable source of the sample courses (zip into packages/ to use)
├── public/
│   ├── index.html       ← course list, learner name/ID, progress table
│   ├── player.html      ← SCORM player (scorm-again + course frame + call log)
│   ├── courses/         ← generated: extracted packages
│   └── lib/             ← generated: scorm-again
├── scripts/build.js     ← unzip packages, copy scorm-again, write courses.json
├── server.js            ← Express API (courses + progress)
├── progress-store.js    ← progress storage: Upstash Redis or ./data
├── courses.json         ← generated: course list
├── data/                ← local progress (git-ignored)
└── .env.example         ← optional Redis settings for local dev
```

Generated folders and files are git-ignored: `public/courses/`, `public/lib/`, `courses.json` and `data/`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Course not in the list | Check that `imsmanifest.xml` is at the zip root (`unzip -l`), then run `npm start` again. |
| Course shows an old version | Make sure you replaced the zip in `packages/`. Editing `samples/` alone does nothing. Then rebuild. |
| "No SCORM API found" in the course | Open the course from the list page, not by opening `/courses/...` directly. |
| Progress not saved on Vercel | Connect Upstash Redis in Storage and redeploy. Saves fail with SCORM error 101 until then. |
| Resume starts from the beginning | The course must set `exit = "suspend"` and a bookmark (`location` / `suspend_data`). Check the SCORM calls panel. |
| Course only shows its first part | It's a multi-SCO or sequencing package. Only the first SCO is launched (see [limitations](#supported-scorm-versions)). |

---

## Credits

- SCORM runtime: [scorm-again](https://github.com/jcputney/scorm-again) (MIT).
- Golf Examples: © Rustici Software, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Source: https://scorm.com/scorm-explained/technical-scorm/golf-examples/
- Sample *General Knowledge Basics* courses (`samples/`, `packages/sample-scorm*.zip`): AI generated.
