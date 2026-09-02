# Pragya Coaching — Smart Test Builder & Assessment System

A fully client-side (no backend) MCQ test-building toolkit for coaching institutes. Every
MCQ everywhere in the app — Test Builder, Navodaya/JNVST papers, OMR sheets, and student
tests — always has exactly **4 options: A, B, C, D**.

## What's inside

- **Dashboard** — quick stats, recent tests, question-bank subject breakdown.
- **Smart Test Builder** — title/subject/chapter/section/difficulty/duration, per-question
  marks & negative marking, explanations, image upload on questions and options, drag to
  reorder, duplicate/edit/delete, live preview, JSON export.
- **Navodaya / JNVST Generator** — Mental Ability, Arithmetic, Language and Custom sections,
  built on the same test builder.
- **Question Bank** — a reusable pool of questions, searchable/filterable by subject and
  difficulty, importable into any test.
- **Smart OMR Sheet Builder** — branded, printable A4 OMR sheet with student/roll/class/date
  fields, a Set A–D booklet code, and an auto-chosen bubble-grid layout for 20/40/50/80/100
  or a custom question count. Print directly or download as PDF.
- **Student Online Test Export** — turns any saved test into a single standalone `.html`
  file with a countdown timer, question palette, mark-for-review, auto-scoring (with
  negative marking) and an answer review screen. The generated file has **no external
  dependencies** — it works completely offline and can be shared over WhatsApp; students
  just open it in a browser.
- **Settings** — dark/light mode, full JSON backup export/import, and a data-erase option.

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
js/app.js          State, storage, router, dashboard, test builder, question bank, settings
js/omr.js          OMR sheet layout, print, PDF export
js/generator.js    Standalone student-test HTML generator
```

## Notes

- The OMR "Download PDF" button loads `html2canvas` + `jsPDF` from a CDN on demand (needs
  internet the first time it's used in a session). Printing (`window.print`) always works
  offline.
- Generated student test files are 100% self-contained — no CDN, no fonts, no network calls.
