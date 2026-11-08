# HEC lyric timing: method and quality report (v2, built from the karaoke MIDI files)

Generated 2026-11-08 by `python3 align.py` (about 10 s; needs `mido`). Outputs, all in `/home/claude/hec/timing/`:

- `lyricTiming.json`: version 2, one event per sung Kinyarwanda syllable, all times in **audio** time. Contains only hymns with quality >= 0.6 (`QUALITY_THRESHOLD` in align.py).
- `quality.json`: diagnostics for every hymn (time map, verse and line matching notes).
- `python3 align.py --show 7 --verse 0`: prints a table of token, syllable, audio ms, the French syllable it sits on, and its MIDI time. Nothing is written.

**Result: 270 of 272 included.** The two left out are 173 (MIDI and audio don't fit) and 200bis (no lyrics). 216 hymns score 1.0 and 44 score between 0.9 and 0.99.

The earlier version, built from audio onsets alone, was replaced. It had no notes to go by, so it guessed slurs and line boundaries and could drift by 1-2 notes. A copy of that script is kept in the scratchpad, outside this folder.

## Format

`{"version":2,"generatedAt":"2026-11-08","hymns":{"7":{"quality":q,"events":[[verseIdx,lineIdx,wordIdx,charStart,charEnd,startMs,endMs],...]}}}`

- `charStart` and `charEnd` are a half-open range inside the token, using the app's tokenisation (`content.split(/\s+/)`).
- A word's syllable ranges are contiguous and cover the whole token:
  - Consonants and the apostrophe of an elided vowel open the next syllable: `Wow'utuye` = `Wo|w'u|tu|ye`.
  - Leading punctuation and marker text attach to the first syllable; trailing consonants and punctuation attach to the last.
- A token with letters but no vowel (a lone `n'`) gets one whole-token event, timed with the next syllable.
- Repeat markers and punctuation-only tokens get no events.
- startMs is the audio time of the syllable's first note.
- **endMs is the end of the syllable's last soprano note, ties and melisma included**, so rests show up as gaps between events.
- Events are sorted by startMs. Repeated lines and refrains give repeated events.
- `align.py` checks every run that ranges are inside tokens, that each sung token occurrence is covered exactly once, and that events are sorted. It prints "validation ok".

## Method

1. **MIDI** (`../midi/HeC_NNN-mono-piano-*.mid`):
   - Note times in seconds follow the tempo map.
   - The soprano is the track named So*an* (some files spell it "Sorpano"); otherwise the first track with notes.
   - The lyric track holds one French syllable per soprano note onset.
   - A lyric starting with `\` opens a paragraph and `/` opens a line. A paragraph starting with "N." opens a new verse.
   - A French syllable's notes are its own note plus the following lyric-less soprano notes that continue without a rest (ties and melisma).
   - Every repeat is written out in the MIDI, so it gives the exact number of times each line and refrain is played.
2. **MIDI to audio time.** All-voice MIDI onsets are matched against the audio onsets in `onsets.json`: first by a histogram of time differences, then by a linear least-squares fit audio = a x midi + b.
   - The scale a is 1.0000 everywhere (range 0.99986 to 1.00003): no tempo change.
   - The offset b differs per hymn, from -5.35 to +3.33 s (median -1.81 s), because the renders trimmed different lead-ins.
   - Residuals on matched onsets are about 4 ms. 60-80% matched is normal, because the audio onset detector misses repeated and inner-voice notes.
   - Hymn 7: b = -2.346 s, a = 0.999998, 100% matched, rms 4 ms. Its first note (MIDI 2.25 s) falls at -0.10 s, just before the audio file starts, and is clipped to 0. That confirms the cut first chord found earlier.
3. **Verse matching.** Kinyarwanda verse entries are matched to MIDI verses by a dynamic-programming alignment. One entry can cover 1-3 MIDI verses or the reverse, and either side can be skipped. The cost is the line-alignment cost, plus a penalty when verse numbers disagree. Several numbered Kinyarwanda verses on one MIDI verse are allowed only when the MIDI has fewer verses.
4. **Line matching** within a verse:
   - Candidate expansions of each Kinyarwanda verse are tried: each line-final `(bis)`/`(ter)` as a line repeat, a couplet repeat, or no repeat. For hymns that print the refrain only under verse 1, appending it to later verses is also tried.
   - A mid-line repeat is sung as separate phrases (hymns 41, 138, 271).
   - Kinyarwanda lines are aligned to MIDI lines, 1:1, 1:2, 2:1, 1:3 or 3:1. The cost is the syllable-count difference, where possible vowel merges count as cheap.
5. **Syllable matching** within a matched line group:
   - Equal counts: one Kinyarwanda syllable per French syllable.
   - Otherwise a small dynamic-programming alignment. Two or three Kinyarwanda syllables can go on one note; this is cheap at a vowel elision or a vowel cluster, and never allowed across a Kinyarwanda line boundary. One Kinyarwanda syllable can spread over 2-3 French syllables; this is cheapest on the last syllable of a line, where French often has an extra mute-e note.
   - Merged syllables at an elision share the whole note. Other merged syllables split the note evenly, so the colour keeps moving.
6. **Quality** is the fraction of Kinyarwanda sung lines whose syllable count matches the French exactly or nearly (difference of 1 or less after allowing vowel merges). Lines without a MIDI counterpart count as failures. The score is halved for a poor time-map fit (under 45% matched, or rms over 10 ms) and reduced when syllables fall before the audio starts.

## Hymns 1-8

| hymn | q | |
|---|---|---|
| 1 | 0.94 | 12 MIDI lines per verse (refrain written out); 1 line in 18 has a count difference over 1 |
| 2 | 0.94 | |
| 3 | 0.90 | |
| 4 | 1.00 | the `(bis)` lines match the MIDI's written-out repeats |
| 5-7 | 1.00 | hymn 7: line starts at 0.00 / 8.97 / 18.04 / 27.11 / 36.18 / 45.25 s, in a dotted half-quarter rhythm, not steady quarters |
| 8 | 1.00 | `(bis)` = repeat of the last couplet, as the MIDI shows |

## Per-hymn table

kin/midi = number of Kinyarwanda verse entries / number of MIDI verses. offset and scale are the time-map b and a. match = fraction of MIDI onsets with an audio onset within 40 ms.

| hymn | quality | included | kin/midi | offset s | scale | match | rms ms | notes |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.94 | yes | 2/2 | -2.494 | 0.99998 | 1.0 | 4.8 |  |
| 2 | 0.94 | yes | 2/2 | -1.595 | 1.00000 | 1.0 | 4.3 |  |
| 3 | 0.90 | yes | 1/1 | -1.595 | 1.00000 | 1.0 | 4.4 |  |
| 4 | 1.00 | yes | 3/3 | -3.097 | 1.00000 | 1.0 | 3.8 |  |
| 5 | 1.00 | yes | 5/5 | -2.347 | 1.00000 | 1.0 | 3.9 |  |
| 6 | 1.00 | yes | 2/2 | -0.097 | 1.00001 | 1.0 | 4.1 |  |
| 7 | 1.00 | yes | 5/5 | -2.346 | 1.00000 | 1.0 | 4.0 |  |
| 8 | 1.00 | yes | 3/3 | -2.347 | 1.00000 | 1.0 | 4.2 | v1: repeats ['couplet']; v2: repeats ['couplet']; v3: repeats ['couplet'] |
| 9 | 1.00 | yes | 3/3 | -2.098 | 1.00001 | 1.0 | 4.1 |  |
| 10 | 1.00 | yes | 3/3 | -3.097 | 1.00000 | 0.988 | 4.7 | v3: repeats ['line', 'none'] |
| 11 | 1.00 | yes | 6/6 | -2.497 | 1.00000 | 1.0 | 4.7 |  |
| 12 | 1.00 | yes | 1/1 | -1.695 | 0.99996 | 1.0 | 4.0 |  |
| 13 | 1.00 | yes | 4/4 | -2.096 | 1.00000 | 0.996 | 4.6 |  |
| 14 | 1.00 | yes | 4/4 | -2.764 | 1.00000 | 1.0 | 3.7 |  |
| 15 | 1.00 | yes | 4/4 | -0.954 | 1.00000 | 1.0 | 4.3 |  |
| 16 | 1.00 | yes | 4/4 | -2.097 | 1.00000 | 1.0 | 4.6 |  |
| 17 | 0.94 | yes | 2/2 | -2.497 | 1.00001 | 1.0 | 4.6 | v1: repeats ['none']; v2: repeats ['line', 'none'] |
| 18 | 1.00 | yes | 3/3 | -2.498 | 0.99999 | 1.0 | 2.9 |  |
| 19 | 1.00 | yes | 3/3 | -0.098 | 1.00000 | 1.0 | 2.9 |  |
| 20 | 1.00 | yes | 5/5 | -0.096 | 1.00000 | 1.0 | 3.4 |  |
| 21 | 1.00 | yes | 5/5 | -2.495 | 1.00000 | 1.0 | 4.2 |  |
| 22 | 1.00 | yes | 3/3 | -2.867 | 1.00000 | 1.0 | 3.6 | v3: repeats ['couplet', 'line'] |
| 23 | 1.00 | yes | 2/2 | -2.867 | 1.00000 | 1.0 | 3.6 |  |
| 24 | 1.00 | yes | 4/4 | -0.098 | 1.00000 | 1.0 | 3.6 |  |
| 25 | 1.00 | yes | 3/3 | -0.097 | 0.99999 | 1.0 | 3.2 |  |
| 26 | 0.88 | yes | 4/4 | -0.098 | 1.00000 | 1.0 | 3.9 |  |
| 27 | 1.00 | yes | 4/4 | -0.096 | 1.00000 | 1.0 | 3.6 |  |
| 28 | 1.00 | yes | 3/3 | +3.331 | 1.00000 | 0.767 | 4.0 |  |
| 29 | 1.00 | yes | 4/4 | -2.096 | 1.00000 | 0.996 | 4.6 | v1: repeats ['none'] |
| 30 | 1.00 | yes | 4/4 | -0.097 | 1.00000 | 1.0 | 4.5 |  |
| 31 | 1.00 | yes | 6/6 | -0.097 | 1.00000 | 1.0 | 3.5 |  |
| 32 | 1.00 | yes | 4/4 | -2.669 | 1.00000 | 1.0 | 3.2 |  |
| 33 | 1.00 | yes | 3/3 | -4.098 | 1.00000 | 1.0 | 4.1 |  |
| 34 | 1.00 | yes | 4/4 | -1.507 | 0.99999 | 0.652 | 3.7 |  |
| 35 | 1.00 | yes | 3/3 | -3.733 | 1.00000 | 1.0 | 3.8 |  |
| 36 | 1.00 | yes | 1/1 | -3.098 | 1.00001 | 1.0 | 3.1 | v1: repeats ['none'] |
| 37 | 1.00 | yes | 1/1 | -3.098 | 1.00001 | 1.0 | 3.1 |  |
| 38 | 1.00 | yes | 3/3 | -3.097 | 1.00000 | 1.0 | 4.0 |  |
| 39 | 1.00 | yes | 3/3 | -1.597 | 1.00000 | 1.0 | 3.4 |  |
| 40 | 1.00 | yes | 1/1 | -3.295 | 0.99995 | 1.0 | 3.3 |  |
| 41 | 1.00 | yes | 2/2 | -2.707 | 1.00001 | 1.0 | 3.9 |  |
| 42 | 1.00 | yes | 4/4 | -0.894 | 0.99999 | 1.0 | 4.4 |  |
| 43 | 1.00 | yes | 3/3 | -2.495 | 1.00000 | 1.0 | 3.9 |  |
| 44 | 1.00 | yes | 4/4 | -1.598 | 1.00000 | 1.0 | 5.0 |  |
| 45 | 1.00 | yes | 4/4 | -2.498 | 1.00000 | 1.0 | 2.8 |  |
| 46 | 1.00 | yes | 5/5 | -2.669 | 1.00000 | 1.0 | 3.3 |  |
| 47 | 1.00 | yes | 5/5 | -2.097 | 1.00000 | 1.0 | 4.8 |  |
| 48 | 1.00 | yes | 3/3 | -1.898 | 1.00000 | 1.0 | 4.1 |  |
| 49 | 1.00 | yes | 3/3 | -0.097 | 1.00002 | 1.0 | 3.9 |  |
| 50 | 1.00 | yes | 3/3 | -3.097 | 1.00001 | 1.0 | 3.5 |  |
| 51 | 1.00 | yes | 4/4 | -0.848 | 1.00000 | 0.914 | 3.0 |  |
| 52 | 1.00 | yes | 4/4 | -0.097 | 1.00000 | 1.0 | 3.8 |  |
| 53 | 1.00 | yes | 3/3 | -2.763 | 1.00000 | 1.0 | 4.2 |  |
| 54 | 1.00 | yes | 4/4 | -2.495 | 1.00000 | 1.0 | 3.7 |  |
| 55 | 1.00 | yes | 2/2 | -0.849 | 1.00001 | 0.92 | 3.2 |  |
| 56 | 1.00 | yes | 3/3 | -0.096 | 1.00001 | 1.0 | 4.6 |  |
| 57 | 1.00 | yes | 3/3 | -2.765 | 1.00000 | 1.0 | 3.5 |  |
| 58 | 1.00 | yes | 3/3 | -2.497 | 1.00001 | 1.0 | 4.6 |  |
| 59 | 1.00 | yes | 6/11 | -3.297 | 1.00000 | 1.0 | 3.5 | Kinyarwanda verse(s) 2-2 <-> MIDI verse(s) 2-3; Kinyarwanda verse(s) 3-3 <-> MIDI verse(s) 4-5; Kinyarwanda verse(s) 4-4 <-> MIDI verse(s) 6-7; Kinyarwanda verse(s) 5-5 <-> MIDI verse(s) 8-9; Kinyarwanda verse(s) 6-6 <-> MIDI verse(s) 10-11; verse count differs: 6 Kinyarwanda entries vs 11 MIDI verses |
| 60 | 1.00 | yes | 4/4 | -2.765 | 1.00000 | 1.0 | 3.6 |  |
| 61 | 1.00 | yes | 3/3 | -3.098 | 0.99999 | 1.0 | 3.3 |  |
| 62 | 1.00 | yes | 5/5 | -2.097 | 1.00000 | 1.0 | 3.6 |  |
| 63 | 1.00 | yes | 3/3 | -2.347 | 1.00000 | 1.0 | 3.7 |  |
| 64 | 1.00 | yes | 4/4 | -0.095 | 1.00000 | 1.0 | 4.8 |  |
| 65 | 0.94 | yes | 4/4 | -0.095 | 0.99998 | 1.0 | 3.7 |  |
| 66 | 1.00 | yes | 4/4 | -2.346 | 1.00000 | 1.0 | 3.4 |  |
| 67 | 1.00 | yes | 3/3 | +2.672 | 1.00000 | 0.761 | 3.8 |  |
| 68 | 0.97 | yes | 4/4 | -3.526 | 1.00000 | 1.0 | 3.4 |  |
| 69 | 1.00 | yes | 3/3 | -1.508 | 1.00000 | 1.0 | 3.3 |  |
| 70 | 1.00 | yes | 4/4 | -0.097 | 1.00000 | 1.0 | 4.6 |  |
| 71 | 1.00 | yes | 7/7 | -1.597 | 1.00000 | 1.0 | 2.8 |  |
| 72 | 1.00 | yes | 5/5 | -0.096 | 1.00000 | 1.0 | 3.5 |  |
| 73 | 1.00 | yes | 3/3 | -0.896 | 1.00000 | 1.0 | 4.3 |  |
| 74 | 1.00 | yes | 3/3 | -2.346 | 1.00001 | 0.994 | 4.5 |  |
| 75 | 1.00 | yes | 3/3 | -0.098 | 1.00000 | 1.0 | 3.7 |  |
| 76 | 1.00 | yes | 6/6 | -0.894 | 1.00000 | 1.0 | 4.4 |  |
| 77 | 1.00 | yes | 2/2 | -0.849 | 1.00001 | 0.92 | 3.2 |  |
| 78 | 1.00 | yes | 3/3 | -1.508 | 0.99998 | 0.99 | 3.5 |  |
| 79 | 1.00 | yes | 2/2 | -2.347 | 0.99999 | 1.0 | 3.2 |  |
| 80 | 1.00 | yes | 4/4 | -1.597 | 1.00000 | 1.0 | 2.8 |  |
| 81 | 1.00 | yes | 5/5 | +2.672 | 1.00000 | 0.751 | 4.0 |  |
| 82 | 1.00 | yes | 6/6 | -1.429 | 0.99999 | 1.0 | 3.8 |  |
| 83 | 1.00 | yes | 3/3 | -1.991 | 1.00000 | 1.0 | 4.0 |  |
| 84 | 1.00 | yes | 3/3 | -0.846 | 1.00000 | 1.0 | 3.8 |  |
| 85 | 1.00 | yes | 2/2 | -1.598 | 1.00002 | 1.0 | 4.8 |  |
| 86 | 1.00 | yes | 6/6 | -2.495 | 1.00000 | 1.0 | 3.5 |  |
| 87 | 1.00 | yes | 3/3 | -1.297 | 0.99999 | 1.0 | 3.9 |  |
| 88 | 1.00 | yes | 3/3 | -1.297 | 0.99999 | 1.0 | 3.9 |  |
| 89 | 0.98 | yes | 6/6 | -2.350 | 1.00000 | 0.76 | 3.5 | 1 syllables fall before the audio file starts (clipped to 0 ms) |
| 90 | 1.00 | yes | 5/5 | -2.497 | 1.00000 | 1.0 | 4.6 |  |
| 91 | 0.93 | yes | 3/3 | -0.098 | 1.00000 | 1.0 | 3.8 |  |
| 92 | 1.00 | yes | 4/4 | -1.360 | 1.00000 | 1.0 | 4.3 |  |
| 93 | 1.00 | yes | 3/3 | -0.763 | 0.99999 | 1.0 | 5.1 |  |
| 94 | 0.84 | yes | 4/4 | -0.847 | 1.00000 | 1.0 | 3.6 |  |
| 95 | 0.92 | yes | 3/3 | -1.509 | 0.99999 | 1.0 | 3.3 |  |
| 96 | 1.00 | yes | 7/7 | -0.845 | 1.00000 | 1.0 | 4.3 |  |
| 97 | 1.00 | yes | 3/3 | -2.669 | 1.00000 | 0.994 | 4.6 |  |
| 98 | 1.00 | yes | 4/4 | -2.345 | 1.00000 | 1.0 | 4.6 |  |
| 99 | 0.94 | yes | 4/4 | -2.097 | 1.00000 | 1.0 | 4.8 |  |
| 100 | 1.00 | yes | 1/1 | -0.697 | 0.99998 | 1.0 | 3.6 |  |
| 101 | 0.97 | yes | 5/5 | -0.096 | 1.00000 | 1.0 | 4.7 | v5: refrain from verse 1 appended |
| 102 | 1.00 | yes | 4/4 | -1.597 | 1.00000 | 1.0 | 4.2 |  |
| 103 | 1.00 | yes | 3/3 | -2.347 | 1.00000 | 1.0 | 3.1 |  |
| 104 | 1.00 | yes | 2/2 | -2.098 | 1.00001 | 1.0 | 3.8 |  |
| 105 | 1.00 | yes | 3/3 | -1.763 | 0.99999 | 0.993 | 5.0 | v1: repeats ['couplet']; v2: repeats ['couplet']; v3: repeats ['couplet'] |
| 106 | 1.00 | yes | 3/3 | -1.595 | 0.99999 | 1.0 | 3.8 |  |
| 107 | 1.00 | yes | 3/3 | -0.096 | 1.00000 | 1.0 | 3.5 |  |
| 108 | 1.00 | yes | 1/1 | -3.098 | 1.00003 | 1.0 | 4.1 |  |
| 109 | 1.00 | yes | 3/3 | -1.809 | 1.00000 | 1.0 | 4.8 |  |
| 110 | 0.93 | yes | 5/5 | -1.762 | 1.00000 | 0.998 | 3.9 | v2: refrain from verse 1 appended; v3: refrain from verse 1 appended; v4: refrain from verse 1 appended; v5: refrain from verse 1 appended |
| 111 | 0.77 | yes | 4/4 | -1.595 | 0.99999 | 1.0 | 4.7 |  |
| 112 | 0.95 | yes | 6/6 | -0.097 | 1.00000 | 0.996 | 4.6 |  |
| 113 | 1.00 | yes | 2/2 | -1.430 | 1.00000 | 1.0 | 3.8 |  |
| 114 | 1.00 | yes | 4/4 | -0.097 | 1.00000 | 1.0 | 3.3 |  |
| 115 | 1.00 | yes | 6/6 | -1.430 | 1.00000 | 1.0 | 4.1 |  |
| 116 | 1.00 | yes | 5/5 | -0.096 | 1.00000 | 1.0 | 3.7 |  |
| 117 | 1.00 | yes | 3/3 | -2.346 | 1.00000 | 1.0 | 3.5 |  |
| 118 | 0.67 | yes | 3/2 | -1.763 | 1.00000 | 0.994 | 3.5 | Kinyarwanda verse 3 has no MIDI verse (no events); verse count differs: 3 Kinyarwanda entries vs 2 MIDI verses |
| 119 | 1.00 | yes | 4/4 | -2.348 | 0.99999 | 1.0 | 3.3 |  |
| 120 | 1.00 | yes | 3/3 | -2.096 | 0.99999 | 1.0 | 3.8 |  |
| 121 | 1.00 | yes | 4/4 | -1.508 | 1.00000 | 1.0 | 4.1 |  |
| 122 | 1.00 | yes | 4/4 | -0.098 | 1.00000 | 1.0 | 4.9 |  |
| 123 | 1.00 | yes | 2/2 | -2.344 | 1.00000 | 1.0 | 4.3 |  |
| 124 | 1.00 | yes | 3/3 | -0.097 | 1.00000 | 1.0 | 4.0 |  |
| 125 | 1.00 | yes | 3/3 | -1.971 | 1.00000 | 0.991 | 4.2 | v2: refrain from verse 1 appended; v3: refrain from verse 1 appended |
| 126 | 1.00 | yes | 5/5 | -0.096 | 0.99999 | 1.0 | 4.1 |  |
| 127 | 1.00 | yes | 4/4 | -0.096 | 1.00000 | 1.0 | 3.5 |  |
| 128 | 1.00 | yes | 7/7 | -2.214 | 1.00000 | 0.997 | 4.2 |  |
| 129 | 1.00 | yes | 5/5 | -0.894 | 1.00000 | 1.0 | 4.4 |  |
| 130 | 1.00 | yes | 4/4 | -0.097 | 1.00001 | 1.0 | 3.5 |  |
| 131 | 1.00 | yes | 5/5 | -2.097 | 1.00000 | 1.0 | 4.9 |  |
| 132 | 0.95 | yes | 5/5 | -0.096 | 1.00000 | 1.0 | 3.3 |  |
| 133 | 1.00 | yes | 3/3 | -1.597 | 0.99999 | 1.0 | 2.9 |  |
| 134 | 1.00 | yes | 5/5 | -1.597 | 1.00000 | 1.0 | 2.9 |  |
| 135 | 1.00 | yes | 3/3 | -0.096 | 0.99999 | 1.0 | 4.9 |  |
| 136 | 1.00 | yes | 4/4 | -4.096 | 1.00000 | 1.0 | 3.7 |  |
| 137 | 1.00 | yes | 7/7 | -2.096 | 1.00000 | 1.0 | 3.6 |  |
| 138 | 1.00 | yes | 5/5 | -2.922 | 1.00000 | 1.0 | 4.6 |  |
| 139 | 1.00 | yes | 5/5 | -0.096 | 0.99999 | 1.0 | 4.1 |  |
| 140 | 1.00 | yes | 2/2 | -2.099 | 1.00002 | 1.0 | 3.6 |  |
| 141 | 1.00 | yes | 4/4 | -1.972 | 1.00000 | 1.0 | 4.1 |  |
| 142 | 1.00 | yes | 2/2 | -2.349 | 1.00000 | 1.0 | 2.9 |  |
| 143 | 1.00 | yes | 4/4 | -2.213 | 1.00000 | 0.667 | 3.4 |  |
| 144 | 0.96 | yes | 6/6 | -1.695 | 1.00000 | 0.974 | 4.4 |  |
| 145 | 1.00 | yes | 2/2 | -2.347 | 1.00001 | 1.0 | 3.5 |  |
| 146 | 1.00 | yes | 4/4 | -1.834 | 1.00000 | 1.0 | 3.9 |  |
| 147 | 1.00 | yes | 2/2 | -0.098 | 1.00003 | 1.0 | 4.3 |  |
| 148 | 1.00 | yes | 4/4 | -1.598 | 1.00000 | 1.0 | 4.1 |  |
| 149 | 1.00 | yes | 2/2 | -0.096 | 1.00001 | 1.0 | 3.8 |  |
| 150 | 1.00 | yes | 4/4 | -3.099 | 1.00000 | 1.0 | 3.2 |  |
| 151 | 1.00 | yes | 3/3 | -2.097 | 1.00000 | 1.0 | 4.2 |  |
| 152 | 1.00 | yes | 3/4 | -0.927 | 0.99999 | 0.766 | 4.0 | Kinyarwanda verse(s) 3-3 <-> MIDI verse(s) 3-4; verse count differs: 3 Kinyarwanda entries vs 4 MIDI verses |
| 153 | 0.93 | yes | 3/3 | -2.096 | 1.00000 | 1.0 | 3.9 |  |
| 154 | 0.92 | yes | 3/3 | -3.098 | 1.00000 | 1.0 | 3.5 |  |
| 155 | 1.00 | yes | 4/4 | -2.347 | 1.00000 | 1.0 | 3.4 |  |
| 156 | 1.00 | yes | 7/7 | -0.096 | 1.00000 | 1.0 | 4.7 |  |
| 157 | 0.96 | yes | 7/7 | -1.429 | 1.00000 | 0.783 | 4.2 |  |
| 158 | 1.00 | yes | 7/7 | -1.695 | 0.99999 | 0.974 | 4.6 |  |
| 159 | 1.00 | yes | 3/3 | -2.213 | 1.00000 | 1.0 | 4.4 |  |
| 160 | 1.00 | yes | 4/4 | -1.596 | 1.00000 | 1.0 | 3.8 |  |
| 161 | 1.00 | yes | 3/3 | -1.297 | 1.00000 | 1.0 | 4.3 |  |
| 162 | 1.00 | yes | 4/4 | -2.095 | 0.99999 | 1.0 | 3.7 |  |
| 163 | 0.96 | yes | 4/4 | -0.096 | 0.99999 | 1.0 | 4.0 |  |
| 164 | 1.00 | yes | 3/3 | -2.214 | 0.99997 | 1.0 | 3.3 |  |
| 165 | 1.00 | yes | 4/4 | -2.213 | 1.00000 | 1.0 | 4.1 |  |
| 166 | 1.00 | yes | 5/5 | -0.095 | 1.00000 | 1.0 | 4.8 |  |
| 167 | 1.00 | yes | 2/2 | -2.214 | 1.00000 | 1.0 | 3.9 |  |
| 168 | 1.00 | yes | 2/2 | -0.096 | 0.99999 | 1.0 | 4.0 |  |
| 169 | 1.00 | yes | 4/4 | -1.810 | 1.00002 | 0.853 | 5.1 |  |
| 170 | 1.00 | yes | 2/2 | -2.215 | 1.00002 | 0.792 | 3.6 |  |
| 171 | 1.00 | yes | 3/3 | -2.495 | 1.00000 | 1.0 | 3.4 |  |
| 172 | 1.00 | yes | 6/6 | -1.595 | 1.00000 | 0.996 | 3.5 |  |
| 173 | 0.44 | no | 3/3 | -1.576 | 0.99986 | 0.581 | 13.3 | v1: repeats ['couplet']; v2: repeats ['couplet']; v3: repeats ['couplet']; weak MIDI/audio match |
| 174 | 1.00 | yes | 3/3 | +2.570 | 1.00000 | 0.755 | 4.6 |  |
| 175 | 1.00 | yes | 5/5 | -1.695 | 1.00001 | 0.974 | 4.6 |  |
| 176 | 0.98 | yes | 4/4 | -3.847 | 1.00000 | 0.815 | 3.4 | 1 syllables fall before the audio file starts (clipped to 0 ms) |
| 177 | 1.00 | yes | 2/2 | -1.508 | 0.99999 | 1.0 | 3.6 |  |
| 178 | 1.00 | yes | 5/5 | -2.094 | 1.00000 | 1.0 | 4.8 |  |
| 179 | 1.00 | yes | 5/5 | -0.728 | 0.99999 | 0.616 | 3.6 | v1: repeats ['couplet']; v2: repeats ['couplet']; v3: repeats ['couplet']; v4: repeats ['couplet']; v5: repeats ['couplet'] |
| 180 | 1.00 | yes | 2/2 | -1.812 | 1.00001 | 1.0 | 3.8 |  |
| 181 | 0.96 | yes | 4/4 | -2.096 | 1.00000 | 1.0 | 4.4 |  |
| 182 | 1.00 | yes | 4/4 | -2.094 | 1.00000 | 1.0 | 4.7 |  |
| 183 | 0.94 | yes | 2/2 | -1.430 | 1.00000 | 1.0 | 3.9 |  |
| 184 | 1.00 | yes | 4/4 | -2.496 | 1.00000 | 1.0 | 2.7 |  |
| 185 | 1.00 | yes | 3/3 | -1.507 | 1.00001 | 1.0 | 3.9 |  |
| 186 | 1.00 | yes | 3/3 | -2.095 | 1.00000 | 1.0 | 5.0 |  |
| 187 | 1.00 | yes | 2/2 | -2.214 | 1.00000 | 1.0 | 4.7 |  |
| 188 | 0.95 | yes | 3/3 | -3.470 | 1.00000 | 0.743 | 3.3 | 2 syllables fall before the audio file starts (clipped to 0 ms) |
| 189 | 0.95 | yes | 4/5 | -0.096 | 1.00000 | 1.0 | 4.0 | Kinyarwanda verse(s) 2-2 <-> MIDI verse(s) 2-3; verse count differs: 4 Kinyarwanda entries vs 5 MIDI verses |
| 190 | 1.00 | yes | 5/5 | -2.096 | 1.00000 | 1.0 | 3.5 |  |
| 191 | 1.00 | yes | 7/7 | -1.596 | 1.00000 | 1.0 | 4.0 |  |
| 192 | 1.00 | yes | 3/3 | -2.429 | 1.00000 | 0.995 | 3.2 |  |
| 193 | 0.95 | yes | 5/5 | -1.507 | 0.99999 | 1.0 | 3.6 |  |
| 194 | 1.00 | yes | 3/3 | -2.498 | 1.00000 | 1.0 | 4.0 |  |
| 195 | 1.00 | yes | 4/4 | -2.213 | 1.00000 | 1.0 | 4.0 |  |
| 196 | 0.92 | yes | 3/3 | -2.213 | 1.00001 | 1.0 | 4.9 |  |
| 197 | 1.00 | yes | 2/2 | -2.214 | 1.00001 | 0.983 | 4.5 |  |
| 198 | 1.00 | yes | 6/6 | -2.763 | 1.00001 | 0.99 | 3.7 |  |
| 199 | 1.00 | yes | 5/5 | -2.213 | 1.00000 | 0.672 | 3.6 |  |
| 200 | 0.97 | yes | 3/3 | -5.350 | 1.00000 | 0.872 | 7.5 | 1 syllables fall before the audio file starts (clipped to 0 ms) |
| 200bis | 0.00 | no | –/– | +nan | nan | – | – | no lyrics in songs.json |
| 201 | 1.00 | yes | 4/4 | -2.289 | 1.00000 | 0.994 | 3.9 |  |
| 202 | 1.00 | yes | 3/3 | -1.595 | 1.00001 | 0.994 | 4.3 |  |
| 203 | 1.00 | yes | 3/3 | -2.498 | 1.00000 | 1.0 | 3.6 |  |
| 204 | 1.00 | yes | 3/3 | -1.694 | 0.99998 | 0.973 | 4.5 |  |
| 205 | 1.00 | yes | 5/5 | -2.095 | 0.99999 | 1.0 | 4.8 |  |
| 206 | 1.00 | yes | 3/3 | -2.215 | 1.00001 | 1.0 | 3.4 |  |
| 207 | 0.92 | yes | 3/3 | -2.346 | 1.00001 | 0.984 | 6.4 |  |
| 208 | 1.00 | yes | 7/7 | -1.596 | 1.00000 | 1.0 | 3.9 |  |
| 209 | 0.96 | yes | 3/3 | -0.095 | 1.00000 | 1.0 | 4.1 |  |
| 210 | 0.96 | yes | 6/6 | -1.296 | 1.00000 | 1.0 | 3.3 |  |
| 211 | 1.00 | yes | 5/5 | -0.848 | 1.00000 | 1.0 | 3.5 |  |
| 212 | 1.00 | yes | 4/4 | -1.187 | 1.00001 | 1.0 | 4.7 |  |
| 213 | 1.00 | yes | 5/5 | -2.496 | 1.00000 | 1.0 | 4.7 |  |
| 214 | 1.00 | yes | 3/3 | -2.213 | 1.00000 | 1.0 | 4.0 |  |
| 215 | 1.00 | yes | 6/6 | -2.823 | 1.00000 | 1.0 | 4.3 |  |
| 216 | 1.00 | yes | 5/5 | -2.095 | 1.00000 | 1.0 | 4.0 |  |
| 217 | 0.95 | yes | 5/5 | -4.591 | 1.00000 | 0.687 | 6.4 | 2 syllables fall before the audio file starts (clipped to 0 ms) |
| 218 | 1.00 | yes | 4/4 | -2.214 | 1.00000 | 1.0 | 3.8 |  |
| 219 | 1.00 | yes | 5/5 | -1.595 | 1.00000 | 0.991 | 3.7 |  |
| 220 | 1.00 | yes | 4/4 | -2.345 | 1.00000 | 0.969 | 4.2 |  |
| 221 | 1.00 | yes | 7/7 | -2.498 | 1.00000 | 1.0 | 3.6 |  |
| 222 | 1.00 | yes | 4/4 | -1.895 | 1.00000 | 1.0 | 4.2 |  |
| 223 | 0.96 | yes | 3/3 | -2.496 | 1.00000 | 1.0 | 3.9 |  |
| 224 | 1.00 | yes | 6/6 | -2.096 | 1.00000 | 1.0 | 4.9 |  |
| 225 | 0.78 | yes | 1/1 | -2.214 | 1.00000 | 1.0 | 3.5 |  |
| 226 | 1.00 | yes | 4/4 | -4.094 | 1.00000 | 1.0 | 4.7 |  |
| 227 | 1.00 | yes | 4/4 | -1.762 | 1.00000 | 0.995 | 4.7 |  |
| 228 | 1.00 | yes | 4/4 | -1.761 | 0.99999 | 0.995 | 3.8 |  |
| 229 | 1.00 | yes | 5/5 | -1.895 | 1.00000 | 1.0 | 5.1 |  |
| 230 | 1.00 | yes | 3/3 | -2.918 | 1.00000 | 1.0 | 3.5 |  |
| 231 | 1.00 | yes | 3/3 | -2.095 | 1.00000 | 1.0 | 4.7 |  |
| 232 | 0.96 | yes | 3/3 | -2.215 | 1.00000 | 1.0 | 4.1 |  |
| 233 | 0.98 | yes | 4/4 | -3.429 | 1.00000 | 0.825 | 3.5 | 1 syllables fall before the audio file starts (clipped to 0 ms) |
| 234 | 1.00 | yes | 3/3 | -2.348 | 1.00000 | 1.0 | 3.3 |  |
| 235 | 1.00 | yes | 3/3 | -2.097 | 1.00001 | 1.0 | 3.6 |  |
| 236 | 1.00 | yes | 4/4 | -1.733 | 1.00000 | 1.0 | 3.0 |  |
| 237 | 1.00 | yes | 3/3 | -0.846 | 0.99999 | 1.0 | 3.2 |  |
| 238 | 1.00 | yes | 3/3 | -2.347 | 1.00002 | 0.984 | 6.1 |  |
| 239 | 1.00 | yes | 4/4 | -0.951 | 0.99999 | 1.0 | 4.1 |  |
| 240 | 0.98 | yes | 3/3 | -2.951 | 1.00000 | 0.576 | 4.4 | v2: refrain from verse 1 appended; v3: refrain from verse 1 appended; 1 syllables fall before the audio file starts (clipped to 0 ms) |
| 241 | 1.00 | yes | 5/5 | -2.213 | 1.00001 | 0.763 | 4.9 |  |
| 242 | 1.00 | yes | 4/4 | -0.951 | 1.00000 | 0.676 | 3.3 |  |
| 243 | 0.94 | yes | 4/4 | -0.847 | 1.00000 | 0.918 | 3.6 |  |
| 244 | 1.00 | yes | 3/3 | -1.595 | 1.00000 | 1.0 | 3.7 |  |
| 245 | 1.00 | yes | 5/5 | -1.508 | 0.99999 | 1.0 | 3.8 |  |
| 246 | 0.94 | yes | 3/4 | -0.748 | 1.00000 | 1.0 | 3.9 | MIDI verse 4 has no Kinyarwanda text; verse count differs: 3 Kinyarwanda entries vs 4 MIDI verses |
| 247 | 1.00 | yes | 4/4 | -2.214 | 1.00000 | 1.0 | 4.5 |  |
| 248 | 1.00 | yes | 4/4 | -0.096 | 1.00002 | 1.0 | 4.6 |  |
| 249 | 0.95 | yes | 5/5 | -2.096 | 1.00000 | 1.0 | 4.4 |  |
| 250 | 1.00 | yes | 4/4 | -1.806 | 1.00000 | 0.8 | 5.2 | v1: repeats ['couplet']; v2: repeats ['couplet']; v3: repeats ['couplet']; v4: repeats ['couplet'] |
| 251 | 1.00 | yes | 3/3 | -0.096 | 0.99999 | 1.0 | 4.4 |  |
| 252 | 1.00 | yes | 3/1 | -1.672 | 0.99995 | 0.744 | 4.2 | Kinyarwanda verse(s) 1-3 <-> MIDI verse(s) 1-1; verse count differs: 3 Kinyarwanda entries vs 1 MIDI verses |
| 253 | 0.88 | yes | 4/4 | -0.095 | 1.00000 | 1.0 | 3.8 |  |
| 254 | 0.94 | yes | 3/3 | -0.094 | 0.99998 | 1.0 | 3.4 |  |
| 255 | 1.00 | yes | 5/5 | -0.095 | 1.00000 | 1.0 | 4.1 |  |
| 256 | 0.88 | yes | 4/4 | -1.810 | 1.00000 | 1.0 | 4.2 | v2: refrain from verse 1 appended; v3: refrain from verse 1 appended; v4: refrain from verse 1 appended |
| 257 | 0.93 | yes | 6/5 | -0.098 | 1.00000 | 1.0 | 4.0 | Kinyarwanda verse(s) 1-2 <-> MIDI verse(s) 1-1; verse count differs: 6 Kinyarwanda entries vs 5 MIDI verses |
| 258 | 0.75 | yes | 3/3 | -3.430 | 1.00000 | 0.992 | 4.0 | v1: repeats ['none']; v2: repeats ['none']; v3: repeats ['none'] |
| 259 | 1.00 | yes | 2/2 | -2.094 | 1.00000 | 0.993 | 4.8 |  |
| 260 | 0.97 | yes | 6/6 | -2.213 | 1.00000 | 1.0 | 4.3 |  |
| 261 | 0.81 | yes | 4/4 | -0.095 | 1.00000 | 1.0 | 4.7 |  |
| 262 | 1.00 | yes | 5/5 | -0.096 | 0.99999 | 1.0 | 3.9 |  |
| 263 | 0.92 | yes | 3/3 | -3.095 | 1.00000 | 1.0 | 5.1 | v2: refrain from verse 1 appended; v3: refrain from verse 1 appended |
| 264 | 1.00 | yes | 3/3 | -0.095 | 1.00000 | 0.993 | 4.1 |  |
| 265 | 1.00 | yes | 4/4 | -1.731 | 1.00000 | 1.0 | 4.1 | v2: refrain from verse 1 appended; v3: refrain from verse 1 appended; v4: refrain from verse 1 appended |
| 266 | 1.00 | yes | 3/3 | -0.096 | 1.00001 | 1.0 | 3.9 |  |
| 267 | 1.00 | yes | 5/4 | -1.763 | 1.00000 | 1.0 | 3.9 | Kinyarwanda verse(s) 1-2 <-> MIDI verse(s) 1-1; verse count differs: 5 Kinyarwanda entries vs 4 MIDI verses |
| 268 | 0.78 | yes | 3/3 | -2.823 | 1.00000 | 1.0 | 4.4 |  |
| 269 | 0.96 | yes | 3/3 | -0.096 | 0.99999 | 1.0 | 4.7 |  |
| 270 | 0.97 | yes | 4/4 | -0.469 | 0.99999 | 0.643 | 3.9 |  |
| 271 | 1.00 | yes | 4/4 | -1.597 | 1.00002 | 1.0 | 4.1 |  |

## Known issues and what to spot-check

- **Verse structure differs from the MIDI:**
  - 118: the audio has 2 verses, so Kinyarwanda verse 3 has no events.
  - 189: Kinyarwanda entry 2 = MIDI verses 2+3.
  - 246: MIDI verse 4 has no text.
  - 252: 3 entries on 1 MIDI verse.
  - 257 and 267: verse 1 is split into two entries.
  - 111: the MIDI has a refrain on verses 1 and 4 with no Kinyarwanda text, so those notes get no events.

  In each case the events are placed correctly but some text or music is left uncovered. Check these by ear.
- **Lowest included scores:** 118 (0.67), 258 (0.75), 111 (0.77), 225 and 268 (0.78), 261 (0.81), 94 (0.84). Some lines there need a 2:1 or 1:2 syllable mapping beyond a single merge, so check those lines for which syllable gets the long note.
- **Clipped first syllables:** in 89, 176, 188, 200, 217, 233 and 240, 1-2 syllables fall before the audio file starts and are clipped to 0 ms.
- **Excluded:** 173 (MIDI and audio disagree: 58% matched, rms 13 ms; probably a different arrangement) and 200bis (no lyrics).
- **Split notes:** when two Kinyarwanda syllables share one French note without an elision, the note is split evenly. That is an approximation of how singers fit the extra syllable.


## Other editions (fr, en, ee)

`python3 align.py` also writes `lyricTiming_fr.json`, `lyricTiming_en.json` and `lyricTiming_ee.json`. They use the same v2 format, and the indices refer to each edition's own songs file (`songs_fr.json`, `songs_en.json`, `songs_ee.json`). Per-hymn diagnostics are in `quality_<lang>.json`. Use `--lang fr` (or a comma list) to run one edition, and `--show 7 --verse 0 --lang ee` to print a table. The Kinyarwanda output did not change: the new run produced a byte-identical file.

The pipeline is the same for every edition: MIDI notes, the per-hymn time map (unchanged), verse, line and syllable matching, and the same quality score and 0.6 threshold. What differs per edition:

- **French (1991 text):**
  - Syllable boundaries for each word come from the MIDI karaoke syllables of the same hymn: a normalised-letter dictionary built from the MIDI words, so the MIDI decides each e-muet.
  - Words that differ from the MIDI text (1991 revisions) fall back to a rule-based splitter (vowel groups; u after q/g is not a vowel; a diaeresis splits a group) plus the dynamic-programming alignment.
  - `Refrain :` label lines are not sung and get no events.
  - A line ending in `etc.` (e.g. "Ô notre Dieu ! sois béni, etc.") is sung, and is followed by the rest of the refrain printed under verse 1. Those events point at verse 1's lines. The `etc.` token gets no event.
- **English (Little Flock 1881):**
  - The syllabifier counts vowel groups, drops a silent final e (but not consonant+le), and drops -es and -ed unless they follow s/x/z/c/g/h or t/d.
  - An apostrophe inside a word does not split it (o'er = 1 syllable).
  - `(2x)`/`(3x)`/`(4x)` are repeat markers, and `etc.` works as in French.
  - This text is a close translation, not a singable one, so syllable counts often don't fit the tune. Many lines need 2:1 or 1:2 mappings, which explains the low pass rate.
- **Ewe:**
  - Each vowel (a e i o u ɛ ɔ, with tone and nasal marks kept attached) is one syllable.
  - A word-initial m or n before a consonant is a syllabic nasal.
  - An apostrophe joins as in Kinyarwanda ('gbefiakuku).
  - Some verses split lines differently from the French, so 2:1 and 3:1 line groups are common.
  - The text of some verses is incomplete. In hymn 7, verses 1 and 2 have about 16 syllables against 30 notes for the first four lines, so part of the music has no text.

| edition | included (>= 0.6) | quality 1.0 | median | hymns 1-8 |
|---|---|---|---|---|
| rw | 270 / 272 | 216 | 1.00 | .94 .94 .90 1 1 1 1 1 |
| fr | 269 / 272 | 239 | 1.00 | .96 1 1 1 .90 .94 1 1 |
| en | 133 / 272 | 5 | 0.59 | .79 .71 .77 .59 .64 .57 .73 .83 (4 and 6 excluded) |
| ee | 264 / 272 | 121 | 0.96 | 1 1 1 1 1 1 .83 .95 |

Excluded:
- fr: 173 (time map), 200bis, 225.
- ee: 22, 101, 160, 173, 214, 251, 266, 200bis.
- en: 139 hymns (see `quality_en.json`).

Spot-check:
- **English:** included hymns can still put a word on the wrong note inside a line, because the text doesn't follow the tune. Treat English as approximate.
- **French:** check hymns with "etc." refrains (e.g. 7) to confirm the refrain repeats after every verse.
- **Ewe:** check hymn 7, verses 1-2 (incomplete text).
