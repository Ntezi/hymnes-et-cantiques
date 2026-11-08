#!/usr/bin/env python3
"""Karaoke syllable timing (lyricTiming.json version 2) for the HEC hymns (Kinyarwanda).

Source of truth: the Cantiquest karaoke MIDI files the app's piano renders were made from
(../midi/HeC_NNN-mono-piano-*.mid): soprano notes + French lyric syllables (one per note
onset; notes without lyric = ties / melisma; '\\' = new paragraph/verse, '/' = new line).
Steps: MIDI -> French syllable-notes per verse/line; MIDI->audio time map fitted against the
audio onsets (onsets.json); Kinyarwanda lines (repeats expanded) aligned to the French lines,
then syllables to syllable-notes; times converted to audio time.

python3 align.py                         -> writes lyricTiming.json (+ quality.json)
python3 align.py --show 7 [--verse 0]    -> syllable/note table (no files written)
"""
import json, re, sys, math, unicodedata, itertools, os, glob
import numpy as np
import mido

HERE = os.path.dirname(os.path.abspath(__file__))
SONGS = os.path.join(HERE, '..', 'repo', 'src', 'songs.json')
ONSETS = os.path.join(HERE, 'onsets.json')
MIDI_GLOB = os.path.join(HERE, '..', 'midi', 'HeC_{}-*.mid')
OUT = os.path.join(HERE, 'lyricTiming.json')
QOUT = os.path.join(HERE, 'quality.json')
QUALITY_THRESHOLD = 0.6
GENERATED_AT = '2026-11-08'

# ---------------------------------------------------------------- text
MARK_RE = re.compile(r'\((bis|ter|x\s*\d|\d|etc\.?)\)', re.I)
VERSE_NUM_RE = re.compile(r'^(\d+)\.\s*(.*)$')


def mark_count(m):
    v = m.lower().replace(' ', '').rstrip('.')
    if v in ('bis', 'x2', '2'):
        return 2
    if v in ('ter', 'x3', '3'):
        return 3
    if v.startswith('x') and v[1:].isdigit():
        return int(v[1:])
    if v.isdigit():
        return int(v)
    return 1  # (etc)


def tokenize_verse(verse):
    """Exactly the app's tokenisation: lines -> strip verse number -> split on whitespace."""
    lines = [s.strip() for s in verse.split('\n') if s.strip()]
    out = []
    for line in lines:
        m = VERSE_NUM_RE.match(line)
        content = m.group(2) if m else line
        out.append([w for w in re.split(r'\s+', content) if w])
    return out


def _letters(w):
    w = unicodedata.normalize('NFD', w.lower())
    return ''.join(c for c in w if 'a' <= c <= 'z')


def _is_vowel(ch):
    return unicodedata.normalize('NFD', ch)[0].lower() in 'aeiou'


def syl_ranges(token):
    """Half-open character ranges of the sung syllables inside a token string.
    Every vowel letter is a nucleus (CV, CCV, NCV...; y/w are glides = consonants); the
    consonants (and an apostrophe of an elided vowel) before a vowel open its syllable, so
    "Wow'utuye" -> Wo|w'u|tu|ye. Leading punctuation/marker text goes to the first syllable,
    trailing consonants/punctuation to the last. Repeat-marker text never counts as a vowel.
    Ranges are contiguous and cover the whole token; [] if the token has no vowel."""
    masked = list(token)
    for m in MARK_RE.finditer(token):
        for k in range(m.start(), m.end()):
            masked[k] = '#'
    vow = [k for k, ch in enumerate(masked) if ch != '#' and ch.isalpha() and _is_vowel(ch)]
    if not vow:
        return []
    starts = [0] + [v + 1 for v in vow[:-1]]
    ends = [v + 1 for v in vow[:-1]] + [len(token)]
    return list(zip(starts, ends))


def syllables(word):
    """Number of sung syllables of a token (marker text removed)."""
    return len(syl_ranges(word))


