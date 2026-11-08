#!/usr/bin/env python3
"""Karaoke syllable timing (lyricTiming.json version 2) for the HEC hymns (Kinyarwanda) from piano-render onsets.

python3 align.py            -> writes lyricTiming.json (+ quality.json used by report.md)
python3 align.py --show 7   -> print word/time table for hymn 7 (no files written)

Inputs (read-only): ../repo/src/songs.json, onsets.json.
See report.md for the method.
"""
import json, re, sys, math, unicodedata, itertools, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SONGS = os.path.join(HERE, '..', 'repo', 'src', 'songs.json')
ONSETS = os.path.join(HERE, 'onsets.json')
FEAT = os.path.join(HERE, '..', 'mel', 'feat', 'hec_{}.npz')
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


# ---------------------------------------------------------------- audio
def find_period(t, nv):
    """Period of the repeated (per-verse) music: shift that maps onsets onto onsets."""
    t0, span = t[0], t[-1] - t[0]
    best = (0.0, None)
    for j in range(1, len(t)):
        P = t[j] - t0
        if not (0.7 * span / nv < P < 1.3 * span / max(nv - 1, 1)):
            continue
        sh = t + P
        m = sh < t[-1] + 0.05
        if m.sum() < 5:
            continue
        idx = np.clip(np.searchsorted(t, sh[m]), 1, len(t) - 1)
        d = np.minimum(np.abs(t[idx] - sh[m]), np.abs(t[idx - 1] - sh[m]))
        sc = float((d < 0.04).mean())
        if sc > best[0] + 1e-9:
            best = (sc, P)
    return best


def segment(t, nv, dur):
    """-> list of (start, end) per verse, confidence, note"""
    if nv == 1:
        return [(t[0] - 0.15, dur)], 0.9, 'single verse'
    sc, P = find_period(t, nv)
    if P is not None:
        reps = (t[-1] - t[0]) / P
        nrep = int(math.floor(reps)) + 1
        if nrep == nv and sc >= 0.8:
            segs = [(t[0] + k * P - 0.15, t[0] + (k + 1) * P - 0.15) for k in range(nv)]
            segs[-1] = (segs[-1][0], dur)
            return segs, min(1.0, sc), f'periodic P={P:.2f}s match={sc:.2f}'
        note = f'period P={P:.2f}s match={sc:.2f} gives {nrep} repeats for {nv} verses'
    else:
        note = 'no period found'
    # fallback: nv-1 largest gaps
    g = np.diff(t)
    idx = sorted(np.argsort(g)[::-1][:nv - 1])
    bounds = [t[0] - 0.05] + [t[i + 1] - 0.05 for i in idx] + [dur]
    segs = list(zip(bounds[:-1], bounds[1:]))
    gs = np.sort(g)[::-1]
    sep = gs[nv - 2] / max(gs[nv - 1], 1e-3)
    lens = np.array([b - a for a, b in segs[:-1]]) if nv > 2 else np.array([1.0])
    eq = 1 - min(1, lens.std() / max(lens.mean(), 1e-3) * 3)
    conf = 0.5 * min(1, (sep - 1) / 1.0) * eq
    return segs, conf, 'gap fallback; ' + note


# ---------------------------------------------------------------- repetition
def dominant_repeat(M):
    """Keep only the equivalences of the most common shift (the A-A repeat of the tune)."""
    cnt = {}
    for x, ys in M.items():
        for y in ys:
            if y > x:
                cnt[y - x] = cnt.get(y - x, 0) + 1
    if not cnt or max(cnt.values()) < 8:
        return {}, 0
    d = max(cnt, key=cnt.get)
    out = {}
    for x, ys in M.items():
        if x + d in ys:
            out.setdefault(x, set()).add(x + d)
            out.setdefault(x + d, set()).add(x)
    return out, d


def onset_chroma(tt, feat):
    if feat is None:
        return None
    C = feat['chroma'].astype(float)
    hop = 512 / 8000
    out = []
    for x in tt:
        f = int((x + 0.03) / hop)
        v = C[f:f + 2].mean(0) if f < len(C) else np.zeros(12)
        nv_ = np.linalg.norm(v)
        out.append(v / nv_ if nv_ > 0 else v)
    return np.array(out)


