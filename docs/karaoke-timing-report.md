# HEC lyric timing: method and quality report

Generated 2026-11-08 by `python3 align.py` (about 20 s). Outputs, all in `/home/claude/hec/timing/`:

- `lyricTiming.json`: what the app loads. Contains only hymns with quality >= 0.6 (`QUALITY_THRESHOLD` in align.py).
- `quality.json`: diagnostics for every hymn (segmentation, scores, chosen repeat mode, elision and missed-onset counts).
- `python3 align.py --show 7 [--table]`: prints line start offsets per verse, and with `--table` the word-to-time table. Nothing is written.

**Result: 249 of 272 audio files included.** 22 hymns are excluded as low quality, plus 200bis, which has audio but no lyrics in songs.json.

## Method

1. **Tokenisation** is the same as the app's: lines are trimmed and empty ones dropped, a leading `N.` is stripped, then the line is split on whitespace. Event indices refer to these tokens. Repeat-marker tokens get no event: `(bis)`, `(x2)`, `(2)`, `(ter)`, `(3)`, `(x3)`, `(etc)`. Punctuation-only tokens get no event either.
2. **Syllables.** Apostrophes are deleted, because the elided vowel is already missing from the spelling (`Wow'utuye` gives wo-wu-tu-ye). After that, every vowel letter counts as one syllable (CV, CCV, NCV; y and w count as consonants). There is one optional extra rule. When a word ends in a vowel and the next word in the line starts with one, singers usually merge the two (`Urondora ibyo mu ijuru` is printed as `Urondor'ibyo mw'ijuru` in the Growing in Grace book). The aligner may merge the two syllables onto one note for a small cost, or a larger cost across a comma.
3. **Repeats.**
   - A marker in the middle of a line repeats the words before it (hymns 41, 138, 271).
   - A marker at the end of a line repeats either that line or the couplet. The choice is made once per hymn, by the lowest total alignment cost across the options line, couplet and none.
   - Some hymns print the refrain only under verse 1 (101, 110, 125, 240, 256, 263, 265). For these the aligner also tries appending that refrain to every later verse. The events then point at verse 0's refrain lines.
4. **Verse segmentation.** The MIDI plays the same music for every verse, so I search for the time shift P that maps onsets onto onsets. It typically matches 100% of onsets within 40 ms. Verse k then starts at t0 + kP. If P is missing, matches less than 80% of onsets, or gives a number of repeats different from the number of verses, the script falls back to the largest gaps with low confidence. In practice every hymn on the fallback path ended up excluded.
5. **Missing first chord.** Every render starts already sounding: the envelope is non-zero from 0 s, but the first onset is at about 0.5 to 1.4 s. In verses 2 and later, the same chord shows up as an onset 0.4 to 1.5 s before the periodic start. That chord is the verse's first note: chroma shows it equals the pickup of the repeated phrase, as at 18.04 s in hymn 7. So the script adds the chord back at 0.00 s and moves every verse start back by that lead-in.
6. **Alignment.** Each verse runs a monotone dynamic-programming alignment of syllables to onsets.
   - Onset strength, relative to the hymn median, gives a melody-note likelihood. Weak onsets are cheap to skip (inner voices, ties).
   - Skipping a strong onset costs a melisma.
   - A syllable on a weak onset costs extra.
   - A line-final syllable that is not held about 1.6 beats or longer costs extra.
   - A long rest or held note in the middle of a line costs extra.
   - A line start without a gap before it costs a little.
   - Two syllables can share one onset (a vowel merge, or a missed onset). A missed onset is cheaper inside a long interval, and its syllable is timed by interpolation.
   - The top-pitch estimate is not used: it is unreliable in sustained SATB, and in hymn 7 it jumps an octave inside one phrase.
7. **Consistency passes.**
   - (a) Across verses: the music is identical, so line starts must sit at the same offset from the verse start. Each verse's line starts are tried as a shared template for all verses, and the cheapest total wins.
   - (b) Within a verse: onsets with matching chroma and rhythm over 6 or more notes mark a repeated passage, for example lines 1-2 = lines 3-4. A line start is encouraged where a repeat begins, and the two copies are aligned so their line starts correspond.
