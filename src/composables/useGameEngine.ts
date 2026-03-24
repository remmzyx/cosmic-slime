import { computed, reactive, ref } from "vue";
import type { DifficultyKey, GameLog, GameState } from "../types";

interface Player { x:number; y:number; radius:number; vx:number; vy:number; speed:number; maxSpeed:number; friction:number; dashPower:number; dashCooldown:number; dashTimer:number; invincibleTimer:number; pulse:number; }
interface Drone { x:number; y:number; radius:number; color:string; speed:number; wobblePhase:number; wobbleSpeed:number; wobbleAmount:number; hitFlash:number; }
interface Shard { x:number; y:number; radius:number; color:string; pulse:number; value:number; }
interface Particle { x:number; y:number; vx:number; vy:number; life:number; maxLife:number; color:string; }
interface MazeLine { x1:number; y1:number; x2:number; y2:number; alpha:number; width:number; }

const STORAGE_KEY = "cosmicSlimeSave";

export function useGameEngine() {
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const logs = ref<GameLog[]>([]);
  const musicToggleHandler = ref<(() => void) | null>(null);
  const gameOverHandler = ref<((score: number, wave: number, difficulty: DifficultyKey) => void) | null>(null);
  const tutorial = reactive({ active:false, step:0, steps:["Use W A S D to move your slime.","Collect a shard cluster.","Avoid drones - touching them deals damage.","Press SPACE to dash.","Great! Tutorial complete!"] });

  const gameState = reactive<GameState>({ running:false, paused:false, score:0, wave:1, health:100, shards:0, timeAlive:0, lastTimeStamp:0, difficulty:"easy", bestScore:0, bestWave:1, totalRuns:0, totalShards:0, totalTimeAlive:0 });
  const stateLabel = computed(() => !gameState.running ? "Idle" : gameState.paused ? "Paused" : "Running");

  const player: Player = { x:320, y:240, radius:14, vx:0, vy:0, speed:2.1, maxSpeed:3.4, friction:0.88, dashPower:5.5, dashCooldown:1.2, dashTimer:0, invincibleTimer:0, pulse:0 };
  const keys = reactive({ w:false, a:false, s:false, d:false, space:false, p:false, m:false });
  let drones: Drone[] = []; let shards: Shard[] = []; let particles: Particle[] = []; let mazeLines: MazeLine[] = []; let rafId = 0;

  const difficultyConfig = {
    easy: { droneSpeed:1.1, droneCountBase:4, droneCountPerWave:1, shardCountBase:6, shardCountPerWave:1, damageOnHit:12, shardHeal:4 },
    normal: { droneSpeed:1.6, droneCountBase:6, droneCountPerWave:2, shardCountBase:5, shardCountPerWave:1, damageOnHit:16, shardHeal:3 },
    hard: { droneSpeed:2.1, droneCountBase:7, droneCountPerWave:3, shardCountBase:4, shardCountPerWave:1, damageOnHit:20, shardHeal:3 },
    chaos: { droneSpeed:2.7, droneCountBase:8, droneCountPerWave:4, shardCountBase:4, shardCountPerWave:2, damageOnHit:24, shardHeal:2 },
  } as const;

  const nowTime = () => { const n = new Date(); return [n.getHours(), n.getMinutes(), n.getSeconds()].map((v) => String(v).padStart(2, "0")).join(":"); };
  const logMessage = (text:string) => { logs.value.push({ id:`${Date.now()}-${Math.random()}`, time:nowTime(), text }); if (logs.value.length > 200) logs.value.shift(); };
  const randRange = (min:number,max:number) => Math.random() * (max - min) + min;
  const randInt = (min:number,max:number) => Math.floor(randRange(min, max + 1));
  const clamp = (v:number,min:number,max:number) => Math.max(min, Math.min(max, v));
  const distance = (x1:number,y1:number,x2:number,y2:number) => Math.hypot(x2 - x1, y2 - y1);

  function saveGame(){ localStorage.setItem(STORAGE_KEY, JSON.stringify({ bestScore:gameState.bestScore, bestWave:gameState.bestWave, totalRuns:gameState.totalRuns, totalShards:gameState.totalShards, totalTimeAlive:gameState.totalTimeAlive, difficulty:gameState.difficulty })); }
  function setDifficulty(diff:DifficultyKey){ gameState.difficulty = diff; logMessage(`Difficulty set to ${diff.toUpperCase()}.`); saveGame(); }
  function loadGame(){ const raw = localStorage.getItem(STORAGE_KEY); if(!raw) return; try{ const data = JSON.parse(raw) as Partial<GameState>; gameState.bestScore=data.bestScore??0; gameState.bestWave=data.bestWave??1; gameState.totalRuns=data.totalRuns??0; gameState.totalShards=data.totalShards??0; gameState.totalTimeAlive=data.totalTimeAlive??0; setDifficulty((data.difficulty as DifficultyKey) ?? "easy"); logMessage("Save loaded."); } catch { logMessage("Save corrupted, ignoring."); } }

  function generateMaze(canvas:HTMLCanvasElement){ mazeLines=[]; for(let i=0;i<40;i++){ const x1=randRange(20, canvas.width-20); const y1=randRange(20, canvas.height-20); mazeLines.push({ x1,y1,x2:x1+randRange(-80,80), y2:y1+randRange(-80,80), alpha:randRange(0.1,0.4), width:randRange(1,3)});} }
  function spawnDronesForWave(canvas:HTMLCanvasElement,wave:number){ drones=[]; const cfg=difficultyConfig[gameState.difficulty]; const count=cfg.droneCountBase + cfg.droneCountPerWave*(wave-1); for(let i=0;i<count;i++){ const fromSide=Math.random()<0.5; const x=fromSide?(Math.random()<0.5?-30:canvas.width+30):randRange(0,canvas.width); const y=fromSide?randRange(0,canvas.height):(Math.random()<0.5?-30:canvas.height+30); drones.push({x,y,radius:randRange(8,14),color:"#ff4b81",speed:cfg.droneSpeed+Math.random()*0.6,wobblePhase:Math.random()*Math.PI*2,wobbleSpeed:randRange(0.02,0.05),wobbleAmount:randRange(4,10),hitFlash:0}); } logMessage(`Wave ${wave}: ${count} drones detected.`); }
  function spawnShardsForWave(canvas:HTMLCanvasElement,wave:number){ shards=[]; const cfg=difficultyConfig[gameState.difficulty]; const count=cfg.shardCountBase + cfg.shardCountPerWave*(wave-1); for(let i=0;i<count;i++){ shards.push({x:randRange(40,canvas.width-40),y:randRange(40,canvas.height-40),radius:randRange(6,10),color:"#00f5ff",pulse:Math.random()*Math.PI*2,value:randInt(3,8)});} logMessage(`Wave ${wave}: ${count} shard clusters spawned.`); }
  function spawnParticles(x:number,y:number,color:string,count:number){ for(let i=0;i<count;i++){ particles.push({x,y,vx:randRange(-2,2),vy:randRange(-2,2),life:randRange(0.4,1),maxLife:1,color}); } }
  function resetPlayer(canvas:HTMLCanvasElement){ player.x=canvas.width/2; player.y=canvas.height/2; player.vx=0; player.vy=0; player.dashTimer=0; player.invincibleTimer=0; }

  function resetGame(){ const canvas=canvasRef.value; if(!canvas) return; gameState.score=0; gameState.wave=1; gameState.health=100; gameState.shards=0; gameState.timeAlive=0; gameState.lastTimeStamp=performance.now(); drones=[]; shards=[]; particles=[]; generateMaze(canvas); resetPlayer(canvas); spawnDronesForWave(canvas, gameState.wave); spawnShardsForWave(canvas, gameState.wave); logMessage("New run started. Good luck, cosmic slime."); }
  function gameOver(reason:string){ gameState.running=false; logMessage(`Game over: ${reason}`); gameState.totalRuns += 1; gameState.totalTimeAlive += gameState.timeAlive; if(gameState.score>gameState.bestScore) gameState.bestScore=gameState.score; if(gameState.wave>gameState.bestWave) gameState.bestWave=gameState.wave; saveGame(); gameOverHandler.value?.(gameState.score, gameState.wave, gameState.difficulty); }
  function attemptDash(){ if(player.dashTimer>0) return; const len=Math.hypot(player.vx, player.vy); if(len===0){ player.vx=randRange(-1,1)*player.dashPower; player.vy=randRange(-1,1)*player.dashPower; } else { player.vx += (player.vx/len)*player.dashPower; player.vy += (player.vy/len)*player.dashPower; } player.dashTimer=player.dashCooldown; player.invincibleTimer=0.35; spawnParticles(player.x, player.y, "0,255,163", 18); logMessage("Dash! Slime zips through the void."); }
  function togglePause(){ if(!gameState.running) return; gameState.paused=!gameState.paused; if(!gameState.paused) gameState.lastTimeStamp=performance.now(); logMessage(gameState.paused?"Game paused.":"Game resumed."); }

  function updateInput(dt:number){ let ax=0; let ay=0; if(keys.w) ay-=1; if(keys.s) ay+=1; if(keys.a) ax-=1; if(keys.d) ax+=1; const len=Math.hypot(ax,ay); if(len>0){ ax/=len; ay/=len; } player.vx += ax*player.speed; player.vy += ay*player.speed; player.vx *= player.friction; player.vy *= player.friction; const speed=Math.hypot(player.vx, player.vy); if(speed>player.maxSpeed){ player.vx=(player.vx/speed)*player.maxSpeed; player.vy=(player.vy/speed)*player.maxSpeed; } if(player.dashTimer>0) player.dashTimer -= dt; if(player.invincibleTimer>0) player.invincibleTimer -= dt; }

  function update(dt:number){ const canvas=canvasRef.value; if(!canvas) return; if(tutorial.active){ if(tutorial.step===0&&(player.vx!==0||player.vy!==0)) tutorial.step+=1; if(tutorial.step===1&&gameState.shards>0) tutorial.step+=1; if(tutorial.step===2&&gameState.health<100) tutorial.step+=1; if(tutorial.step===3&&player.invincibleTimer>0) tutorial.step+=1; if(tutorial.step>=tutorial.steps.length) tutorial.active=false; }
    updateInput(dt);
    player.x=clamp(player.x+player.vx, player.radius+4, canvas.width-player.radius-4);
    player.y=clamp(player.y+player.vy, player.radius+4, canvas.height-player.radius-4);
    player.pulse += dt*4;
    const cfg=difficultyConfig[gameState.difficulty];
    for(let i=drones.length-1;i>=0;i--){ const d=drones[i]; const dx=player.x-d.x; const dy=player.y-d.y; const dist=Math.hypot(dx,dy)||1; const dirX=dx/dist; const dirY=dy/dist; d.wobblePhase += d.wobbleSpeed; const wobble=Math.sin(d.wobblePhase)*d.wobbleAmount; d.x += dirX*d.speed + Math.cos(d.wobblePhase)*0.3 + (dy/dist)*(wobble*0.02); d.y += dirY*d.speed + Math.sin(d.wobblePhase)*0.3 - (dx/dist)*(wobble*0.02); d.hitFlash=Math.max(0,d.hitFlash-dt); if(distance(d.x,d.y,player.x,player.y)<d.radius+player.radius && player.invincibleTimer<=0){ gameState.health -= cfg.damageOnHit; player.invincibleTimer=0.6; d.hitFlash=0.3; spawnParticles(player.x,player.y,"255,75,129",20); if(gameState.health<=0) gameOver("Your slime got shredded by neon drones."); }}
    for(let i=shards.length-1;i>=0;i--){ const s=shards[i]; s.pulse += dt*3; if(distance(s.x,s.y,player.x,player.y)<s.radius+player.radius+4){ gameState.shards += s.value; gameState.totalShards += s.value; gameState.score += s.value*10; gameState.health = clamp(gameState.health + cfg.shardHeal,0,100); spawnParticles(s.x,s.y,"0,245,255",16); shards.splice(i,1);} }
    for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.life -= dt; if(p.life<=0) particles.splice(i,1); }
    if(shards.length===0){ gameState.score += 50 + gameState.wave*20; gameState.wave += 1; spawnDronesForWave(canvas, gameState.wave); spawnShardsForWave(canvas, gameState.wave); }
  }

  function draw(){ const canvas=canvasRef.value; if(!canvas) return; const ctx=canvas.getContext("2d"); if(!ctx) return; ctx.clearRect(0,0,canvas.width,canvas.height); ctx.save(); ctx.strokeStyle="rgba(0,255,255,0.05)"; for(let x=0;x<=canvas.width;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();} for(let y=0;y<=canvas.height;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();} ctx.restore(); ctx.save(); mazeLines.forEach((line)=>{ctx.strokeStyle=`rgba(0,255,255,${line.alpha})`;ctx.lineWidth=line.width;ctx.beginPath();ctx.moveTo(line.x1,line.y1);ctx.lineTo(line.x2,line.y2);ctx.stroke();}); ctx.restore(); ctx.save(); shards.forEach((s)=>{const r=s.radius*(1+Math.sin(s.pulse)*0.2);ctx.fillStyle="rgba(0,245,255,0.15)";ctx.beginPath();ctx.arc(s.x,s.y,r+6,0,Math.PI*2);ctx.fill();ctx.fillStyle=s.color;ctx.beginPath();ctx.moveTo(s.x,s.y-r);ctx.lineTo(s.x+r*0.7,s.y);ctx.lineTo(s.x,s.y+r);ctx.lineTo(s.x-r*0.7,s.y);ctx.closePath();ctx.fill();}); ctx.restore(); ctx.save(); drones.forEach((d)=>{ctx.fillStyle=d.color;ctx.beginPath();ctx.arc(d.x,d.y,d.radius,0,Math.PI*2);ctx.fill();}); ctx.restore(); ctx.save(); const radius=player.radius*(1+Math.sin(player.pulse)*0.08); ctx.fillStyle="#00ffa3"; ctx.beginPath(); ctx.arc(player.x,player.y,radius,0,Math.PI*2); ctx.fill(); if(player.invincibleTimer>0){ctx.strokeStyle="rgba(255,255,255,.9)";ctx.beginPath();ctx.arc(player.x,player.y,radius+4,0,Math.PI*2);ctx.stroke();} ctx.restore(); ctx.save(); particles.forEach((p)=>{const alpha=clamp(p.life/p.maxLife,0,1);ctx.fillStyle=`rgba(${p.color},${alpha})`;ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();}); ctx.restore(); if(!gameState.running||gameState.paused){ctx.save();ctx.fillStyle="rgba(0,0,0,.55)";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#e0faff";ctx.textAlign="center";ctx.font="22px 'Segoe UI', sans-serif";ctx.fillText(!gameState.running?"Cosmic Slime Escape":"Paused", canvas.width/2, canvas.height/2-10);ctx.restore();} if(tutorial.active){ctx.save();ctx.fillStyle="rgba(0,0,0,.6)";ctx.fillRect(0,0,canvas.width,40);ctx.fillStyle="#00ffa3";ctx.font="16px 'Segoe UI'";ctx.textAlign="center";ctx.fillText(`Tutorial: ${tutorial.steps[tutorial.step] ?? "Complete"}`, canvas.width/2,25);ctx.restore();} }

  function gameLoop(timestamp:number){ rafId=requestAnimationFrame(gameLoop); if(!gameState.running||gameState.paused){ draw(); return; } const dt=(timestamp-gameState.lastTimeStamp)/1000; gameState.lastTimeStamp=timestamp; gameState.timeAlive += dt; update(dt); draw(); }
  const startGame = () => { gameState.running=true; gameState.paused=false; resetGame(); };
  const startTutorial = () => { tutorial.active=true; tutorial.step=0; startGame(); logMessage("Tutorial started."); };

  function onKeyDown(e:KeyboardEvent){ const t=e.target as HTMLElement | null; if(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA")) return; const key=e.key.toLowerCase(); if(key==="w") keys.w=true; if(key==="a") keys.a=true; if(key==="s") keys.s=true; if(key==="d") keys.d=true; if(key===" "){ e.preventDefault(); if(!keys.space) attemptDash(); keys.space=true; } if(key==="p"){ if(!keys.p) togglePause(); keys.p=true; } if(key==="m"){ if(!keys.m) musicToggleHandler.value?.(); keys.m=true; } }
  function onKeyUp(e:KeyboardEvent){ const key=e.key.toLowerCase(); if(key==="w") keys.w=false; if(key==="a") keys.a=false; if(key==="s") keys.s=false; if(key==="d") keys.d=false; if(key===" ") keys.space=false; if(key==="p") keys.p=false; if(key==="m") keys.m=false; }

  function mount(){ const canvas=canvasRef.value; if(!canvas) return; loadGame(); generateMaze(canvas); gameState.lastTimeStamp=performance.now(); rafId=requestAnimationFrame(gameLoop); window.addEventListener("keydown", onKeyDown); window.addEventListener("keyup", onKeyUp); }
  function unmount(){ cancelAnimationFrame(rafId); window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); }
  const registerMusicToggle = (handler:()=>void) => { musicToggleHandler.value = handler; };
  const registerGameOverHandler = (handler:(score: number, wave: number, difficulty: DifficultyKey) => void) => { gameOverHandler.value = handler; };

  return { canvasRef, gameState, logs, stateLabel, tutorial, setDifficulty, startGame, startTutorial, registerMusicToggle, registerGameOverHandler, mount, unmount };
}
