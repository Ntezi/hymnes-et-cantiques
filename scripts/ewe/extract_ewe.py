import pymupdf, re, json, glob, unicodedata, mido, sys, collections
PDF='/home/claude/hec/ewe/ewe.pdf'; MIDI='/home/claude/hec/midi'
d=pymupdf.open(PDF)
LAST_PAGE=542
VN=re.compile(r'^(\d+)\.$')
JOIN={'e','mía','mia','wo','a','míe','mie',"'",'ŋutɔ'}
def clean(t):
    def fj(m):
        pre=m.group(1)
        return (pre if pre.lower() in JOIN else pre+' ')+'\u0192'
    t=re.sub('(\\S*)\\s+\u0335\\s*\u0283',fj,t)
    t=re.sub('\u0335\\s*\u0283','\u0192',t); t=re.sub('\u0283\\s*\u0335','\u0192',t)
    t=re.sub('\\s*\u0335\\s*\u01a9','\u0191',t)
    t=t.replace('\u0283','\u0192').replace('\u01a9','\u0191').replace('\u0335','')
    t=t.replace('\u0110','\u0189').replace('\u0111','\u0256').replace('\u019e','\u014b').replace('\u0315','')
    t=t.replace('\u00ad','').replace('\xa0',' ').replace('\u202f',' ').replace('\u2019',"'").replace('\u2018',"'")
    return unicodedata.normalize('NFC',t)
# ---- collect per page items
items=[]  # (hymnSeqKey, kind, data)
starts={}
pages=[]
for pi in range(1,LAST_PAGE+1):
    p=d[pi]; spans=[]
    for b in p.get_text('rawdict')['blocks']:
        for l in b.get('lines',[]):
            for s in l['spans']:
                chars=s['chars']
                t=''.join(c['c'] for c in chars)
                if not t.strip(): continue
                f,sz=s['font'],round(s['size'],1)
                if f.startswith('Times') and sz==9.2:
                    cur=[]
                    for c in chars+[{'c':' ','bbox':None}]:
                        if c['c'].isspace() or c['c'] in '\xa0':
                            if cur:
                                bb=(min(x['bbox'][0] for x in cur),min(x['bbox'][1] for x in cur),max(x['bbox'][2] for x in cur),max(x['bbox'][3] for x in cur))
                                spans.append((f,sz,bb,''.join(x['c'] for x in cur)))
                            cur=[]
                        else: cur.append(c)
                else: spans.append((f,sz,s['bbox'],t))
    hy=[]
    for g in p.get_drawings():
        for it in g['items']:
            if it[0]=='l':
                a,b=it[1],it[2]
                if abs(a.y-b.y)<0.6 and 0.3<abs(a.x-b.x)<7: hy.append((min(a.x,b.x),max(a.x,b.x),(a.y+b.y)/2))
            elif it[0]=='re':
                r=it[1]
                if r.height<1.2 and 0.3<r.width<7: hy.append((r.x0,r.x1,(r.y0+r.y1)/2))
    pages.append((pi,spans,hy))
# ---- assign content to hymns in reading order (page, y)
hymn_pages=collections.defaultdict(list)  # n -> list of (pi, ymin, ymax)
marks=[]
for pi,spans,hy in pages:
    for f,sz,bb,t in spans:
        if f.startswith('CenturySchL-Bold') and sz>15 and t.strip().isdigit(): marks.append((pi,bb[1],int(t.strip())))
marks.sort()
def hymn_of(pi,y):
    cur=None
    for mp,my,n in marks:
        if (mp,my-30)<=(pi,y): cur=n
        else: break
    return cur
H=collections.defaultdict(lambda:{'syl':[],'vn':[],'text':[],'hy':[]})
for pi,spans,hy in pages:
    for f,sz,bb,t in spans:
        if bb[1]<14 and f.startswith('CenturySchL-Bold') and sz<12: continue  # page header number
        n=hymn_of(pi,bb[1])
        if n is None: continue
        if f.startswith('Times') and sz==9.2:
            tt=clean(t).strip()
            if VN.match(tt): H[n]['vn'].append((pi,bb,int(tt[:-1])))
            else: H[n]['syl'].append((pi,bb,tt))
        elif f.startswith('Times') and sz==9.0: H[n]['text'].append((pi,bb,clean(t)))
        elif f.startswith('CenturySchL') and sz<9 and VN.match(t.strip()): H[n]['vn'].append((pi,bb,int(t.strip()[:-1])))
    for x0,x1,y in hy:
        n=hymn_of(pi,y)
        if n: H[n]['hy'].append((pi,x0,x1,y))
