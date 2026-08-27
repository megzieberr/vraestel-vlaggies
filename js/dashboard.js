import { PAPERS } from './questions.js';
import { TOPICS, PAPER_TOPIC_LABEL } from './topics.js';
import { allFlags } from './db.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (t, cls, txt) => {
  const n = document.createElement(t);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
};

let ROWS = [];
let filter = 'all';

/* ---------------------------------------------------------- lookups */
function partOf(row) {
  const paper = PAPERS.find((p) => p.id === row.paper);
  if (!paper) return {};
  const q = paper.questions.find((x) => x.n === row.qnum);
  if (!q) return { paper };
  const pt = row.part_id ? q.parts.find((x) => x.id === row.part_id) : null;
  return { paper, q, pt };
}

function subOf(row) {
  const topic = TOPICS.find((x) => x.id === row.topic_id);
  const sub = topic && topic.subs.find((x) => x.id === row.sub_id);
  return { topic, sub };
}

/** Human label for one flag, both languages where it helps. */
function describe(row) {
  if (row.kind === 'paper') {
    const { q, pt } = partOf(row);
    const lbl = q ? (PAPER_TOPIC_LABEL[q.topic] || {}) : {};
    return {
      head: 'Paper ' + row.paper + ' · Question ' + (pt ? pt.disp : row.qnum)
        + (pt ? '' : ' — the whole question'),
      sub: pt ? pt.en : '',   // whole-question cards: marks already sit in .meta
      subAf: pt ? pt.af : '',
      meta: (lbl.en || '') + (pt ? ' · ' + pt.marks + ' marks' : (q ? ' · ' + q.marks + ' marks' : '')),
      accent: q ? q.topic : 'ana',
      sortKey: row.paper + ' ' + String(row.qnum).padStart(2, '0') + ' ' + (row.part_id || ''),
    };
  }
  if (row.kind === 'note') {
    return {
      head: '✍️ In their own words',
      sub: '', subAf: '', meta: 'Typed by a learner', accent: 's2',
      sortKey: 'zz ' + (row.created_at || ''),
    };
  }
  const { topic, sub } = subOf(row);
  return {
    head: (topic ? topic.en : row.topic_id) + ' › ' + (sub ? sub.en : row.sub_id),
    sub: sub ? sub.af : '',
    subAf: '',
    meta: 'Topic',
    accent: topic ? topic.id : 'ana',
    sortKey: row.topic_id + ' ' + row.sub_id,
  };
}

/* ---------------------------------------------------------- grouping */
const ANON = 'Anonymous';

/* Counting is by DEVICE, not by name — names are optional, so a flag from someone
   who ticked "naamloos" still counts as one learner. */
function group(rows) {
  const map = new Map();
  rows.forEach((r) => {
    let g = map.get(r.target_key);
    if (!g) {
      g = { key: r.target_key, row: r, names: [], devices: new Set(), anon: new Set(),
            comments: [], latest: r.created_at };
      map.set(r.target_key, g);
    }
    g.devices.add(r.device_id);
    if (r.learner) {
      if (!g.names.includes(r.learner)) g.names.push(r.learner);
    } else {
      g.anon.add(r.device_id);
    }
    if (r.comment) g.comments.push({ who: r.learner || ANON, text: r.comment });
    if (r.created_at > g.latest) g.latest = r.created_at;
  });
  return [...map.values()].sort((a, b) =>
    b.devices.size - a.devices.size
    || describe(a.row).sortKey.localeCompare(describe(b.row).sortKey));
}

/** "Anja, Ben + 3 anonymous" — or just "4 anonymous" when nobody named themselves. */
function whoLine(g) {
  const bits = g.names.slice();
  if (g.anon.size) bits.push((bits.length ? '+ ' : '') + g.anon.size + ' anonymous');
  return bits.join(', ') || 'anonymous';
}

function pass(r) {
  if (r.kind === 'note') return false;   // notes are one-offs; they get their own section
  if (filter === 'all') return true;
  if (filter === 'topics') return r.kind === 'topic';
  return r.kind === 'paper' && r.paper === filter;
}

