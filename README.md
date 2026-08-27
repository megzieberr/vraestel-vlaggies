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

## Handled flags (added 2026-08-27)

Her class runs again on the Saturday and the Sunday, so a second and third round of
flags land on top of the first. The dashboard can mark the current list **handled** so
each class starts clean, without losing what came before.

- `public.flags.resolved_at timestamptz` — null means still open. **Nothing is ever
  deleted.** A handled flag keeps its row, its comment and its learner.
- `resolve_flags()` stamps every open flag with **one shared `now()`** and returns
  `(stamp, n)`. One stamp per batch is what makes the undo exact.
- `unresolve_flags(p_stamp)` clears only the rows carrying that exact stamp, so undoing
  a mistake cannot un-handle a batch that was correctly dealt with a week earlier.
- Both are `SECURITY DEFINER` with `search_path` pinned, executable by `anon`, matching
  `add_flag` / `remove_flag`. `anon` still has **SELECT only** on the table — the new
  column is not directly writable.

On the dashboard: the ranked list, the counts and the **Copy for Claude** export all show
**open flags only**. Handled ones move to an *Already handled* section, grouped by batch
with the date, collapsed behind **Show them**. Right after marking, an **Undo the batch I
just marked** button appears.

⚠️ **The learner page is deliberately untouched.** "My lys" still shows a learner every
flag they made, handled or not — otherwise their flag would appear to vanish and they
would flag it again.

⚠️ **The dashboard is unprotected and this button writes.** Before this change the
dashboard was read-only, so the worst a learner who found the URL could do was read.
Now they could mark the list handled. Nothing is destroyed and the undo exists, but it is
a real change in what that page can do.
