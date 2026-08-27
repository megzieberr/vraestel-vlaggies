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

## Pending on Megan

1. 📱 **Send the learners the link** — nothing else is needed; they just open it.
2. 💻 When the flags are in, open the dashboard, press **Kopieer vir Claude**, paste it to
   me. Then I gather the flagged questions into one document and write new practice on the
   flagged topics.

## Housekeeping done

- Added to the keep-alive pinger as the 11th project (`keepalive()` function created,
  ping verified `HTTP 200 "ok …"`). Without it the free project would pause after ~7 quiet
  days and the app would silently stop saving.
- Registered as `vlaggies` (port 5193) in `~/.claude/.claude/launch.json`.

## When the exam is over

Delete the Supabase project and the repo, and remove the `vraestel-vlaggies` line from
`keepalive.ps1`. Nothing else depends on it.