/* Newest first. Each note is unique, so ranking them by count is meaningless. */
function notesOf(rows) {
  return rows.filter((r) => r.kind === 'note')
    .slice()
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

/* ---------------------------------------------------------- export */
function buildExport() {
  const rows = ROWS;
  const people = new Set(rows.map((r) => r.device_id));
  const named = [...new Set(rows.map((r) => r.learner).filter(Boolean))].sort();
  const paperGroups = group(rows.filter((r) => r.kind === 'paper'));
  const topicGroups = group(rows.filter((r) => r.kind === 'topic'));
  const d = new Date().toISOString().slice(0, 10);

  const out = [];
  out.push('# Paper Flags — ' + d);
  out.push(people.size + ' learners (' + (named.length ? named.join(', ') + '; ' : '')
    + Math.max(0, people.size - named.length) + ' anonymous) · ' + rows.length + ' flags');
  out.push('Class: Grade 12, the strong Afrikaans group — they need the material in Afrikaans.');
  out.push('Sources: September Vraestel II A–D (Desktop / Graad 12 Curro / September Vraestel II).');
  out.push('');

  out.push('## QUESTIONS FROM THE PAPERS (most-wanted first)');
  if (!paperGroups.length) out.push('(nothing flagged)');
  paperGroups.forEach((g, i) => {
    const { q, pt } = partOf(g.row);
    const lbl = q ? (PAPER_TOPIC_LABEL[q.topic] || {}) : {};
    const id = pt ? pt.disp : ('Q' + g.row.qnum + ' (the whole question)');
    out.push((i + 1) + '. Paper ' + g.row.paper + ' · ' + id
      + (pt ? ' — ' + pt.marks + ' marks' : (q ? ' — ' + q.marks + ' marks' : ''))
      + ' — ' + (lbl.en || '') + ' — ' + g.devices.size + ' learner(s): ' + whoLine(g));
    if (pt) out.push('   EN: ' + pt.en);
    if (pt) out.push('   AF: ' + pt.af);
    g.comments.forEach((c) => out.push('   - ' + c.who + ': "' + c.text + '"'));
  });
  out.push('');

  out.push('## TOPICS (most-wanted first)');
  if (!topicGroups.length) out.push('(nothing flagged)');
  topicGroups.forEach((g, i) => {
    const { topic, sub } = subOf(g.row);
    out.push((i + 1) + '. ' + (topic ? topic.en : g.row.topic_id) + ' › '
      + (sub ? sub.en : g.row.sub_id)
      + '  [AF: ' + (topic ? topic.af : '') + ' › ' + (sub ? sub.af : '') + ']'
      + ' — ' + g.devices.size + ' learner(s): ' + whoLine(g));
    g.comments.forEach((c) => out.push('   - ' + c.who + ': "' + c.text + '"'));
  });
  out.push('');

  const notes = notesOf(rows);
  out.push('## IN THEIR OWN WORDS (typed by learners, not from any list)');
  if (!notes.length) out.push('(nothing typed)');
  notes.forEach((r, i) => {
    out.push((i + 1) + '. ' + (r.learner || 'Anonymous') + ': "' + r.comment + '"');
  });
  out.push('');

  out.push('## WHAT I WANT NOW');
  out.push('1. Pull every flagged question above out of the Sept Paper II sources into ONE document, in Afrikaans (the class works in Afrikaans; one learner needs English).');
  out.push('2. Write brand-new practice questions on the topics above — not the same questions again.');
  out.push('3. We have 3 classes left, each 2 × 45 min. Order it so the most-flagged things come first.');
  out.push('4. Read the "in their own words" notes too — they are the bits the topic list could not cover.');
  return out.join('\n');
}

/* ---------------------------------------------------------- render */
function render() {
  const root = $('#view');
  root.innerHTML = '';

  const people = new Set(ROWS.map((r) => r.device_id));
  const qFlags = ROWS.filter((r) => r.kind === 'paper');
  const tFlags = ROWS.filter((r) => r.kind === 'topic');

  root.appendChild(el('div', 'eyebrow', 'Grade 12 · September Paper II'));
  root.appendChild(el('h1', null, 'What they flagged'));

  const stats = el('div', 'stat-row');
  const pl = (n, one, many) => (n === 1 ? one : many);
  [[people.size, pl(people.size, 'learner', 'learners')],
   [ROWS.length, pl(ROWS.length, 'flag', 'flags')],
   [group(qFlags).length, pl(group(qFlags).length, 'question flagged', 'different questions')],
   [group(tFlags).length, pl(group(tFlags).length, 'topic', 'topics')]]
    .forEach(([n, w]) => {
      const s = el('div', 'stat');
      s.appendChild(el('b', null, String(n)));
      s.appendChild(el('span', null, w));
      stats.appendChild(s);
    });
  root.appendChild(stats);

  if (!ROWS.length) {
    root.appendChild(el('div', 'empty', 'Nothing flagged yet. As soon as a learner flags something it shows up here.'));
    return;
  }

  const tools = el('div', 'dash-tools');
  [['all', 'All'], ['2A', 'P 2A'], ['2B', 'P 2B'], ['2C', 'P 2C'], ['2D', 'P 2D'], ['topics', 'Topics']]
    .forEach(([id, label]) => {
      const b = el('button', 'btn small' + (filter === id ? ' primary' : ''), label);
      b.onclick = () => { filter = id; render(); };
      tools.appendChild(b);
    });
  root.appendChild(tools);

  const shown = ROWS.filter(pass);
  const groups = group(shown);

  const sec = el('div', 'dash-sec');
  groups.forEach((g, i) => {
    const d = describe(g.row);
    const card = el('div', 'rank');
    card.appendChild(el('div', 'n', String(g.devices.size)));
    const body = el('div', 'body');
    const ttl = el('div', 'ttl');
    ttl.appendChild(el('span', 'dot dot-' + d.accent));
    ttl.lastChild.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:50%;border:2px solid var(--ink);margin-right:7px';
    ttl.appendChild(document.createTextNode(d.head));
    body.appendChild(ttl);
    if (d.sub) body.appendChild(el('div', 'sub', d.sub));
    if (d.meta) body.appendChild(el('div', 'small muted', d.meta));
    body.appendChild(el('div', 'who', '👤 ' + whoLine(g)));
    if (g.comments.length) {
      const cw = el('div', 'cmts');
      g.comments.forEach((c) => {
        const cm = el('div', 'cmt');
        cm.appendChild(el('b', null, c.who + ': '));
        cm.appendChild(document.createTextNode('“' + c.text + '”'));
        cw.appendChild(cm);
      });
      body.appendChild(cw);
    }
    card.appendChild(body);
    sec.appendChild(card);
  });
  if (!groups.length) sec.appendChild(el('div', 'empty', 'Nothing in this filter.'));
  root.appendChild(sec);

  /* ---- what they typed themselves ---- */
  const notes = notesOf(ROWS);
  if (notes.length) {
    const ns = el('div', 'dash-sec');
    ns.appendChild(el('h2', null, '✍️ In their own words'));
    ns.appendChild(el('p', 'small muted',
      'Typed by a learner because the topic list did not cover it. Not counted or ranked.'));
    notes.forEach((r) => {
      const card = el('div', 'rank note-rank');
      card.appendChild(el('div', 'n', '“”'));
      const body = el('div', 'body');
      body.appendChild(el('div', 'ttl', r.comment));
      body.appendChild(el('div', 'who', '👤 ' + (r.learner || ANON)));
      card.appendChild(body);
      ns.appendChild(card);
    });
    root.appendChild(ns);
  }

  /* ---- export ---- */
  const ex = el('div', 'dash-sec');
  ex.appendChild(el('h2', null, 'Give this to Claude'));
  ex.appendChild(el('p', 'small muted',
    'Everything below — not just the current filter. Hit copy and paste it into a session.'));
  const btn = el('button', 'btn primary', '📋 Copy for Claude');
  btn.style.marginTop = '10px';
  const ta = el('textarea', 'export');
  ta.readOnly = true;
  ta.value = buildExport();
  btn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(ta.value);
      btn.textContent = '✓ Copied';
    } catch (e) {
      ta.select();
      document.execCommand('copy');
      btn.textContent = '✓ Copied';
    }
    setTimeout(() => { btn.textContent = '📋 Copy for Claude'; }, 2000);
  };
  ex.appendChild(btn);
  ex.appendChild(ta);
  root.appendChild(ex);
}

async function boot() {
  try {
    ROWS = (await allFlags()) || [];
  } catch (e) {
    $('#view').innerHTML = '';
    $('#view').appendChild(el('div', 'err', "Couldn't load the list: " + e.message));
    return;
  }
  render();
}

boot();
