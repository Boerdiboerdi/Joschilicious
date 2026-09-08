(function () {
  'use strict';
  const button=document.getElementById('install-app');
  const banner=document.getElementById('install-banner');
  const android=navigator.userAgentData?.platform==='Android'||/Android/i.test(navigator.userAgent||'');
  const modes=['standalone','minimal-ui','fullscreen'].map(mode=>window.matchMedia(`(display-mode: ${mode})`));
  const supported=android&&window.isSecureContext&&location.protocol!=='file:'&&!window.AKKORD_PORTABLE;
  let deferred=null,installedHere=false,relatedInstalled=false,checking=false,busy=false,revision=0;
  const installed=()=>installedHere||relatedInstalled||modes.some(m=>m.matches);
  function update(){
    const visible=supported&&!installed()&&!checking&&!busy&&!!deferred;
    banner.hidden=!visible;button.hidden=!visible;button.disabled=busy;
    window.dispatchEvent(new Event('gpd-install-change'));
  }
  async function checkInstalled(){
    if(!supported||typeof navigator.getInstalledRelatedApps!=='function'){update();return;}
    const current=++revision;checking=true;update();let timer;
    try{
      const apps=await Promise.race([navigator.getInstalledRelatedApps(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),1800);})]);
      if(current!==revision)return;
      const manifest=new URL('./manifest.json',document.baseURI).href;
      relatedInstalled=Array.isArray(apps)&&apps.some(app=>{
        if(app.platform!=='webapp'||!app.url)return false;
        try{return new URL(app.url,document.baseURI).href===manifest;}catch{return false;}
      });
    }catch{/* Without this optional API, the browser's install event is authoritative. */}
    finally{clearTimeout(timer);if(current===revision){checking=false;update();}}
  }
  window.addEventListener('beforeinstallprompt',event=>{
    if(!supported)return;
    event.preventDefault();deferred=event;installedHere=false;
    checkInstalled();
  });
  window.addEventListener('appinstalled',()=>{installedHere=true;deferred=null;update();});
  for(const mode of modes){
    const changed=()=>{if(installed())deferred=null;update();};
    if(mode.addEventListener)mode.addEventListener('change',changed);else mode.addListener?.(changed);
  }
  window.addEventListener('pageshow',checkInstalled);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkInstalled();});
  button.addEventListener('click',async()=>{
    if(!supported||installed()||checking||busy||!deferred)return;
    const prompt=deferred;deferred=null;busy=true;update();
    try{await prompt.prompt();await prompt.userChoice;}
    catch{window.dispatchEvent(new Event('gpd-install-error'));}
    finally{busy=false;update();}
  });
  window.GPDInstall={get installed(){return installed();},get available(){return supported&&!installed()&&!checking&&!!deferred;}};
  checkInstalled();
})();
