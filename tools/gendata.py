# Turn survey.json into the app's questions.js data file.
import re, json, os, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = r"C:\Users\megzi\Desktop\Claude Code Projects\vraestel-vlaggies\js\questions.js"

GREEK = {
    'theta': '\u03b8', 'alpha': '\u03b1', 'beta': '\u03b2', 'gamma': '\u03b3',
    'delta': '\u03b4', 'pi': '\u03c0', 'lambda': '\u03bb', 'mu': '\u03bc',
    'sigma': '\u03c3', 'phi': '\u03c6', 'omega': '\u03c9', 'Delta': '\u0394',
}
SYM = {
    'parallel': '\u2225', 'perp': '\u22a5', 'leq': '\u2264', 'geq': '\u2265',
    'neq': '\u2260', 'times': '\u00d7', 'cdot': '\u00b7', 'triangle': '\u25b3',
    'angle': '\u2220', 'therefore': '\u2234', 'approx': '\u2248', 'pm': '\u00b1',
    'infty': '\u221e', 'ldots': '\u2026', 'dots': '\u2026', 'to': '\u2192',
    'Rightarrow': '\u21d2', 'in': '\u2208', 'cup': '\u222a', 'cap': '\u2229',
    'sqrt': '\u221a', 'circ': '\u00b0', 'quad': ' ', 'qquad': '  ',
}
KEEPWORD = ('sin', 'cos', 'tan', 'log', 'ln', 'max', 'min')


def strip_tex(t):
    if not t:
        return ''
    s = t
    # drop figure macros and layout-only commands entirely
    s = re.sub(r'\\Fig[A-Za-z]+', ' ', s)
    # Afrikaans accents written the LaTeX way (Paper 2D's AFR source): ko\"ordinate, \^e
    ACC = {'"': '\u0308', '^': '\u0302', "'": '\u0301', '`': '\u0300', '~': '\u0303'}
    s = re.sub(r'\\(["^\'`~])\{?([A-Za-z])\}?',
               lambda m: unicodedata.normalize('NFC', m.group(2) + ACC[m.group(1)]), s)
    s = re.sub(r'\\(wspace|vspace|hspace|newpage|par|noindent|centering|hfill|label|ref|pageref|input|reasons|mk|tot)\b\*?(\{[^{}]*\})?', ' ', s)
    s = re.sub(r'\\begin\{[^}]*\}(\[[^\]]*\])?', ' ', s)
    s = re.sub(r'\\end\{[^}]*\}', ' ', s)
    # fractions -> a/b  (run twice for light nesting)
    for _ in range(3):
        s = re.sub(r'\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}', r'(\1)/(\2)', s)
    # sqrt
    s = re.sub(r'\\sqrt\s*\{([^{}]*)\}', '\u221a' + r'(\1)', s)
    # accents: \hat{A} -> Â-ish (just keep the letter with a caret marker)
    s = re.sub(r'\\(widehat|hat)\s*\{([^{}]*)\}', r'\2' + '\u0302', s)
    s = re.sub(r'\\(overline|bar)\s*\{([^{}]*)\}', r'\2', s)
    s = re.sub(r'\\text(bf|it|rm|sf)?\s*\{([^{}]*)\}', r'\2', s)
    s = re.sub(r'\\(emph|mathrm|mathbf|operatorname)\s*\{([^{}]*)\}', r'\2', s)
    # ^\circ -> degree
    s = re.sub(r'\^\s*\{?\\circ\}?', '\u00b0', s)
    s = re.sub(r'\^\s*\{([^{}]*)\}', r'^\1', s)
    s = re.sub(r'_\s*\{([^{}]*)\}', r'_\1', s)
    # named symbols
    def sub_cmd(m):
        w = m.group(1)
        if w in GREEK:
            return GREEK[w]
        if w in SYM:
            return SYM[w]
        if w in KEEPWORD:
            return w
        return ' '
    s = re.sub(r'\\([A-Za-z]+)', sub_cmd, s)
    # escaped literals: \% \$ \& \# \_ -> the character itself
    s = re.sub(r'\\([%$&#_{}])', r'\1', s)
    # spacing macros and leftovers
    s = s.replace('\\,', ' ').replace('\\;', ' ').replace('\\!', '').replace('\\ ', ' ')
    s = s.replace('$', '').replace('{', '').replace('}', '')
    s = s.replace('~', ' ').replace('\\\\', ' ')
    s = re.sub(r'\s+([;,.])', r'\1', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


TOPIC_OF = {'STAT': 'stat', 'ANA': 'ana', 'TRIG': 'trig', 'EUC': 'euc'}

survey = json.load(open(os.path.join(HERE, 'survey.json'), encoding='utf-8'))

papers = []
for P in 'ABCD':
    fp = survey[P]['fingerprint']
    en = survey[P]['langs']['en']
    af = survey[P]['langs']['af']
    assert len(en) == len(af), 'paper %s language mismatch' % P
    topics = fp['topic_sequence']
    types = fp.get('type_slots', [])
    qs = []
    for i, (qe, qa) in enumerate(zip(en, af)):
        assert qe['q'] == qa['q'], 'q number mismatch %s' % P
        sec = 'A' if str(qe['section']).strip().startswith('A') else 'B'
        parts = []
        assert len(qe['parts']) == len(qa['parts']), 'part count mismatch %s Q%s' % (P, qe['q'])
        for pe, pa in zip(qe['parts'], qa['parts']):
            if pe['subs']:
                assert len(pe['subs']) == len(pa['subs'])
                for se, sa in zip(pe['subs'], pa['subs']):
                    parts.append({
                        'id': '%s%s%s' % (qe['q'], pe['label'], se['label']),
                        'disp': '%s(%s)(%s)' % (qe['q'], pe['label'], se['label']),
                        'marks': se['marks'],
                        'en': strip_tex(se['text']),
                        'af': strip_tex(sa['text']),
                    })
            else:
                parts.append({
                    'id': '%s%s' % (qe['q'], pe['label']),
                    'disp': '%s(%s)' % (qe['q'], pe['label']),
                    'marks': pe['marks'],
                    'en': strip_tex(pe['text']),
                    'af': strip_tex(pa['text']),
                })
        qs.append({
            'n': qe['q'],
            'sec': sec,
            'topic': TOPIC_OF.get(topics[i] if i < len(topics) else '', 'ana'),
            'kind': types[i] if i < len(types) else '',
            'marks': qe['marks'],
            'parts': parts,
        })
    papers.append({'id': '2' + P, 'label': 'Paper 2' + P, 'labelAf': 'Vraestel 2' + P, 'questions': qs})

body = json.dumps(papers, ensure_ascii=False, indent=1)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as fh:
    fh.write('// GENERATED from the Sept Paper II LaTeX sources by gendata.py. Do not hand-edit.\n')
    fh.write('export const PAPERS = ')
    fh.write(body)
    fh.write(';\n')

n_parts = sum(len(q['parts']) for p in papers for q in p['questions'])
n_q = sum(len(p['questions']) for p in papers)
print('wrote %s' % OUT)
print('%d papers, %d questions, %d parts' % (len(papers), n_q, n_parts))
# sanity: show a few
for p in papers[:1]:
    for q in p['questions'][:2]:
        for pt in q['parts'][:3]:
            print('  %-6s %-3s EN: %s' % (pt['id'], pt['marks'], pt['en'][:70]))
            print('  %-6s %-3s AF: %s' % ('', '', pt['af'][:70]))
