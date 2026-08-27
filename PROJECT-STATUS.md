# Vraestel Vlaggies — project status

**Built and shipped 2026-08-27, one session.** Read `README.md` first — it holds the
architecture, the security shape, and the "never hand-edit questions.js" rule.

## Live

- Learner page: **https://megzieberr.github.io/vraestel-vlaggies/**
- Teacher page: **https://megzieberr.github.io/vraestel-vlaggies/dashboard.html**
- Repo: https://github.com/megzieberr/vraestel-vlaggies (**public** — free Pages)
- Supabase: `vraestel-vlaggies` / `ounkyusqvbjmmfzehugj`, **Family** org on the
  `circle-geo` account.
- Deploy = `git push`. Pages builds in ~1 min.

## Her decisions this session

- **First names on**, learners type their own — no class list to seed.
- **2026-08-27, later the same day: the name is now OPTIONAL.** Her request — a tick
  box, "Ek merk liewer naamloos". Ticking it disables the name field and the flag
  saves with `learner = null`. They can change their mind either way afterwards and it
  applies retroactively to what they already flagged (`set_learner`).
- **The teacher dashboard is ENGLISH ONLY** (2026-08-27) — her words: the Afrikaans
  version was "grossing me out", her thinking is wired in English. The learner page
  stays fully bilingual. The clipboard export is English too. Question text on a card
  shows English; a topic card shows the Afrikaans term underneath, and the export
  still carries EN + AF for every question.
- **Afrikaans says "naam", never "voornaam"** — her correction; "voornaam" is not
  a real Afrikaans word. English keeps "First name".
- **Free-text notes added** (2026-08-27, her request): an optional box on the topic tab
  for a question/problem that is not on the list. Shown on the dashboard under
  "In their own words", verbatim, never counted or ranked.
- **Dashboard unprotected.** She was told the consequence (a learner who finds the URL sees
  who flagged what) and chose it anyway. Do not "fix" this.
- **Public repo / public paper text is fine** — she was asked specifically, because the app
  shows the real question wording of all four Paper II papers. She said ship it.
- **No open/close switch** (dropped from the plan — the only place for the control was the
  unprotected dashboard, where a learner could close the site).

## Verified before shipping (all on the live site unless noted)

- Language → name → home → both routes → My list → remove, end to end, AF and EN.
- Search: `3b1`, `7 (b)(1)`, `Q7B1` all resolve the same; `raaklyn` / `tangent` match text;
  a number not in the current paper offers "Ook in Vraestel 2B".
- Topic search across languages: `trig reductions` → *Verkleiningsformules*,
  `cyclic quad` → *Koordevierhoeke*, `OATS` → *Spesiale hoeke*.
- Name normalising: `naam` / `NAAM` both land as `Naam`.
- Dashboard groups by count, shows comments per learner, export text correct, empty state
  clean.
- **Phone width (375×812):** no horizontal scroll on any view, comment sheet fits, every
  button ≥ 38px tall. Checked by measuring the DOM — the Browser pane could not screenshot
  (the known rAF/compositing problem), so this was geometry, not a picture.
- **Outside-in security probe** with the publishable key: `SELECT` 200; direct `INSERT`,
  `UPDATE`, `DELETE` all `42501 permission denied`.
- All test rows deleted; table is empty and ready for the class.

## Round 1 is in (2026-08-27)

**11 flags from 2 learners** (Adriaan 9, Alani 2; nobody anonymous). She pasted the export
and asked for the flagged paper questions gathered into one document.

Delivered: `Gevlagde-Vrae-AFR.pdf` + `-ENG.pdf`, 6 pages each, in
`Desktop\Graad 12 Curro\September Vraestel II\` (see `README-GEVLAGDE-VRAE.md` there).
Three blocks — P2A Q8(e), P2C Q3(c)+(d), P2C Q4(c) — each naming its source paper and
question, with an anonymised note on what was asked. **No memo** (the colour memos already
have all four worked) and **no new practice questions yet**.

Still to build from this round: fresh practice on the five flagged topics
(eweredigheid, weerkaatsing & transformasie, gelykvormige driehoeke, korrelasiekoëffisiënt,
spreidiagramme & regressielyn) plus the free-text note — **"denkbeeldige goed" turned out to
mean circles named in the words but never drawn** ("prove BE is a tangent to circle ABE",
and there is no circle ABE), her own explanation. That is the concyclic-points family.

## Handled flags (2026-08-27)

Because the class also runs Saturday and Sunday, the dashboard can now mark the current
list handled so each class starts clean. `resolved_at` stamp, `resolve_flags()` /
`unresolve_flags(stamp)`, an *Already handled* section and a one-press undo. Nothing is
ever deleted and the learner page is untouched. Full shape in `README.md`.

Verified end to end against the live table: marked 11 → dashboard showed 0 open and 10
handled cards (two learners share the proportionality topic, so 11 rows group to 10) →
undo → back to 11 open. Table checked before and after: **11 rows throughout, none lost.**

## Pending on Megan

1. 💻 **Decide when to press "Mark these 11 as handled."** They are still OPEN — she is
   teaching them tomorrow, so marking them now would hide the list she is about to use.
   One tap on the dashboard after the class.
2. 💻 After Saturday and Sunday, press **Kopieer vir Claude** again — the export now
   carries only the new, unhandled flags.

## Housekeeping done

- Added to the keep-alive pinger as the 11th project (`keepalive()` function created,
  ping verified `HTTP 200 "ok …"`). Without it the free project would pause after ~7 quiet
  days and the app would silently stop saving.
- Registered as `vlaggies` (port 5193) in `~/.claude/.claude/launch.json`.

## When the exam is over

Delete the Supabase project and the repo, and remove the `vraestel-vlaggies` line from
`keepalive.ps1`. Nothing else depends on it.