class Line:
    def __init__(self, vi, li, words):
        self.vi, self.li, self.words = vi, li, words
        # per word: syllable count, marker count (if a marker sits in/after the word)
        self.syl = [syllables(w) for w in words]
        self.end_mark = 1
        self.mid_marks = []  # (word index after which the repeat happens, count)
        for wi, w in enumerate(words):
            ms = MARK_RE.findall(w)
            if not ms:
                continue
            c = max(mark_count(x) for x in ms)
            rest_after = any(self.syl[k] > 0 for k in range(wi + 1, len(words)))
            stripped = MARK_RE.sub('', w)
            # marker before the word text, e.g. "(3)ur'ibyishimo": repeat what precedes it
            if MARK_RE.match(w) and syllables(stripped) > 0:
                pos = wi - 1
            else:
                pos = wi
            if rest_after or (MARK_RE.match(w) and syllables(stripped) > 0):
                if pos >= 0 and c > 1:
                    self.mid_marks.append((pos, c))
            else:
                self.end_mark = max(self.end_mark, c)

    def word_units(self):
        """sung word sequence for this line incl. mid-line repeats -> list of wi"""
        seq = list(range(len(self.words)))
        for pos, c in sorted(self.mid_marks, reverse=True):
            head = list(range(0, pos + 1))
            seq = head * c + [k for k in seq if k > pos]
        return seq


def sung_sequence(verse_lines, bis_mode, extra_lines=()):
    """verse_lines: [Line]; returns list of (Line, [wi...]) sung in order.
    bis_mode: 'line' | 'couplet' | 'none' for line-final repeat markers."""
    out = []
    for k, L in enumerate(verse_lines):
        out.append((L, L.word_units()))
        if L.end_mark > 1 and bis_mode != 'none':
            if bis_mode == 'couplet' and k >= 1 and verse_lines[k - 1].end_mark == 1:
                block = [(verse_lines[k - 1], verse_lines[k - 1].word_units()), (L, L.word_units())]
            else:
                block = [(L, L.word_units())]
            for _ in range(L.end_mark - 1):
                out.extend(block)
    for L in extra_lines:
        out.append((L, L.word_units()))
        if L.end_mark > 1 and bis_mode != 'none':
            for _ in range(L.end_mark - 1):
                out.append((L, L.word_units()))
    return out


def to_syllables(seq):
    """-> syllable list: dict(word=(vi,li,wi) or None for 0-syl tokens handled later,
    wfirst, lfirst, llast). Zero-syllable tokens are attached to the next word."""
    syl = []
    words = []  # (vi,li,wi, first syllable index or None)
    for li_s, (L, wis) in enumerate(seq):
        line_start = len(syl)
        prev_end = None  # (ends with vowel, punctuation after it)
        for wi in wis:
            n = L.syl[wi]
            stripped = MARK_RE.sub('', L.words[wi])
            if not re.search(r'\w', stripped):
                continue  # pure marker / punctuation token: not sung, no event
            words.append([L.vi, L.li, wi, len(syl) if n else None])
            letters = _letters(stripped)
            elide = 0
            if n and prev_end and prev_end[0] and letters[:1] in tuple('aeiou'):
                elide = 2 if prev_end[1] else 1
            rng = syl_ranges(L.words[wi])
            for s in range(n):
                syl.append({'lfirst': False, 'llast': False, 'wfirst': s == 0,
                            'elide': elide if s == 0 else 0, 'line': li_s,
                            'w': (L.vi, L.li, wi), 'cs': rng[s][0], 'ce': rng[s][1]})
            if n:
                prev_end = (letters[-1:] in tuple('aeiou'), bool(re.search(r'[,;:.!?]$', stripped)))
        if len(syl) > line_start:
            syl[line_start]['lfirst'] = True
            syl[-1]['llast'] = True
    return syl, words


