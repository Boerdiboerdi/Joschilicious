(function(scope){
  'use strict';
  const M=scope.AkkordMusic||(typeof require==='function'?require('./music.js'):null);
  // The base is a familiar triad; n() names tones of the selected chord.
  const TEXTS={
    major:['major',()=> 'Keine Erweiterung: Grundton, große Terz und reine Quinte bilden den Dur-Dreiklang. Die Terz liegt vier Halbtöne über dem Grundton.','hell, klar oder offen'],
    minor:['major',n=>`Die Dur-Terz wird um einen Halbton zur kleinen Terz (${n(3)}) erniedrigt. Grundton und Quinte bleiben gleich. So entsteht der Moll-Dreiklang.`,'weich, nachdenklich oder dunkel'],
    '7':['major',n=>`Eine kleine Septime (${n(7)}) kommt hinzu. Sie liegt einen Ganzton unter dem nächsten Grundton. Anders als bei maj7 ist die Septime hier klein.`,'bluesig, drängend oder spannungsvoll'],
    maj7:['major',n=>`Eine große Septime (${n(7)}) kommt hinzu. Sie liegt einen Halbton unter dem nächsten Grundton. Anders als bei einem 7-Akkord ist die Septime hier groß.`,'verträumt, jazzig oder weich'],
    m7:['minor',n=>`Eine kleine Septime (${n(7)}) kommt zum Moll-Dreiklang hinzu.`,'warm, entspannt oder melancholisch'],
    sus2:['major',n=>`Die Terz wird durch die große Sekunde (${n(2)}) ersetzt. Ohne Terz ist dieser Akkord weder eindeutig Dur noch Moll. Anders als bei add9 bleibt die Terz hier nicht erhalten.`,'offen, schwebend oder luftig'],
    sus4:['major',n=>`Die Terz wird durch die reine Quarte (${n(4)}) ersetzt. Ohne Terz ist dieser Akkord weder eindeutig Dur noch Moll. Die Quarte kann sich zur Terz auflösen, muss es aber nicht.`,'schwebend oder erwartungsvoll'],
    add9:['major',n=>`Eine große None (${n(9)}) kommt hinzu; die Terz bleibt erhalten. Eine None ist eine Sekunde plus eine Oktave. Anders als beim 9-Akkord kommt keine Septime hinzu.`,'weit, offen oder leuchtend'],
    '6':['major',n=>`Eine große Sexte (${n(6)}) kommt hinzu. Eine Septime gehört nicht zu diesem Akkord.`,'warm, leicht oder swingend'],
    m6:['minor',n=>`Eine große Sexte (${n(6)}) kommt hinzu. „Moll“ bezeichnet die kleine Terz, nicht die Sexte: Diese bleibt groß.`,'melancholisch mit einer hellen, jazzigen Spannung'],
    '69':['major',n=>`Eine große Sexte (${n(6)}) und eine große None (${n(9)}) kommen hinzu. Der 6/9-Akkord enthält keine Septime.`,'weich, weit oder entspannt'],
    '9':['major',n=>`Eine kleine Septime (${n(7)}) und eine große None (${n(9)}) kommen hinzu. Die 9 schließt hier die Septime ein; add9 enthält dagegen keine Septime.`,'voll, bluesig oder spannungsvoll'],
    maj9:['major',n=>`Eine große Septime (${n(7)}) und eine große None (${n(9)}) kommen hinzu. Er erweitert den maj7-Akkord um die None.`,'weich, schimmernd oder verträumt'],
    m9:['minor',n=>`Eine kleine Septime (${n(7)}) und eine große None (${n(9)}) kommen hinzu. Er erweitert den m7-Akkord um die None.`,'sanft, tief oder melancholisch'],
    m11:['minor',n=>`Kleine Septime (${n(7)}), große None (${n(9)}) und reine Undezime (${n(11)}) erweitern den Dreiklang. Eine Undezime ist eine Quarte plus eine Oktave.`,'offen, schwebend oder ruhig'],
    '13':['major',n=>`Die vollständige Terzschichtung ergänzt kleine Septime (${n(7)}), große None (${n(9)}), reine Undezime (${n(11)}) und große Tredezime (${n(13)}). Eine Tredezime ist eine Sexte plus eine Oktave. In der Praxis werden Töne oft ausgelassen; besonders die Undezime kann mit der Dur-Terz reiben.`,'reich, jazzig oder spannungsvoll'],
    '7b9':['major',n=>`Eine kleine Septime (${n(7)}) und eine kleine None (${n(9)}) kommen hinzu. Gegenüber dem 9-Akkord ist die None um einen Halbton erniedrigt.`,'dicht, dunkel oder stark gespannt'],
    '7#9':['major',n=>`Eine kleine Septime (${n(7)}) und eine übermäßige None (${n(9)}) kommen hinzu. Gegenüber dem 9-Akkord ist die None um einen Halbton erhöht. Sie klingt wie eine kleine Terz in anderer Oktavlage; die große Terz bleibt zugleich im Akkord.`,'rau, bluesig oder rockig'],
    '7#5':['major',n=>`Die Quinte wird um einen Halbton zur übermäßigen Quinte (${n(5)}) erhöht. Eine kleine Septime (${n(7)}) kommt hinzu.`,'schillernd, instabil oder gespannt'],
    m7b5:['minor',n=>`Die Quinte wird um einen Halbton zur verminderten Quinte (${n(5)}) erniedrigt. Eine kleine Septime (${n(7)}) kommt hinzu. Das heißt „halbvermindert“; bei dim7 ist auch die Septime noch einen Halbton tiefer.`,'dunkel, fragend oder gespannt'],
    dim7:['minor',n=>`Die Quinte wird um einen Halbton zur verminderten Quinte (${n(5)}) erniedrigt. Eine verminderte Septime (${n(7)}) kommt hinzu: Sie liegt neun Halbtöne über dem Grundton und klingt wie eine große Sexte, wird aber als Septime geschrieben. Der Akkord besteht aus drei übereinandergeschichteten kleinen Terzen.`,'dramatisch, unruhig oder stark gespannt'],
    aug:['major',n=>`Die Quinte wird um einen Halbton zur übermäßigen Quinte (${n(5)}) erhöht. So entstehen zwei übereinandergeschichtete große Terzen.`,'schwebend, rätselhaft oder instabil'],
    mMaj7:['minor',n=>`Eine große Septime (${n(7)}) kommt zum Moll-Dreiklang hinzu. Anders als bei m7 bleibt die Septime groß; die Terz ist klein.`,'geheimnisvoll, melancholisch oder gespannt'],
    '7sus4':['major',n=>`Die Terz wird durch die reine Quarte (${n(4)}) ersetzt; eine kleine Septime (${n(7)}) kommt hinzu. Gegenüber einem 7-Akkord fehlt also die Terz.`,'offen, schwebend oder spannungsvoll']
  };
  const ROLES={0:'Grundton',2:'große Sekunde',3:'kleine Terz',4:'große Terz',5:'reine Quarte',6:'verminderte Quinte',7:'reine Quinte',8:'übermäßige Quinte',9:'große Sexte',10:'kleine Septime',11:'große Septime',13:'kleine None',14:'große None',15:'übermäßige None',17:'reine Undezime',21:'große Tredezime'};
  function describe(root,typeId,inversion=0,shape=M.guitar(root,typeId)[0]){
    const item=M.chord(root,typeId),[baseType,change,sound]=TEXTS[typeId];
    const base=M.chord(root,baseType);
    const tones=item.tones.map((t,i)=>({...t,role:t.degree===7&&item.type.intervals[i]===9?'verminderte Septime':ROLES[item.type.intervals[i]]}));
    const toneFor=midi=>tones.find(t=>t.pc===M.mod(midi));
    const piano=M.piano(root,typeId,inversion).map(toneFor);
    const guitar=M.guitarNotes(shape.frets).slice().sort((a,b)=>a-b).map(toneFor);
    const omitted=tones.filter(t=>!piano.some(p=>p.pc===t.pc));
    return {
      title:item.title,symbol:item.symbol,tones,
      base:`Ausgangspunkt: der ${base.title}-Dreiklang (${base.tones.map(t=>t.name).join('–')}).`,
      change:change(degree=>tones.find(t=>t.degree===degree).name),
      sound:`Der Klang kann als ${sound} empfunden werden. Die Wirkung hängt auch von Lage, Rhythmus und musikalischem Zusammenhang ab.`,
      piano,guitar,omitted,
      position:`Am Klavier liegt ${piano[0].name} (${piano[0].role}) unten. Beim Wechsel der Lage wechseln Basston und Tonanordnung; der gespielte Tonvorrat bleibt gleich.`,
      guitarPosition:`Im gewählten Gitarrengriff liegt ${guitar[0].name} (${guitar[0].role}) unten. Mehrfach aufgeführte Tonnamen bedeuten Verdoppelungen, teils in verschiedenen Oktaven.`,
      voicing:omitted.length?`Die kompakten Griffe beider Instrumente lassen ${omitted.map(t=>`${t.name} (${t.role})`).join(', ')} aus. Der vollständige Akkordaufbau oben enthält auch diese Töne.`:'Beide Instrumente enthalten alle Akkordtöne; Oktavlage und Verdoppelungen können sich unterscheiden.'
    };
  }
  const api={describe};scope.GPDExplanations=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
