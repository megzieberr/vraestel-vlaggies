# Vraestel Vlaggies

A small site where Megan's Grade 12 class flag the questions from **September Vraestel II
A–D** that they want gone through in the three classes before the exam.

Learner page: `index.html` (Afrikaans + English) · Teacher page: `dashboard.html` (**English only** — her call: "everything is wired in my brain in English").

## How it works

1. Learner picks **Afrikaans or English** (one learner in the Afrikaans class works in English).
2. Types their **first name** once — or ticks **"Ek merk liewer naamloos"** and gives no
   name at all. Remembered on their phone, no login.
3. Then either, or both:
   - **📄 A question from a paper** — pick 2A/2B/2C/2D, scroll the questions or search a
     number (`7b1`, `7 (b)(1)` and `Q7B1` all work) or a word (`raaklyn`, `tangent`).
     Every question also offers **"the whole question"**. A comment is optional.
   - **🎯 A topic** — six topics, ~45 sub-topics, searchable in both languages. Classroom
     shorthand is indexed too, so `trig reductions` finds *Verkleiningsformules* and
     `OATS` finds *Spesiale hoeke*.
   - **✍️ A free-text note** at the bottom of the topic tab, for whatever the list does not
     cover ("Nie op die lys nie?"). Saved as `kind = 'note'` with the words in `comment`
     and a client-generated id in `part_id`, so two different notes never collide but
     re-saving the same one still edits it. Notes are **not ranked or counted** on the
     dashboard — each is unique — they get their own section and their own export block.
4. They can come back across the three weeks: **My lys** shows their flags and lets them
   remove any.
5. Megan opens `dashboard.html`, sorted by how many learners flagged each thing, and presses
   **Kopieer vir Claude** to get the whole list as text to paste into a session.

## The question data is generated, not typed

`js/questions.js` is **generated** from the real LaTeX sources in
`Desktop\Graad 12 Curro\September Vraestel II\` by `tools/gendata.py`.
**Never hand-edit `js/questions.js`.** If a paper changes, re-run:

```bash
python tools/gendata.py
```

It reads `Sept-P2{A,B,C,D}-{ENG,AFR}.tex` plus each `fingerprint-p2*.json` (for the topic
of each question) and asserts that the English and Afrikaans papers have the same questions
and the same sub-parts. Current contents: **4 papers, 54 questions, 200 sub-parts**
(plus 5 questions that have no sub-parts and are flagged whole).

`js/topics.js` **is** hand-written — the six topics and their sub-topics. Afrikaans terms
were lifted from her own AFR papers (`boks-en-snor-diagram`, `verkleiningsformules`,
`interkwartielomvang`, `koordevierhoek`, `eweredigheidstelling`, `hoogtehoek`,
`dubbelhoekformule`), not translated fresh.

## Backend

Supabase project **`vraestel-vlaggies`** (`ounkyusqvbjmmfzehugj`), in the **Family** org on
the `circle-geo` account — the `mathwithmegan` org was full (circle-geometry-game +
gr8-quiz-relay). Free tier, R0/month.

One table, `public.flags`. Security shape:

- `anon` may **SELECT only**. Direct `INSERT` / `UPDATE` / `DELETE` are revoked and were
  verified blocked from the browser (all return `42501 permission denied`).
- Writes go through two `SECURITY DEFINER` functions with `search_path` pinned:
  `add_flag(...)` and `remove_flag(device, key)`. `remove_flag` only deletes rows whose
  `device_id` matches the caller's, so nobody can clear someone else's list.
- `add_flag` title-cases the name (`naam`, `NAAM` → `Naam`) so the dashboard groups a
  learner correctly however they type it. **The name is optional** — `learner` is nullable
  and an anonymous flag stores `null`.
- `set_learner(device, name)` renames **every** flag that device already made, so choosing
  "naamloos" later actually removes the name from what they flagged earlier — otherwise the
  tick would be a lie about rows already sitting in the table.
- ⚠️ **The dashboard counts by `device_id`, never by name.** Counting distinct names would
  collapse every anonymous learner into one. "4 learners" is 4 devices; the line under it
  reads e.g. `Sanri, + 3 naamloos`.
- One flag per learner per thing (`unique (device_id, target_key)`); re-flagging edits the
  comment rather than making a duplicate.

The four remaining Supabase advisor WARNs are "anon can execute a SECURITY DEFINER
function" — that **is** the write path for a no-login app, same as her other apps. Not a
finding.

**No learner names are in this repo.** The repo is public (free GitHub Pages); names are
typed by the learners and live only in Supabase.

## Deliberately not built

- **No dashboard password** — her call. Note that with names on and the page open, a
  learner who finds `dashboard.html` can see who flagged what.
- **No open/close switch.** It was in the plan, but the only place to put the control was
  the unprotected dashboard, where a learner could close the site. When the classes are
  over, delete the Supabase project or just stop sharing the link.

## Local preview

```bash
python -m http.server 5193
```

Registered as `vlaggies` in `~/.claude/.claude/launch.json`.
