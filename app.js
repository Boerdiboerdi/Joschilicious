(function(){
  'use strict';
  const M=window.AkkordMusic,$=id=>document.getElementById(id);
  const STORE='akkordbruecke-v1';
  const state={root:0,type:'major',guitar:0,inversion:0,volume:.55,jazz:false,favorites:[]};
  let toastTimer,playingTimer,offlineReady=false,storageOK=true,playGeneration=0;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function validSelection(s){return s&&Number.isInteger(s.root)&&s.root>=0&&s.root<12&&M.TYPES.some(t=>t.id===s.type)&&Number.isInteger(s.inversion)&&s.inversion>=0&&s.inversion<M.chord(s.root,s.type).voicingTones.length;}
  function validFavorite(f){return validSelection(f)&&typeof f.shape==='string'&&M.guitar(f.root,f.type).some(s=>s.id===f.shape);}
  function favoriteKey(f){return `${f.root}:${f.type}:${f.shape}:${f.inversion}`;}
  function readStorage(){
    try{
      const saved=JSON.parse(localStorage.getItem(STORE)||'null');
      if(saved){
        state.jazz=saved.jazz===true;
        if(Number.isFinite(saved.volume))state.volume=Math.max(0,Math.min(1,saved.volume));
        if(Array.isArray(saved.favorites)){
          const seen=new Set();state.favorites=saved.favorites.filter(validFavorite).filter(f=>{const k=favoriteKey(f);if(seen.has(k))return false;seen.add(k);return true;}).slice(0,500);
        }
        if(validSelection(saved.current)){
          state.root=saved.current.root;state.type=saved.current.type;state.inversion=saved.current.inversion;
          state.guitar=Math.max(0,M.guitar(state.root,state.type).findIndex(s=>s.id===saved.current.shape));
        }
      }
      if(M.chord(state.root,state.type).type.jazz)state.jazz=true;
      localStorage.setItem(STORE+'-check','1');localStorage.removeItem(STORE+'-check');
    }catch{storageOK=false;}
  }
  function current(){return {root:state.root,type:state.type,shape:M.guitar(state.root,state.type)[state.guitar].id,inversion:state.inversion};}
  function save(){
    try{localStorage.setItem(STORE,JSON.stringify({version:2,jazz:state.jazz,volume:state.volume,favorites:state.favorites,current:current()}));storageOK=true;}
    catch{storageOK=false;}
    $('storage-warning').hidden=storageOK;
    return storageOK;
  }
  function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2800);}
  function stopSound(){playGeneration++;clearTimeout(playingTimer);window.AkkordAudio.stop();['play-guitar','play-piano'].forEach(id=>{$(id).classList.remove('playing');$(id).setAttribute('aria-label',id==='play-guitar'?'Gitarrengriff anhören':'Klavierumkehrung anhören');});}
  async function play(instrument){
    stopSound();const generation=playGeneration;
    const notes=instrument==='guitar'?M.guitarNotes(M.guitar(state.root,state.type)[state.guitar].frets):M.piano(state.root,state.type,state.inversion);
    try{const duration=await window.AkkordAudio.play(notes,instrument,state.volume);if(generation!==playGeneration)return;const b=$('play-'+instrument);b.classList.add('playing');b.setAttribute('aria-label','Wird abgespielt');playingTimer=setTimeout(()=>{b.classList.remove('playing');b.setAttribute('aria-label',instrument==='guitar'?'Gitarrengriff anhören':'Klavierumkehrung anhören');},duration);}
    catch(error){toast(error.message||'Der Klang konnte nicht abgespielt werden.');}
  }
  function guitarDiagram(item,shape){
    const width=330,height=200,x0=55,gap=44,top=39,step=32;
    const maxFret=Math.max(...shape.frets.filter(v=>v!==null)),rows=Math.max(4,maxFret-shape.start+1),dy=Math.min(step,128/rows);
    const toneFor=midi=>item.tones.find(t=>t.pc===M.mod(midi));
    const description=shape.frets.map((f,i)=>f===null?`${6-i}. Saite stumm`:`${6-i}. Saite ${f===0?'leer':'Bund '+f}: ${toneFor(M.TUNING[i]+f).name}`).join(', ');
    let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(item.title+', '+description)}"><title>${escape(item.title+' auf der Gitarre')}</title>`;
    for(let r=0;r<=rows;r++)svg+=`<line x1="${x0}" y1="${top+r*dy}" x2="${x0+gap*5}" y2="${top+r*dy}" stroke="${r===0&&shape.start===1?'#182b31':'#d5dfdf'}" stroke-width="${r===0&&shape.start===1?4:1}"/>`;
    for(let i=0;i<6;i++){
      const x=x0+i*gap;
      svg+=`<line x1="${x}" y1="${top}" x2="${x}" y2="${top+rows*dy}" stroke="#52666c" stroke-width="${1.8-i*.19}"/><text x="${x}" y="${top+rows*dy+25}" fill="#52666c" text-anchor="middle" font-size="15">${['E','A','D','G','H','E'][i]}</text>`;
      const f=shape.frets[i];
      if(f===null){svg+=`<text x="${x}" y="26" fill="#52666c" text-anchor="middle" font-size="23">×</text>`;continue;}
      const tone=toneFor(M.TUNING[i]+f),open=f===0,y=open?20:top+(f-shape.start+.5)*dy;
      svg+=`<circle cx="${x}" cy="${y}" r="16" fill="${open?'#fff':tone.color}" stroke="${tone.color}" stroke-width="2"/><text x="${x}" y="${y+5}" fill="${open?tone.color:'#fff'}" text-anchor="middle" font-size="17" font-weight="600">${tone.name}</text>`;
    }
    for(let r=0;r<rows;r++)svg+=`<text x="29" y="${top+(r+.5)*dy+5}" fill="#52666c" text-anchor="middle" font-size="15">${shape.start+r}</text>`;
    return svg+'</svg>';
  }
  function pianoDiagram(item,notes){
    const range=M.keyboardRange(notes),whites=[];
    for(let n=range.lo;n<=range.hi;n++)if(M.isWhite(n))whites.push(n);
    const active=new Set(notes),toneFor=n=>item.tones.find(t=>t.pc===M.mod(n));
    const mark=n=>active.has(n)?`<span class="key-note">${escape(toneFor(n).name)}</span>`:M.mod(n)===0?`<span class="key-c">C${Math.floor(n/12)-1}</span>`:'';
    let html='';
    whites.forEach(n=>html+=`<div class="piano-key${active.has(n)?' active':''}" ${active.has(n)?`style="--tone:${toneFor(n).color}"`:''} aria-hidden="true">${mark(n)}</div>`);
    for(let n=range.lo;n<=range.hi;n++)if(!M.isWhite(n)){
      const position=whites.filter(w=>w<n).length/whites.length*100;
      const width=60/whites.length;
      html+=`<div class="piano-key black${active.has(n)?' active':''}" style="--left:${position-width/2}%;--black-width:${width}%;${active.has(n)?'--tone:'+toneFor(n).color:''}" aria-hidden="true">${mark(n)}</div>`;
    }
    $('piano-diagram').innerHTML=html;
    $('piano-diagram').setAttribute('role','img');
    $('piano-diagram').setAttribute('aria-label','Linke Hand: '+notes.map(n=>toneFor(n).name+' '+M.octave(n,toneFor(n))).join(', ')+', von tief nach hoch');
    $('piano-notes').innerHTML=notes.map(n=>`<span style="--tone:${toneFor(n).color}">${escape(toneFor(n).name)}<small>${M.octave(n,toneFor(n))}</small></span>`).join('');
  }
  function updateFavorite(){
    const isSaved=state.favorites.some(f=>favoriteKey(f)===favoriteKey(current()));
    $('favorite-toggle').textContent=isSaved?'★':'☆';$('favorite-toggle').setAttribute('aria-pressed',String(isSaved));
    $('favorite-toggle').setAttribute('aria-label',isSaved?'Aktuelle Kombination aus Favoriten entfernen':'Aktuelle Kombination als Favorit speichern');
    $('favorite-toggle').title=isSaved?'Aus Favoriten entfernen':'Als Favorit speichern';$('favorites-count').textContent=state.favorites.length;
  }
  function render(){
    const item=M.chord(state.root,state.type),shapes=M.guitar(state.root,state.type),shape=shapes[state.guitar];
    $('root').value=state.root;$('type').value=state.type;$('chord-title').textContent=item.title;document.title=item.title+' · GuitarPianoDicc';
    $('tone-legend').innerHTML=item.tones.map(t=>`<span class="tone-chip${item.omitted.includes(t)?' omitted':''}" title="${item.omitted.includes(t)?'In den kompakten Griffen ausgelassen':'Gespielter Akkordton'}"><span class="tone-dot" style="--tone:${t.color}" aria-hidden="true"></span>${escape(t.name)}</span>`).join('');
    $('voicing-note').hidden=!item.omitted.length;$('voicing-note').textContent=item.omitted.length?'Kompakte Griffe · ohne '+item.omitted.map(t=>t.name).join(', '):'';
    $('guitar-label').textContent=shape.label;$('guitar-diagram').innerHTML=guitarDiagram(item,shape);
    $('guitar-position').textContent=`Griff ${state.guitar+1} von ${shapes.length}`;
    $('guitar-count').textContent=shape.start===1?'Offene Lage':`Ab Bund ${shape.start}`;
    const notes=M.piano(state.root,state.type,state.inversion);pianoDiagram(item,notes);
    $('piano-position').textContent=M.inversionName(state.inversion,state.type);$('piano-count').textContent=`${state.inversion+1} von ${item.voicingTones.length}`;
    updateFavorite();$('storage-warning').hidden=storageOK;
  }
  function selectChord(){stopSound();state.root=Number($('root').value);state.type=$('type').value;state.guitar=0;state.inversion=0;render();save();}
  function move(instrument,direction){stopSound();if(instrument==='guitar'){const n=M.guitar(state.root,state.type).length;state.guitar=(state.guitar+direction+n)%n;}else{const n=M.chord(state.root,state.type).voicingTones.length;state.inversion=(state.inversion+direction+n)%n;}render();save();}
  function openDialog(title,html){$('dialog-title').textContent=title;$('dialog-content').innerHTML=html;if(!$('detail-dialog').open)$('detail-dialog').showModal();}
  function explanation(){
    const shape=M.guitar(state.root,state.type)[state.guitar];
    const info=window.GPDExplanations.describe(state.root,state.type,state.inversion,shape);
    const sequence=tones=>tones.map(t=>t.name).join('–');
    const rows=info.tones.map(t=>`<div class="explanation-tone"><dt><span class="tone-dot" style="--tone:${t.color}" aria-hidden="true"></span>${escape(t.name)}</dt><dd>${escape(t.role)}</dd></div>`).join('');
    openDialog('Erklärung: '+info.symbol,`<article class="chord-explanation"><p class="explanation-formula">${escape(sequence(info.tones))}</p><p>${escape(info.base)}</p><p>${escape(info.change)}</p><p class="explanation-sound">${escape(info.sound)}</p><details><summary>Töne und angezeigte Griffe im Detail</summary><dl class="explanation-tones">${rows}</dl><p>${escape(info.voicing)}</p><h3>Klavier · linke Hand</h3><p>Tief → hoch: <strong>${escape(sequence(info.piano))}</strong></p><p>${escape(info.position)}</p><h3>Gitarre · gewählter Griff</h3><p>Tief → hoch: <strong>${escape(sequence(info.guitar))}</strong></p><p>${escape(info.guitarPosition)}</p><p class="explanation-hint">None, Undezime und Tredezime benennen die Akkordfunktion. Im kompakten Griff können diese Töne eine Oktave tiefer liegen. H und B sind deutsche Notennamen; ♭♭ und ♯♯ bedeuten eine Erniedrigung beziehungsweise Erhöhung um zwei Halbtöne.</p></details></article>`);
  }
  function favorites(){
    const html=state.favorites.length?state.favorites.map((f,i)=>{
      const item=M.chord(f.root,f.type),shape=M.guitar(f.root,f.type).find(s=>s.id===f.shape);
      return `<div class="favorite-row"><button class="favorite-load" data-load="${i}"><span>${escape(item.title)}</span><small>${escape(shape.label)} · ${escape(M.inversionName(f.inversion,f.type))}</small></button><button class="remove-favorite" data-remove="${i}" aria-label="${escape(item.title)} aus Favoriten entfernen">×</button></div>`;
    }).join(''):'<div class="empty-state">Hier ist Platz für deine Akkorde. Tippe auf den Stern neben der Auswahl, um Akkord, Gitarrengriff und Klavierumkehrung gemeinsam zu speichern.</div>';
    openDialog('Deine Favoriten',html);
    document.querySelectorAll('[data-load]').forEach(b=>b.addEventListener('click',()=>{
      const f=state.favorites[Number(b.dataset.load)];stopSound();state.root=f.root;state.type=f.type;state.inversion=f.inversion;state.guitar=M.guitar(f.root,f.type).findIndex(s=>s.id===f.shape);if(M.chord(f.root,f.type).type.jazz)state.jazz=true;populateTypes();render();save();$('detail-dialog').close();
    }));
    document.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{state.favorites.splice(Number(b.dataset.remove),1);save();updateFavorite();favorites();toast('Favorit entfernt');}));
  }
  function examples(){
    const item=M.chord(state.root,state.type),groups=window.GPDSongMatches(state.root,state.type);
    const shiftText=n=>`${Math.abs(n)} Halbton${Math.abs(n)===1?'':'schritte'} ${n<0?'abwärts':'aufwärts'}`;
    const link=s=>`<a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.linkLabel)} ↗</a><p class="artist">${escape(s.source)}</p>`;
    const card=(entry,kind)=>{
      const s=entry.song,original=entry.from===undefined?'':M.chord(entry.from,state.type).symbol;
      let tag=kind==='exact'?'Passende Akkordfassung':kind==='transposed'?'Zum Transponieren':'Akkordtyp in einer Studie';
      let instruction=kind==='exact'?`${item.symbol} ist in der verlinkten Fassung enthalten. Griff und Umkehrung können abweichen.`:kind==='transposed'?`${original} → ${item.symbol}: Verschiebe das ganze Stück um ${shiftText(entry.shift)}. Der Link öffnet die unveränderte Ausgangsfassung.`:'Die Studie behandelt diesen Akkordtyp. Der gewählte Grundton ist damit noch nicht bestätigt; passe die Tonart der passenden Stelle an.';
      if(kind==='idea'){
        tag='Eigene Übevariante · veränderte Harmonie';
        const base=M.chord(entry.from,entry.family).symbol,target=M.chord(state.root,entry.family).symbol;
        instruction=`Ausgangsakkord im verlinkten Lied: ${base}. ${entry.shift?'Transponiere zunächst das ganze Stück um '+shiftText(entry.shift)+'. ':''}Übe dann ohne Gesang den Wechsel ${target} → ${item.symbol} → ${target}. Das ist eine neue Klangübung zur Ausgangsfassung; der ausgewählte Jazz- oder Zusatzakkord ist für diesen Song nicht belegt. Prüfe später, ob die Melodie dazu passt.`;
      }
      return `<article class="song"><h3>${escape(s.title)}</h3><span class="artist">${escape(s.artist)}</span><span class="song-tag">${tag}</span><p>${escape(instruction)}</p><p>${escape(s.note)}</p>${link(s)}</article>`;
    };
    const section=(title,list,kind)=>list.length?`<h3 class="example-heading">${title} (${list.length})</h3>`+list.map(e=>card(e,kind)).join(''):'';
    let html='<p class="dialog-intro">Lieder, Studien und Klangübungen zum ausgewählten Akkord. Quellen geprüft am 08.09.2026. Externe Lektionen und Tabs brauchen Internet; einzelne Downloads sind kostenpflichtig. Die App verwendet H/B, viele Quellen B/B♭.</p>';
    html+=section('Passende Fassungen',groups.exact,'exact');
    if(!groups.exact.length)html+='<p class="dialog-intro">Für diesen genauen Grundton und Akkordtyp ist bisher keine Fassung belegt. Unten findest du Alternativen mit klarer Kennzeichnung.</p>';
    html+=section('Denselben Akkordtyp transponieren',groups.transposed,'transposed')+section('Studien zum Akkordtyp',groups.studies,'study');
    if(['sus2','sus4','7sus4'].includes(state.type))html+='<h3 class="example-heading">Weitere Lieder mit Sus-Klängen</h3><p class="dialog-intro">Diese Sammellektion zeigt verschiedene Sus-Griffe. Grundton und genaue Sus-Variante bitte an der angegebenen Videostelle prüfen.</p>'+window.GPDSusSongs.map(([title,artist,time])=>`<article class="song"><h3>${escape(title)}</h3><span class="artist">${escape(artist)} · ab ${time}</span><a href="https://www.andyguitar.co.uk/videos/10-great-songs-that-use-sus-chords" target="_blank" rel="noopener noreferrer">Andy Guitar · Sammellektion & Tab-Links ↗</a></article>`).join('');
    if(groups.ideas.length)html+='<details><summary>Eigene Klangübungen mit weiteren Liedern ('+groups.ideas.length+')</summary>'+section('Bewusst veränderte Begleitung',groups.ideas,'idea')+'</details>';
    openDialog('Beispiele für '+item.symbol,html);
  }
  function options(){
    const local=location.protocol==='file:'||window.AKKORD_PORTABLE;
    const install=local?'<p>Diese Datei kannst du direkt ausprobieren. Für die Installation auf dem Android-Startbildschirm wird die App zusätzlich über einen Web-Link bereitgestellt.</p>':window.GPDInstall?.installed?'<p>Die App ist bereits installiert.</p>':`<p>Öffne diese App auf deinem Android-Handy im Browser.</p><ol><li>Öffne das Browsermenü.</li><li>Wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.</li><li>Warte einmal auf „Offline bereit“.</li></ol>`;
    openDialog('Optionen',`<section class="option"><label for="jazz-toggle">Komplexe Jazzakkorde <input id="jazz-toggle" type="checkbox" role="switch" ${state.jazz?'checked':''}></label><p>16 zusätzliche Typen, zum Beispiel maj9, m11, 13 und 7♯9. Erweiterte Akkorde werden mit höchstens vier Tönen gegriffen; ausgelassene Töne sind oben gekennzeichnet.</p></section><section class="option"><label for="volume">Lautstärke <input id="volume" type="range" min="0" max="100" value="${Math.round(state.volume*100)}" aria-label="Lautstärke"></label><p>Die synthetischen Instrumentenklänge entstehen direkt auf deinem Gerät.</p></section><section class="option"><h3>Auf Android installieren</h3>${install}</section><section class="option"><h3>Offline & Favoriten</h3><p>${escape($('offline-status').textContent)} Favoriten werden auf diesem Gerät gespeichert; sie werden nicht mit anderen Geräten synchronisiert.</p></section><section class="option"><h3>Notennamen</h3><p>Deutsche Schreibweise: H entspricht dem internationalen B, deutsches B dem internationalen B♭. Gleiche Tonhöhen erhalten dieselbe Farbe, auch in unterschiedlichen Oktaven. C4 ist das mittlere C.</p></section><section class="option"><h3>GuitarPianoDicc · Version 2.1</h3><p>288 Akkorde mit Jazzoption · Standardstimmung · linke Hand. Bei den Jazzakkorden wechselst du die Basslage des kompakten Griffs. Die vollständige Akkordformel kann mehr Töne enthalten.</p></section>`);
    $('jazz-toggle').addEventListener('change',()=>{stopSound();state.jazz=$('jazz-toggle').checked;if(!state.jazz&&M.chord(state.root,state.type).type.jazz){state.type='major';state.guitar=0;state.inversion=0;}populateTypes();render();save();});
    $('volume').addEventListener('input',()=>{state.volume=Number($('volume').value)/100;save();});
  }
  function offlineStatus(){
    if(window.AKKORD_PORTABLE||location.protocol==='file:'){$('offline-status').textContent='Dateiversion · Akkorde und Klang ohne Internet';return;}
    if(!('serviceWorker' in navigator)||!window.isSecureContext){$('offline-status').textContent='Offline-Speicherung ist in diesem Browser nicht verfügbar.';return;}
    $('offline-status').textContent=offlineReady?(navigator.onLine?'Offline bereit · auf diesem Gerät':'Offline · alle Akkorde verfügbar'):(navigator.onLine?'Offline-Nutzung wird vorbereitet …':'Noch nicht vollständig offline gespeichert. Bitte einmal online öffnen.');
  }
  async function setupOffline(){
    offlineStatus();
    if(window.AKKORD_PORTABLE||location.protocol==='file:'||!('serviceWorker' in navigator)||!window.isSecureContext)return;
    try{
      await navigator.serviceWorker.register('./sw.js',{scope:'./'});
      let timeout;
      const ready=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Offline-Vorbereitung dauert zu lange')),15000);})]).finally(()=>clearTimeout(timeout));
      function ask(){const worker=navigator.serviceWorker.controller||ready.active;if(worker)worker.postMessage({type:'CHECK_OFFLINE'});}
      navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='OFFLINE_READY'){offlineReady=e.data.ready===true;offlineStatus();}});
      navigator.serviceWorker.addEventListener('controllerchange',ask);ask();
    }catch{$('offline-status').textContent='Offline-Speicherung fehlgeschlagen. Bitte die Seite online neu laden.';}
  }
  function populateTypes(){const options=types=>types.map(t=>`<option value="${t.id}">${escape(t.name)}</option>`).join('');$('type').innerHTML='<optgroup label="Grundakkorde">'+options(M.TYPES.filter(t=>!t.jazz))+'</optgroup>'+(state.jazz?'<optgroup label="Jazzakkorde">'+options(M.TYPES.filter(t=>t.jazz))+'</optgroup>':'');}
  readStorage();
  $('root').innerHTML=M.ROOTS.map(r=>`<option value="${r.pc}">${r.name}</option>`).join('');
  populateTypes();
  $('root').addEventListener('change',selectChord);$('type').addEventListener('change',selectChord);
  for(const instrument of ['guitar','piano']){for(const direction of ['prev','next'])$(instrument+'-'+direction).addEventListener('click',()=>move(instrument,direction==='next'?1:-1));$('play-'+instrument).addEventListener('click',()=>play(instrument));}
  $('favorite-toggle').addEventListener('click',()=>{
    const f=current(),index=state.favorites.findIndex(v=>favoriteKey(v)===favoriteKey(f));
    if(index>=0)state.favorites.splice(index,1);else state.favorites.push(f);
    const persisted=save();updateFavorite();toast(persisted?(index>=0?'Favorit entfernt':'Akkord und Varianten gespeichert'):'Nur für diese Sitzung gespeichert');
  });
  $('open-explanation').addEventListener('click',explanation);
  $('open-favorites').addEventListener('click',favorites);$('open-examples').addEventListener('click',examples);$('open-options').addEventListener('click',options);
  $('close-dialog').addEventListener('click',()=>$('detail-dialog').close());
  $('detail-dialog').addEventListener('click',e=>{if(e.target===$('detail-dialog')){const r=$('detail-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('detail-dialog').close();}});
  window.addEventListener('appinstalled',()=>{toast('GuitarPianoDicc ist installiert');if($('detail-dialog').open&&$('dialog-title').textContent==='Optionen')options();});
  window.addEventListener('gpd-install-error',()=>toast('Bitte nutze die Installation über dein Browsermenü.'));
  window.addEventListener('online',offlineStatus);window.addEventListener('offline',offlineStatus);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSound();});
  render();setupOffline();
})();