def repeat_map(tt, V, n=6):
    """Pairs of musically equivalent onsets inside one verse: passages of >= n onsets with the
    same chroma and rhythm (AABA-type tunes). Returns {onset index: set(equivalent indices)}."""
    m = len(tt)
    M = {}
    if V is None or m < 2 * n:
        return M
    ioi = np.diff(tt)
    S = V @ V.T
    for a in range(m - n):
        for b in range(a + n, m - n + 1):
            if np.mean(S[np.arange(a, a + n), np.arange(b, b + n)]) < 0.93:
                continue
            if np.sum(np.abs(ioi[a:a + n - 1] - ioi[b:b + n - 1]) < 0.06) < n - 2:
                continue
            for k in range(n):
                M.setdefault(a + k, set()).add(b + k)
                M.setdefault(b + k, set()).add(a + k)
    return M


# ---------------------------------------------------------------- alignment
A_MATCH = 1.0     # syllable on a weak onset
B_SKIP = 1.0      # strong onset left without syllable (melisma / extra note)
SKIP_EPS = 0.06
LEAD_W, TRAIL_W = 1.5, 0.4
C_LINEEND = 1.6   # line-final syllable that is not held
F_GAPCROSS = 1.2  # a long rest/held note in the middle of a line
G_LINESTART = 0.35
E_LONG = 0.25
K_MAX = 10
ELIDE_COST = {1: 0.25, 2: 0.6}  # vowel elision across a word boundary (2 = across punctuation)
R_LINESTART = 1.0  # line start not on the start of a repeated passage (only where the tune has one)
H_PRIOR = 1.5     # line start away from the cross-verse consensus
MISS_COST = 1.3   # two syllables on one detected onset (missed onset)


def melody_prob(strength, med):
    r = strength / med
    return float(np.clip((r - 0.45) / 0.4, 0, 1))