def rows_of(h):
    # split multi-syllable spans into words keeping positions
    words=[]
    for pi,bb,t in h['syl']:
        if not t.strip(): continue
        words.append((pi,bb[0],bb[1],bb[2],bb[3],t))
    # group into rows by (page, y)
    rows=collections.defaultdict(list)
    for w in words: rows[(w[0],round(w[2]))].append(w)
    keys=sorted(rows)
    # merge keys within 2pt
    merged=[];
    for k in keys:
        if merged and merged[-1][0][0]==k[0] and abs(merged[-1][0][1]-k[1])<=7: merged[-1][1].extend(rows[k])
        else: merged.append([k,list(rows[k])])
    # systems: consecutive rows with gap < 20
    systems=[]
    for k,ws in merged:
        ws.sort(key=lambda w:w[1])
        if systems and systems[-1][-1][0][0]==k[0] and k[1]-systems[-1][-1][0][1]<20: systems[-1].append((k,ws))
        else: systems.append([(k,ws)])
    return systems
def join_row(ws,hy,pi):
    out=[]; trailing=False
    pending=False
    for i,w in enumerate(ws):
        if not re.search(r'\w',w[5]):
            if out: out[-1]=out[-1]+' '+w[5]
            continue
        if out and pending: out[-1]=out[-1]+w[5]
        else: out.append(w[5])
        ymid=(w[2]+w[4])/2
        nx=ws[i+1][1] if i+1<len(ws) else 1e9
        pending=any(p==pi and abs(y-ymid)<3.5 and x0>=w[3]-0.5 and x1<=nx+0.5 for p,x0,x1,y in hy)
    return out,pending
def syll_count_row(ws): return len(ws)
def midi_lines(n):
    fs=glob.glob(f'{MIDI}/HeC_{n:03d}-mono-piano-*.mid')
    if not fs: return None
    m=mido.MidiFile(fs[0]); verses=[]; cur=None
    for tr in m.tracks:
        evs=[x.text for x in tr if x.type in('lyrics','text')]
        if not any(e.startswith('\\') or e.startswith('/') for e in evs): continue
        for e in evs:
            if e.startswith('@'): continue
            if e.startswith('\\'): verses.append([[]]); e=e[1:]
            elif e.startswith('/'):
                if not verses: verses.append([[]])
                verses[-1].append([]); e=e[1:]
            if not verses: verses.append([[]])
            if e.strip(): verses[-1][-1].append(e)
    return [[len(l) for l in v if l] for v in verses]
def text_verses(h):
    byline=collections.defaultdict(list)
    for pi,bb,t in h['text']:
        byline[(pi,round(bb[1]))].append((bb[0],bb[2],t))
    segs=[]  # (pi, col, y, text)
    for (pi,y),parts in byline.items():
        parts.sort()
        cur=[parts[0]]
        groups=[]
        for prt in parts[1:]:
            if prt[0]-cur[-1][1]>4.5: groups.append(cur); cur=[prt]
            else: cur.append(prt)
        groups.append(cur)
        for g in groups:
            txt=re.sub(r'\s+',' ',''.join(t for _,_,t in g)).strip()
            if txt: segs.append((pi,0 if g[0][0]<110 else 1,y,txt))
    MK=re.compile(r'^\((bis|ter|x\s*\d|\d)\)\.?$|^(bis|ter)$',re.I)
    keep=[]
    for sg in segs:
        if MK.match(sg[3]):
            tgt=[x for x in keep if x[0]==sg[0] and abs(x[2]-sg[2])<=2]
            if not tgt: tgt=[x for x in segs if x is not sg and x[0]==sg[0] and abs(x[2]-sg[2])<=2 and not MK.match(x[3])]
            if not tgt:
                cand=[x for x in segs if x is not sg and x[0]==sg[0] and 0<=sg[2]-x[2]<=12 and not MK.match(x[3]) and x[1]==0]
                tgt=sorted(cand,key=lambda x:x[2])[-1:] if cand else []
            if tgt:
                t0=tgt[-1]; i=segs.index(t0); segs[i]=(t0[0],t0[1],t0[2],t0[3]+' '+sg[3])
                keep=[segs[i] if (x[0],x[1],x[2])==(t0[0],t0[1],t0[2]) else x for x in keep]
                continue
        keep.append(sg)
    segs=[x for x in segs if not MK.match(x[3])]
    segs.sort()
    verses=[]
    for pi,col,y,s_ in segs:
        m=re.match(r'^(\d+)\.\s*(.*)$',s_)
        if m: verses.append([int(m.group(1)),[m.group(2)] if m.group(2) else []])
        elif verses: verses[-1][1].append(s_)
    verses.sort(key=lambda v:v[0])
    return verses