def validate(hymns, songs):
    """Every event's range lies inside its token; for every sung occurrence of a token the
    syllable ranges are contiguous and cover it exactly once; events sorted by start."""
    problems, missing = [], []
    for key, h in hymns.items():
        toks = [tokenize_verse(v) for v in songs[key]['verses']]
        ev = h['events']
        if any(ev[i][5] > ev[i + 1][5] for i in range(len(ev) - 1)):
            problems.append((key, 'not sorted'))
        occ = {}
        for v, l, w, cs, ce, a, b in ev:
            tok = toks[v][l][w]
            if not (0 <= cs < ce <= len(tok)):
                problems.append((key, 'range', v, l, w, cs, ce))
            if b <= a:
                problems.append((key, 'empty time', v, l, w, a, b))
            occ.setdefault((v, l, w), []).append((cs, ce))
        for (v, l, w), rs in occ.items():
            tok = toks[v][l][w]
            n = len(syl_ranges(tok)) or 1
            if len(rs) % n:
                problems.append((key, 'syllable count', v, l, w, rs))
                continue
            full = [(0, len(tok))] if not syl_ranges(tok) else syl_ranges(tok)
            if sorted(rs) != sorted(full * (len(rs) // n)):
                problems.append((key, 'coverage', v, l, w, rs))
            if full[0][0] != 0 or full[-1][1] != len(tok) or any(full[k][1] != full[k + 1][0] for k in range(len(full) - 1)):
                problems.append((key, 'not contiguous', v, l, w))
        for v in range(len(toks)):
            for l in range(len(toks[v])):
                for w, tok in enumerate(toks[v][l]):
                    sung = re.search(r'\w', MARK_RE.sub('', tok))
                    if sung and (v, l, w) not in occ:
                        missing.append((key, v, l, w))
                    if not sung and (v, l, w) in occ:
                        problems.append((key, 'marker/punctuation has events', v, l, w, tok))
    return problems, missing



# ---------------------------------------------------------------- MIDI
def midi_path(key):
    k = key if not key.isdigit() else f'{int(key):03d}'
    fs = sorted(glob.glob(MIDI_GLOB.format(k)))
    return fs[0] if fs else None


def read_midi(path):
    """-> dict(sop=[(t0,t1)], allon=[t], lyr=[(t, text)]) in MIDI seconds (tempo map honoured)."""
    m = mido.MidiFile(path)
    tpb = m.ticks_per_beat
    tempos = []
    for tr in m.tracks:
        tk = 0
        for x in tr:
            tk += x.time
            if x.type == 'set_tempo':
                tempos.append((tk, x.tempo))
    tempos = sorted(set(tempos))
    # cumulative seconds at each tempo change
    marks, s, last, tempo = [], 0.0, 0, 500000
    for a, b in tempos:
        s += (a - last) * tempo / tpb / 1e6
        marks.append((a, s, b))
        last, tempo = a, b

    def sec(tk):
        base_tk, base_s, tp = 0, 0.0, 500000
        for a, s_, b in marks:
            if a > tk:
                break
            base_tk, base_s, tp = a, s_, b
        return base_s + (tk - base_tk) * tp / tpb / 1e6

    def notes(tr):
        out, open_ = [], {}
        tk = 0
        for x in tr:
            tk += x.time
            if x.type == 'note_on' and x.velocity > 0:
                open_.setdefault(x.note, []).append(tk)
            elif x.type in ('note_off', 'note_on') and open_.get(x.note):
                st = open_[x.note].pop(0)
                out.append((sec(st), sec(tk)))
        return sorted(out)

    voice_tracks = [tr for tr in m.tracks if any(x.type == 'note_on' for x in tr)]
    sop_tr = next((tr for tr in voice_tracks if re.match(r'^so\w*an', tr.name.strip(), re.I)), voice_tracks[0])
    sop = notes(sop_tr)
    allon = sorted({round(a, 4) for tr in voice_tracks for a, _ in notes(tr)})
    lyr_tr = max(m.tracks, key=lambda tr: sum(1 for x in tr if x.type in ('text', 'lyrics')
                                               and not x.text.startswith('@')))
    lyr, tk = [], 0
    for x in lyr_tr:
        tk += x.time
        if x.type in ('text', 'lyrics') and not x.text.startswith('@'):
            lyr.append((sec(tk), x.text))
    return dict(sop=sop, allon=np.array(allon), lyr=lyr, length=m.length)


def french_structure(md):
    """-> verses: [ [ line: [ {t0,t1,text} ] ] ]. A syllable spans its note plus the
    following lyric-less soprano notes that continue without a rest (ties / melisma)."""
    sop = md['sop']
    starts = np.array([a for a, _ in sop])
    lyr = [(t, txt) for t, txt in md['lyr']]
    verses, cur_v, cur_l = [], None, None
    nums = []
    for k, (t, txt) in enumerate(lyr):
        brk_v = txt.startswith('\\')
        brk_l = txt.startswith('/')
        body = txt.lstrip('\\/')
        numbered = re.match(r'^\s*\d+\.\s*', body)
        body_clean = re.sub(r'^\s*\d+\.\s*', '', body)
        if cur_v is None or numbered:
            cur_v = []
            verses.append(cur_v)
            nums.append(int(numbered.group().strip().rstrip('.')) if numbered else None)
            cur_l = None
        if cur_l is None or brk_v or brk_l:
            cur_l = []
            cur_v.append(cur_l)
        if not body_clean.strip():
            continue  # empty lyric event: melisma continuation
        nxt_t = lyr[k + 1][0] if k + 1 < len(lyr) else t + 10
        # notes of this syllable
        j = int(np.searchsorted(starts, t - 0.03))
        t1 = None
        if j < len(sop) and abs(sop[j][0] - t) < 0.06:
            t1 = sop[j][1]
            jj = j + 1
            while jj < len(sop) and sop[jj][0] < nxt_t - 0.03 and sop[jj][0] - t1 < 0.06:
                t1 = sop[jj][1]
                jj += 1
        if t1 is None:
            t1 = min(nxt_t, t + 0.5)
        syl = {'t0': t, 't1': t1, 'text': body_clean}
        cur_l.append(syl)
    keep = [k for k, v in enumerate(verses) if any(v)]
    return [[l for l in verses[k] if l] for k in keep], [nums[k] for k in keep]


def fit_time_map(allon, audio_on):
    """audio = a*midi + b from all-voice MIDI onsets vs audio spectral-flux onsets."""
    if len(audio_on) < 5 or len(allon) < 5:
        return None
    d = (audio_on[:, None] - allon[None, :]).ravel()
    d = d[np.abs(d) < 8]
    h, e = np.histogram(d, bins=np.arange(-8, 8.001, 0.02))
    b = e[h.argmax()] + 0.01
    a = 1.0
    for tol in (0.08, 0.05, 0.04):
        pred = a * allon + b
        idx = np.clip(np.searchsorted(audio_on, pred), 1, len(audio_on) - 1)
        near = np.where(np.abs(audio_on[idx] - pred) < np.abs(audio_on[idx - 1] - pred), idx, idx - 1)
        ok = np.abs(audio_on[near] - pred) < tol
        if ok.sum() < 5:
            return None
        a, b = np.polyfit(allon[ok], audio_on[near[ok]], 1)
    pred = a * allon + b
    idx = np.clip(np.searchsorted(audio_on, pred), 1, len(audio_on) - 1)
    near = np.where(np.abs(audio_on[idx] - pred) < np.abs(audio_on[idx - 1] - pred), idx, idx - 1)
    res = audio_on[near] - pred
    inside = (pred > audio_on[0] - 0.5) & (pred < audio_on[-1] + 0.5)
    frac = float((np.abs(res[inside]) < 0.04).mean()) if inside.any() else 0.0
    # audio onsets explained by MIDI onsets
    idx2 = np.clip(np.searchsorted(pred, audio_on), 1, len(pred) - 1)
    dd = np.minimum(np.abs(pred[idx2] - audio_on), np.abs(pred[idx2 - 1] - audio_on))
    frac2 = float((dd < 0.04).mean())
    return dict(a=float(a), b=float(b), midi_matched=round(frac, 3), audio_matched=round(frac2, 3),
                rms_ms=round(float(np.sqrt(np.mean(res[inside & (np.abs(res) < 0.04)] ** 2)) * 1000), 1))


# ---------------------------------------------------------------- Kinyarwanda <-> French
def kin_line_syls(L, wis):
    syl, words = to_syllables([(L, wis)])
    return syl, words


def nel(syl):
    """syllables that may merge with the previous one (vowel elision / vowel cluster)"""
    return sum(1 for i, s in enumerate(syl) if i and mergeable(syl, i) < 0.5)


def mergeable(syl, i):
    """cost of singing kin syllable i on the same note as syllable i-1"""
    s = syl[i]
    if s.get('elide'):
        return 0.25 if s['elide'] == 1 else 0.5
    if not s['wfirst'] and s.get('bare_vowel'):
        return 0.35          # vowel cluster inside a word (e.g. "ia", "ue")
    return 1.0


def line_cost(ks, kn, m):
    if ks == m:
        return 0.0
    if ks > m:
        e = ks - m
        return min(e, kn) * 0.3 + max(0, e - kn) * 1.0
    return (m - ks) * 0.8


def align_lines(K, M):
    """K: [(nsyl, nmergeable)], M: [nsyl]. Moves: 1:1, 1:2, 1:3, 2:1, 3:1, skip.
    -> (cost, groups [(kin idx list, midi idx list)])"""
    INF = 1e9
    nK, nM = len(K), len(M)
    D = np.full((nK + 1, nM + 1), INF)
    B = {}
    D[0, 0] = 0
    moves = [(1, 1), (1, 2), (2, 1), (1, 3), (3, 1), (1, 0), (0, 1)]
    for i in range(nK + 1):
        for j in range(nM + 1):
            if D[i, j] >= INF:
                continue
            for di, dj in moves:
                ii, jj = i + di, j + dj
                if ii > nK or jj > nM:
                    continue
                if di and dj:
                    ks = sum(K[x][0] for x in range(i, ii))
                    kn = sum(K[x][1] for x in range(i, ii))
                    ms = sum(M[x] for x in range(j, jj))
                    c = line_cost(ks, kn, ms) + 0.8 * (di + dj - 2)
                else:
                    c = 5.0
                if D[i, j] + c < D[ii, jj]:
                    D[ii, jj] = D[i, j] + c
                    B[(ii, jj)] = (i, j)
    groups, ij = [], (nK, nM)
    while ij != (0, 0):
        p = B[ij]
        groups.append((list(range(p[0], ij[0])), list(range(p[1], ij[1]))))
        ij = p
    return float(D[nK, nM]), groups[::-1]


def align_sylls(ksyl, fsyl):
    """Kin syllables -> French syllable-notes inside one line group.
    -> list per kin syllable of (first f idx, last f idx, share index k, share count n, elided)"""
    nK, nF = len(ksyl), len(fsyl)
    INF = 1e9
    D = np.full((nK + 1, nF + 1), INF)
    B = {}
    D[0, 0] = 0
    for i in range(nK + 1):
        for j in range(nF + 1):
            if D[i, j] >= INF:
                continue
            for di, dj in ((1, 1), (2, 1), (3, 1), (1, 2), (1, 3)):
                ii, jj = i + di, j + dj
                if ii > nK or jj > nF:
                    continue
                if di == 1 and dj == 1:
                    c = 0.0
                elif dj == 1:
                    c = sum(mergeable(ksyl, x) for x in range(i + 1, ii))
                    c += sum(2.0 for x in range(i + 1, ii) if ksyl[x]['lfirst'])  # never across lines
                    c += 0.5 * (di - 2)
                else:
                    last = ii == nK or ksyl[ii]['lfirst']
                    c = (0.4 if last else 0.8) * (dj - 1) + 0.3 * (dj - 2)
                if D[i, j] + c < D[ii, jj]:
                    D[ii, jj] = D[i, j] + c
                    B[(ii, jj)] = (i, j)
    if D[nK, nF] >= INF:
        return None, INF
    out = [None] * nK
    ij = (nK, nF)
    while ij != (0, 0):
        i, j = B[ij]
        di, dj = ij[0] - i, ij[1] - j
        grp_el = di > 1 and all(mergeable(ksyl, i + k) < 0.6 for k in range(1, di))
        for k in range(di):
            out[i + k] = (j, j + dj - 1, k, di, grp_el)
        ij = (i, j)
    return out, float(D[nK, nF])


def split_units(L):
    """A mid-line repeat ("Niyo Mana yacu (ter) niyo bwihisho") is sung as separate phrases:
    one sung line per repetition, then the rest of the line."""
    if not L.mid_marks:
        return [(L, L.word_units())]
    pos, c = sorted(L.mid_marks)[0]
    head = list(range(0, pos + 1))
    rest = [k for k in range(len(L.words)) if k > pos]
    out = [(L, head) for _ in range(c)]
    if rest:
        out.append((L, rest))
    return out


def verse_candidates(lines, vi, chorus, lc):
    """Kinyarwanda sung-line expansions to try: per line-final marker line/couplet/none."""
    vl = lines[vi]
    marked = [k for k, L in enumerate(vl) if L.end_mark > 1]
    opts = []
    choice_sets = [('line', 'couplet', 'none') if k >= 1 else ('line', 'none') for k in marked]
    if len(marked) > 5:
        choice_sets = None
    combos = itertools.product(*choice_sets) if choice_sets is not None else \
        [tuple(m for _ in marked) for m in ('line', 'couplet', 'none')]
    extras = [()]
    if chorus and vi > 0 and lc[vi] < lc[0]:
        extras.append(tuple(chorus))
    for combo in combos:
        mode = dict(zip(marked, combo))
        for extra in extras:
            seq = []
            for k, L in enumerate(vl):
                seq.extend(split_units(L))
                if L.end_mark > 1 and mode[k] != 'none':
                    if mode[k] == 'couplet' and vl[k - 1].end_mark == 1:
                        block = [(vl[k - 1], vl[k - 1].word_units()), (L, L.word_units())]
                    else:
                        block = [(L, L.word_units())]
                    for _ in range(L.end_mark - 1):
                        seq.extend(block)
            for L in extra:
                seq.append((L, L.word_units()))
                if L.end_mark > 1:
                    for _ in range(L.end_mark - 1):
                        seq.append((L, L.word_units()))
            opts.append((dict(mode), bool(extra), seq))
    return opts


def sung_line_syls(seq):
    """per sung line: (syllables, words) with flags needed by the aligners"""
    out = []
    for L, wis in seq:
        syl, words = to_syllables([(L, wis)])
        for s in syl:
            v, l, w = s['w']
            tok = L.words[w]
            txt = _letters(tok[s['cs']:s['ce']])
            s['bare_vowel'] = len(txt) == 1 and txt in 'aeiou'
        out.append((syl, words))
    return out


def process(song, ons, md):
    verses = song['verses']
    toks = [tokenize_verse(v) for v in verses]
    lines = [[Line(vi, li, w) for li, w in enumerate(vt)] for vi, vt in enumerate(toks)]
    nv = len(verses)
    fr, fr_nums = french_structure(md)
    kin_nums = []
    for v in verses:
        mm = re.match(r'^\s*(\d+)\.', v)
        kin_nums.append(int(mm.group(1)) if mm else None)
    audio_on = np.array([o[0] for o in ons['onsets']]) if ons else np.array([])
    tm = fit_time_map(md['allon'], audio_on) if ons else None
    info = dict(nv_kin=nv, nv_midi=len(fr), fr_lines=[len(v) for v in fr])
    if tm is None:
        info.update(quality=0.0, reason='no MIDI->audio time map')
        return None, info
    info['time_map'] = tm
    A, Bo = tm['a'], tm['b']

    def ms(t):
        return int(round(max(0.0, A * t + Bo) * 1000))

    lc = [len(x) for x in lines]
    chorus = []
    if nv > 1:
        other = int(np.median(lc[1:]))
        if lc[0] - other >= 2:
            chorus = lines[0][other:]
    events, good, total, notes_ = [], 0, 0, []
    # verse level: a Kinyarwanda verse entry may cover 1-3 MIDI verses and vice versa
    # (e.g. a verse split into two entries, or a MIDI file with all verses in one paragraph)
    def best_for(kvs, mjs):
        F = [l for mj in mjs for l in fr[mj]]
        M = [len(l) for l in F]
        if len(kvs) == 1:
            cands = verse_candidates(lines, kvs[0], chorus, lc)
        else:
            seq = []
            for kv in kvs:
                seq += verse_candidates(lines, kv, [], lc)[0][2]   # default: (bis) = line
            cands = [({}, False, seq)]
        best = None
        for mode, ch, seq in cands:
            sl = sung_line_syls(seq)
            K = [(len(x), nel(x)) for x, _ in sl]
            c, groups = align_lines(K, M)
            if best is None or c < best[0]:
                best = (c, groups, sl, mode, ch, F)
        return best

    nF = len(fr)
    INF = 1e9
    VD = np.full((nv + 1, nF + 1), INF)
    VB, VC = {}, {}
    VD[0, 0] = 0
    for i in range(nv + 1):
        for j in range(nF + 1):
            if VD[i, j] >= INF:
                continue
            for di, dj in ((1, 1), (1, 2), (2, 1), (1, 3), (3, 1), (1, 0), (0, 1)):
                ii, jj = i + di, j + dj
                if ii > nv or jj > nF:
                    continue
                if di and dj:
                    key_ = (i, ii, j, jj)
                    if key_ not in VC:
                        VC[key_] = best_for(list(range(i, ii)), list(range(j, jj)))
                    c = VC[key_][0] + 1.0 * (di + dj - 2)
                    if kin_nums[i] is not None and fr_nums[j] is not None and kin_nums[i] != fr_nums[j]:
                        c += 2.0   # verse numbers disagree
                    if di > 1 and nF >= nv and any(kin_nums[x] is not None for x in range(i + 1, ii)):
                        c += 50.0  # two numbered Kinyarwanda verses on one MIDI verse: only if MIDI lacks verses
                elif di:
                    c = 3.0 * len(lines[i])
                else:
                    c = 3.0 * len(fr[j])
                if VD[i, j] + c < VD[ii, jj]:
                    VD[ii, jj] = VD[i, j] + c
                    VB[(ii, jj)] = (i, j)
    vgroups, ij = [], (nv, nF)
    while ij != (0, 0):
        p = VB[ij]
        vgroups.append((p[0], ij[0], p[1], ij[1]))
        ij = p
    vgroups = vgroups[::-1]
    for i, ii, j, jj in vgroups:
        if ii - i and jj - j:
            if (ii - i, jj - j) != (1, 1):
                notes_.append(f'Kinyarwanda verse(s) {i + 1}-{ii} <-> MIDI verse(s) {j + 1}-{jj}')
        elif ii - i:
            notes_.append(f'Kinyarwanda verse {i + 1} has no MIDI verse (no events)')
            total += sum(1 for _ in lines[i])
            continue
        else:
            notes_.append(f'MIDI verse {j + 1} has no Kinyarwanda text')
            continue
        c, groups, sl, mode, ch, F = VC[(i, ii, j, jj)]
        vi = i
        if mode and any(v != 'line' for v in mode.values()):
            notes_.append(f'v{vi + 1}: repeats {sorted(set(mode.values()))}')
        if ch:
            notes_.append(f'v{vi + 1}: refrain from verse 1 appended')
        for kis, fjs in groups:
            ksyl, kwords = [], []
            for ki in kis:
                s, w = sl[ki]
                base = len(ksyl)
                ksyl.extend(s)
                kwords.extend([[a, b, cc, (d + base) if d is not None else None] for a, b, cc, d in w])
            total += len(kis)
            if not fjs or not kis:
                continue
            fsyl = [x for fj in fjs for x in F[fj]]
            ks = len(ksyl)
            kn = nel(ksyl)
            near = line_cost(ks, kn, len(fsyl)) <= 1.0
            if near:
                good += len(kis)
            amap, _ = align_sylls(ksyl, fsyl)
            if amap is None:
                continue
            for i, s in enumerate(ksyl):
                f0, f1, k, n, el = amap[i]
                t0, t1 = fsyl[f0]['t0'], fsyl[f1]['t1']
                if n > 1 and not el:
                    # two+ syllables on one note: split the note so the colour still moves
                    # (an elided pair shares the whole note instead)
                    span = t1 - t0
                    kk = k
                    t0, t1 = t0 + span * kk / n, t0 + span * (kk + 1) / n
                elif n > 1 and el:
                    pass
                s['_t'] = (t0, t1, fsyl[f0]['text'].strip())
            for wv, wl, wwi, fs in kwords:
                if fs is None:
                    tok = toks[wv][wl][wwi]
                    nxt = next((w[3] for w in kwords if w[3] is not None and w[3] >= 0), None)
                    later = [w[3] for w in kwords[kwords.index([wv, wl, wwi, fs]) + 1:] if w[3] is not None]
                    ref = later[0] if later else nxt
                    if ref is None or '_t' not in ksyl[ref]:
                        continue
                    t0, t1, ftxt = ksyl[ref]['_t']
                    events.append([wv, wl, wwi, 0, len(tok), ms(t0), max(ms(t1), ms(t0) + 1), t0, ftxt])
            for s in ksyl:
                if '_t' not in s:
                    continue
                t0, t1, ftxt = s['_t']
                v, l, w = s['w']
                events.append([v, l, w, s['cs'], s['ce'], ms(t0), max(ms(t1), ms(t0) + 1), t0, ftxt])
    if nv != len(fr):
        notes_.append(f'verse count differs: {nv} Kinyarwanda entries vs {len(fr)} MIDI verses')
    events.sort(key=lambda e: (e[5], e[7]))
    q_lines = good / total if total else 0.0
    q = q_lines
    # The audio onset detector misses many repeated / inner-voice notes, so a 60-80 % match
    # with ~4 ms residual is normal; only a poor or noisy fit is penalised.
    if tm['midi_matched'] < 0.45 or tm['rms_ms'] > 10:
        q *= 0.5
        notes_.append('weak MIDI/audio match')
    early = sum(1 for e in events if A * e[7] + Bo < -0.2)
    if early:
        notes_.append(f'{early} syllables fall before the audio file starts (clipped to 0 ms)')
        q *= max(0.0, 1 - early / max(1, len(events)) * 5)
    info.update(quality=round(q, 3), line_match=round(q_lines, 3), lines=total, notes=notes_)
    return events, info


def load():
    songs = {str(x['song_number']): x for x in json.load(open(SONGS, encoding='utf-8'))}
    ons = json.load(open(ONSETS))
    return songs, ons


def key_of(k):
    return str(int(k)) if k.isdigit() else k


def run_one(key, songs, ons):
    p = midi_path(key)
    if p is None:
        return None, dict(quality=0.0, reason='no MIDI')
    md = read_midi(p)
    okey = f'{int(key):03d}' if key.isdigit() else key
    return process(songs[key], ons.get(okey), md)


def show(num, songs, ons):
    ev, info = run_one(str(num), songs, ons)
    print(json.dumps(info, ensure_ascii=False))
    if not ev:
        return
    toks = [tokenize_verse(v) for v in songs[str(num)]['verses']]
    only_v = int(sys.argv[sys.argv.index('--verse') + 1]) if '--verse' in sys.argv else None
    prev = None
    for v, l, w, cs, ce, a, b, t0, ftxt in ev:
        if only_v is not None and v != only_v:
            continue
        if (v, l) != prev:
            print(f'  v{v} l{l}:')
            prev = (v, l)
        tok = toks[v][l][w]
        print(f'    {tok:<18} {tok[cs:ce]:<8} {a:>7}-{b:<7} ms   (FR "{ftxt}", MIDI {t0:.2f}s)')


def main():
    songs, ons = load()
    if '--show' in sys.argv:
        args = sys.argv[sys.argv.index('--show') + 1:]
        skip = {i + 1 for i, x in enumerate(args) if x == '--verse'}
        for a in [x for i, x in enumerate(args) if not x.startswith('--') and i not in skip]:
            show(a, songs, ons)
        return
    hymns, qual = {}, {}
    keys = sorted(set(key_of(k) for k in ons) | set(songs), key=lambda x: (int(re.match(r'\d+', x).group()), x))
    for key in keys:
        if key not in songs:
            qual[key] = dict(quality=0.0, reason='no lyrics in songs.json')
            continue
        try:
            ev, info = run_one(key, songs, ons)
        except Exception as ex:
            ev, info = None, dict(quality=0.0, reason=f'error: {ex!r}')
        qual[key] = info
        if ev and info['quality'] >= QUALITY_THRESHOLD:
            hymns[key] = {'quality': round(info['quality'], 2), 'events': [e[:7] for e in ev]}
    problems, missing = validate(hymns, songs)
    if problems:
        print(f'VALIDATION: {len(problems)} problems, e.g. {problems[:5]}')
    else:
        print('validation ok: ranges inside tokens, per-occurrence coverage complete, sorted')
    print(f'{len(missing)} sung tokens without events in included hymns (unmatched lines/verses)')
    tms = [q['time_map'] for q in qual.values() if 'time_map' in q]
    a_ = np.array([t['a'] for t in tms]); b_ = np.array([t['b'] for t in tms])
    print(f'time map: scale median {np.median(a_):.5f} [{a_.min():.5f}..{a_.max():.5f}], '
          f'offset median {np.median(b_):.3f}s [{b_.min():.3f}..{b_.max():.3f}]')
    out = {'version': 2, 'generatedAt': GENERATED_AT, 'hymns': hymns}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, separators=(',', ':'), ensure_ascii=False)
    with open(QOUT, 'w', encoding='utf-8') as f:
        json.dump(qual, f, ensure_ascii=False, indent=0)
    print(f'{len(hymns)} / {len(qual)} hymns written (threshold {QUALITY_THRESHOLD})')


if __name__ == '__main__':
    main()
