import { PAPERS } from './questions.js';
import { TOPICS, PAPER_TOPIC_LABEL } from './topics.js';
import { T } from './i18n.js';
import { addFlag, removeFlag, myFlags, setLearner } from './db.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (t, cls, txt) => {
  const n = document.createElement(t);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
};
const esc = (s) => String(s == null ? '' : s);

const state = {
  lang: localStorage.getItem('vv-lang') || null,
  learner: localStorage.getItem('vv-name') || null,
  anon: localStorage.getItem('vv-anon') === '1',   // chose to stay nameless
  view: 'home',
  paper: localStorage.getItem('vv-paper') || '2A',
  q: '',
  openTopic: null,
  mine: new Map(),   // target_key -> row
  busy: false,
};

const t = () => T[state.lang || 'af'];

/* past the front gate once they either gave a name or chose to stay nameless */
const identified = () => Boolean(state.learner || state.anon);

/* target keys must mirror add_flag() in the database */
const paperKey = (paper, qnum, part) => 'p:' + paper + ':' + qnum + ':' + (part || 'ALL');
const topicKey = (topic, sub) => 't:' + topic + ':' + sub;

/* "7 (b)(1)" / "Q7b1" / "7B1" all normalise to "7b1" */
const norm = (s) => String(s || '').toLowerCase().replace(/^q/, '').replace(/[^a-z0-9]/g, '');
const fold = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');  // ö -> o, so "koordevierhoek" finds it

/* ---------------------------------------------------------------- toast */
let toastTimer = null;
function toast(msg) {
  const old = $('.toast');
  if (old) old.remove();
  const n = el('div', 'toast', msg);
  document.body.appendChild(n);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => n.remove(), 1800);
}

/* ---------------------------------------------------------------- shell */
function chrome() {
  const bar = $('#topbar');
  bar.innerHTML = '';
  const logo = el('button', 'tb-logo');
  logo.appendChild(el('span', 'tb-flag'));
  logo.appendChild(el('span', null, t().title));
  logo.onclick = () => go('home');
  bar.appendChild(logo);

  const right = el('div', 'tb-right');
  if (state.learner) {
    right.appendChild(el('span', 'pill who', state.learner));
  } else if (state.anon) {
    right.appendChild(el('span', 'pill who', '🕶 ' + t().anonLabel));
  }
  if (state.lang) {
    const lp = el('button', 'pill lang', state.lang === 'af' ? 'AFR' : 'ENG');
    lp.title = t().pickLang;
    lp.onclick = () => { setLang(state.lang === 'af' ? 'en' : 'af'); };
    right.appendChild(lp);
  }
  bar.appendChild(right);
  bar.hidden = !(state.lang && identified());

  const bb = $('#bottombar');
  bb.innerHTML = '';
  if (state.lang && identified() && state.view !== 'lang' && state.view !== 'name') {
    const b1 = el('button', 'btn', t().back);
    b1.onclick = () => go('home');
    const b2 = el('button', 'btn primary');
    b2.appendChild(el('span', null, t().myList + ' '));
    const c = el('span', 'pill count', String(state.mine.size));
    c.style.marginLeft = '4px';
    b2.appendChild(c);
    b2.onclick = () => go('mine');
    if (state.view !== 'home') bb.appendChild(b1);
    bb.appendChild(b2);
    bb.hidden = false;
  } else {
    bb.hidden = true;
  }
}

function setLang(l) {
  state.lang = l;
  localStorage.setItem('vv-lang', l);
  document.documentElement.lang = l;
  render();
}

function go(v) {
  state.view = v;
  state.q = '';
  window.scrollTo(0, 0);
  render();
}

/* ---------------------------------------------------------------- views */
function viewLang(root) {
  const hero = el('div', 'hero');
  const h = el('h1', null, 'Vraestel Vlaggies');
  hero.appendChild(h);
  hero.appendChild(el('p', null, 'Merk die vrae wat ons moet deurgaan · Flag the questions you want us to do'));
  root.appendChild(hero);

  const card = el('div', 'card gate');
  card.appendChild(el('div', 'eyebrow', 'Taal / Language'));
  card.appendChild(el('h2', 'card-title', 'Kies jou taal'));
  const row = el('div', 'lang-row');
  const a = el('button', 'btn big primary', 'Afrikaans');
  a.onclick = () => { setLang('af'); go(identified() ? 'home' : 'name'); };
  const e = el('button', 'btn big', 'English');
  e.onclick = () => { setLang('en'); go(identified() ? 'home' : 'name'); };
  row.appendChild(a); row.appendChild(e);
  card.appendChild(row);
  root.appendChild(card);
}

