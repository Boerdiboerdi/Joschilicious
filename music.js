(function (scope) {
  'use strict';
  const mod = n => ((n % 12) + 12) % 12;
  const ROOTS = [
    ['C',0,0],['Cis',1,0],['D',2,1],['Es',3,2],['E',4,2],['F',5,3],
    ['Fis',6,3],['G',7,4],['As',8,5],['A',9,5],['B',10,6],['H',11,6]
  ].map(([name,pc,letter])=>({name,pc,letter}));
  const TYPES = [
    {id:'major',name:'Dur',symbol:'',intervals:[0,4,7],degrees:[1,3,5]},
    {id:'minor',name:'Moll',symbol:'m',intervals:[0,3,7],degrees:[1,3,5]},
    {id:'7',name:'7 · Dominantsept',symbol:'7',intervals:[0,4,7,10],degrees:[1,3,5,7]},
    {id:'maj7',name:'maj7 · Dursept',symbol:'maj7',intervals:[0,4,7,11],degrees:[1,3,5,7]},
    {id:'m7',name:'m7 · Mollsept',symbol:'m7',intervals:[0,3,7,10],degrees:[1,3,5,7]},
    {id:'sus2',name:'sus2',symbol:'sus2',intervals:[0,2,7],degrees:[1,2,5]},
    {id:'sus4',name:'sus4',symbol:'sus4',intervals:[0,5,7],degrees:[1,4,5]},
    {id:'add9',name:'add9',symbol:'add9',intervals:[0,4,7,14],degrees:[1,3,5,9]},
    {id:'6',name:'6 · Dursexte',symbol:'6',intervals:[0,4,7,9],degrees:[1,3,5,6],jazz:true},
    {id:'m6',name:'m6 · Mollsexte',symbol:'m6',intervals:[0,3,7,9],degrees:[1,3,5,6],jazz:true},
    {id:'69',name:'6/9',symbol:'6/9',intervals:[0,4,7,9,14],degrees:[1,3,5,6,9],voicing:[0,4,9,14],jazz:true},
    {id:'9',name:'9 · Dominantnone',symbol:'9',intervals:[0,4,7,10,14],degrees:[1,3,5,7,9],voicing:[0,4,10,14],jazz:true},
    {id:'maj9',name:'maj9',symbol:'maj9',intervals:[0,4,7,11,14],degrees:[1,3,5,7,9],voicing:[0,4,11,14],jazz:true},
    {id:'m9',name:'m9',symbol:'m9',intervals:[0,3,7,10,14],degrees:[1,3,5,7,9],voicing:[0,3,10,14],jazz:true},
    {id:'m11',name:'m11',symbol:'m11',intervals:[0,3,7,10,14,17],degrees:[1,3,5,7,9,11],voicing:[0,3,10,17],jazz:true},
    {id:'13',name:'13 · Dominanttredezime',symbol:'13',intervals:[0,4,7,10,14,17,21],degrees:[1,3,5,7,9,11,13],voicing:[0,4,10,21],jazz:true},
    {id:'7b9',name:'7♭9',symbol:'7♭9',intervals:[0,4,7,10,13],degrees:[1,3,5,7,9],voicing:[0,4,10,13],jazz:true},
    {id:'7#9',name:'7♯9 · Hendrix',symbol:'7♯9',intervals:[0,4,7,10,15],degrees:[1,3,5,7,9],voicing:[0,4,10,15],jazz:true},
    {id:'7#5',name:'7♯5',symbol:'7♯5',intervals:[0,4,8,10],degrees:[1,3,5,7],jazz:true},
    {id:'m7b5',name:'m7♭5 · Halbvermindert',symbol:'m7♭5',intervals:[0,3,6,10],degrees:[1,3,5,7],jazz:true},
    {id:'dim7',name:'dim7 · Vermindert',symbol:'dim7',intervals:[0,3,6,9],degrees:[1,3,5,7],jazz:true},
    {id:'aug',name:'aug · Übermäßig',symbol:'aug',intervals:[0,4,8],degrees:[1,3,5],jazz:true},
    {id:'mMaj7',name:'m(maj7)',symbol:'m(maj7)',intervals:[0,3,7,11],degrees:[1,3,5,7],jazz:true},
    {id:'7sus4',name:'7sus4',symbol:'7sus4',intervals:[0,5,7,10],degrees:[1,4,5,7],jazz:true}
  ];
  const COLORS=['#b85424','#794ca5','#947000','#ae3672','#245fb1','#168084','#5655b7','#217a57','#8b426a','#a33e34','#526e28','#3b6691'];
  const TUNING=[40,45,50,55,59,64];
  const letters=['C','D','E','F','G','A','H'];
  const naturals=[0,2,4,5,7,9,11];
  const flats=['Ces','Des','Es','Fes','Ges','As','B'];
  function spell(pc,letter) {
    let difference=mod(pc-naturals[letter]);
    if(difference>6) difference-=12;
    if(difference===0) return letters[letter];
    if(difference===-1) return flats[letter];
    if(difference===1) return letters[letter]+'is';
    return letters[letter]+(difference<0?'♭'.repeat(-difference):'♯'.repeat(difference));
  }
  function chord(root,typeId) {
    const r=ROOTS[root], type=TYPES.find(t=>t.id===typeId);
    if(!r || !type) throw new Error('Unbekannter Akkord');
    const tones=type.intervals.map((interval,i)=>{
      const pc=mod(root+interval);
      const letter=(r.letter+type.degrees[i]-1)%7;
      let delta=mod(pc-naturals[letter]);if(delta>6)delta-=12;
      return {pc,name:spell(pc,letter),degree:type.degrees[i],color:COLORS[pc],octaveShift:(pc-naturals[letter]-delta)/12};
    });
    const played=(type.voicing||type.intervals).map(i=>mod(root+i));
    const voicingTones=tones.filter(t=>played.includes(t.pc));
    const omitted=tones.filter(t=>!played.includes(t.pc));
    return {root,type,tones,voicingTones,omitted,symbol:r.name+type.symbol,title:r.name+(typeId==='major'?'-Dur':typeId==='minor'?'-Moll':type.symbol)};
  }
  function piano(root,typeId,inversion=0) {
    const item=chord(root,typeId);
    const intervals=(item.type.voicing||item.type.intervals).map(mod);
    const bass=intervals[inversion%intervals.length];
    const notes=intervals.map(i=>48+root+bass+mod(i-bass)).sort((a,b)=>a-b);
    while(notes[0]>57) for(let i=0;i<notes.length;i++) notes[i]-=12;
    return notes;
  }
  const A={major:[null,0,2,2,2,0],minor:[null,0,2,2,1,0],'7':[null,0,2,0,2,0],maj7:[null,0,2,1,2,0],m7:[null,0,2,0,1,0],sus2:[null,0,2,2,0,0],sus4:[null,0,2,2,3,0]};
  const E={major:[0,2,2,1,0,0],minor:[0,2,2,0,0,0],'7':[0,2,0,1,0,0],maj7:[0,null,1,1,0,0],m7:[0,2,0,0,0,0],sus4:[0,2,2,2,0,0]};
  const D={major:[null,null,0,2,3,2],minor:[null,null,0,2,3,1],'7':[null,null,0,2,1,2],maj7:[null,null,0,2,2,2],m7:[null,null,0,2,1,1],sus2:[null,null,0,2,3,0],sus4:[null,null,0,2,3,3]};
  // Familiar standard voicings take precedence over transposed closed shapes.
  const OPEN={
    '0:major':[[null,3,2,0,1,0]],'2:major':[[null,null,0,2,3,2]],'4:major':[[0,2,2,1,0,0]],'5:major':[[null,null,3,2,1,1],[1,3,3,2,1,1]],'7:major':[[3,2,0,0,0,3],[3,2,0,0,3,3]],'9:major':[[null,0,2,2,2,0]],
    '2:minor':[[null,null,0,2,3,1]],'4:minor':[[0,2,2,0,0,0]],'9:minor':[[null,0,2,2,1,0]],
    '0:7':[[null,3,2,3,1,0]],'2:7':[[null,null,0,2,1,2]],'4:7':[[0,2,0,1,0,0]],'7:7':[[3,2,0,0,0,1]],'9:7':[[null,0,2,0,2,0]],'11:7':[[null,2,1,2,0,2]],
    '0:maj7':[[null,3,2,0,0,0]],'2:maj7':[[null,null,0,2,2,2]],'4:maj7':[[0,null,1,1,0,0]],'5:maj7':[[null,null,3,2,1,0]],'7:maj7':[[3,null,0,0,0,2]],'9:maj7':[[null,0,2,1,2,0]],
    '2:m7':[[null,null,0,2,1,1]],'4:m7':[[0,2,0,0,0,0],[0,2,2,0,3,0]],'9:m7':[[null,0,2,0,1,0]],
    '0:sus2':[[null,3,0,0,1,3]],'2:sus2':[[null,null,0,2,3,0]],'4:sus2':[[0,2,4,4,0,0]],'7:sus2':[[3,0,0,0,3,3]],'9:sus2':[[null,0,2,2,0,0]],
    '0:sus4':[[null,3,3,0,1,1]],'2:sus4':[[null,null,0,2,3,3]],'4:sus4':[[0,2,2,2,0,0]],'7:sus4':[[3,3,0,0,1,3]],'9:sus4':[[null,0,2,2,3,0]],
    '0:add9':[[null,3,2,0,3,3],[null,3,2,0,3,null]],'2:add9':[[null,5,4,2,3,0]],'4:add9':[[0,2,4,1,0,0]],'7:add9':[[3,2,0,2,0,3]],'9:add9':[[null,0,2,4,2,0]]
  };
  function guitarNotes(frets){return frets.flatMap((f,i)=>f===null?[]:[TUNING[i]+f]);}
  function validFrets(frets,item) {
    if(frets.length!==6 || frets.some(f=>f!==null&&(!Number.isInteger(f)||f<0||f>16))) return false;
    const actual=new Set(guitarNotes(frets).map(mod));
    return actual.size===item.voicingTones.length&&item.voicingTones.every(t=>actual.has(t.pc));
  }
  function fingerCount(frets) {
    // One finger may bar strings only if no sounding lower fret lies between.
    let count=0;
    for(const f of new Set(frets.filter(v=>v>0))) {
      let inRun=false;
      for(const v of frets) {
        if(v!==null&&v<f) inRun=false;
        if(v===f&&!inRun){count++;inRun=true;}
      }
    }
    return count;
  }
  const shapeCache=new Map();
  function guitar(root,typeId) {
    const key=root+':'+typeId;
    if(shapeCache.has(key)) return shapeCache.get(key);
    const item=chord(root,typeId),shapes=[],seen=new Set();
    function add(frets,preferred=false) {
      const id=frets.map(f=>f===null?'x':f).join('-');
      if(seen.has(id)||!validFrets(frets,item)||fingerCount(frets)>4) return;
      seen.add(id);
      const pressed=frets.filter(f=>f>0),low=Math.min(...pressed),high=Math.max(...pressed);
      const bass=mod(Math.min(...guitarNotes(frets)));
      const open=frets.some(f=>f===0);
      shapes.push({id,frets,preferred,bass,start:high<=4?1:low,fingers:fingerCount(frets),score:(preferred?-1000:0)+high*1.7+(high-low)*3+fingerCount(frets)*2-(open?2:0)});
    }
    (OPEN[key]||[]).forEach(f=>add(f,true));
    for(const [family,base] of [[A,9],[E,4],[D,2]]) {
      if(family[typeId]) add(family[typeId].map(f=>f===null?null:f+mod(root-base)));
    }
    if(typeId==='add9') {
      let r=mod(root-2); if(r<2)r+=12;
      add([null,null,r,r-1,r-2,r]);
      r=mod(root-9);if(r<3)r+=12;
      add([null,r,r-1,r-3,r,null]);
    }
    if(item.type.jazz){
      // Enumerate small, physically bounded grips; no invented chord dictionary entries.
      const pcs=item.voicingTones.map(t=>t.pc);
      const groups=pcs.length===3?[[1,2,3],[2,3,4],[3,4,5]]:[[0,2,3,4],[1,2,3,4],[2,3,4,5],[0,2,3,5]];
      for(const group of groups){
        const candidates=group.map(string=>Array.from({length:16},(_,f)=>f).filter(f=>pcs.includes(mod(TUNING[string]+f))));
        function walk(i,frets,notes){
          if(i===group.length){add(frets);return;}
          for(const f of candidates[i]){
            const pc=mod(TUNING[group[i]]+f);if(notes.includes(pc))continue;
            const pressed=frets.filter(v=>v>0).concat(f>0?[f]:[]);
            if(pressed.length&&Math.max(...pressed)-Math.min(...pressed)>3)continue;
            const next=frets.slice();next[group[i]]=f;walk(i+1,next,notes.concat(pc));
          }
        }
        walk(0,Array(6).fill(null),[]);
      }
      shapes.forEach(s=>{s.score+=s.bass===root?-12:5;});
    }
    shapes.sort((a,b)=>a.score-b.score);
    if(item.type.jazz)shapes.splice(6);
    shapes.forEach((s,i)=>{
      s.label=i===0?'Standardgriff':s.frets.some(f=>f===0)?'Offene Variante':s.frets.filter(f=>f!==null).length===4?'Kompakter Griff':'Geschlossener Griff';
      if(s.bass!==root) s.label+=' · '+item.tones.find(t=>t.pc===s.bass).name+' im Bass';
    });
    shapeCache.set(key,shapes);
    return shapes;
  }
  function inversionName(n,typeId){
    const type=TYPES.find(t=>t.id===typeId);
    if(type?.jazz){const tone=chord(0,typeId).voicingTones[n];return ({1:'Grundton',3:'Terz',4:'Quarte',5:'Quinte',6:'Sexte',7:'Septime',9:'None',11:'Undezime',13:'Tredezime'}[tone.degree]||'Akkordton')+' im Bass';}
    return n===0?'Grundstellung':typeId==='add9'&&n===3?'None im Bass':n+'. Umkehrung';
  }
  function isWhite(n){return ![1,3,6,8,10].includes(mod(n));}
  function keyboardRange(notes) {
    let lo=Math.min(...notes)-1,hi=Math.max(...notes)+1;
    while(!isWhite(lo))lo--;
    while(!isWhite(hi))hi++;
    while(Array.from({length:hi-lo+1},(_,i)=>lo+i).filter(isWhite).length<8){hi++;while(!isWhite(hi))hi++;}
    return {lo,hi};
  }
  const octave=(midi,tone)=>Math.floor(midi/12)-1+tone.octaveShift;
  const api={ROOTS,TYPES,COLORS,TUNING,mod,chord,piano,guitar,guitarNotes,validFrets,fingerCount,inversionName,isWhite,keyboardRange,octave};
  scope.AkkordMusic=api;
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
