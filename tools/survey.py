import re, json, os
D = r"C:\Users\megzi\Desktop\Graad 12 Curro\September Vraestel II"
HERE = os.path.dirname(os.path.abspath(__file__))

def brace(s, i):
    assert s[i] == '{'
    d = 0
    for j in range(i, len(s)):
        if s[j] == '{':
            d += 1
        elif s[j] == '}':
            d -= 1
            if d == 0:
                return s[i + 1:j], j + 1
    raise ValueError("unbalanced")

TOK = re.compile(r'\\(qhead|dvv|dv|mk|tot|sect)\s*\{')

def parse(path):
    s = open(path, encoding='utf-8').read()
    s = s.split('\\sect{A}', 1)[-1]
    out = []
    q = None; sub = None; ssub = None; section = 'A'
    for m in TOK.finditer(s):
        cmd = m.group(1); i = m.end() - 1
        a, nxt = brace(s, i)
        if cmd == 'sect':
            section = a.strip()
        elif cmd == 'qhead':
            q = {'q': a.strip(), 'section': section, 'parts': [], 'marks': None}
            out.append(q); sub = None; ssub = None
        elif cmd == 'dv':
            body = brace(s, nxt)[0] if nxt < len(s) and s[nxt] == '{' else ''
            sub = {'label': a.strip(), 'text': body, 'subs': [], 'marks': None}
            q['parts'].append(sub); ssub = None
        elif cmd == 'dvv':
            body = brace(s, nxt)[0] if nxt < len(s) and s[nxt] == '{' else ''
            ssub = {'label': a.strip(), 'text': body, 'marks': None}
            sub['subs'].append(ssub)
        elif cmd == 'mk':
            tgt = ssub or sub
            if tgt is not None:
                tgt['marks'] = a.strip()
        elif cmd == 'tot':
            if q is not None:
                q['marks'] = a.strip()
    return out

res = {}
for P in 'ABCD':
    fp = json.load(open(os.path.join(D, 'fingerprint-p2%s.json' % P.lower()), encoding='utf-8'))
    langs = {}
    for lang, suf in (('en', 'ENG'), ('af', 'AFR')):
        langs[lang] = parse(os.path.join(D, 'Sept-P2%s-%s.tex' % (P, suf)))
    res[P] = {'fingerprint': fp, 'langs': langs}

for P in 'ABCD':
    fp = res[P]['fingerprint']; qs = res[P]['langs']['en']; qa = res[P]['langs']['af']
    topics = fp['topic_sequence']; types = fp.get('type_slots', [])
    tot = sum(int(q['marks']) for q in qs if q['marks'])
    print("\n===== PAPER 2%s - %d questions, %d marks (AFR parses %d questions) =====" % (P, len(qs), tot, len(qa)))
    for n, q in enumerate(qs):
        t = topics[n] if n < len(topics) else '?'
        ty = types[n] if n < len(types) else ''
        ids = []
        for p in q['parts']:
            if p['subs']:
                for ss in p['subs']:
                    ids.append("%s%s%s(%s)" % (q['q'], p['label'], ss['label'], ss['marks']))
            else:
                ids.append("%s%s(%s)" % (q['q'], p['label'], p['marks']))
        if not q['parts']:
            ids = ["%s = whole question" % q['q']]
        print("  Q%-3s [%s] %-4s %-24s [%s]  %s" % (q['q'], q['section'], t, ty, q['marks'], " ".join(ids)))

json.dump(res, open(os.path.join(HERE, 'survey.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print("\nwrote survey.json")
