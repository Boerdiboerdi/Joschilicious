(function(){
  'use strict';
  let context,active=[],master,generation=0;
  function stop(){generation++;for(const node of active){try{node.stop();}catch{}}active=[];}
  async function play(notes,instrument,volume=.55){
    stop();const ticket=generation;
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio) throw new Error('Dieser Browser unterstützt die Klangwiedergabe nicht.');
    if(!context){context=new Audio();master=context.createGain();master.connect(context.destination);}
    if(context.state==='suspended')await context.resume();
    if(ticket!==generation)return 0;
    if(context.state!=='running') throw new Error('Bitte aktiviere die Tonwiedergabe in deinem Browser.');
    master.gain.setValueAtTime(Math.max(0,Math.min(1,volume))*.27/Math.sqrt(notes.length),context.currentTime);
    const start=context.currentTime+.025;
    const guitar=instrument==='guitar';
    notes.forEach((midi,i)=>{
      const at=start+(guitar?i*.055:0);
      const freq=440*2**((midi-69)/12);
      const harmonics=guitar?[1,.5,.3,.15,.08]:[1,.34,.13,.06];
      harmonics.forEach((amplitude,h)=>{
        if(freq*(h+1)>context.sampleRate*.45)return;
        const oscillator=context.createOscillator(),envelope=context.createGain();
        oscillator.type='sine';oscillator.frequency.value=freq*(h+1);
        const length=(guitar?1.8:2.5)/(1+h*.38);
        envelope.gain.setValueAtTime(0,at);
        envelope.gain.linearRampToValueAtTime(amplitude,at+(guitar?.003:.008));
        envelope.gain.exponentialRampToValueAtTime(.001,at+length);
        envelope.gain.linearRampToValueAtTime(0,at+length+.06);
        oscillator.connect(envelope);envelope.connect(master);
        oscillator.start(at);oscillator.stop(at+length+.08);
        oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();active=active.filter(n=>n!==oscillator);};
        active.push(oscillator);
      });
    });
    return (guitar?1.9+(notes.length-1)*.055:2.6)*1000;
  }
  window.AkkordAudio={play,stop};
})();
