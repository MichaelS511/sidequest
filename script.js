(() => {
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const screen = document.querySelector('#gameScreen');
  const overlay = document.querySelector('#gameOverlay');
  const scoreEl = document.querySelector('#score');
  const timerEl = document.querySelector('#timer');
  const bestEl = document.querySelector('#best');
  const toast = document.querySelector('#toast');
  const input = document.querySelector('#taskInput');
  const list = document.querySelector('#taskList');
  const savedTasks = readStore('sidequest-tasks', []);
  const tasks = Array.isArray(savedTasks) ? savedTasks : [];
  const progress = readStore('sidequest-progress', {points:0, shields:0, streak:0, lastActive:''});
  const hasTokenBalance = Object.prototype.hasOwnProperty.call(progress, 'tokens');
  progress.points = Number(progress.points) || 0; progress.shields = Number(progress.shields) || 0; progress.streak = Number(progress.streak) || 0;
  progress.tokens = hasTokenBalance ? (Number(progress.tokens) || 0) : tasks.filter(task => task.done && task.rewarded).length;
  let running = false, last = 0, elapsed = 0, spawn = 0, score = 0, playerX = 0, targetX = 0, keys = {}, particles = [], hazards = [], toastTimer;
  let best = Number(localStorage.getItem('sidequest-best') || 0);
  let shieldFlash = 0;
  function readStore(key,fallback){try{return JSON.parse(localStorage.getItem(key)) ?? fallback}catch{return fallback}}
  function saveProgress(){localStorage.setItem('sidequest-progress',JSON.stringify(progress));updateProgressUI()}
  function saveTasks(){localStorage.setItem('sidequest-tasks',JSON.stringify(tasks))}
  function dayKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
  function updateProgressUI(){document.querySelector('#pointCount').textContent=progress.points;document.querySelector('#shieldCount').textContent=progress.shields;document.querySelector('#tokenCount').textContent=progress.tokens;const today=dayKey(),yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);const current=progress.lastActive===today;const active=current||progress.lastActive===dayKey(yesterday)?progress.streak:0;document.querySelector('#streakCount').textContent=`${active} ${active===1?'day':'days'} in a row`;document.querySelector('#streakStatus').textContent=current?'You completed at least one task today.':progress.lastActive===dayKey(yesterday)?'Complete a task today to keep your streak going.':'Complete a task today and your streak will begin.';updatePlayControls();}
  function updatePlayControls(){const playButton=document.querySelector('#playButton');playButton.disabled=progress.tokens<1;playButton.textContent=progress.tokens>0?'I have a token, so I’m ready to play':'Complete a quest to earn a game token';const startButton=document.querySelector('#startButton');if(running)return;startButton.disabled=progress.tokens<1;startButton.innerHTML=progress.tokens>0?`<span>▶</span> Use one token to play <small>You have ${progress.tokens} game token${progress.tokens===1?'':'s'}</small>`:'<span>▣</span> Complete a quest to play <small>One token is needed for each run</small>';}
  function completeTask(task){if(!task.rewarded){task.rewarded=true;progress.points+=10;progress.tokens+=1;const today=dayKey(),yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);if(progress.lastActive!==today){progress.streak=progress.lastActive===dayKey(yesterday)?progress.streak+1:1;progress.lastActive=today}saveProgress();notify('You completed a quest and earned 10 points plus one game token.');}}
  const colors = ['#bd806d','#c3cbb0','#a9a2b7','#8daeb0'];
  const size = () => { const r = screen.getBoundingClientRect(); const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = r.width*dpr; canvas.height = r.height*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); if (!playerX) playerX=r.width/2; };
  addEventListener('resize', size); size();
  function burst(x,y,color,n=8){for(let i=0;i<n;i++){let a=Math.random()*Math.PI*2,s=30+Math.random()*110;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.45+Math.random()*.35,color,size:2+Math.random()*3})}}
  function draw(t=0){const w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);ctx.fillStyle='#24262f';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#ffffff0a';ctx.lineWidth=1;for(let x=0;x<w;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<h;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
    for(let i=0;i<24;i++){let x=(i*97+24)%w,y=(i*57+18)%h;ctx.fillStyle=`rgba(222,221,232,${.12+Math.sin(t/700+i)*.1})`;ctx.fillRect(x,y,2,2)}
    const px=playerX||w/2, py=h*.77; const pulse=1+Math.sin(t/90)*.08;
    // soft field and pixel pilot
    ctx.beginPath();ctx.arc(px,py,25*pulse,0,Math.PI*2);ctx.fillStyle='#a9a2b720';ctx.fill();
    ctx.fillStyle='#a9a2b7';ctx.fillRect(px-9,py-12,18,18);ctx.fillStyle='#f2f0e9';ctx.fillRect(px-5,py-8,3,3);ctx.fillRect(px+3,py-8,3,3);ctx.fillStyle='#bd806d';ctx.fillRect(px-13,py+5,6,7);ctx.fillRect(px+7,py+5,6,7);ctx.fillStyle='#c3cbb0';ctx.fillRect(px-5,py+6,10,5);
    hazards.forEach(o=>{ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.rot);ctx.fillStyle=o.color;ctx.fillRect(-o.s/2,-o.s/2,o.s,o.s);ctx.fillStyle='#fff8';ctx.fillRect(-o.s/2,-o.s/2,3,3);ctx.restore()});
    particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size)});ctx.globalAlpha=1;
    if(!running)requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
  function format(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`}
  bestEl.textContent=format(best);
  updateProgressUI();
  function start(){if(running)return;if(progress.tokens<1){notify('Complete a quest to earn a token before you play another game.');return}progress.tokens-=1;running=true;saveProgress();elapsed=0;score=0;hazards=[];particles=[];spawn=.3;last=performance.now();overlay.classList.add('hidden');requestAnimationFrame(loop)}
  function end(){running=false;burst(playerX,canvas.clientHeight*.77,'#bd806d',22);if(elapsed>best){best=elapsed;localStorage.setItem('sidequest-best',String(best));bestEl.textContent=format(best)};overlay.querySelector('.overlay-title').innerHTML='You<br>did it!';overlay.querySelector('p').innerHTML=`You stayed in for ${format(elapsed)}. Take that good energy back to your day.`;overlay.classList.remove('hidden');updatePlayControls();notify('That was a good break. Your plan will be here when you are ready.')}
  function loop(now){if(!running)return;let dt=Math.min((now-last)/1000,.04);last=now;elapsed+=dt;score=Math.floor(elapsed*10);scoreEl.textContent=String(score).padStart(3,'0');timerEl.textContent=format(elapsed);const w=canvas.clientWidth,h=canvas.clientHeight;
    if(keys.ArrowLeft||keys.a)targetX-=280*dt;if(keys.ArrowRight||keys.d)targetX+=280*dt;if(targetX===0)targetX=playerX;targetX=Math.max(15,Math.min(w-15,targetX));playerX+=(targetX-playerX)*Math.min(1,dt*10);
    spawn-=dt;if(spawn<=0){let x=18+Math.random()*(w-36),s=10+Math.random()*12;hazards.push({x,y:-15,s,v:100+Math.min(elapsed*5,110),rot:Math.random()*6,color:colors[Math.floor(Math.random()*colors.length)]});spawn=Math.max(.22,.8-elapsed*.008)+Math.random()*.3}
    hazards.forEach(o=>{o.y+=o.v*dt;o.rot+=dt*2; if(running&&Math.abs(o.x-playerX)<o.s*.75+9&&Math.abs(o.y-h*.77)<o.s*.75+11){if(progress.shields>0){progress.shields--;o.y=h+100;burst(playerX,h*.77,'#c3cbb0',16);saveProgress();notify('Your shield blocked a spark, so you can keep playing.')}else end()}});hazards=hazards.filter(o=>o.y<h+30);
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt});particles=particles.filter(p=>p.life>0);
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#24262f';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#ffffff0a';for(let x=0;x<w;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<h;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}for(let i=0;i<24;i++){ctx.fillStyle=`rgba(222,221,232,${.12+Math.sin(now/700+i)*.1})`;ctx.fillRect((i*97+24)%w,(i*57+18)%h,2,2)}
    hazards.forEach(o=>{ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.rot);ctx.fillStyle=o.color;ctx.fillRect(-o.s/2,-o.s/2,o.s,o.s);ctx.fillStyle='#fff8';ctx.fillRect(-o.s/2,-o.s/2,3,3);ctx.restore()});particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size)});ctx.globalAlpha=1;
    let py=h*.77;ctx.beginPath();ctx.arc(playerX,py,25,0,Math.PI*2);ctx.fillStyle='#a9a2b720';ctx.fill();ctx.fillStyle='#a9a2b7';ctx.fillRect(playerX-9,py-12,18,18);ctx.fillStyle='#f2f0e9';ctx.fillRect(playerX-5,py-8,3,3);ctx.fillRect(playerX+3,py-8,3,3);ctx.fillStyle='#bd806d';ctx.fillRect(playerX-13,py+5,6,7);ctx.fillRect(playerX+7,py+5,6,7);ctx.fillStyle='#c3cbb0';ctx.fillRect(playerX-5,py+6,10,5);
    if(running)requestAnimationFrame(loop)
  }
  function notify(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2400)}
  document.querySelector('#startButton').addEventListener('click',start);
  document.querySelector('#planButton').addEventListener('click',()=>{document.querySelector('#planner').scrollIntoView({behavior:'smooth'});setTimeout(()=>input.focus(),450)});
  document.addEventListener('keydown',e=>{const typing=document.activeElement===input;if(e.key==='Enter'&&typing){e.preventDefault();addTask();return}if(running&&!typing&&['ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys[e.key]=true});document.addEventListener('keyup',e=>keys[e.key]=false);
  screen.addEventListener('pointerdown',e=>{if(!running)return;screen.setPointerCapture(e.pointerId);targetX=e.clientX-screen.getBoundingClientRect().left});screen.addEventListener('pointermove',e=>{if(running&&e.buttons)targetX=e.clientX-screen.getBoundingClientRect().left});
  document.querySelectorAll('[data-dir]').forEach(b=>{const dir=b.dataset.dir;b.addEventListener('pointerdown',()=>keys[dir==='left'?'ArrowLeft':'ArrowRight']=true);['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>keys[dir==='left'?'ArrowLeft':'ArrowRight']=false))});
  function renderTasks(){document.querySelector('#taskCount').textContent=tasks.length===0?'Your list is empty':`${tasks.length} ${tasks.length===1?'task':'tasks'} in your list`;if(!tasks.length){list.innerHTML='<div class="empty-state"><span>✳</span> Your list is empty for now. Add a task whenever you are ready.</div>'}else list.innerHTML=tasks.map((t,i)=>`<div class="task ${t.done?'done':''}"><input type="checkbox" aria-label="Mark ${escapeText(t.text)} complete" data-check="${i}" ${t.done?'checked':''}><span>${escapeText(t.text)}</span><div class="task-actions"><button data-edit="${i}" aria-label="Edit ${escapeText(t.text)}">EDIT</button><button class="remove" aria-label="Remove task" data-remove="${i}">×</button></div></div>`).join('');updatePlayControls();list.querySelectorAll('[data-check]').forEach(el=>el.onchange=()=>{const task=tasks[el.dataset.check];task.done=el.checked;if(task.done)completeTask(task);saveTasks();renderTasks()});list.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>{tasks.splice(el.dataset.remove,1);saveTasks();renderTasks()});list.querySelectorAll('[data-edit]').forEach(el=>el.onclick=()=>{const task=tasks[el.dataset.edit],updated=prompt('What would you like this task to say?',task.text);if(updated!==null&&updated.trim()){task.text=updated.trim();saveTasks();renderTasks()}})}
  function escapeText(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
  function addTask(){const text=input.value.trim();if(!text)return;tasks.push({text,done:false,rewarded:false});input.value='';saveTasks();renderTasks();}
  document.querySelector('#addTask').addEventListener('click',addTask);
  document.querySelector('#buyShield').addEventListener('click',()=>{if(progress.points<25){notify('Complete a task to earn points. A shield costs 25 points.');return}progress.points-=25;progress.shields++;saveProgress();notify('You added a shield. It will protect you from one spark in your next game.')});
  document.querySelector('#playButton').addEventListener('click',()=>{if(progress.tokens<1)return;document.querySelector('#top').scrollIntoView({behavior:'smooth'});notify('Your token is ready. Starting your game now.');setTimeout(start,650)});
  document.querySelector('#soundToggle').addEventListener('click',e=>{const label=e.currentTarget.querySelector('span');label.textContent=label.textContent==='sound off'?'sound on':'sound off';notify('Sound controls are not available in this preview yet.')});
  renderTasks();
  updatePlayControls();
  saveTasks();
})();