VOW='aeiouɛɔãẽĩõũɛ̃ɔ̃áéíóúàèìòùâêîôû'
def nsyl(s):
    s=unicodedata.normalize('NFD',s.lower()); s=''.join(c for c in s if unicodedata.category(c)!='Mn')
    return max(1,len(re.findall(r'[aeiouɛɔ]+',s)))
def split_lines(wordsyl, ref):
    if ref and len(ref)>=4 and sum(ref)/len(ref)<5:
        ref=[sum(ref[i:i+2]) for i in range(0,len(ref),2)]
    # wordsyl: list of (word, nsyl, endsPunct); ref: syllable counts per line
    if not ref: return [' '.join(w for w,_,_ in wordsyl)]
    cum=[0]
    for _,c,_ in wordsyl: cum.append(cum[-1]+c)
    total=cum[-1]; rt=sum(ref); scale=total/rt if rt else 1
    targets=[]; acc=0
    for c in ref[:-1]: acc+=c; targets.append(acc*scale)
    cuts=[]; last=0
    for tgt in targets:
        best=None
        for i in range(last+1,len(wordsyl)):
            dist=abs(cum[i]-tgt)
            if wordsyl[i-1][2]: dist-=0.6
            if wordsyl[i][0][:1].isupper() or wordsyl[i][0].startswith("'"): dist-=0.4
            if best is None or dist<best[0]: best=(dist,i)
        if best: cuts.append(best[1]); last=best[1]
    lines=[]; prev=0
    for c in cuts+[len(wordsyl)]:
        if c>prev: lines.append(' '.join(w for w,_,_ in wordsyl[prev:c]))
        prev=c
    return lines
