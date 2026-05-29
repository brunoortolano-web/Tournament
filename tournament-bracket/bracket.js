(() => {
  'use strict';

  const isTouch = () => matchMedia('(hover:none) and (pointer:coarse)').matches;
  function dims() {
    const t = isTouch();
    return { MW:t?155:200, MH:t?86:70, CG:t?38:55, RG:t?8:12, SG:t?50:70, PAD:t?25:50 };
  }
  let MW,MH,CG,RG,SG,PAD;
  function loadDims(){({MW,MH,CG,RG,SG,PAD}=dims())}

  /* === MODE: ?admin in URL = admin, otherwise viewer === */
  let MODE = new URLSearchParams(window.location.search).has('admin') ? 'admin' : 'viewer';

  /* === SERVER SYNC === */
  let serverTimer = null;
  let lastServerData = '';

  function saveToServer() {
    clearTimeout(serverTimer);
    serverTimer = setTimeout(() => {
      const title = document.getElementById('tournament-title').textContent;
      const body = JSON.stringify({...S, title});
      fetch('/api/state', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: body
      }).then(() => {
        document.getElementById('sync-dot').className = 'sync-dot ok';
      }).catch(() => {
        document.getElementById('sync-dot').className = 'sync-dot err';
      });
    }, 800);
  }

  async function loadFromServer() {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) return false;
      const text = await res.text();
      if (!text || text === '{}') return false;
      if (text === lastServerData) return false;
      lastServerData = text;
      const data = JSON.parse(text);
      if (data.title) {
        document.getElementById('tournament-title').textContent = data.title;
        document.title = data.title;
      }
      delete data.title;
      S = data;
      return true;
    } catch(e) { return false; }
  }

  /* === WIRING === */
  const W={
    1:{s:'wb',r:1,wt:[13,1],lt:[9,1]},2:{s:'wb',r:1,wt:[13,2],lt:[9,2]},
    3:{s:'wb',r:1,wt:[14,1],lt:[10,1]},4:{s:'wb',r:1,wt:[14,2],lt:[10,2]},
    5:{s:'wb',r:1,wt:[15,1],lt:[11,1]},6:{s:'wb',r:1,wt:[15,2],lt:[11,2]},
    7:{s:'wb',r:1,wt:[16,1],lt:[12,1]},8:{s:'wb',r:1,wt:[16,2],lt:[12,2]},
    13:{s:'wb',r:2,wt:[23,1],lt:[17,2]},14:{s:'wb',r:2,wt:[23,2],lt:[18,2]},
    15:{s:'wb',r:2,wt:[24,1],lt:[19,2]},16:{s:'wb',r:2,wt:[24,2],lt:[20,2]},
    23:{s:'wb',r:3,wt:[28,1],lt:[25,2]},24:{s:'wb',r:3,wt:[28,2],lt:[26,2]},
    28:{s:'wb',r:4,wt:[30,1],lt:null},
    9:{s:'lb',r:1,wt:[20,1],lt:null},10:{s:'lb',r:1,wt:[19,1],lt:null},
    11:{s:'lb',r:1,wt:[18,1],lt:null},12:{s:'lb',r:1,wt:[17,1],lt:null},
    17:{s:'lb',r:2,wt:[21,2],lt:null},18:{s:'lb',r:2,wt:[21,1],lt:null},
    19:{s:'lb',r:2,wt:[22,2],lt:null},20:{s:'lb',r:2,wt:[22,1],lt:null},
    21:{s:'lb',r:3,wt:[26,1],lt:null},22:{s:'lb',r:3,wt:[25,1],lt:null},
    25:{s:'lb',r:4,wt:[27,1],lt:null},26:{s:'lb',r:4,wt:[27,2],lt:null},
    27:{s:'lb',r:5,wt:[30,2],lt:null},
    30:{s:'gf',r:1,wt:null,lt:null},31:{s:'gf',r:2,wt:null,lt:null},
  };

  let S={m:{},reset:false,shownChamp:null};
  let pos={};
  function em(id){if(!S.m[id])S.m[id]={p1:'',p2:'',w:null};return S.m[id]}

  function cx(n){return PAD+n*(MW+CG)}
  function calcPos(){
    [1,2,3,4,5,6,7,8].forEach((id,i)=>{pos[id]={x:cx(0),y:PAD+28+i*(MH+RG)}});
    [[13,1,2],[14,3,4],[15,5,6],[16,7,8]].forEach(([id,a,b])=>{pos[id]={x:cx(1),y:(pos[a].y+pos[b].y)/2}});
    pos[23]={x:cx(2),y:(pos[13].y+pos[14].y)/2};pos[24]={x:cx(2),y:(pos[15].y+pos[16].y)/2};
    pos[28]={x:cx(3),y:(pos[23].y+pos[24].y)/2};
    const lbY=pos[8].y+MH+SG;
    [9,10,11,12].forEach((id,i)=>{pos[id]={x:cx(0),y:lbY+i*(MH+RG)}});
    [20,19,18,17].forEach((id,i)=>{pos[id]={x:cx(1),y:lbY+i*(MH+RG)}});
    pos[22]={x:cx(2),y:(pos[20].y+pos[19].y)/2};pos[21]={x:cx(2),y:(pos[18].y+pos[17].y)/2};
    pos[25]={x:cx(3),y:pos[22].y};pos[26]={x:cx(3),y:pos[21].y};
    pos[27]={x:cx(4),y:(pos[25].y+pos[26].y)/2};
    pos[30]={x:cx(5),y:(pos[28].y+pos[27].y)/2};
    pos[31]={x:cx(5),y:pos[30].y+MH+40};
  }

  function srcLabel(mid,slot){
    for(const[sid,c]of Object.entries(W)){
      if(c.wt&&c.wt[0]===mid&&c.wt[1]===slot)return'W-M'+sid;
      if(c.lt&&c.lt[0]===mid&&c.lt[1]===slot)return'L-M'+sid;
    }return null;
  }

  /* === RENDER === */
  function render(){
    const ct=document.getElementById('bracket-container');
    ct.querySelectorAll('.match,.section-label,.round-label,.gf-rule-note').forEach(e=>e.remove());
    addLabels(ct);
    for(const id of Object.keys(W).map(Number)){
      if(id===31&&!S.reset)continue;
      ct.appendChild(mkMatch(id));
    }
    drawLines();sizeContainer(ct);updateStandings();
  }

  function mkMatch(id){
    const c=W[id],ms=em(id),p=pos[id];
    const isR1=c.s==='wb'&&c.r===1;
    const ready=isR1?(ms.p1.trim()&&ms.p2.trim()):(!!(ms.p1.trim()&&ms.p2.trim()));
    const el=document.createElement('div');
    el.className='match '+c.s+(isR1?' r1':'');
    if(ready)el.classList.add('ready');
    el.id='match-'+id;
    el.style.cssText='left:'+p.x+'px;top:'+p.y+'px;width:'+MW+'px;';
    const nb=document.createElement('div');nb.className='match-number';nb.textContent=id;el.appendChild(nb);

    for(let sl=1;sl<=2;sl++){
      const name=ms['p'+sl];
      const div=document.createElement('div');div.className='player-slot';
      if(ms.w===sl)div.classList.add('winner');
      if(ms.w&&ms.w!==sl)div.classList.add('loser');

      if(isR1&&MODE==='admin'){
        const inp=document.createElement('input');inp.type='text';inp.className='player-input';
        inp.placeholder='Enter name...';inp.value=name||'';
        inp.addEventListener('input',e=>onName(id,sl,e.target.value));
        inp.addEventListener('keydown',e=>{if(e.key==='Enter')e.target.blur()});
        div.appendChild(inp);
        const btn=document.createElement('button');btn.className='win-btn';
        btn.textContent=ms.w===sl?'\u2713':'\u2694';btn.title='Select winner';
        btn.addEventListener('click',e=>{e.stopPropagation();onWin(id,sl)});
        div.appendChild(btn);
      } else {
        const sp=document.createElement('span');sp.className='player-name';
        if(name){sp.textContent=name}
        else{sp.textContent=srcLabel(id,sl)||'\u2014';sp.classList.add('source-hint')}
        div.appendChild(sp);
        if(MODE==='admin'&&ready)div.addEventListener('click',()=>onWin(id,sl));
      }
      el.appendChild(div);
    }
    if(id===28||id===27){const lb=document.createElement('div');lb.className='match-label third-place-label';lb.textContent='Defeated \u2192 3rd Rank';el.appendChild(lb)}
    if(id===30){const lb=document.createElement('div');lb.className='match-label gf-label';lb.textContent='Final Battle';el.appendChild(lb)}
    if(id===31){const lb=document.createElement('div');lb.className='match-label reset-label';lb.textContent='Rematch';el.appendChild(lb)}
    return el;
  }

  function addLabels(ct){
    [{t:'\u2693 Fleet Command',x:PAD,y:PAD+3,c:'section-label wb'},
     {t:'\u2693 Reserve Fleet',x:PAD,y:pos[9].y-22,c:'section-label lb'},
     {t:'Skirmish',x:cx(0),y:PAD+14,c:'round-label'},
     {t:'Engage',x:cx(1),y:PAD+14,c:'round-label'},
     {t:'Assault',x:cx(2),y:PAD+14,c:'round-label'},
     {t:'Flagship',x:cx(3),y:PAD+14,c:'round-label'},
     {t:'Final Battle',x:cx(5),y:PAD+14,c:'round-label gf-round'},
    ].forEach(l=>{
      const d=document.createElement('div');d.className=l.c;d.textContent=l.t;
      d.style.cssText='left:'+l.x+'px;top:'+l.y+'px;';ct.appendChild(d);
    });
    if(!S.reset){
      const note=document.createElement('div');note.className='gf-rule-note';
      note.textContent='Fleet victor \u2192 Admiral. Reserve victor \u2192 Rematch.';
      note.style.cssText='left:'+pos[30].x+'px;top:'+(pos[30].y+MH+16)+'px;width:'+MW+'px;';
      ct.appendChild(note);
    }
  }
  function sizeContainer(ct){
    let mx=0,my=0;
    for(const p of Object.values(pos)){mx=Math.max(mx,p.x+MW);my=Math.max(my,p.y+MH)}
    ct.style.width=(mx+PAD+60)+'px';ct.style.height=(my+PAD+100)+'px';
  }

  function drawLines(){
    const svg=document.getElementById('connectors');svg.innerHTML='';
    const ct=document.getElementById('bracket-container');
    svg.setAttribute('width',ct.style.width||'1600');svg.setAttribute('height',ct.style.height||'1200');
    for(const[sid,c]of Object.entries(W)){
      const id=Number(sid);if(id===31&&!S.reset)continue;if(!c.wt)continue;
      const[tid,tsl]=c.wt;if(tid===31&&!S.reset)continue;if(!pos[id]||!pos[tid])continue;
      const sp=pos[id],tp=pos[tid];
      const x1=sp.x+MW,y1=sp.y+MH/2,x2=tp.x,y2=tp.y+(tsl===1?MH*.25:MH*.75),mx=x1+(x2-x1)*.5;
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d','M'+x1+','+y1+' H'+mx+' V'+y2+' H'+x2);
      let cls='connector '+c.s;if(S.m[id]&&S.m[id].w)cls+=' active';
      path.setAttribute('class',cls);svg.appendChild(path);
    }
  }

  /* === GAME LOGIC === */
  function onName(id,sl,val){
    if(MODE!=='admin')return;
    const ms=em(id);
    if(ms.w!==null){cascadeReset(id);ms.w=null;ms['p'+sl]=val;save();render();return}
    ms['p'+sl]=val;save();
    const matchEl=document.getElementById('match-'+id);
    if(matchEl)matchEl.classList.toggle('ready',!!(ms.p1.trim()&&ms.p2.trim()));
  }
  function onWin(id,sl){
    if(MODE!=='admin')return;
    const ms=em(id);
    if(!ms['p'+sl]||!ms['p'+sl].trim())return;
    const oth=sl===1?2:1;if(!ms['p'+oth]||!ms['p'+oth].trim())return;
    if(ms.w===sl){cascadeReset(id);ms.w=null;save();render();return}
    if(ms.w!==null)cascadeReset(id);
    ms.w=sl;propagate(id);save();render();
  }
  function propagate(id){
    const c=W[id],ms=S.m[id];if(!ms||!ms.w)return;
    const wN=ms['p'+ms.w],lsl=ms.w===1?2:1,lN=ms['p'+lsl];
    if(c.wt)em(c.wt[0])['p'+c.wt[1]]=wN;
    if(c.lt)em(c.lt[0])['p'+c.lt[1]]=lN;
    if(id===30&&ms.w){
      if(ms.w===1){S.reset=false;showChampion(wN)}
      else{S.reset=true;const r=em(31);r.p1=ms.p1;r.p2=ms.p2;r.w=null}
    }
    if(id===31&&ms.w)showChampion(ms['p'+ms.w]);
  }
  function cascadeReset(id){
    const c=W[id],ms=S.m[id];if(!ms)return;
    if(c.wt&&ms.w){const[t,s]=c.wt;if(S.m[t]){cascadeReset(t);S.m[t]['p'+s]='';S.m[t].w=null}}
    if(c.lt&&ms.w){const[t,s]=c.lt;if(S.m[t]){cascadeReset(t);S.m[t]['p'+s]='';S.m[t].w=null}}
    if(id===30){S.reset=false;S.shownChamp=null;if(S.m[31])S.m[31]={p1:'',p2:'',w:null}}
    if(id===31)S.shownChamp=null;
  }

  function showChampion(name){
    if(S.shownChamp===name)return;S.shownChamp=name;
    document.getElementById('champion-name').textContent=name;
    document.getElementById('champion-overlay').classList.add('visible');
  }

  function updateStandings(){
    const panel=document.getElementById('standings');
    let champ=null,runner=null,thirds=[];
    if(S.reset&&S.m[31]?.w){const m=S.m[31];champ=m['p'+m.w];runner=m['p'+(m.w===1?2:1)]}
    else if(!S.reset&&S.m[30]?.w){const m=S.m[30];champ=m['p'+m.w];runner=m['p'+(m.w===1?2:1)]}
    if(S.m[28]?.w)thirds.push(S.m[28]['p'+(S.m[28].w===1?2:1)]);
    if(S.m[27]?.w)thirds.push(S.m[27]['p'+(S.m[27].w===1?2:1)]);
    if(!champ&&!runner&&!thirds.length){panel.style.display='none';return}
    let h='<div class="standings-title">Naval Ranks</div>';
    if(champ)h+='<div class="standing champion-standing"><span class="standing-icon">\u2693</span><span class="standing-label">Admiral</span><span class="standing-name">'+esc(champ)+'</span></div>';
    if(runner)h+='<div class="standing"><span class="standing-icon">\ud83d\udea2</span><span class="standing-label">Captain</span><span class="standing-name">'+esc(runner)+'</span></div>';
    thirds.forEach(n=>{if(n)h+='<div class="standing"><span class="standing-icon">\u26f5</span><span class="standing-label">Commander</span><span class="standing-name">'+esc(n)+'</span></div>'});
    panel.innerHTML=h;panel.style.display='flex';
  }
  function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

  /* === SHARE (just copies viewer URL) === */
  function shareViewerLink(){
    const base = window.location.origin + window.location.pathname;
    const url = base; // viewer URL = base URL without ?admin
    if(navigator.share){
      navigator.share({title:document.getElementById('tournament-title').textContent, url}).catch(()=>{});
    } else {
      const modal=document.getElementById('share-modal');
      document.getElementById('share-url').value=url;
      modal.classList.add('visible');
      setTimeout(()=>{document.getElementById('share-url').focus();document.getElementById('share-url').select()},100);
    }
  }

  function toast(msg){
    const el=document.getElementById('toast');el.textContent=msg;el.classList.add('visible');
    setTimeout(()=>el.classList.remove('visible'),3500);
  }

  /* === PERSISTENCE === */
  function save(){
    if(MODE==='admin') saveToServer();
  }
  function resetAll(){
    if(!confirm('Reset the entire tournament?'))return;
    S={m:{},reset:false,shownChamp:null};save();render();
  }

  /* === INIT === */
  let resizeTimer=null;
  document.addEventListener('DOMContentLoaded',async()=>{
    document.body.classList.add(MODE+'-mode');
    loadDims();calcPos();

    // Load state from server
    const loaded = await loadFromServer();
    if(!loaded && MODE==='admin'){
      toast('No saved data yet. Start adding names!');
    }
    render();

    // Viewers: auto-refresh every 5 seconds
    if(MODE==='viewer'){
      setInterval(async()=>{
        if(await loadFromServer()) render();
      }, 5000);
      toast('Live view \u2014 auto-updates every 5s');
    }

    document.getElementById('reset-btn').addEventListener('click',resetAll);
    document.getElementById('champion-close').addEventListener('click',()=>document.getElementById('champion-overlay').classList.remove('visible'));
    document.getElementById('share-btn').addEventListener('click',shareViewerLink);

    if(MODE==='admin'){
      document.getElementById('tournament-title').addEventListener('blur',()=>saveToServer());
    }

    window.addEventListener('resize',()=>{
      clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{loadDims();calcPos();render()},300);
    });
  });
})();