def align_verse(nsyl, syl, tt, qq, gb, seg_start, seg_end, beat, prior=None, pref=None):
    """DP over syllables x onsets (monotone; onsets may be skipped = melisma / inner voice;
    a syllable may share the previous syllable's onset = vowel elision across words or a
    missed onset). prior: {sung line index: expected start time relative to seg_start}.
    Returns (cost, times, path, modes, stats) or None."""
    m = len(tt)
    n = nsyl
    if n == 0 or m == 0:
        return None
    skip = SKIP_EPS + B_SKIP * qq
    cs = np.concatenate([[0], np.cumsum(skip)])  # skipsum(a..b) = cs[b+1]-cs[a]
    INF = 1e18
    cost = np.full((n, m), INF)
    back = np.full((n, m), -1, dtype=int)
    mode = np.zeros((n, m), dtype=np.int8)
    long_gap = 1.8 * beat
    jj = np.arange(m)
    base = A_MATCH * (1 - qq)
    gapcross = np.where(gb >= long_gap, F_GAPCROSS * (0.6 + 1.4 * np.minimum((gb / beat - 1.8) / 1.5, 1)), 0.0)
    lsgap = G_LINESTART * (1 - np.clip((gb / beat - 1.0) / 1.5, 0, 1))
    rel = tt - seg_start
    ioi_next = np.append(np.diff(tt), max(seg_end - tt[-1], 0.0))
    # a missed onset is more plausible inside a long inter-onset interval
    misscost = MISS_COST * np.clip(1.6 - 0.5 * (ioi_next / beat - 0.8), 0.6, 1.8)

    repc = 0.0 if pref is None else pref  # per-onset extra cost for a line start

    def node(i):
        if syl[i]['lfirst']:
            c = base + (lsgap if i > 0 else 0.0) + repc
            if prior is not None and syl[i]['line'] in prior:
                c = c + H_PRIOR * np.minimum(1.0, np.abs(rel - prior[syl[i]['line']]) / (0.6 * beat))
            return c
        return base + gapcross

    def durcost(i, D):
        if syl[i]['llast']:
            return C_LINEEND * np.maximum(0.0, 1 - D / (1.6 * beat))
        return E_LONG * np.maximum(0.0, D / beat - 3)

    cost[0] = node(0) + LEAD_W * cs[:m]
    for i in range(1, n):
        e = syl[i]['elide']
        nd = node(i)
        best = np.full(m, INF)
        bj = np.full(m, -1)
        md = np.zeros(m, dtype=np.int8)
        prev = cost[i - 1]
        for d in range(1, K_MAX + 1):
            if d >= m:
                break
            jp = jj[d:] - d
            c = prev[jp] + (cs[jj[d:]] - cs[jp + 1]) + durcost(i - 1, tt[d:] - tt[:-d]) + nd[d:]
            better = c < best[d:]
            best[d:][better] = c[better]
            bj[d:][better] = jp[better]
        if not syl[i]['lfirst']:
            share_c = ELIDE_COST[e] if e else misscost
            c = prev + share_c
            better = c < best
            best[better] = c[better]
            bj[better] = jj[better]
            md[better] = 1 if e else 2
        ok = best < INF / 2
        cost[i, ok] = best[ok]
        back[i, ok] = bj[ok]
        mode[i, ok] = md[ok]
    fin = cost[n - 1] + TRAIL_W * (cs[m] - cs[1:]) + durcost(n - 1, seg_end - tt)
    j = int(np.argmin(fin))
    if fin[j] >= INF / 2:
        return None
    total = float(fin[j])
    path, modes = [j], [int(mode[n - 1, j])]
    for i in range(n - 1, 0, -1):
        j = int(back[i, j])
        path.append(j)
        modes.append(int(mode[i - 1, j]))
    path, modes = path[::-1], modes[::-1]
    modes[0] = 0
    # mode[] stores how syllable i reached onset j; rebuild modes per syllable
    modes = [0] + [int(mode[i, path[i]]) for i in range(1, n)]
    # syllable times
    times = np.array([tt[j] for j in path], dtype=float)
    i = 0
    while i < n:
        k = i + 1
        while k < n and path[k] == path[i]:
            k += 1
        grp = list(range(i, k))
        miss = [x for x in grp[1:] if modes[x] == 2]
        if miss:
            jn = path[i] + 1
            t_next = tt[jn] if jn < m else min(seg_end, tt[path[i]] + beat)
            step = (t_next - tt[path[i]]) / (len(grp) if len(grp) > 1 else 2)
            for r, x in enumerate(grp):
                times[x] = tt[path[i]] + r * step if modes[x] == 2 or r == 0 else times[x - 1]
        i = k
    # stats
    used = np.zeros(m, bool)
    used[path] = True
    strong = qq.sum()
    own = [p for p, md in zip(path, modes) if md == 0]
    matched_q = float(qq[own].mean())
    first, last = path[0], path[-1]
    inner = np.zeros(m, bool)
    inner[first:last + 1] = True
    skipped_strong = float(qq[inner & ~used].sum())
    ll = [i for i in range(n - 1) if syl[i]['llast']]
    held = [times[i + 1] - times[i] >= 1.4 * beat for i in ll]
    crossings = sum(1 for i in range(1, n) if not syl[i]['lfirst'] and modes[i] == 0 and gb[path[i]] >= 2.2 * beat)
    stats = dict(n=n, m=m, strong=float(strong), matched_q=matched_q,
                 skipped_strong=skipped_strong, anchor=float(np.mean(held)) if held else 0.8,
                 crossings=crossings, lead=float(qq[:first].sum()), cost=total,
                 elided=sum(1 for x in modes if x == 1), missed=sum(1 for x in modes if x == 2),
                 n_eff=n - sum(1 for x in modes if x == 1))
    return total, times, path, modes, stats


def verse_quality(st):
    ratio = st['n_eff'] / max(st['strong'], 1e-3)
    fit = max(0.0, 1 - abs(math.log(max(ratio, 1e-3))) * 1.6)   # ratio 1 -> 1, 0.65/1.5 -> ~0.33
    melis = max(0.0, 1 - st['skipped_strong'] / st['n'] * 2.0)
    cross = max(0.0, 1 - st['crossings'] / max(1, st['n'] / 8))
    lead = 1.0 if st['lead'] < 1.5 else 0.6
    lead *= max(0.0, 1 - 2.5 * st['missed'] / st['n'])
    return (0.25 * st['matched_q'] + 0.25 * st['anchor'] + 0.2 * fit + 0.15 * melis + 0.15 * cross) * lead


