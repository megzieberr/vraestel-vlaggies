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
      head: 'Vraestel ' + row.paper + ' · Vraag ' + (pt ? pt.disp : row.qnum)
        + (pt ? '' : ' — die hele vraag'),
      sub: pt ? pt.af : (q ? q.marks + ' punte' : ''),
      subEn: pt ? pt.en : '',
      meta: (lbl.af || '') + (pt ? ' · ' + pt.marks + ' punte' : (q ? ' · ' + q.marks + ' punte' : '')),
      accent: q ? q.topic : 'ana',
      sortKey: row.paper + ' ' + String(row.qnum).padStart(2, '0') + ' ' + (row.part_id || ''),
    };
  }
  const { topic, sub } = subOf(row);
  return {
    head: (topic ? topic.af : row.topic_id) + ' › ' + (sub ? sub.af : row.sub_id),
    sub: sub ? sub.en : '',
    subEn: '',
    meta: 'Onderwerp',
    accent: topic ? topic.id : 'ana',
    sortKey: row.topic_id + ' ' + row.sub_id,
  };
}

/* ---------------------------------------------------------- grouping */
function group(rows) {
  const map = new Map();
  rows.forEach((r) => {
    let g = map.get(r.target_key);
    if (!g) {
      g = { key: r.target_key, row: r, learners: [], comments: [], latest: r.created_at };
      map.set(r.target_key, g);
    }
    if (!g.learners.includes(r.learner)) g.learners.push(r.learner);
    if (r.comment) g.comments.push({ who: r.learner, text: r.comment });
    if (r.created_at > g.latest) g.latest = r.created_at;
  });
  return [...map.values()].sort((a, b) =>
    b.learners.length - a.learners.length
    || describe(a.row).sortKey.localeCompare(describe(b.row).sortKey));
}

function pass(r) {
  if (filter === 'all') return true;
  if (filter === 'topics') return r.kind === 'topic';
  return r.kind === 'paper' && r.paper === filter;
}

/* ---------------------------------------------------------- export */
function buildExport() {
  const rows = ROWS;
  const learners = [...new Set(rows.map((r) => r.learner))].sort();
  const paperGroups = group(rows.filter((r) => r.kind === 'paper'));
  const topicGroups = group(rows.filter((r) => r.kind === 'topic'));
  const d = new Date().toISOString().slice(0, 10);

  const out = [];
  out.push('# Vraestel Vlaggies — ' + d);
  out.push(learners.length + ' leerders · ' + rows.length + ' vlaggies');
  out.push('Klas: Graad 12, sterk Afrikaanse groep. Bronne: September Vraestel II A–D.');
  out.push('');

  out.push('## VRAE UIT DIE VRAESTELLE (meeste eerste)');
  if (!paperGroups.length) out.push('(niks gemerk nie)');
  paperGroups.forEach((g, i) => {
    const { q, pt } = partOf(g.row);
    const lbl = q ? (PAPER_TOPIC_LABEL[q.topic] || {}) : {};
    const id = pt ? pt.disp : ('Q' + g.row.qnum + ' (hele vraag)');
    out.push((i + 1) + '. Paper ' + g.row.paper + ' · ' + id
      + (pt ? ' — ' + pt.marks + ' marks' : (q ? ' — ' + q.marks + ' marks' : ''))
      + ' — ' + (lbl.en || '') + ' — ' + g.learners.length + ' learner(s): ' + g.learners.join(', '));
    if (pt) out.push('   EN: ' + pt.en);
    if (pt) out.push('   AF: ' + pt.af);
    g.comments.forEach((c) => out.push('   - ' + c.who + ': "' + c.text + '"'));
  });
  out.push('');

  out.push('## ONDERWERPE (meeste eerste)');
  if (!topicGroups.length) out.push('(niks gemerk nie)');
  topicGroups.forEach((g, i) => {
    const { topic, sub } = subOf(g.row);
    out.push((i + 1) + '. ' + (topic ? topic.en : g.row.topic_id) + ' › '
      + (sub ? sub.en : g.row.sub_id)
      + '  [AF: ' + (topic ? topic.af : '') + ' › ' + (sub ? sub.af : '') + ']'
      + ' — ' + g.learners.length + ' learner(s): ' + g.learners.join(', '));
    g.comments.forEach((c) => out.push('   - ' + c.who + ': "' + c.text + '"'));
  });
  out.push('');

  out.push('## WAT EK NOU WIL HÊ');
  out.push('1. Trek al die gemerkte vrae hierbo uit die Sept Paper II bronne in EEN dokument (EN + AF soos die klas dit nodig het).');
  out.push('2. Skryf splinternuwe oefenvrae oor die onderwerpe hierbo — nie dieselfde vrae nie.');
  out.push('3. Ons het 3 klasse oor, elk 2 × 45 min.');
  return out.join('\n');
}