8. **Word times.** A word starts at its first syllable. It ends at the next later word start. For a line-final word, the end is cut short if the envelope drops below 20% of the note's peak (a real rest). In practice the piano sustain seldom drops that far, so line-final words usually last until the next line starts.
9. **Quality** (0 to 1) is a product of these terms:
   - Segmentation confidence (period match, or 0.9 for single-verse hymns).
   - Per-verse alignment score: syllables on strong onsets, held line ends, syllable to strong-onset ratio, few skipped strong onsets, no line crossing a long gap, few missed onsets. This is 0.7 of the mean plus 0.3 of the worst verse.
   - Agreement of the independent pass-1 line starts across verses: factor 0.55 + 0.45 x agreement, or 0.85 when there is only one verse.
   - Repeated-passage consistency: factor 0.75 + 0.25 x consistency.

   This score measures internal consistency, not accuracy against a score. There is no ground truth here.

## Sanity checks (hymns 1-8)

| hymn | q | notes |
|---|---|---|
| 1 | 0.64 | 2 verses with a 3-line refrain, dotted rhythm with no clear rests. Independent verses disagreed on 1/3 of line starts (agreement 0.67); after the consistency passes, lines 1-3 and 4-6 follow the repeated melody. Borderline. |
| 2 | 0.96 | clean |
| 3 | 0.74 | single verse, so no cross-verse check (capped at 0.85 x score) |
| 4 | 0.64 | verse 1 has 5 printed lines and verses 2-3 have 6, so the cross-verse check isn't possible. The `(bis)` on line 1 is sung as a line repeat. Borderline. |
| 5 | 0.91 | 8 lines, 2-3 missed onsets per verse interpolated |
| 6 | 0.88 | clean |
| 7 | 0.83 | 5 verses x 6 lines. Line starts are identical in all verses: 0.00, 8.97, 18.04, 27.11, 35.35, 45.24 s after the verse start, at a beat of 0.752 s, with 6.0 s between verses. Lines 1-2 and 3-4 are the same melody (chroma 0.996) and start on the same notes. Open doubt: line 5 may really start one note later (36.18 instead of 35.35). |
| 8 | 0.84 | the `(bis)` at the end of each verse is sung as the last couplet (chosen automatically), giving 8 sung lines per verse |

## Per-hymn quality