# ---------------------------------------------------------------- per hymn
def word_end_times(events_raw, env, seg_ends):
    """events_raw: list of dicts with start, line_last(bool), last_syl_t, seg_end. Fill 'end'."""
    env = np.asarray(env)
    fr = 0.05
    for k, e in enumerate(events_raw):
        nxt = next((x['start'] for x in events_raw[k + 1:] if x['start'] > e['start'] + 1e-6), None)
        lim = nxt if nxt is not None and nxt <= e['seg_end'] + 1e-6 else e['seg_end']
        if e['line_last']:
            ts = e['last_syl_t']
            a = int(ts / fr)
            ref = env[a:a + 6].max() if a < len(env) else 0
            b = int((ts + 0.25) / fr)
            stop = min(int(lim / fr), len(env))
            end = lim
            for f in range(b, stop):
                if env[f] < 0.2 * ref:
                    end = f * fr
                    break
            end = min(end, ts + 8.0)
            e['end'] = max(end, e['start'] + 0.1)
        else:
            e['end'] = lim if nxt is not None else min(e['seg_end'], e['last_syl_t'] + 2.0)
    return events_raw


def process(song, ons, feat=None):
    verses = song['verses']
    nv = len(verses)
    toks = [tokenize_verse(v) for v in verses]
    lines = [[Line(vi, li, w) for li, w in enumerate(vt)] for vi, vt in enumerate(toks)]
    on = ons['onsets']
    t = np.array([o[0] for o in on])
    s = np.array([o[1] for o in on])
    dur = ons['dur']
    segs, segconf, segnote = segment(t, nv, dur)
    beat0 = float(np.percentile(np.diff(t), 60)) if len(t) > 2 else 0.6
    # The detector misses the very first chord at the file start (no previous frame; the
    # render even seems to start a few ms into it). Later verses show it as an onset X s
    # before the periodic start. Re-insert it for verse 1 and move every verse start back by X.
    env = np.asarray(ons['env'], dtype=float)
    head = None
    if len(env) and env[:max(1, int(t[0] / 0.05))].max(initial=0) > 0.15 * env.max() and t[0] > 0.25:
        X = None
        if nv > 1 and segnote.startswith('periodic'):
            b2 = segs[1][0] + 0.15
            cand = [j for j in range(1, len(t)) if b2 - 4.5 * beat0 < t[j] < b2 - 0.1
                    and t[j] - t[j - 1] >= 1.2 * beat0]
            if cand:
                X = b2 - t[cand[-1]]
        if X is None:
            X = t[0] - max(0.0, np.argmax(env > 0.15 * env.max()) * 0.05)
        head = max(0.0, t[0] - X)
        t = np.concatenate([[head], t])
        s = np.concatenate([[np.percentile(s, 75)], s])
        segs = [(a - X, b - X) for a, b in segs]
        segs[0] = (min(segs[0][0], head - 0.05), segs[0][1])
        segs[-1] = (segs[-1][0], dur)
        segnote += f'; first chord re-inserted at {head:.2f}s (verse lead-in {X:.2f}s)'

    beat = float(np.percentile(np.diff(t), 60)) if len(t) > 2 else 0.6
    med = float(np.median(s))
    qq_all = np.array([melody_prob(x, med) for x in s])
    gb_all = np.concatenate([[99.0], np.diff(t)])

    # chorus printed only under verse 1?
    lc = [len(x) for x in lines]
    chorus = []
    if nv > 1:
        other = int(np.median(lc[1:]))
        if lc[0] - other >= 2:
            chorus = lines[0][other:]
    has_end_marks = any(L.end_mark > 1 for vl in lines for L in vl)
    bis_opts = ['line', 'couplet', 'none'] if has_end_marks else ['line']
    ch_opts = [False, True] if chorus else [False]

    seg_on = []
    for a, b in segs:
        idx = np.where((t >= a) & (t < b))[0]
        seg_on.append(idx)

    V = onset_chroma(t, feat)
    rmaps = [dominant_repeat(repeat_map(t[idx], None if V is None else V[idx])) for idx in seg_on]
    rstarts = []
    for (dm, d), idx in zip(rmaps, seg_on):
        p = np.zeros(len(idx), bool)
        for x in dm:
            if x + d in dm.get(x, ()) and not (x - 1 in dm and x - 1 + d in dm[x - 1]):
                p[x] = True
                if x + d < len(idx):
                    p[x + d] = True
        rstarts.append(np.where(p, 0.0, R_LINESTART) if p.any() else None)

    def run(bm, ch, priors=None, prefs=None):
        tot, res = 0.0, []
        for vi in range(nv):
            extra = chorus if (ch and vi > 0 and lc[vi] < lc[0]) else ()
            seq = sung_sequence(lines[vi], bm, extra)
            syl, words = to_syllables(seq)
            idx = seg_on[vi]
            r = align_verse(len(syl), syl, t[idx], qq_all[idx], gb_all[idx], segs[vi][0], segs[vi][1],
                            beat, priors, rstarts[vi] if prefs is None else prefs[vi])
            if r is None:
                return None
            tot += r[0]
            res.append((syl, words, idx, r))
        return tot, res

    def line_starts(res, vi):
        syl, _, _, r = res[vi]
        times = r[1]
        return {syl[i]['line']: times[i] - segs[vi][0] for i in range(len(syl)) if syl[i]['lfirst']}

    best = None
    for bm, ch in itertools.product(bis_opts, ch_opts):
        out = run(bm, ch)
        if out and (best is None or out[0] < best[0]):
            best = (out[0], bm, ch, out[1])
    info = dict(nv=nv, onsets=len(t), beat=round(beat, 3), seg=segnote, segconf=round(segconf, 3))
    if best is None:
        info.update(quality=0.0, reason='no alignment')
        return None, info
    tot, bm, ch, res = best
    # cross-verse consistency: same music -> same relative line starts
    agree = None
    if nv > 1:
        ls = [line_starts(res, vi) for vi in range(nv)]
        nlines = {len(x) for x in ls}
        if len(nlines) == 1:
            L = nlines.pop()
            mat = np.array([[x[l] for l in range(L)] for x in ls])
            med_ = np.median(mat, axis=0)
            agree = float((np.abs(mat - med_) < 0.35 * beat).mean())
            if agree < 1.0:
                # pass 2: try each verse's line starts as the shared template
                cands = []
                for vi in range(nv):
                    out = run(bm, ch, priors=ls[vi])
                    if out:
                        cands.append(out)
                if cands:
                    tot, res = min(cands, key=lambda x: x[0])
        else:
            agree = 0.5  # different line structure per verse: no check possible
    info['agree'] = None if agree is None else round(agree, 2)

    # Repeated passage of the tune (e.g. lines 1-2 == lines 3-4): the lines that start inside
    # copy 1 and copy 2 must start at equivalent onsets. Let one copy be the template for the
    # other (both ways, keep the cheaper), like the cross-verse template above.
    def region_lines(res, vi):
        dm, d = rmaps[vi]
        if not dm:
            return None
        syl, _, _, r = res[vi]
        xs = sorted(x for x in dm if x + d in dm[x])
        r0 = r1 = xs[0]
        for x in xs[1:]:            # first contiguous run (gaps of <= 2 onsets allowed)
            if x - r1 > 3 or x >= r0 + d:
                break
            r1 = x
        r1 += 1                     # exclusive end
        st = {syl[i]['line']: r[2][i] for i in range(len(syl)) if syl[i]['lfirst']}
        L1 = sorted(l for l, j in st.items() if r0 <= j < r1)
        L2 = sorted(l for l, j in st.items() if r0 + d <= j < r1 + d)
        return st, d, L1, L2

    def rep_cons(res):
        hit = tot_ = 0
        for vi in range(nv):
            rl = region_lines(res, vi)
            if not rl:
                continue
            st, d, L1, L2 = rl
            S = set(st.values())
            for l in L1:
                tot_ += 1
                hit += (st[l] + d) in S
            for l in L2:
                tot_ += 1
                hit += (st[l] - d) in S
        return (hit / tot_ if tot_ >= 2 else None)

    repc1 = rep_cons(res)
    if repc1 is not None and repc1 < 1:
        new_res = []
        for vi in range(nv):
            rl = region_lines(res, vi)
            syl, words, idx, r0_ = res[vi]
            if not rl or not (rl[2] or rl[3]):
                new_res.append(res[vi])
                continue
            st, d, L1, L2 = rl
            tv = t[idx]
            m = len(idx)
            dm = rmaps[vi][0]
            xs = sorted(x for x in dm if x + d in dm[x])
            r0 = xs[0]
            r1 = max(j for j in [r0] + [x for x in xs if x < r0 + d])  # same run as region_lines
            # recompute exclusive end exactly as region_lines does
            r1 = r0
            for x in xs[1:]:
                if x - r1 > 3 or x >= r0 + d:
                    break
                r1 = x
            r1 += 1
            cands = []
            for src, dst, sign, reg_end in ((L1, L2, 1, r1 + d), (L2, L1, -1, r1)):
                E = sorted(st[l] + sign * d for l in src if 0 <= st[l] + sign * d < m)
                pr = {l: tv[st[l]] - segs[vi][0] for l in src}
                dl = list(dst)
                nxt = (dst[-1] + 1) if dst else ((src[-1] + 1) if sign == 1 else None)
                while len(dl) < len(E) and nxt is not None and nxt in st and nxt not in pr:
                    dl.append(nxt)
                    nxt += 1
                for k, l in enumerate(dl):
                    if k < len(E):
                        pr[l] = tv[E[k]] - segs[vi][0]
                    elif reg_end < m:
                        pr[l] = tv[reg_end] - segs[vi][0]
                rr = align_verse(len(syl), syl, tv, qq_all[idx], gb_all[idx], segs[vi][0], segs[vi][1],
                                 beat, pr, rstarts[vi])
                if rr:
                    cands.append(rr)
            if cands:
                new_res.append((syl, words, idx, min(cands, key=lambda x: x[0])))
            else:
                new_res.append(res[vi])
        cand_res = new_res
        if nv > 1 and agree is not None and agree != 0.5:
            ls = [line_starts(cand_res, vi) for vi in range(nv)]
            if len({len(x) for x in ls}) == 1:
                cc = [run(bm, ch, priors=ls[vi]) for vi in range(nv)]
                cc = [c for c in cc if c]
                if cc:
                    cand_res = min(cc, key=lambda x: x[0])[1]
        r2 = rep_cons(cand_res)
        if r2 is not None and r2 > repc1:
            res, repc1 = cand_res, r2
    info['rep_consistency'] = None if repc1 is None else round(repc1, 2)
    events, vq = [], []
    for vi, (syl, words, idx, (c, times, path, modes, st)) in enumerate(res):
        vq.append(verse_quality(st))
        raw = []
        seq = 0
        for k, (wv, wl, wwi, fs) in enumerate(words):
            if fs is not None:
                ls = fs
                while ls + 1 < len(syl) and not syl[ls + 1]['wfirst']:
                    ls += 1
                for i in range(fs, ls + 1):
                    raw.append(dict(v=wv, l=wl, w=wwi, cs=syl[i]['cs'], ce=syl[i]['ce'],
                                    start=float(times[i]), last_syl_t=float(times[i]),
                                    line_last=bool(syl[i]['llast']), seg_end=segs[vi][1], seq=i))
            else:
                # token with letters but no vowel (e.g. a lone "n'"): one event, merged
                # into the next sung syllable (or the previous one at a line end)
                nxt = next((w[3] for w in words[k + 1:] if w[3] is not None), None)
                if nxt is None:
                    nxt = next((w[3] for w in reversed(words[:k]) if w[3] is not None), None)
                tok = toks[wv][wl][wwi]
                raw.append(dict(v=wv, l=wl, w=wwi, cs=0, ce=len(tok), start=float(times[nxt]),
                                last_syl_t=float(times[nxt]), line_last=False, seg_end=segs[vi][1],
                                seq=nxt - 0.5))
        raw.sort(key=lambda e: (e['start'], e['seq']))
        word_end_times(raw, ons['env'], None)
        for e in raw:
            events.append([e['v'], e['l'], e['w'], e['cs'], e['ce'],
                           int(round(e['start'] * 1000)), int(round(e['end'] * 1000)),
                           vi * 100000 + e['seq']])
    events.sort(key=lambda e: (e[5], e[7]))
    events = [e[:7] for e in events]
    mq = float(np.mean(vq))
    q = segconf * (0.7 * mq + 0.3 * min(vq)) * (0.85 if agree is None else 0.55 + 0.45 * agree)
    if repc1 is not None:
        q *= 0.75 + 0.25 * repc1
    info.update(quality=round(q, 3), verse_q=[round(x, 2) for x in vq], bis=bm, chorus_appended=ch,
                syl_per_verse=[r[3][4]['n'] for r in res],
                elided=[r[3][4]['elided'] for r in res],
                missed=[r[3][4]['missed'] for r in res],
                strong_per_verse=[round(r[3][4]['strong'], 1) for r in res],
                anchor=[round(r[3][4]['anchor'], 2) for r in res])
    return events, info