function viewName(root) {
  const card = el('div', 'card gate');
  card.appendChild(el('div', 'eyebrow', t().title));
  card.appendChild(el('h2', 'card-title', t().namePrompt));
  card.appendChild(el('p', 'small muted', t().nameHint));
  const inp = el('input', 'text-input');
  inp.type = 'text';
  inp.placeholder = t().namePh;
  inp.maxLength = 40;
  inp.autocomplete = 'given-name';
  inp.value = state.learner || '';
  card.appendChild(inp);

  /* the anonymous tick */
  const tickRow = el('label', 'tick-row');
  const tick = el('input');
  tick.type = 'checkbox';
  tick.className = 'tick';
  tick.checked = state.anon;
  const tickBody = el('span', 'tick-body');
  tickBody.appendChild(el('span', 'tick-ttl', '🕶 ' + t().anonTick));
  tickBody.appendChild(el('span', 'tick-hint', t().anonHint));
  tickRow.appendChild(tick);
  tickRow.appendChild(tickBody);
  card.appendChild(tickRow);

  const err = el('div', 'err');
  err.hidden = true;
  card.appendChild(err);

  const syncTick = () => {
    inp.disabled = tick.checked;
    inp.style.opacity = tick.checked ? '.45' : '1';
    if (tick.checked) err.hidden = true;
  };
  tick.onchange = syncTick;
  syncTick();

  const go1 = el('button', 'btn big primary', t().start);
  const submit = async () => {
    const v = inp.value.trim();
    if (!tick.checked && !v) { err.textContent = t().nameErr; err.hidden = false; return; }
    const wasNamed = state.learner;
    if (tick.checked) {
      state.anon = true;
      state.learner = null;
      localStorage.setItem('vv-anon', '1');
      localStorage.removeItem('vv-name');
    } else {
      state.anon = false;
      state.learner = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
      localStorage.setItem('vv-name', state.learner);
      localStorage.removeItem('vv-anon');
    }
    go('home');
    // if they already flagged things, changing their mind has to apply to those too
    if (state.mine.size && wasNamed !== state.learner) {
      try {
        await setLearner(state.learner);
        state.mine.forEach((row) => { row.learner = state.learner; });
      } catch (e) { toast(t().offline); }
    }
  };
  go1.onclick = submit;
  inp.onkeydown = (ev) => { if (ev.key === 'Enter') submit(); };
  card.appendChild(go1);
  const cl = el('button', 'link-btn', t().pickLang);
  cl.onclick = () => go('lang');
  card.appendChild(cl);
  root.appendChild(card);
  if (!state.anon) setTimeout(() => inp.focus(), 40);
}

function viewHome(root) {
  const hero = el('div', 'hero');
  hero.appendChild(el('h1', null, state.learner ? t().hi + ', ' + state.learner + '!' : t().hiAnon));
  hero.appendChild(el('p', null, t().tagline));
  root.appendChild(hero);

  root.appendChild(el('div', 'eyebrow center', t().chooseRoute));
  const routes = el('div', 'routes');

  const r1 = el('button', 'route');
  r1.appendChild(el('div', 'route-ico', '📄'));
  const b1 = el('div');
  b1.appendChild(el('h3', null, t().routeQ));
  b1.appendChild(el('p', null, t().routeQSub));
  r1.appendChild(b1);
  r1.onclick = () => go('paper');

  const r2 = el('button', 'route');
  r2.appendChild(el('div', 'route-ico', '🎯'));
  const b2 = el('div');
  b2.appendChild(el('h3', null, t().routeT));
  b2.appendChild(el('p', null, t().routeTSub));
  r2.appendChild(b2);
  r2.onclick = () => go('topic');

  routes.appendChild(r1);
  routes.appendChild(r2);
  root.appendChild(routes);

  if (state.mine.size) {
    const p = el('p', 'small muted center');
    p.style.marginTop = '18px';
    p.textContent = t().myCount.replace('{n}', state.mine.size) + ' ' + t().savedNote;
    root.appendChild(p);
  }
  const cn = el('button', 'link-btn', t().changeName);
  cn.style.display = 'block';
  cn.style.margin = '14px auto 0';
  cn.onclick = () => go('name');
  root.appendChild(cn);
}

