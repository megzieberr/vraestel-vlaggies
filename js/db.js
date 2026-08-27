// Supabase access over plain REST — no SDK, keeps the site a static drop.
// The publishable key is meant to be public; every write goes through a
// SECURITY DEFINER function, and anon has no direct insert/update/delete.

const URL = 'https://ounkyusqvbjmmfzehugj.supabase.co';
const KEY = 'sb_publishable_oHxQN-ne2nAR_SV0w3XUmw_3fUxY-rL';

const HEAD = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

async function call(path, opts) {
  const res = await fetch(URL + path, opts);
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).message || ''; } catch (e) { /* body not json */ }
    throw new Error('db ' + res.status + (detail ? ': ' + detail : ''));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** One id per browser, so a learner can manage the list they made. */
export function deviceId() {
  let d = localStorage.getItem('vv-device');
  if (!d) {
    d = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2))
      .replace(/-/g, '');
    localStorage.setItem('vv-device', d);
  }
  return d;
}

export function addFlag(f) {
  return call('/rest/v1/rpc/add_flag', {
    method: 'POST',
    headers: HEAD,
    body: JSON.stringify({
      p_device: deviceId(),
      p_learner: f.learner,
      p_lang: f.lang,
      p_kind: f.kind,
      p_paper: f.paper || null,
      p_qnum: f.qnum || null,
      p_part: f.part || null,
      p_topic: f.topic || null,
      p_sub: f.sub || null,
      p_comment: f.comment || null,
    }),
  });
}

/** Renames (or anonymises) every flag this browser has already made. */
export function setLearner(name) {
  return call('/rest/v1/rpc/set_learner', {
    method: 'POST',
    headers: HEAD,
    body: JSON.stringify({ p_device: deviceId(), p_name: name || null }),
  });
}

export function removeFlag(key) {
  return call('/rest/v1/rpc/remove_flag', {
    method: 'POST',
    headers: HEAD,
    body: JSON.stringify({ p_device: deviceId(), p_key: key }),
  });
}

/** Everything this browser has flagged. */
export function myFlags() {
  return call('/rest/v1/flags?select=*&device_id=eq.' + encodeURIComponent(deviceId())
    + '&order=created_at.desc', { headers: HEAD });
}

/** Everything, for the teacher dashboard. */
export function allFlags() {
  return call('/rest/v1/flags?select=*&order=created_at.desc', { headers: HEAD });
}

/* ---- handled / not handled -------------------------------------------------
   A flag is never deleted once it has been dealt with in class; it just gets a
   `resolved_at` stamp so the next class starts on a clean list. Every flag in
   one batch shares a single stamp, which is what makes the undo exact. */

/** Stamp every currently-open flag. Resolves to { stamp, n }. */
export async function resolveFlags() {
  const rows = await call('/rest/v1/rpc/resolve_flags', {
    method: 'POST', headers: HEAD, body: '{}',
  });
  return (rows && rows[0]) || { stamp: null, n: 0 };
}

/** Undo one batch — only the rows carrying exactly that stamp. */
export function unresolveFlags(stamp) {
  return call('/rest/v1/rpc/unresolve_flags', {
    method: 'POST', headers: HEAD, body: JSON.stringify({ p_stamp: stamp }),
  });
}