def load():
    songs = {str(x['song_number']): x for x in json.load(open(SONGS, encoding='utf-8'))}
    ons = json.load(open(ONSETS))
    return songs, ons


def load_feat(k):
    p = FEAT.format(k)
    if not os.path.exists(p):
        return None
    d = np.load(p)
    return {'chroma': d['chroma']}


def key_of(k):
    return str(int(k)) if k.isdigit() else k


def show(num, songs, ons):
    k = next(x for x in ons if key_of(x) == str(num))
    song = songs[str(num)]
    ev, info = process(song, ons[k], load_feat(k))
    print(json.dumps(info, ensure_ascii=False))
    if not ev:
        return
    toks = [tokenize_verse(v) for v in song['verses']]
    # line-start table (first event of each (verse,line) occurrence), relative to verse start
    starts = {}
    for v, l, w, cs, ce, a, b in ev:
        starts.setdefault(v, [])
        if not starts[v] or starts[v][-1][0] != l:
            starts[v].append((l, a))
    print('line starts rel. to verse start (s):')
    for v in starts:
        v0 = starts[v][0][1]
        print(f'  v{v}: ' + ' '.join(f'{(a - v0)/1000:6.2f}' for l, a in starts[v]))
    if '--table' not in sys.argv:
        return
    only_v = None
    if '--verse' in sys.argv:
        only_v = int(sys.argv[sys.argv.index('--verse') + 1])
    prev_line = None
    for v, l, w, cs, ce, a, b in ev:
        if only_v is not None and v != only_v:
            continue
        if (v, l) != prev_line:
            print(f'\n  v{v} l{l}:')
            prev_line = (v, l)
        tok = toks[v][l][w]
        print(f'    {tok:<18} {tok[cs:ce]:<8} {a:>7}-{b:<7} ms')
    print()