/* ---------------------------------------------------------- render */
function render() {
  const root = $('#view');
  root.innerHTML = '';

  const learners = [...new Set(ROWS.map((r) => r.learner))];
  const qFlags = ROWS.filter((r) => r.kind === 'paper');
  const tFlags = ROWS.filter((r) => r.kind === 'topic');

  root.appendChild(el('div', 'eyebrow', 'Graad 12 · September Vraestel II'));
  root.appendChild(el('h1', null, 'Wat hulle gemerk het'));

  const stats = el('div', 'stat-row');
  [[learners.length, 'leerders'], [ROWS.length, 'vlaggies'],
   [group(qFlags).length, 'verskillende vrae'], [group(tFlags).length, 'onderwerpe']]
    .forEach(([n, w]) => {
      const s = el('div', 'stat');
      s.appendChild(el('b', null, String(n)));
      s.appendChild(el('span', null, w));
      stats.appendChild(s);
    });
  root.appendChild(stats);

  if (!ROWS.length) {
    root.appendChild(el('div', 'empty', 'Nog niks gemerk nie. Sodra ’n leerder iets merk, verskyn dit hier.'));
    return;
  }

  const tools = el('div', 'dash-tools');
  [['all', 'Alles'], ['2A', 'V 2A'], ['2B', 'V 2B'], ['2C', 'V 2C'], ['2D', 'V 2D'], ['topics', 'Onderwerpe']]
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
    card.appendChild(el('div', 'n', String(g.learners.length)));
    const body = el('div', 'body');
    const ttl = el('div', 'ttl');
    ttl.appendChild(el('span', 'dot dot-' + d.accent));
    ttl.lastChild.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:50%;border:2px solid var(--ink);margin-right:7px';
    ttl.appendChild(document.createTextNode(d.head));
    body.appendChild(ttl);
    if (d.sub) body.appendChild(el('div', 'sub', d.sub));
    if (d.meta) body.appendChild(el('div', 'small muted', d.meta));
    body.appendChild(el('div', 'who', '👤 ' + g.learners.join(', ')));
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
  if (!groups.length) sec.appendChild(el('div', 'empty', 'Niks in hierdie filter nie.'));
  root.appendChild(sec);

  /* ---- export ---- */
  const ex = el('div', 'dash-sec');
  ex.appendChild(el('h2', null, 'Gee dit vir Claude'));
  ex.appendChild(el('p', 'small muted',
    'Alles hieronder — nie net die filter nie. Druk kopieer en plak dit vir Claude.'));
  const btn = el('button', 'btn primary', '📋 Kopieer vir Claude');
  btn.style.marginTop = '10px';
  const ta = el('textarea', 'export');
  ta.readOnly = true;
  ta.value = buildExport();
  btn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(ta.value);
      btn.textContent = '✓ Gekopieer';
    } catch (e) {
      ta.select();
      document.execCommand('copy');
      btn.textContent = '✓ Gekopieer';
    }
    setTimeout(() => { btn.textContent = '📋 Kopieer vir Claude'; }, 2000);
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
    $('#view').appendChild(el('div', 'err', 'Kon nie die lys laai nie: ' + e.message));
    return;
  }
  render();
}

boot();