/* ---- paper route ---- */
function partHay(paper, q, pt) {
  const lbl = PAPER_TOPIC_LABEL[q.topic] || {};
  return {
    id: norm(pt ? pt.id : q.n),
    text: fold((pt ? pt[state.lang] : '') + ' ' + (lbl[state.lang] || '') + ' ' + (lbl.en || '')),
  };
}

function matches(hay, query) {
  if (!query) return true;
  const nq = norm(query);
  const fq = fold(query);
  if (nq && hay.id.startsWith(nq)) return true;
  return fq.length >= 2 && hay.text.includes(fq);
}

function viewPaper(root) {
  root.appendChild(el('div', 'eyebrow', t().pickPaper));
  const row = el('div', 'paper-row');
  PAPERS.forEach((p) => {
    const c = el('button', 'paper-chip' + (p.id === state.paper ? ' on' : ''),
      (state.lang === 'af' ? 'V' : 'P') + ' ' + p.id);
    c.onclick = () => {
      state.paper = p.id;
      localStorage.setItem('vv-paper', p.id);
      render();
    };
    row.appendChild(c);
  });
  root.appendChild(row);

  const sw = el('div', 'search-wrap');
  const s = el('input', 'search');
  s.type = 'search';
  s.placeholder = t().searchQ;
  s.value = state.q;
  s.oninput = () => { state.q = s.value; renderPaperList(list, other); };
  sw.appendChild(s);
  sw.appendChild(el('div', 'hint', t().hintQ));
  root.appendChild(sw);

  const list = el('div');
  const other = el('div');
  root.appendChild(other);
  root.appendChild(list);
  renderPaperList(list, other);

  if (state.q) setTimeout(() => { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }, 0);
}

function renderPaperList(list, other) {
  list.innerHTML = '';
  other.innerHTML = '';
  const paper = PAPERS.find((p) => p.id === state.paper);
  let shown = 0;

  paper.questions.forEach((q) => {
    const wholeHay = { id: norm(q.n), text: fold((PAPER_TOPIC_LABEL[q.topic] || {})[state.lang] || '') };
    const hits = q.parts.filter((pt) => matches(partHay(paper.id, q, pt), state.q));
    const qHit = matches(wholeHay, state.q);
    if (!hits.length && !qHit) return;
    shown += 1;

    const block = el('div', 'qblock');
    const head = el('div', 'qhead');
    head.appendChild(el('span', 'dot dot-' + q.topic));
    head.appendChild(el('h3', null, t().qWord + ' ' + q.n));
    const lbl = PAPER_TOPIC_LABEL[q.topic] || {};
    head.appendChild(el('span', 'meta',
      (lbl[state.lang] || '') + ' · ' + t().section + ' ' + q.sec + ' · ' + q.marks + ' ' + t().marks));
    block.appendChild(head);

    const parts = el('div', 'parts');
    parts.appendChild(partRow(paper.id, q, null));
    (hits.length ? hits : q.parts).forEach((pt) => parts.appendChild(partRow(paper.id, q, pt)));
    block.appendChild(parts);
    list.appendChild(block);
  });

  if (!shown) {
    list.appendChild(el('div', 'empty', t().noMatch));
    // the number they typed may live in another paper — offer it
    const nq = norm(state.q);
    if (nq) {
      PAPERS.forEach((p) => {
        if (p.id === state.paper) return;
        const found = p.questions.some((q) => q.parts.some((pt) => norm(pt.id).startsWith(nq)));
        if (!found) return;
        const b = el('button', 'btn small');
        b.style.margin = '4px';
        b.textContent = (state.lang === 'af' ? 'Ook in Vraestel ' : 'Also in Paper ') + p.id;
        b.onclick = () => {
          state.paper = p.id;
          localStorage.setItem('vv-paper', p.id);
          render();
        };
        other.appendChild(b);
      });
    }
  }
}

function partRow(paperId, q, pt) {
  const key = paperKey(paperId, q.n, pt ? pt.id : null);
  const on = state.mine.has(key);
  const row = el('button', 'part' + (pt ? '' : ' whole') + (on ? ' on' : ''));
  row.appendChild(el('span', 'part-id', pt ? pt.disp : q.n));
  row.appendChild(el('span', 'part-txt', pt ? pt[state.lang] : t().whole));
  if (pt) row.appendChild(el('span', 'part-mk', '(' + pt.marks + ')'));
  row.appendChild(el('span', 'part-tick', on ? '✓' : ''));
  row.onclick = () => openSheet({
    kind: 'paper',
    key,
    paper: paperId,
    qnum: q.n,
    part: pt ? pt.id : null,
    title: (state.lang === 'af' ? 'Vraestel ' : 'Paper ') + paperId + ' · '
      + (pt ? t().qWord + ' ' + pt.disp : t().qWord + ' ' + q.n + ' — ' + t().whole),
    detail: pt ? pt[state.lang] : '',
  });
  return row;
}