def validate(hymns, songs):
    """Every event's range lies inside its token; for every sung occurrence of a token the
    syllable ranges are contiguous and cover it exactly once; events sorted by start."""
    problems = []
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
                        problems.append((key, 'token without events', v, l, w, tok))
                    if not sung and (v, l, w) in occ:
                        problems.append((key, 'marker/punctuation has events', v, l, w, tok))
    return problems


def main():
    songs, ons = load()
    if '--show' in sys.argv:
        args = sys.argv[sys.argv.index('--show') + 1:]
        skip = {i + 1 for i, x in enumerate(args) if x == '--verse'}
        for a in [x for i, x in enumerate(args) if not x.startswith('--') and i not in skip]:
            show(a, songs, ons)
        return
    hymns, qual = {}, {}
    for k in sorted(ons, key=lambda x: (int(re.match(r'\d+', x).group()), x)):
        key = key_of(k)
        if key not in songs:
            qual[key] = dict(quality=0.0, reason='no lyrics in songs.json')
            continue
        try:
            ev, info = process(songs[key], ons[k], load_feat(k))
        except Exception as ex:  # keep going, flag it
            ev, info = None, dict(quality=0.0, reason=f'error: {ex!r}')
        qual[key] = info
        if ev and info['quality'] >= QUALITY_THRESHOLD:
            hymns[key] = {'quality': round(info['quality'], 2), 'events': ev}
    problems = validate(hymns, songs)
    if problems:
        print(f'VALIDATION: {len(problems)} problems, e.g. {problems[:5]}')
    else:
        print('validation ok: ranges inside tokens, per-occurrence coverage complete, sorted')
    out = {'version': 2, 'generatedAt': GENERATED_AT, 'hymns': hymns}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, separators=(',', ':'), ensure_ascii=False)
    with open(QOUT, 'w', encoding='utf-8') as f:
        json.dump(qual, f, ensure_ascii=False, indent=0)
    print(f'{len(hymns)} / {len(qual)} hymns written (threshold {QUALITY_THRESHOLD})')


if __name__ == '__main__':
    main()
