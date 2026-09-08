(function(){
  'use strict';
  const M=window.AkkordMusic,$=id=>document.getElementById(id);
  const STORE='akkordbruecke-v1';
  const state={root:0,type:'major',guitar:0,inversion:0,volume:.55,favorites:[]};
  let toastTimer,playingTimer,installPrompt,offlineReady=false,storageOK=true,playGeneration=0;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function validSelection(s){return s&&Number.isInteger(s.root)&&s.root>=0&&s.root<12&&M.TYPES.some(t=>t.id===s.type)&&Number.isInteger(s.inversion)&&s.inversion>=0&&s.inversion<M.chord(s.root,s.type).tones.length;}
  function validFavorite(f){return validSelection(f)&&typeof f.shape==='string'&&M.guitar(f.root,f.type).some(s=>s.id===f.shape);}
  function favoriteKey(f){return `${f.root}:${f.type}:${f.shape}:${f.inversion}`;}
  function readStorage(){
    try{
      const saved=JSON.parse(localStorage.getItem(STORE)||'null');
      if(saved){
        if(Number.isFinite(saved.volume))state.volume=Math.max(0,Math.min(1,saved.volume));
        if(Array.isArray(saved.favorites)){
          const seen=new Set();state.favorites=saved.favorites.filter(validFavorite).filter(f=>{const k=favoriteKey(f);if(seen.has(k))return false;seen.add(k);return true;}).slice(0,500);
        }
        if(validSelection(saved.current)){
          state.root=saved.current.root;state.type=saved.current.type;state.inversion=saved.current.inversion;
          state.guitar=Math.max(0,M.guitar(state.root,state.type).findIndex(s=>s.id===saved.current.shape));
        }
      }
      localStorage.setItem(STORE+'-check','1');localStorage.removeItem(STORE+'-check');
    }catch{storageOK=false;}
  }
  function current(){return {root:state.root,type:state.type,shape:M.guitar(state.root,state.type)[state.guitar].id,inversion:state.inversion};}
  function save(){
    try{localStorage.setItem(STORE,JSON.stringify({version:1,volume:state.volume,favorites:state.favorites,current:current()}));storageOK=true;}
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
    const width=330,height=274,x0=55,gap=44,top=44,step=43;
    const maxFret=Math.max(...shape.frets.filter(v=>v!==null)),rows=Math.max(4,maxFret-shape.start+1),dy=Math.min(step,172/rows);
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
      svg+=`<circle cx="${x}" cy="${y}" r="16" fill="${open?'#fff':tone.color}" stroke="${tone.color}" stroke-width="2"/><text x="${x}" y="${y+5}" fill="${open?tone.color:'#fff'}" text-anchor="middle" font-size="15" font-weight="600">${tone.name}</text>`;
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
    $('root').value=state.root;$('type').value=state.type;$('chord-title').textContent=item.title;document.title=item.title+' · Akkordbrücke';
    $('tone-legend').innerHTML=item.tones.map(t=>`<span class="tone-chip"><span class="tone-dot" style="--tone:${t.color}" aria-hidden="true"></span>${escape(t.name)}</span>`).join('');
    $('guitar-label').textContent=shape.label;$('guitar-diagram').innerHTML=guitarDiagram(item,shape);
    $('guitar-position').textContent=`Griff ${state.guitar+1} von ${shapes.length}`;
    $('guitar-count').textContent=shape.start===1?'Offene Lage':`Ab Bund ${shape.start}`;
    const notes=M.piano(state.root,state.type,state.inversion);pianoDiagram(item,notes);
    $('piano-position').textContent=M.inversionName(state.inversion,state.type);$('piano-count').textContent=`${state.inversion+1} von ${item.tones.length}`;
    updateFavorite();$('storage-warning').hidden=storageOK;
  }
  function selectChord(){stopSound();state.root=Number($('root').value);state.type=$('type').value;state.guitar=0;state.inversion=0;render();save();}
  function move(instrument,direction){stopSound();if(instrument==='guitar'){const n=M.guitar(state.root,state.type).length;state.guitar=(state.guitar+direction+n)%n;}else{const n=M.chord(state.root,state.type).tones.length;state.inversion=(state.inversion+direction+n)%n;}render();save();}
  function openDialog(title,html){$('dialog-title').textContent=title;$('dialog-content').innerHTML=html;if(!$('detail-dialog').open)$('detail-dialog').showModal();}
  function favorites(){
    const html=state.favorites.length?state.favorites.map((f,i)=>{
      const item=M.chord(f.root,f.type),shape=M.guitar(f.root,f.type).find(s=>s.id===f.shape);
      return `<div class="favorite-row"><button class="favorite-load" data-load="${i}"><span>${escape(item.title)}</span><small>${escape(shape.label)} · ${escape(M.inversionName(f.inversion,f.type))}</small></button><button class="remove-favorite" data-remove="${i}" aria-label="${escape(item.title)} aus Favoriten entfernen">×</button></div>`;
    }).join(''):'<div class="empty-state">Hier ist Platz für deine Akkorde. Tippe auf den Stern neben der Auswahl, um Akkord, Gitarrengriff und Klavierumkehrung gemeinsam zu speichern.</div>';
    openDialog('Deine Favoriten',html);
    document.querySelectorAll('[data-load]').forEach(b=>b.addEventListener('click',()=>{
      const f=state.favorites[Number(b.dataset.load)];stopSound();state.root=f.root;state.type=f.type;state.inversion=f.inversion;state.guitar=M.guitar(f.root,f.type).findIndex(s=>s.id===f.shape);render();save();$('detail-dialog').close();
    }));
    document.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{state.favorites.splice(Number(b.dataset.remove),1);save();updateFavorite();favorites();toast('Favorit entfernt');}));
  }
  function examples(){
    const item=M.chord(state.root,state.type),matches=window.AkkordSongs.filter(s=>s.chords.includes(state.root+':'+state.type));
    const intro='<p class="dialog-intro">Der ausgewählte Akkord kommt in diesen verlinkten Fassungen vor. Die Umkehrung kann abweichen. Externe Seiten benötigen Internet; einzelne Inhalte können ein Konto erfordern.</p>';
    openDialog('Beispiele für '+item.symbol,intro+(matches.length?matches.map(s=>`<article class="song"><h3>${escape(s.title)}</h3><span class="artist">${escape(s.artist)}</span><p>${escape(s.note)}</p><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.linkLabel)} ↗</a><p class="artist">${escape(s.source)} · geprüft am 08.09.2026</p></article>`).join(''):'<div class="empty-state">Für '+escape(item.symbol)+' ist in der kleinen Startsammlung noch kein geprüftes Lied hinterlegt. Deine Akkordansicht funktioniert vollständig weiter.</div>'));
  }
  function options(){
    const local=location.protocol==='file:'||window.AKKORD_PORTABLE;
    const install=local?'<p>Diese Datei kannst du direkt ausprobieren. Für die Installation auf dem Android-Startbildschirm wird die App zusätzlich über einen Web-Link bereitgestellt.</p>':window.matchMedia('(display-mode: standalone)').matches?'<p>Die App ist bereits im eigenen Fenster geöffnet.</p>':`<p>Öffne diese App auf deinem Android-Handy im Browser.</p><ol><li>Öffne das Browsermenü.</li><li>Wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.</li><li>Warte einmal auf „Offline bereit“.</li></ol>${installPrompt?'<button id="install-app">App installieren</button>':''}`;
    openDialog('Optionen',`<section class="option"><label for="volume">Lautstärke <input id="volume" type="range" min="0" max="100" value="${Math.round(state.volume*100)}" aria-label="Lautstärke"></label><p>Die synthetischen Instrumentenklänge entstehen direkt auf deinem Gerät.</p></section><section class="option"><h3>Auf Android installieren</h3>${install}</section><section class="option"><h3>Offline & Favoriten</h3><p>${escape($('offline-status').textContent)} Favoriten werden auf diesem Gerät gespeichert; sie werden nicht mit anderen Geräten synchronisiert.</p></section><section class="option"><h3>Notennamen</h3><p>Deutsche Schreibweise: H entspricht dem internationalen B, deutsches B dem internationalen B♭. Gleiche Tonhöhen erhalten dieselbe Farbe, auch in unterschiedlichen Oktaven. C4 ist das mittlere C.</p></section><section class="option"><h3>Version 1</h3><p>96 Akkorde · Standardstimmung · linke Hand. Erweiterte Jazzakkorde, eigene Farben und ausführliche Akkordfunktionen sind für später vorgesehen.</p></section>`);
    $('volume').addEventListener('input',()=>{state.volume=Number($('volume').value)/100;save();});
    if($('install-app'))$('install-app').addEventListener('click',async()=>{try{await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;options();}catch{toast('Bitte nutze die Installation über dein Browsermenü.');}});
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
  readStorage();
  $('root').innerHTML=M.ROOTS.map(r=>`<option value="${r.pc}">${r.name}</option>`).join('');
  $('type').innerHTML=M.TYPES.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
  $('root').addEventListener('change',selectChord);$('type').addEventListener('change',selectChord);
  for(const instrument of ['guitar','piano']){for(const direction of ['prev','next'])$(instrument+'-'+direction).addEventListener('click',()=>move(instrument,direction==='next'?1:-1));$('play-'+instrument).addEventListener('click',()=>play(instrument));}
  $('favorite-toggle').addEventListener('click',()=>{
    const f=current(),index=state.favorites.findIndex(v=>favoriteKey(v)===favoriteKey(f));
    if(index>=0)state.favorites.splice(index,1);else state.favorites.push(f);
    const persisted=save();updateFavorite();toast(persisted?(index>=0?'Favorit entfernt':'Akkord und Varianten gespeichert'):'Nur für diese Sitzung gespeichert');
  });
  $('open-favorites').addEventListener('click',favorites);$('open-examples').addEventListener('click',examples);$('open-options').addEventListener('click',options);
  $('close-dialog').addEventListener('click',()=>$('detail-dialog').close());
  $('detail-dialog').addEventListener('click',e=>{if(e.target===$('detail-dialog')){const r=$('detail-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('detail-dialog').close();}});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
  window.addEventListener('appinstalled',()=>{installPrompt=null;toast('Akkordbrücke ist installiert');});
  window.addEventListener('online',offlineStatus);window.addEventListener('offline',offlineStatus);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSound();});
  render();setupOffline();
})();