/* ---- topic route ---- */
function subHay(topic, sub) {
  return {
    id: '',
    text: fold([sub.en, sub.af, (sub.syn || []).join(' '), topic.en, topic.af,
      (topic.syn || []).join(' ')].join(' ')),
  };
}

function viewTopic(root) {
  const sw = el('div', 'search-wrap');
  const s = el('input', 'search');
  s.type = 'search';
  s.placeholder = t().searchT;
  s.value = state.q;
  s.oninput = () => { state.q = s.value; renderTopicList(list); };
  sw.appendChild(s);
  root.appendChild(sw);
  const list = el('div');
  root.appendChild(list);
  renderTopicList(list);
  if (state.q) setTimeout(() => { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }, 0);
}

function renderTopicList(list) {
  list.innerHTML = '';
  const fq = fold(state.q);
  let shown = 0;

  TOPICS.forEach((topic) => {
    const hits = topic.subs.filter((sub) => !fq || fq.length < 2 || subHay(topic, sub).text.includes(fq));
    if (!hits.length) return;
    shown += 1;
    const searching = fq.length >= 2;
    const open = searching || state.openTopic === topic.id;

    const box = el('div', 'topic');
    const head = el('button', 'topic-head');
    head.appendChild(el('span', 'dot dot-' + topic.id));
    head.appendChild(el('span', null, topic[state.lang]));
    head.appendChild(el('span', 'caret', open ? '▾' : '▸'));
    head.onclick = () => {
      state.openTopic = state.openTopic === topic.id ? null : topic.id;
      renderTopicList(list);
    };
    box.appendChild(head);

    if (open) {
      const subs = el('div', 'subs');
      hits.forEach((sub) => {
        const key = topicKey(topic.id, sub.id);
        const on = state.mine.has(key);
        const row = el('button', 'sub' + (on ? ' on' : ''));
        row.appendChild(el('span', 'sub-txt', sub[state.lang]));
        row.appendChild(el('span', 'sub-tick', on ? '✓' : ''));
        row.onclick = () => openSheet({
          kind: 'topic',
          key,
          topic: topic.id,
          sub: sub.id,
          title: topic[state.lang] + ' · ' + sub[state.lang],
          detail: '',
        });
        subs.appendChild(row);
      });
      box.appendChild(subs);
    }
    list.appendChild(box);
  });

  if (!shown) list.appendChild(el('div', 'empty', t().noMatch));
}

/* ---- my list ---- */
function labelFor(row) {
  if (row.kind === 'paper') {
    const paper = PAPERS.find((p) => p.id === row.paper);
    const q = paper && paper.questions.find((x) => x.n === row.qnum);
    const pt = q && row.part_id ? q.parts.find((x) => x.id === row.part_id) : null;
    const head = (state.lang === 'af' ? 'Vraestel ' : 'Paper ') + row.paper + ' · '
      + t().qWord + ' ' + (pt ? pt.disp : row.qnum) + (pt ? '' : ' — ' + t().whole);
    return { head, sub: pt ? pt[state.lang] : '' };
  }
  const topic = TOPICS.find((x) => x.id === row.topic_id);
  const sub = topic && topic.subs.find((x) => x.id === row.sub_id);
  return {
    head: topic ? topic[state.lang] : row.topic_id,
    sub: sub ? sub[state.lang] : row.sub_id,
  };
}

