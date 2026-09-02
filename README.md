# Pragya Coaching — Smart Test Builder & Assessment System

A fully client-side (no backend) MCQ test-building toolkit for coaching institutes. Every
MCQ everywhere in the app — Test Builder, Navodaya/JNVST papers, OMR sheets, and student
tests — always has exactly **4 options: A, B, C, D**.

## What's inside

- **Dashboard** — quick stats, recent tests, question-bank subject breakdown.
- **Smart Test Builder** — title/subject/chapter/section/difficulty/duration, per-question
  marks & negative marking, explanations (with image), image upload on questions and
  options with a built-in **crop & preview** step, tags, drag to reorder, duplicate/edit/
  delete, live preview, JSON export.
- **Bulk add** — paste any number of questions in one fixed text format and the app parses
  them into their fields automatically (question, 4 options, correct answer, marks,
  negative marking, subject, chapter, difficulty, tags, explanation). A live preview shows
  which ones are valid before you import — see the format below. Works in both the Test
  Builder and the Question Bank, and you can also load a `.txt` file.
- **Navodaya / JNVST Generator** — Mental Ability, Arithmetic, Language and Custom sections,
  built on the same test builder.
- **Smart Question Bank** — search (text + tags), filter by subject/difficulty, sort
  (newest/oldest/subject/difficulty), multi-select checkboxes for bulk delete or bulk
  "add to current test", subject/difficulty stats strip, and automatic **possible-duplicate**
  warnings when a very similar question already exists.
- **Image cropper** — every image upload (question, option A–D, explanation) opens a
  drag-to-move / drag-to-resize crop box with Free/Square/4:3 presets and a "use original"
  skip option, before the image is attached.
- **Smart OMR Sheet Builder** — branded, printable A4 OMR sheet with student/class/date
  fields, a real digit-by-digit **roll number bubble grid** (0–9 per column, configurable
  digit count), a Set A–D bubble code, and an auto-chosen bubble-grid layout for
  20/40/50/80/100 or a custom question count. Print directly or download as PDF.
- **Student Online Test Export** — turns any saved test into a single standalone `.html`
  file with a countdown timer, question palette, mark-for-review, auto-scoring (with
  negative marking) and an answer review screen (with explanation images). The generated
  file has **no external dependencies** — it works completely offline and can be shared
  over WhatsApp; students just open it in a browser.
- **Settings** — dark/light mode, full JSON backup export/import, and a data-erase option.

## Bulk add format

Paste questions like this (blank line between questions; only Q/A/B/C/D/Correct are
required, everything else is optional):

```
Q: What is the capital of India?
A: Mumbai
B: New Delhi
C: Chennai
D: Kolkata
Correct: B
Marks: 1
Negative: 0.25
Subject: GK
Chapter: Geography
Difficulty: Medium
Tags: capitals, india
Explanation: New Delhi has been the capital of India since 1911.

Q: 7 x 8 = ?
A: 54
B: 56
C: 58
D: 64
Correct: B
```

The Bulk Add modal has this template built in (with a "Download sample .txt" button) and
shows a valid/invalid preview — with the exact reason — before anything is added.

All data (tests + question bank) is stored in the browser's `localStorage`. Nothing is
sent anywhere.

## Running it

Just open `index.html` in a browser, or serve the folder with any static file server.

## Deploying to GitHub Pages

1. Push this folder's contents to a GitHub repository.
2. In the repo settings, enable **GitHub Pages** for the `main` branch (root folder).
3. Your app will be live at `https://<username>.github.io/<repo>/`.

No build step, no `npm install`, no server — it's plain HTML/CSS/JS.

## File structure

```
index.html        Shell + all views/modals
css/style.css      Design tokens, layout, components, print rules
js/cropper.js      Dependency-free image crop tool (used by app.js)
js/app.js          State, storage, router, dashboard, builder, bulk import, bank, settings
js/omr.js          OMR sheet layout (incl. roll-number bubbles), print, PDF export
js/generator.js    Standalone student-test HTML generator
```

## Notes

- The OMR "Download PDF" button loads `html2canvas` + `jsPDF` from a CDN on demand (needs
  internet the first time it's used in a session). Printing (`window.print`) always works
  offline.
- Generated student test files are 100% self-contained — no CDN, no fonts, no network calls.