agree = independent cross-verse line-start agreement (0.5 means the verses have different line counts, so it can't be checked). rep = repeated-passage consistency.

| hymn | quality | included | verses | agree | rep | note |
|---|---|---|---|---|---|---|
| 1 | 0.64 | yes | 2 | 0.67 | 0.86 |  |
| 2 | 0.96 | yes | 2 | 1.0 | 1.0 |  |
| 3 | 0.74 | yes | 1 | – | 1.0 |  |
| 4 | 0.64 | yes | 3 | 0.5 | 0.94 |  |
| 5 | 0.91 | yes | 5 | 1.0 | 1.0 |  |
| 6 | 0.88 | yes | 2 | 0.75 | 1.0 |  |
| 7 | 0.83 | yes | 5 | 0.97 | 0.8 |  |
| 8 | 0.84 | yes | 3 | 0.96 | 0.8 | (bis)=couplet |
| 9 | 0.85 | yes | 3 | 0.88 | 1.0 |  |
| 10 | 0.73 | yes | 3 | 0.5 | – |  |
| 11 | 0.91 | yes | 6 | 1.0 | – |  |
| 12 | 0.73 | yes | 1 | – | – |  |
| 13 | 0.21 | no | 4 | 0.95 | – | period P=55.77s match=0.22 gives 4 repeats for 4 verses |
| 14 | 0.93 | yes | 4 | 1.0 | – |  |
| 15 | 0.85 | yes | 4 | 1.0 | 1.0 |  |
| 16 | 0.87 | yes | 4 | 1.0 | 1.0 |  |
| 17 | 0.65 | yes | 2 | 0.5 | – | (bis) markers not repeated |
| 18 | 0.81 | yes | 3 | 1.0 | 1.0 |  |
| 19 | 0.82 | yes | 3 | 0.96 | 1.0 |  |
| 20 | 0.92 | yes | 5 | 1.0 | – |  |
| 21 | 0.58 | no | 5 | 0.92 | 0.0 |  |
| 22 | 0.51 | no | 3 | 0.5 | 0.5 | (bis) markers not repeated |
| 23 | 0.68 | yes | 2 | 1.0 | 0.5 | (bis) markers not repeated |
| 24 | 0.92 | yes | 4 | 1.0 | 1.0 |  |
| 25 | 0.86 | yes | 3 | 1.0 | 1.0 |  |
| 26 | 0.66 | yes | 4 | 0.5 | – | (bis) markers not repeated |
| 27 | 0.79 | yes | 4 | 1.0 | – |  |
| 28 | 0.84 | yes | 3 | 1.0 | – |  |
| 29 | 0.21 | no | 4 | 0.9 | – | period P=55.77s match=0.22 gives 4 repeats for 4 verses (bis) markers not repeated |
| 30 | 0.87 | yes | 4 | 1.0 | – |  |
| 31 | 0.97 | yes | 6 | 1.0 | 1.0 |  |
| 32 | 0.74 | yes | 4 | 0.94 | 1.0 |  |
| 33 | 0.81 | yes | 3 | 1.0 | – |  |
| 34 | 0.89 | yes | 4 | 1.0 | 1.0 | (bis) markers not repeated |
| 35 | 0.68 | yes | 3 | 1.0 | 0.0 |  |
| 36 | 0.68 | yes | 1 | – | – | (bis) markers not repeated |
| 37 | 0.68 | yes | 1 | – | – |  |
| 38 | 0.91 | yes | 3 | 1.0 | 1.0 |  |
| 39 | 0.88 | yes | 3 | 1.0 | 1.0 |  |
| 40 | 0.66 | yes | 1 | – | 1.0 |  |
| 41 | 0.90 | yes | 2 | 1.0 | – |  |
| 42 | 0.88 | yes | 4 | 1.0 | – |  |
| 43 | 0.91 | yes | 3 | 0.97 | 1.0 |  |
| 44 | 0.88 | yes | 4 | 0.97 | – |  |
| 45 | 0.82 | yes | 4 | 1.0 | 1.0 |  |
| 46 | 0.74 | yes | 5 | 0.9 | 1.0 |  |
| 47 | 0.86 | yes | 5 | 1.0 | 1.0 |  |
| 48 | 0.84 | yes | 3 | 0.96 | 1.0 |  |
| 49 | 0.83 | yes | 3 | 0.96 | 1.0 |  |
| 50 | 0.88 | yes | 3 | 1.0 | 1.0 |  |
| 51 | 0.81 | yes | 4 | 0.88 | 1.0 |  |
| 52 | 0.93 | yes | 4 | 1.0 | – |  |
| 53 | 0.94 | yes | 3 | 1.0 | – |  |
| 54 | 0.93 | yes | 4 | 1.0 | – |  |
| 55 | 0.86 | yes | 2 | 1.0 | 1.0 |  |
| 56 | 0.83 | yes | 3 | 0.93 | – |  |
| 57 | 0.93 | yes | 3 | 1.0 | – |  |
| 58 | 0.91 | yes | 3 | 1.0 | – |  |
| 59 | 0.91 | yes | 6 | 1.0 | 1.0 | (bis) markers not repeated |
| 60 | 0.89 | yes | 4 | 0.95 | – |  |
| 61 | 0.88 | yes | 3 | 0.93 | – |  |
| 62 | 0.87 | yes | 5 | 1.0 | – |  |
| 63 | 0.77 | yes | 3 | 1.0 | 1.0 |  |
| 64 | 0.88 | yes | 4 | 0.8 | 1.0 |  |
| 65 | 0.86 | yes | 4 | 0.94 | – |  |
| 66 | 0.81 | yes | 4 | 0.94 | 1.0 |  |
| 67 | 0.77 | yes | 3 | 0.92 | – |  |
| 68 | 0.71 | yes | 4 | 0.5 | 0.93 |  |
| 69 | 0.92 | yes | 3 | 1.0 | – |  |
| 70 | 0.87 | yes | 4 | 0.75 | 1.0 |  |
| 71 | 0.89 | yes | 7 | 0.96 | – |  |
| 72 | 0.78 | yes | 5 | 0.95 | – |  |
| 73 | 0.97 | yes | 3 | 1.0 | 1.0 |  |
| 74 | 0.16 | no | 3 | 0.92 | – | period P=65.29s match=0.23 gives 3 repeats for 3 verses |
| 75 | 0.89 | yes | 3 | 0.93 | – |  |
| 76 | 0.84 | yes | 6 | 0.93 | – |  |
| 77 | 0.86 | yes | 2 | 1.0 | 1.0 |  |
| 78 | 0.90 | yes | 3 | 0.92 | – |  |
| 79 | 0.76 | yes | 2 | 0.88 | 1.0 |  |
| 80 | 0.88 | yes | 4 | 0.94 | – |  |
| 81 | 0.76 | yes | 5 | 0.85 | – |  |
| 82 | 0.98 | yes | 6 | 1.0 | – |  |
| 83 | 0.99 | yes | 3 | 1.0 | 1.0 |  |
| 84 | 0.98 | yes | 3 | 1.0 | 1.0 |  |
| 85 | 0.72 | yes | 2 | 0.5 | – |  |
| 86 | 0.94 | yes | 6 | 1.0 | – |  |
| 87 | 0.99 | yes | 3 | 1.0 | 1.0 |  |
| 88 | 0.99 | yes | 3 | 1.0 | 1.0 |  |
| 89 | 0.93 | yes | 6 | 1.0 | – |  |
| 90 | 0.91 | yes | 5 | 1.0 | – |  |
| 91 | 0.89 | yes | 3 | 0.93 | – |  |
| 92 | 0.82 | yes | 4 | 0.93 | 1.0 |  |
| 93 | 0.97 | yes | 3 | 1.0 | – |  |
| 94 | 0.61 | yes | 4 | 0.62 | 0.88 |  |
| 95 | 0.72 | yes | 3 | 1.0 | 1.0 |  |
| 96 | 0.83 | yes | 7 | 0.91 | – |  |
| 97 | 0.84 | yes | 3 | 0.96 | 0.67 |  |
| 98 | 0.90 | yes | 4 | 1.0 | – |  |
| 99 | 0.77 | yes | 4 | 0.81 | 1.0 |  |
| 100 | 0.68 | yes | 1 | – | – |  |
| 101 | 0.62 | yes | 5 | 0.5 | – | refrain from v1 appended to later verses |
| 102 | 0.86 | yes | 4 | 0.92 | 1.0 |  |
| 103 | 0.72 | yes | 3 | 0.88 | 1.0 |  |
| 104 | 0.65 | yes | 2 | 1.0 | 0.67 |  |
| 105 | 0.65 | yes | 3 | 0.67 | 0.67 | (bis) markers not repeated |
| 106 | 0.84 | yes | 3 | 0.89 | 1.0 |  |
| 107 | 0.76 | yes | 3 | 0.92 | – |  |
| 108 | 0.71 | yes | 1 | – | 1.0 |  |
| 109 | 0.91 | yes | 3 | 0.96 | 1.0 |  |
| 110 | 0.50 | no | 5 | 0.5 | 0.46 | refrain from v1 appended to later verses |
| 111 | 0.60 | yes | 4 | 0.5 | – |  |
| 112 | 0.78 | yes | 6 | 0.98 | – |  |
| 113 | 0.74 | yes | 2 | 1.0 | – |  |
| 114 | 0.86 | yes | 4 | 1.0 | 1.0 |  |
| 115 | 0.96 | yes | 6 | 0.96 | – |  |
| 116 | 0.93 | yes | 5 | 1.0 | – |  |
| 117 | 0.71 | yes | 3 | 0.92 | 1.0 |  |
| 118 | 0.00 | no | 3 | 0.39 | 0.78 | period P=68.42s match=1.00 gives 2 repeats for 3 verses |
| 119 | 1.00 | yes | 4 | 1.0 | 1.0 |  |
| 120 | 0.87 | yes | 3 | 1.0 | – |  |
| 121 | 0.88 | yes | 4 | 1.0 | – |  |
| 122 | 0.90 | yes | 4 | 0.94 | – |  |
| 123 | 0.45 | no | 2 | 0.25 | 0.0 | (bis) markers not repeated |
| 124 | 0.97 | yes | 3 | 0.96 | 1.0 |  |
| 125 | 0.94 | yes | 3 | 0.92 | 1.0 | refrain from v1 appended to later verses |
| 126 | 0.88 | yes | 5 | 0.9 | – |  |
| 127 | 0.80 | yes | 4 | 1.0 | – |  |
| 128 | 0.65 | yes | 7 | 0.94 | 0.0 | (bis) markers not repeated |
| 129 | 0.87 | yes | 5 | 0.96 | – |  |
| 130 | 0.72 | yes | 4 | 0.7 | – |  |
| 131 | 0.86 | yes | 5 | 1.0 | 1.0 |  |
| 132 | 0.94 | yes | 5 | 0.9 | – |  |
| 133 | 0.84 | yes | 3 | 0.83 | – |  |
| 134 | 0.91 | yes | 5 | 1.0 | – |  |
| 135 | 0.95 | yes | 3 | 1.0 | – |  |
| 136 | 0.89 | yes | 4 | 1.0 | – |  |
| 137 | 0.78 | yes | 7 | 0.96 | – |  |
| 138 | 0.90 | yes | 5 | 0.95 | – | (bis) markers not repeated |
| 139 | 0.90 | yes | 5 | 0.95 | – |  |
| 140 | 0.67 | yes | 2 | 1.0 | 0.67 |  |
| 141 | 0.77 | yes | 4 | 0.75 | 1.0 |  |
| 142 | 0.80 | yes | 2 | 1.0 | 1.0 |  |
| 143 | 0.88 | yes | 4 | 1.0 | – |  |
| 144 | 0.80 | yes | 6 | 0.96 | – |  |
| 145 | 0.77 | yes | 2 | 1.0 | 1.0 |  |
| 146 | 0.85 | yes | 4 | 1.0 | – |  |
| 147 | 0.98 | yes | 2 | 1.0 | – |  |
| 148 | 0.98 | yes | 4 | 1.0 | 1.0 |  |
| 149 | 0.73 | yes | 2 | 0.88 | 1.0 |  |
| 150 | 0.90 | yes | 4 | 0.95 | – |  |
| 151 | 0.98 | yes | 3 | 1.0 | – |  |
| 152 | 0.80 | yes | 3 | 0.92 | – |  |
| 153 | 0.75 | yes | 3 | 0.67 | – | (bis) markers not repeated |
| 154 | 0.93 | yes | 3 | 1.0 | – |  |
| 155 | 0.99 | yes | 4 | 1.0 | – |  |
| 156 | 0.93 | yes | 7 | 1.0 | 1.0 |  |
| 157 | 0.93 | yes | 7 | 0.89 | – |  |
| 158 | 0.81 | yes | 7 | 0.96 | – |  |
| 159 | 0.74 | yes | 3 | 1.0 | 0.0 |  |
| 160 | 0.79 | yes | 4 | 0.69 | 1.0 |  |
| 161 | 0.83 | yes | 3 | 1.0 | – |  |
| 162 | 0.69 | yes | 4 | 0.92 | – |  |
| 163 | 0.94 | yes | 4 | 1.0 | – |  |
| 164 | 0.84 | yes | 3 | 0.92 | – |  |
| 165 | 0.85 | yes | 4 | 1.0 | 1.0 |  |
| 166 | 0.89 | yes | 5 | 0.96 | 1.0 |  |
| 167 | 0.82 | yes | 2 | 1.0 | 1.0 |  |
| 168 | 0.99 | yes | 2 | 1.0 | 1.0 |  |
| 169 | 0.00 | no | 4 | – | – | no alignment; period P=34.89s match=0.63 gives 4 repeats for 4 verses |
| 170 | 0.94 | yes | 2 | 1.0 | – |  |
| 171 | 0.90 | yes | 3 | 1.0 | – |  |
| 172 | 0.75 | yes | 6 | 1.0 | – |  |
| 173 | 0.24 | no | 3 | 0.5 | 0.86 | period P=89.16s match=0.62 gives 2 repeats for 3 verses |
| 174 | 0.92 | yes | 3 | 0.96 | – |  |
| 175 | 0.80 | yes | 5 | 1.0 | – |  |
| 176 | 0.85 | yes | 4 | 1.0 | 1.0 |  |
| 177 | 0.85 | yes | 2 | 1.0 | – |  |
| 178 | 0.78 | yes | 5 | 0.8 | 1.0 |  |
| 179 | 0.62 | yes | 5 | 0.57 | 0.56 |  |
| 180 | 0.58 | no | 2 | 0.62 | 0.0 |  |
| 181 | 0.94 | yes | 4 | 1.0 | 1.0 |  |
| 182 | 0.93 | yes | 4 | 1.0 | 1.0 |  |
| 183 | 0.93 | yes | 2 | 1.0 | 1.0 |  |
| 184 | 0.99 | yes | 4 | 1.0 | – |  |
| 185 | 0.86 | yes | 3 | 0.97 | 1.0 |  |
| 186 | 0.94 | yes | 3 | 1.0 | – |  |
| 187 | 0.57 | no | 2 | 0.75 | 0.0 | (bis) markers not repeated |
| 188 | 0.79 | yes | 3 | 0.88 | 1.0 |  |
| 189 | 0.00 | no | 4 | 0.5 | 0.0 | period P=30.70s match=1.00 gives 5 repeats for 4 verses |
| 190 | 0.73 | yes | 5 | 0.93 | 1.0 |  |
| 191 | 0.71 | yes | 7 | 0.82 | – |  |
| 192 | 0.70 | yes | 3 | 0.75 | 1.0 |  |
| 193 | 0.81 | yes | 5 | 1.0 | – |  |
| 194 | 0.92 | yes | 3 | 1.0 | – |  |
| 195 | 0.93 | yes | 4 | 1.0 | 1.0 |  |
| 196 | 0.95 | yes | 3 | 1.0 | – |  |
| 197 | 0.94 | yes | 2 | 1.0 | 1.0 |  |
| 198 | 0.81 | yes | 6 | 1.0 | – |  |
| 199 | 0.99 | yes | 5 | 1.0 | 1.0 |  |
| 200 | 0.88 | yes | 3 | 1.0 | 1.0 |  |
| 200bis | 0.00 | no |  | – | – | no lyrics in songs.json |
| 201 | 0.87 | yes | 4 | 1.0 | – |  |
| 202 | 0.72 | yes | 3 | 0.75 | – |  |
| 203 | 0.65 | yes | 3 | 0.5 | – |  |
| 204 | 0.82 | yes | 3 | 1.0 | – |  |
| 205 | 0.93 | yes | 5 | 1.0 | 1.0 |  |
| 206 | 0.92 | yes | 3 | 1.0 | – |  |
| 207 | 0.90 | yes | 3 | 0.92 | – |  |
| 208 | 0.88 | yes | 7 | 0.93 | – |  |
| 209 | 0.97 | yes | 3 | 1.0 | 1.0 |  |
| 210 | 0.98 | yes | 6 | 1.0 | – |  |
| 211 | 0.83 | yes | 5 | 0.95 | – |  |
| 212 | 0.86 | yes | 4 | 1.0 | – |  |
| 213 | 0.77 | yes | 5 | 0.82 | 1.0 |  |
| 214 | 0.95 | yes | 3 | 1.0 | 1.0 |  |
| 215 | 0.90 | yes | 6 | 1.0 | 0.92 |  |
| 216 | 0.60 | yes | 5 | 0.8 | 0.0 | (bis) markers not repeated |
| 217 | 0.06 | no | 5 | 0.7 | 0.0 | period P=44.14s match=0.51 gives 5 repeats for 5 verses |
| 218 | 0.71 | yes | 4 | 0.5 | – |  |
| 219 | 0.51 | no | 5 | 0.7 | 0.0 |  |
| 220 | 0.81 | yes | 4 | 0.91 | – |  |
| 221 | 0.98 | yes | 7 | 1.0 | – |  |
| 222 | 0.81 | yes | 4 | 0.94 | – |  |
| 223 | 0.80 | yes | 3 | 0.79 | 1.0 |  |
| 224 | 0.75 | yes | 6 | 0.88 | – |  |
| 225 | 0.66 | yes | 1 | – | – |  |
| 226 | 0.69 | yes | 4 | 0.72 | – |  |
| 227 | 0.55 | no | 4 | 1.0 | 0.0 |  |
| 228 | 0.79 | yes | 4 | 0.69 | – | (bis) markers not repeated |
| 229 | 0.86 | yes | 5 | 0.95 | – |  |
| 230 | 0.78 | yes | 3 | 0.96 | – |  |
| 231 | 0.96 | yes | 3 | 1.0 | – |  |
| 232 | 0.99 | yes | 3 | 1.0 | – |  |
| 233 | 0.81 | yes | 4 | 0.91 | 1.0 |  |
| 234 | 0.97 | yes | 3 | 1.0 | – |  |
| 235 | 0.84 | yes | 3 | 0.96 | – |  |
| 236 | 0.97 | yes | 4 | 1.0 | 1.0 |  |
| 237 | 0.84 | yes | 3 | 0.94 | 1.0 |  |
| 238 | 0.95 | yes | 3 | 1.0 | – |  |
| 239 | 0.79 | yes | 4 | 0.94 | – |  |
| 240 | 0.90 | yes | 3 | 0.94 | 1.0 | refrain from v1 appended to later verses |
| 241 | 0.94 | yes | 5 | 1.0 | – |  |
| 242 | 0.74 | yes | 4 | 0.88 | 1.0 |  |
| 243 | 0.64 | yes | 4 | 0.44 | 1.0 |  |
| 244 | 0.76 | yes | 3 | 0.92 | 1.0 |  |
| 245 | 0.84 | yes | 5 | 0.9 | – |  |
| 246 | 0.00 | no | 3 | 0.5 | 0.44 | period P=38.68s match=1.00 gives 4 repeats for 3 verses |
| 247 | 0.73 | yes | 4 | 0.75 | 1.0 |  |
| 248 | 0.79 | yes | 4 | 0.97 | 0.5 |  |
| 249 | 0.93 | yes | 5 | 0.9 | – |  |
| 250 | 0.21 | no | 4 | 0.08 | 0.67 | period P=54.31s match=0.58 gives 4 repeats for 4 verses |
| 251 | 0.98 | yes | 3 | 1.0 | – |  |
| 252 | 0.24 | no | 3 | 0.42 | 0.4 | period P=34.90s match=0.54 gives 3 repeats for 3 verses |
| 253 | 0.80 | yes | 4 | 0.97 | 1.0 |  |
| 254 | 0.82 | yes | 3 | 0.89 | 1.0 |  |
| 255 | 0.78 | yes | 5 | 0.95 | – |  |
| 256 | 0.77 | yes | 4 | 0.97 | 1.0 | refrain from v1 appended to later verses |
| 257 | 0.00 | no | 6 | 0.5 | 0.95 | period P=50.34s match=1.00 gives 5 repeats for 6 verses |
| 258 | 0.89 | yes | 3 | 0.92 | – | (bis) markers not repeated |
| 259 | 0.84 | yes | 2 | 0.88 | 1.0 |  |
| 260 | 0.77 | yes | 6 | 0.83 | – | (bis) markers not repeated |
| 261 | 0.63 | yes | 4 | 0.5 | 0.71 |  |
| 262 | 0.78 | yes | 5 | 0.9 | – |  |
| 263 | 0.81 | yes | 3 | 0.96 | 1.0 | refrain from v1 appended to later verses |
| 264 | 0.22 | no | 3 | 1.0 | 1.0 | period P=68.58s match=0.08 gives 2 repeats for 3 verses |
| 265 | 0.94 | yes | 4 | 1.0 | – | refrain from v1 appended to later verses |
| 266 | 0.96 | yes | 3 | 1.0 | 1.0 |  |
| 267 | 0.00 | no | 5 | 0.5 | 0.55 | period P=42.96s match=1.00 gives 4 repeats for 5 verses |
| 268 | 0.72 | yes | 3 | 0.93 | 0.4 |  |
| 269 | 0.94 | yes | 3 | 1.0 | – |  |
| 270 | 0.85 | yes | 4 | 0.97 | – |  |
| 271 | 0.86 | yes | 4 | 1.0 | – |  |

## Excluded hymns and why

- **Verse count does not match the audio** (P matches every onset, but the number of repeats differs from the number of verses in songs.json): 118 (2 repeats, 3 verses), 173, 189 (5 repeats, 4 verses), 246 (4 repeats, 3 verses), 257 (5 repeats, 6 verses), 264, 267 (4 repeats, 5 verses). The lyrics and the MIDI disagree; someone needs to check which one is right.
- **Audio not periodic per verse** (tempo changes, or different music per verse): 13 and 29 (identical audio files), 74, 217, 250, 252. Also 169, where segmentation left a verse with no usable onsets.
- **Alignment ambiguous** (just under the threshold): 21, 22, 110, 123, 180, 187, 219, 227. Repeated passages of the tune don't line up with the printed lines, or independent verses disagree.
- **200bis**: audio only, no lyrics entry.

## Known failure patterns, also present in included hymns

1. **Line boundary off by 1-2 notes** in tunes with continuous rhythm and no rests, or with two held notes in a row (hymn 7 line 5, hymn 1). Inside a line this shifts the following words by one note.
2. **Melisma or extra piano note:** where the piano has more notes than syllables, the slur is placed where it is cheapest, which is not always the real slur.
3. **Missed onsets** (repeated notes, soft re-attacks): the syllable is interpolated inside the long interval and can be off by up to half a note.
4. **Optional vowel merges** are decided by the aligner. A merged pair gives two words the same start, so the first of them is highlighted only briefly.
5. **Refrain only under verse 1:** for 7 hymns the refrain is appended to later verses with events pointing at verse 0's lines. If the app shows only the current verse card, it has to look across verses for those events.
6. **Verse 1 first word:** the re-inserted chord sits at 0.00 s, but in later verses it falls 0.1 s before the periodic start, so verse 1 can be about 0.1 s late compared with the others.
7. **Word ends** usually run on to the next word or line start, because piano sustain hides rests. Don't treat end times as reliable rest markers.

## Spot-check by ear (in this order)

- **7**: reference check. Is line 5 on 35.4 s or 36.2 s?
- **1**: borderline, continuous rhythm, refrain.
- **4**: line-level `(bis)` and uneven line counts.
- **8**: couplet repeat.
- **5**: interpolated missed onsets.
- **125 and 101**: refrain appended from verse 1.
- **41 and 138**: mid-line repeat markers.
- **111, 216, 94, 179**: lowest included scores (0.60-0.62).
- **35, 128, 216**: repetition consistency 0.0, meaning the line starts don't follow the repeated melody.

If several of the lowest included hymns sound wrong, raise `QUALITY_THRESHOLD` to 0.7. That drops 26 hymns: 223 of 272 audio files would remain.