function viewMine(root) {
  root.appendChild(el('h2', 'card-title', t().myList));
  if (!state.mine.size) {
    root.appendChild(el('div', 'empty', t().myEmpty));
  } else {
    root.appendChild(el('p', 'small muted', t().myCount.replace('{n}', state.mine.size)
      + ' ' + t().savedNote));
    const wrap = el('div', 'mine');
    wrap.style.marginTop = '12px';
    [...state.mine.values()]
      .sort((a, b) => String(a.target_key).localeCompare(String(b.target_key)))
      .forEach((row) => {
        const lab = labelFor(row);
        const item = el('div', 'mine-item');
        const body = el('div', 'body');
        body.appendChild(el('div', 'ttl', lab.head));
        if (lab.sub) body.appendChild(el('div', 'small muted', lab.sub));
        if (row.comment) body.appendChild(el('div', 'cmt', '“' + row.comment + '”'));
        item.appendChild(body);
        const x = el('button', 'x-btn', '×');
        x.title = t().unflag;
        x.onclick = async () => {
          x.disabled = true;
          try {
            await removeFlag(row.target_key);
            state.mine.delete(row.target_key);
            toast(t().removed);
            render();
          } catch (e) {
            x.disabled = false;
            toast(t().offline);
          }
        };
        item.appendChild(x);
        wrap.appendChild(item);
      });
    root.appendChild(wrap);
  }
  const more = el('button', 'btn big primary', t().addMore);
  more.style.marginTop = '18px';
  more.onclick = () => go('home');
  root.appendChild(more);
}

/* ---------------------------------------------------------------- sheet */
function openSheet(target) {
  const existing = state.mine.get(target.key);
  const back = el('div', 'sheet-back');
  const sheet = el('div', 'sheet');
  sheet.appendChild(el('div', 'eyebrow', target.kind === 'paper'
    ? (state.lang === 'af' ? 'Vraag' : 'Question')
    : (state.lang === 'af' ? 'Onderwerp' : 'Topic')));
  sheet.appendChild(el('h3', null, target.title));
  if (target.detail) sheet.appendChild(el('p', 'what muted', target.detail));

  sheet.appendChild(el('div', 'eyebrow', t().cmtTitle));
  sheet.appendChild(el('p', 'small muted', t().cmtHint));
  const ta = el('textarea');
  ta.placeholder = t().cmtPh;
  ta.maxLength = 500;
  ta.value = existing && existing.comment ? existing.comment : '';
  sheet.appendChild(ta);

  const btns = el('div', 'sheet-btns');
  const cancel = el('button', 'btn', t().cancel);
  cancel.onclick = () => back.remove();
  const save = el('button', 'btn primary', existing ? t().save : t().save);
  save.onclick = async () => {
    if (state.busy) return;
    state.busy = true;
    save.disabled = true;
    cancel.disabled = true;
    try {
      await addFlag({
        learner: state.learner,
        lang: state.lang,
        kind: target.kind,
        paper: target.paper,
        qnum: target.qnum,
        part: target.part,
        topic: target.topic,
        sub: target.sub,
        comment: ta.value,
      });
      state.mine.set(target.key, {
        target_key: target.key,
        kind: target.kind,
        paper: target.paper || null,
        qnum: target.qnum || null,
        part_id: target.part || null,
        topic_id: target.topic || null,
        sub_id: target.sub || null,
        comment: ta.value.trim() || null,
      });
      back.remove();
      toast(t().added);
      render();
    } catch (e) {
      toast(t().offline);
      save.disabled = false;
      cancel.disabled = false;
    } finally {
      state.busy = false;
    }
  };
  btns.appendChild(cancel);
  btns.appendChild(save);
  sheet.appendChild(btns);

  if (existing) {
    const rm = el('button', 'link-btn', '× ' + t().unflag);
    rm.style.display = 'block';
    rm.style.margin = '10px auto 0';
    rm.onclick = async () => {
      rm.disabled = true;
      try {
        await removeFlag(target.key);
        state.mine.delete(target.key);
        back.remove();
        toast(t().removed);
        render();
      } catch (e) {
        rm.disabled = false;
        toast(t().offline);
      }
    };
    sheet.appendChild(rm);
  }

  back.onclick = (ev) => { if (ev.target === back) back.remove(); };
  back.appendChild(sheet);
  document.body.appendChild(back);
  setTimeout(() => ta.focus(), 60);
}

/* ---------------------------------------------------------------- boot */
function render() {
  const root = $('#view');
  root.innerHTML = '';
  chrome();
  if (!state.lang) return viewLang(root);
  if (!identified()) return viewName(root);
  if (state.view === 'lang') return viewLang(root);
  if (state.view === 'name') return viewName(root);
  if (state.view === 'paper') return viewPaper(root);
  if (state.view === 'topic') return viewTopic(root);
  if (state.view === 'mine') return viewMine(root);
  return viewHome(root);
}

async function boot() {
  document.documentElement.lang = state.lang || 'af';
  render();
  if (state.lang && identified()) {
    try {
      const rows = await myFlags();
      state.mine = new Map((rows || []).map((r) => [r.target_key, r]));
      render();
    } catch (e) {
      toast(t().offline);
    }
  }
}

boot();