FR={x['song_number']:x for x in json.load(open('/home/claude/hec/repo/src/songs_fr.json'))}
songs=[]; report=[]
for n in range(1,272):
    h=H[n]; systems=rows_of(h)
    blocks=[]
    for s_ in systems:
        if blocks and len(blocks[-1][0])==len(s_): blocks[-1].append(s_)
        else: blocks.append([s_])
    def rowwords(rowlist):
        out=[]; pend=False
        for (k,ws) in rowlist:
            words,pending=join_row(ws,h['hy'],k[0])
            if pend and out and words: out[-1]=(out[-1][0]+words[0],out[-1][1]+1); words=words[1:]
            out.extend((w,nsyl(w)) for w in words)
            pend=pending
        rowwords.last_pend=pend
        return out
    def label_of(row):
        (pi,y),ws=row
        for lp,bb,v in h['vn']:
            if lp==pi and abs(bb[1]-ws[0][2])<4 and bb[0]<ws[0][1]: return v
        return None
    tvs=text_verses(h)
    tnums={v for v,_ in tvs}
    V=max([len(FR[n]['verses'])]+list(tnums)+[1])
    staff=[v for v in range(1,V+1) if v not in tnums] or [1]
    verses_staff={v:[] for v in staff}; refrain=[]; prefix=[]
    multi_verse=len(staff)>1
    seen_verse_block=False
    carry=None
    for bl in blocks:
        k=len(bl[0])
        parts=[]
        for r in range(k):
            ws_=rowwords([sysm[r] for sysm in bl]); parts.append([ws_,rowwords.last_pend])
        if carry and parts and parts[0][0]:
            w0=parts[0][0][0]; parts[0][0][0]=(carry[0]+w0[0],carry[1]+w0[1]); carry=None
        for pt in parts:
            if pt[1] and pt[0]: carry=pt[0].pop()
        if not multi_verse:
            for r in range(k): verses_staff[staff[0]].extend(parts[r][0])
            continue
        if k==1:
            (refrain if seen_verse_block else prefix).extend(parts[0][0]); continue
        labs=[]
        for r in range(k):
            l=None
            for sysm in bl:
                l=label_of(sysm[r])
                if l: break
            labs.append(l)
        if k==len(staff) and not any(labs):
            for r in range(k): verses_staff[staff[r]].extend(parts[r][0])
        else:
            remaining=[v for v in staff if v not in labs]
            unl=[r for r in range(k) if not labs[r]]
            for r in range(k):
                if labs[r] in verses_staff: verses_staff[labs[r]].extend(parts[r][0])
            if len(unl)==1:
                for v in remaining: verses_staff[v].extend(parts[unl[0]][0])
            else:
                for i,r in enumerate(unl):
                    if i<len(remaining): verses_staff[remaining[i]].extend(parts[r][0])
        seen_verse_block=True
    if carry:
        (refrain if (multi_verse and refrain) else verses_staff[staff[-1]]).append(carry)
    if prefix:
        for v in verses_staff: verses_staff[v]=prefix+verses_staff[v]
    verses_staff={v:w for v,w in verses_staff.items() if w}
    tv=tvs
    ml=midi_lines(n) or []
    flat=[c for para in ml for c in para]
    nv=max([v for v,_ in tv]+list(verses_staff.keys())+[1])
    ref1=flat[:len(flat)//nv] if flat and len(flat)%nv==0 else None
    if not ref1 and tv:
        tl=[l for l in tv[0][1] if not re.search(r'(\.\.\.|…|\(bis\))\s*$',l)]
        if tl: ref1=[sum(nsyl(w) for w in l.split()) for l in tl]
    if not ref1 and ml: ref1=ml[0]
    verses_out=[]
    refrain_lines=[]
    if refrain:
        # refrain lines: from MIDI tail of verse1 beyond staff-verse portion
        rl=None
        refrain_lines=split_lines([(w,c,bool(re.search(r'[,;:.!?]$',w))) for w,c in refrain], None)
    for vnum in sorted(verses_staff):
        ws=[(w,c,bool(re.search(r'[,;:.!?]$',w))) for w,c in verses_staff[vnum]]
        if multi_verse and refrain and ref1:
            # reference lines for the verse part = MIDI verse lines minus refrain-length tail
            rs=sum(c for _,c in refrain); acc=0; cut=len(ref1)
            for i in range(len(ref1)-1,-1,-1):
                acc+=ref1[i]
                if acc>=rs*0.85: cut=i; break
            vref=ref1[:cut]; rref=ref1[cut:]
            if vnum==sorted(verses_staff)[0]: refrain_lines=split_lines([(w,c,bool(re.search(r'[,;:.!?]$',w))) for w,c in refrain], rref)
        else: vref=ref1
        lines=split_lines(ws,vref)
        verses_out.append([vnum,lines+refrain_lines])
    if not refrain_lines and verses_out and tv:
        v1=verses_out[0][1]
        for vnum,lines in tv:
            if lines and re.search(r'(\.\.\.|…)\s*$',lines[-1]) and len(v1)>len(lines)-1:
                refrain_lines=v1[len(lines)-1:]; break
    for vnum,lines in tv:
        if refrain_lines and lines and re.search(r'(\.\.\.|…|etc\.?)\s*$',lines[-1]):
            lines=lines[:-1]+refrain_lines
        verses_out.append([vnum,lines])
    verses_out.sort(key=lambda x:x[0])
    vstr=[f"{v}. "+'\n'.join(l) for v,l in verses_out if l]
    first=verses_out[0][1][0] if verses_out and verses_out[0][1] else ''
    tw=first.split()
    m=re.search(r'[,;:!?.]',first)
    if m and len(first[:m.start()].split())>=2: first=first[:m.start()]
    if len(first.split())>7: first=' '.join(first.split()[:6])
    title=re.sub(r'[\s,;:.!?]+$','',first).upper()
    songs.append(dict(song_number=n,title=title,sub_title="",verses=vstr))
    report.append(dict(n=n,layout='multi' if multi_verse else 'repeat',blocks=[len(b[0]) for b in blocks],staff_verses=sorted(verses_staff),text_verses=[v for v,_ in tv],refrain=len(refrain),midi_v1=ref1,lines=[len(l) for _,l in verses_out]))
json.dump(songs,open('/home/claude/hec/ewe/out/songs_ee.json','w'),indent=4,ensure_ascii=False)
json.dump(report,open('/home/claude/hec/ewe/out/extract_report.json','w'),ensure_ascii=False)
print(len(songs))
