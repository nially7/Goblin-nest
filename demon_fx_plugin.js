//@name demon_fx
//@display-name 둥지 시스템 연출 + 운명선택 v1.55.4
//@api 3.0
//@version 1.55.4
//@update-url https://raw.githubusercontent.com/nially7/Goblin-nest/main/demon_fx_plugin.js
(async()=>{
'use strict';
/* ▼▼▼ 깃허브 주소 (여기만 바꾸면 됨) ▼▼▼
   깃허브에 올린 폴더 주소를 넣으세요. 끝에 / 를 꼭 붙여 주세요.
   예) const GH_BASE='https://아이디.github.io/저장소/';
       const GH_BASE='https://raw.githubusercontent.com/아이디/저장소/main/';
   폴더 구성:  destiny/ (운명선택 이미지)   boss/ (보스 연출 이미지)   bgm/ (음악)
   비워 두면 전부 봇 에셋을 씁니다. 깃허브에서 못 받으면 봇 에셋으로 대신합니다. */
const GH_BASE='https://nially7.github.io/Goblin-nest/';
const GH_VER='2';                        // 깃허브 그림·음악을 바꿨는데 예전 것이 보이면 이 숫자를 1 올리세요 (저장된 예전 파일 무시)
const IMG_EXT='webp';                      // boss/ 폴더 이미지 확장자
const BGM_EXT='mp3';                       // bgm/ 폴더 음악 확장자
const BGM_FILES={destiny:'BGM1',boss:'BOSS_BGM'};
const BGM_VOL=0.6;                         // 음악 크기 (0~1)
/* ▲▲▲ */
const ghv=u=>u?u+(u.includes('?')?'&':'?')+'v='+encodeURIComponent(GH_VER):u;
if(globalThis.__DEMON_FX)return;globalThis.__DEMON_FX=true;
const host=typeof Risuai!=='undefined'?Risuai:null;if(!host)return;

/* ------------------------------------------------------------------
   봇의 Lua가 연출이 필요한 답변에 표식(dfx-q)을 남김:
     dfx-n-<번호>  dfx-k-<종류>  dfx-a-<글자 hex>  dfx-s-<부제 hex>  dfx-c-<색 hex>
     보스: dfx-b-<보스코드>  dfx-t-<이름 hex>  + 숨긴 dm-fxa-* 이미지 주소
   번호가 이전보다 1 커지면 전체화면으로 한 번만 재생.
   채팅을 처음 볼 때는 번호만 기억하고 재생하지 않음(다시 그려져도 반복 없음).
   플러그인이 있으면 Lua의 간이 연출(dm-fx)은 바로 숨김.
   이 플러그인은 채팅 내용을 저장하거나 바꾸지 않음.
   ------------------------------------------------------------------ */
const diag={doc:'대기',perm:'-',seen:0,played:0,errors:[],scans:0,lastScan:0,maxSeen:0,lastReq:'-',hist:[],runSince:0};
const err=(w,e)=>{diag.errors.unshift(w+': '+String(e?.message||e));diag.errors.length=Math.min(diag.errors.length,6)};
const release=r=>{try{if(typeof r?.release==='function')r.release()}catch{}};
let doc=null,observer=null,stopped=false,timer=null,running=false,again=false,playing=false;

const CSS=`
*{box-sizing:border-box}html,body{margin:0;height:100%;background:#05050a;overflow:hidden}
body{font-family:Georgia,'Noto Serif KR',serif;color:#e8dcc8}
.fx{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer}
.skip,.ix-skip{position:fixed;top:14px;right:14px;z-index:2147483000;padding:9px 18px;border:1.5px solid rgba(255,255,255,.9);border-radius:999px;background:rgba(0,0,0,.5);color:#fff;font:700 14px/1 'Noto Sans KR',sans-serif;letter-spacing:.12em;text-shadow:0 1px 3px rgba(0,0,0,.8);box-shadow:0 0 14px rgba(255,255,255,.25);cursor:pointer;opacity:0;animation:in .4s 1.2s forwards}
.ix-skip{animation-delay:.6s}
.skip:hover,.ix-skip:hover{background:rgba(255,255,255,.18)}
@keyframes in{to{opacity:1}}
/* 프롤로그 */
.pro{background:#0a0a0f;animation:scr 8s ease-in-out forwards}
.pro .vig{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(20,18,30,.2),rgba(0,0,0,.95))}
.pt{position:absolute;border-radius:50%;background:rgba(180,160,120,.45);animation:pt 5s ease-in-out infinite}
.ln{position:absolute;height:1px;background:linear-gradient(90deg,transparent,rgba(180,160,120,.3),transparent);animation:ln 7s ease-in-out both}
.cn{position:absolute;width:36px;height:36px;border:0 solid rgba(180,160,120,.4);animation:cn 7s ease-in-out both}
.tx{position:relative;z-index:2;text-align:center;animation:tx 7s ease-in-out .8s both}
.sub{font-size:12px;letter-spacing:8px;color:rgba(180,160,120,.75);text-transform:uppercase;margin-bottom:22px;animation:sub 6.5s ease-in-out 1s both}
.main{position:relative;font-size:44px;letter-spacing:14px;animation:main 6s ease-in-out 1.4s both}
.ul{position:absolute;left:50%;bottom:-14px;height:1px;transform:translateX(-50%);background:linear-gradient(90deg,transparent,rgba(180,160,120,.7),transparent);animation:ul 5.5s ease-in-out 1.8s both}
@keyframes scr{0%,80%{opacity:1}95%,100%{opacity:0}}
@keyframes pt{0%,100%{transform:translateY(0);opacity:0}10%,90%{opacity:.55}100%{transform:translateY(-70px)}}
@keyframes ln{0%{width:0}20%,80%{width:100%}100%{width:0}}
@keyframes cn{0%{opacity:0}25%,80%{opacity:1}100%{opacity:0}}
@keyframes tx{0%{opacity:0;transform:scale(.88)}15%,72%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.06)}}
@keyframes sub{0%{opacity:0;transform:translateY(8px)}18%,70%{opacity:1;transform:none}100%{opacity:0}}
@keyframes main{0%{opacity:0;transform:translateY(8px)}20%,68%{opacity:1;transform:none}100%{opacity:0}}
@keyframes ul{0%{width:0}25%,65%{width:110px}100%{width:0}}
/* 보스 */
.boss{background:#050203;animation:scr 7s ease-in-out forwards}
.boss .glow{position:absolute;inset:-20%;background:radial-gradient(ellipse at center,var(--c) 0%,transparent 55%);opacity:0;animation:glow 6.5s ease-in-out .3s both}
.boss .flash{position:absolute;inset:0;background:#fff;opacity:0;animation:flash .9s ease-out .9s}
.boss .bars{position:absolute;left:0;right:0;height:18vh;background:#000;z-index:3;animation:bars 6.6s ease-in-out both}
.boss .bars.t{top:0}.boss .bars.b{bottom:0}
.boss .tx{animation:shake .5s 1s,tx 6.2s ease-in-out .9s both}
.boss .tag{font:700 12px Cinzel,serif;letter-spacing:10px;color:var(--c);margin-bottom:14px;opacity:.9}
.boss .main{font-family:Cinzel,'Noto Serif KR',serif;font-weight:900;font-size:58px;letter-spacing:10px;color:#fff;text-shadow:0 0 18px var(--c),0 0 50px var(--c)}
.boss .sub{margin:20px 0 0;letter-spacing:6px}
@keyframes glow{0%{opacity:0}20%,75%{opacity:.35}100%{opacity:0}}
@keyframes flash{0%{opacity:.75}100%{opacity:0}}
@keyframes bars{0%{transform:scaleY(1)}12%,85%{transform:scaleY(.55)}100%{transform:scaleY(1)}}
@keyframes shake{20%{transform:translate(-6px,3px)}40%{transform:translate(5px,-4px)}60%{transform:translate(-3px,2px)}80%{transform:translate(2px,-1px)}}
/* 정복 */
.clr{background:radial-gradient(ellipse at center,#2a1f0c,#070502 70%);animation:scr 6.5s ease-in-out forwards}
.clr .main{font-family:Cinzel,serif;font-weight:900;font-size:64px;letter-spacing:22px;background:linear-gradient(#fff4c9,#e3bd62 55%,#9b7428);-webkit-background-clip:text;background-clip:text;color:transparent}
.clr .ray{position:absolute;inset:-50%;background:repeating-conic-gradient(rgba(240,200,110,.07) 0 6deg,transparent 6deg 18deg);animation:spin 14s linear infinite,glow 6s ease-in-out both}
@keyframes spin{to{transform:rotate(360deg)}}
/* 전직 */
.prm{background:radial-gradient(ellipse at 50% 60%,#16110a,#040302 70%);animation:scr 6.5s ease-in-out forwards}
.prm .beam{position:absolute;left:50%;top:0;width:220px;height:100%;background:linear-gradient(90deg,transparent,var(--c),transparent);filter:blur(22px);opacity:0;animation:beam 6s ease-out .2s both}
.prm .ring{position:absolute;left:50%;top:50%;width:260px;height:260px;margin:-130px 0 0 -130px;border:1px solid var(--c);border-radius:50%;opacity:0;animation:ring 2.6s ease-out .9s both}
.prm .ring.r2{animation-delay:1.4s}
.prm .flash{position:absolute;inset:0;background:#fff;opacity:0;animation:flash .9s ease-out .9s}
.prm .tx{animation:tx 6.2s ease-in-out .9s both}
.prm .tag{font:700 14px 'Noto Serif KR',serif;letter-spacing:12px;color:var(--c);margin-bottom:16px}
.prm .main{font-family:Cinzel,'Noto Serif KR',serif;font-weight:900;font-size:54px;letter-spacing:10px;color:#fff;text-shadow:0 0 18px var(--c),0 0 50px var(--c)}
.prm .sub{margin:28px 0 0;letter-spacing:3px;text-transform:none;color:rgba(232,220,200,.75)}
@keyframes beam{0%{transform:translateX(-50%) scaleX(0);opacity:0}15%{transform:translateX(-50%) scaleX(1);opacity:.6}70%{opacity:.3}100%{transform:translateX(-50%) scaleX(1.8);opacity:0}}
@keyframes ring{0%{transform:scale(.3);opacity:.9}100%{transform:scale(2.8);opacity:0}}
/* 타락 / 마족 전생 (캔버스) */
.cvx{background:#040204;animation:scr var(--d) ease-in-out forwards}
.cvx .cv{position:absolute;inset:0;width:100%;height:100%;display:block}
.cvx .cvt{position:absolute;left:0;right:0;bottom:8%;z-index:2;text-align:center;opacity:0;animation:cvt 2.9s ease var(--tt) both}
.cvx .tag{font:700 14px 'Noto Serif KR',serif;letter-spacing:12px;color:var(--c);margin-bottom:14px}
.cvx .main{animation:none;font-family:Cinzel,'Noto Serif KR',serif;font-weight:900;font-size:46px;letter-spacing:8px;color:#fff;text-shadow:0 0 16px var(--c),0 0 44px var(--c)}
@keyframes cvt{0%{opacity:0;transform:translateY(12px)}16%,80%{opacity:1;transform:none}100%{opacity:0}}
/* 새 채팅 옮기기 */
.sv{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(5,3,2,.88);font-family:'Noto Serif KR',serif;animation:bkIn .3s ease both}
.sv-box{width:min(640px,94vw);max-height:92vh;display:flex;flex-direction:column;gap:10px;padding:18px 20px;box-sizing:border-box;background:linear-gradient(180deg,#1d140c,#100a06);border:1px solid rgba(201,169,110,.45);box-shadow:0 30px 80px rgba(0,0,0,.85),inset 0 0 40px rgba(0,0,0,.5);color:#d8c8a8}
.sv-h{display:flex;align-items:center;gap:8px}.sv-h b{font-size:16px;letter-spacing:.14em;color:#e6cf9e}.sv-h small{font-size:10.5px;color:#c9a96e;border:1px solid rgba(201,169,110,.4);padding:1px 6px;letter-spacing:.1em}
.sv-x{margin-left:auto;width:34px;height:34px;border:1px solid rgba(201,169,110,.45);background:rgba(0,0,0,.4);color:#c9a96e;font-size:16px;cursor:pointer}
.sv-p{margin:0;font-size:13.5px;line-height:1.75;color:#bfb196;word-break:keep-all}.sv-p b{color:#e6cf9e}
.sv-t{width:100%;min-height:200px;flex:1;box-sizing:border-box;resize:vertical;padding:10px;background:#0a0705;color:#e6dcc4;border:1px solid rgba(201,169,110,.3);font:12px/1.5 ui-monospace,Consolas,monospace;word-break:break-all}
.sv-s{margin:-4px 0 0;text-align:right;font-size:11.5px;color:#8a7a5e}
.sv-btns{display:flex;gap:8px;justify-content:center}
.sv-b{min-width:110px;padding:10px 18px;border:1px solid rgba(201,169,110,.55);background:linear-gradient(180deg,#2c1d10,#160e07);color:#e6cf9e;font:600 14px 'Noto Serif KR',serif;letter-spacing:.1em;cursor:pointer}
.sv-go{border-color:#c9a96e;color:#fff1cf;box-shadow:0 0 14px rgba(201,169,110,.25)}
.sv-msg{min-height:1.4em;text-align:center;font-size:13px;color:#f0c27a;word-break:keep-all}
/* 운명 선택 직후 연출 */
.ix{position:fixed;inset:0;overflow:hidden;background:radial-gradient(ellipse at 50% 46%,#1b0c29,#07030c 62%,#000);display:flex;align-items:center;justify-content:center;font-family:'Noto Serif KR',serif;animation:bkIn .9s ease both;cursor:default}
.ix-smoke{position:absolute;width:70vmax;height:70vmax;left:50%;top:55%;margin:-35vmax 0 0 -35vmax;border-radius:50%;background:radial-gradient(circle,rgba(120,60,190,.22),transparent 62%);filter:blur(30px);animation:ixSm 14s ease-in-out infinite alternate;pointer-events:none}
.ix-s2{background:radial-gradient(circle,rgba(60,140,90,.12),transparent 60%);animation-duration:19s;animation-direction:alternate-reverse;top:62%}
@keyframes ixSm{0%{transform:translate(-6%,4%) scale(.9)}100%{transform:translate(6%,-6%) scale(1.12)}}
.ix-stage{position:relative;z-index:2;width:min(820px,88vw);display:flex;align-items:center;justify-content:center;min-height:40vh}
.ix-q{margin:0;text-align:center;font-size:clamp(20px,2.3vw,32px);line-height:1.7;font-weight:500;letter-spacing:.04em;color:#dcbcff;word-break:keep-all;text-shadow:0 0 14px rgba(160,90,255,.9),0 0 40px rgba(110,40,200,.6);animation:ixQ 5s ease forwards}
@keyframes ixQ{0%{opacity:0;transform:translateY(12px);filter:blur(6px)}16%{opacity:1;transform:none;filter:blur(0)}80%{opacity:1;transform:none;filter:blur(0)}100%{opacity:0;transform:translateY(-10px);filter:blur(5px)}}
.ix-n{transition:opacity .6s,filter .6s}
.ix-green{background:radial-gradient(ellipse at 50% 46%,#0c2216,#030a06 62%,#000)}
.ix-green .ix-smoke{background:radial-gradient(circle,rgba(60,170,100,.2),transparent 62%)}.ix-green .ix-s2{background:radial-gradient(circle,rgba(200,60,110,.1),transparent 60%)}
.ix-blood{background:radial-gradient(ellipse at 50% 42%,#2b050b,#0a0103 62%,#000)}
.ix-blood .ix-smoke{background:radial-gradient(circle,rgba(190,20,50,.24),transparent 62%)}.ix-blood .ix-s2{background:radial-gradient(circle,rgba(60,150,80,.1),transparent 60%)}
.ix-q-g{color:#a8f0bf;text-shadow:0 0 14px rgba(60,200,110,.9),0 0 40px rgba(20,140,70,.6)}
.ix-q-rs{color:#ff3b4e;font-weight:700;text-shadow:0 0 14px rgba(230,30,60,.95),0 0 44px rgba(170,0,30,.8)}
.ix-shk{display:inline-block;animation:ixShk .14s steps(2) infinite}
@keyframes ixShk{0%{transform:translate(0,0)}25%{transform:translate(-2px,1px) rotate(-.4deg)}50%{transform:translate(2px,-1px)}75%{transform:translate(-1px,-2px) rotate(.4deg)}100%{transform:translate(1px,2px)}}
.ix-q-r{color:#ff6b78;text-shadow:0 0 14px rgba(230,30,60,.95),0 0 44px rgba(170,0,30,.7)}
.ix-forest{background:radial-gradient(ellipse at 50% 46%,#16180e,#060704 62%,#000)}
.ix-forest .ix-smoke{background:radial-gradient(circle,rgba(110,130,70,.16),transparent 62%)}.ix-forest .ix-s2{background:radial-gradient(circle,rgba(150,110,60,.1),transparent 60%)}
.ix-q-w{color:#f1e8d4;text-shadow:0 0 12px rgba(230,200,140,.55),0 0 36px rgba(120,90,40,.45)}
.ix-abyss{background:radial-gradient(ellipse at 50% 50%,#0a050f,#030108 55%,#000)}
.ix-abyss .ix-smoke{background:radial-gradient(circle,rgba(160,100,200,.12),transparent 62%)}.ix-abyss .ix-s2{background:radial-gradient(circle,rgba(200,170,50,.06),transparent 55%)}
.ix-q-y{color:#f5d98a;text-shadow:0 0 14px rgba(230,190,60,.9),0 0 44px rgba(170,130,20,.6)}
.sfl{position:fixed;inset:0;background:#070000;display:flex;align-items:center;justify-content:center;overflow:hidden;animation:sflShake .5s steps(2) 3}
.sfl-scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,0,30,.07) 0 2px,transparent 2px 4px);animation:sflFlick 2.2s steps(1) infinite;pointer-events:none}
.sfl-box{text-align:center;opacity:0;animation:sflIn .25s steps(2) .2s forwards}
.sfl-t{position:relative;font:900 clamp(30px,7.5vw,84px)/1.1 ui-monospace,Consolas,monospace;letter-spacing:.08em;color:#ff2238;text-shadow:0 0 18px rgba(255,20,40,.9),0 0 50px rgba(200,0,20,.6)}
.sfl-t::before,.sfl-t::after{content:attr(data-t);position:absolute;inset:0;overflow:hidden}
.sfl-t::before{color:#0ff;opacity:.5;transform:translateX(-4px);clip-path:inset(0 0 60% 0);animation:sflG1 .9s steps(3) infinite}
.sfl-t::after{color:#ff0040;transform:translateX(4px);clip-path:inset(55% 0 0 0);animation:sflG2 .7s steps(3) infinite}
.sfl-s{margin-top:14px;font:700 clamp(13px,2.4vw,20px) ui-monospace,Consolas,monospace;letter-spacing:.4em;color:#ff5a68;animation:sflBlink .6s steps(1) infinite}
@keyframes sflIn{to{opacity:1}}
@keyframes sflBlink{50%{opacity:.15}}
@keyframes sflFlick{0%,100%{opacity:1}43%{opacity:.4}45%{opacity:1}71%{opacity:.6}}
@keyframes sflShake{0%{transform:translate(0)}50%{transform:translate(-6px,3px)}100%{transform:translate(5px,-2px)}}
@keyframes sflG1{0%{clip-path:inset(0 0 70% 0)}33%{clip-path:inset(20% 0 50% 0);transform:translateX(-7px)}66%{clip-path:inset(60% 0 10% 0)}}
@keyframes sflG2{0%{clip-path:inset(60% 0 0 0)}33%{clip-path:inset(10% 0 70% 0);transform:translateX(6px)}66%{clip-path:inset(40% 0 30% 0)}}
.ix.ix-black{background:#000}.ix.ix-black .ix-smoke,.ix.ix-black .ix-bd{display:none}
.ix-sfl{z-index:20}.ix-sfl-out{opacity:0;transition:opacity .45s}
.ix-pan{position:absolute;inset:0;z-index:6;overflow:hidden;background:#000;opacity:0;transition:opacity 1.2s;pointer-events:none}.ix-pan.ix-on{opacity:1}
.ix-pan img{position:absolute;left:50%;transform:translateX(-50%);max-width:none}
.ix-fall .ix-pan{opacity:0!important;transition:opacity 1.7s ease}
.ix-pan-dk{position:absolute;inset:0;background:linear-gradient(transparent 35%,rgba(0,0,0,.82) 78%);opacity:0;transition:opacity .8s}
.ix-pan-dark .ix-pan-dk{opacity:1}
.ix-pantxt .ix-stage{z-index:8;align-self:flex-end;margin-bottom:9vh}.ix-pantxt .ix-tap{z-index:9}
.ix-pan-b{opacity:0}.ix-pan-2 .ix-pan-b{opacity:1;transition:opacity .12s}
.ix-flash{position:absolute;inset:0;background:radial-gradient(circle at 48% var(--fy,40%),#fff7d6,rgba(255,215,90,.85) 35%,rgba(255,190,40,0) 75%);opacity:0;mix-blend-mode:screen}
.ix-pan-2 .ix-flash{animation:ixFlash .9s ease-out}
@keyframes ixFlash{0%{opacity:0}12%{opacity:1}100%{opacity:0}}
.ix-scroll{position:absolute;inset:0;z-index:5;overflow:hidden;pointer-events:none;background:#000}
.ix-scroll img{position:absolute;left:50%;transform:translateX(-50%);width:min(100vw,896px);opacity:0;transition:opacity 1.2s}
.ix-scroll.ix-on img{opacity:1}
.ix-bd{position:absolute;inset:-3%;background:center/cover no-repeat;opacity:0;filter:blur(3px) brightness(.55);transition:opacity 1.2s;pointer-events:none}
.ix-bd.ix-on{opacity:.38;animation:ixKen 24s ease-in-out infinite alternate}
@keyframes ixKen{from{transform:scale(1)}to{transform:scale(1.07)}}
.ix-pic{position:absolute;inset:0;z-index:4;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .7s;background:rgba(0,0,0,.55)}
.ix-pic.ix-on{opacity:1}
.ix-full{position:absolute;inset:0;z-index:1;opacity:0;background:center/cover no-repeat;transition:opacity 1.4s,filter 1s;pointer-events:none}
.ix-full.ix-on{opacity:1;animation:ixFullK 18s ease-out forwards}.ix-full.ix-dim{filter:brightness(.42)}
@keyframes ixFullK{from{transform:scale(1.08)}to{transform:scale(1)}}
.ix-pic img{max-width:min(92vw,1200px);max-height:84vh;box-shadow:0 0 0 1px rgba(255,255,255,.12),0 24px 70px rgba(0,0,0,.9);animation:ixPic 1.1s ease both}
@keyframes ixPic{from{opacity:0;transform:scale(1.04);filter:blur(4px)}}
.ix-sfx{margin:0;text-align:center;font:900 clamp(44px,7vw,108px)/1.1 'Noto Serif KR',serif;letter-spacing:.02em;color:#ffd9c8;text-shadow:0 0 18px rgba(255,60,40,.95),0 0 60px rgba(200,0,0,.7);animation:ixSfx 1.8s ease forwards}
@keyframes ixSfx{0%{opacity:0;transform:scale(1.6);filter:blur(8px)}12%{opacity:1;transform:scale(1);filter:blur(0)}70%{opacity:1}100%{opacity:0;transform:scale(.96)}}
.ix-shake{animation:ixSh .55s linear 2}
@keyframes ixSh{0%,100%{transform:none}20%{transform:translate(-9px,5px)}40%{transform:translate(8px,-6px)}60%{transform:translate(-6px,-3px)}80%{transform:translate(5px,6px)}}
.ix-pet{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden;opacity:0;transition:opacity 1.2s}
.ix-pet.ix-on{opacity:1}
.ix-pet i{position:absolute;top:0;left:var(--l);width:var(--s);height:calc(var(--s)*.72);border-radius:85% 0 85% 0;background:radial-gradient(circle at 32% 30%,#ff6a78,#c00a28 58%,#5c0012);filter:drop-shadow(0 0 4px rgba(255,40,70,.35));opacity:0;animation:ixPf var(--d) linear var(--dl) infinite}
.ix-pet i.ix-pf{z-index:3;filter:blur(1.6px) drop-shadow(0 0 6px rgba(255,40,70,.4))}
@keyframes ixPf{0%{opacity:0;transform:translate(0,-8vh) rotate(0deg)}6%{opacity:.95}25%{transform:translate(var(--x),24vh) rotate(calc(var(--r)*110deg))}50%{transform:translate(calc(var(--x)*-.6),52vh) rotate(calc(var(--r)*210deg))}75%{transform:translate(var(--x),80vh) rotate(calc(var(--r)*300deg))}92%{opacity:.9}100%{opacity:0;transform:translate(calc(var(--x)*-.4),108vh) rotate(calc(var(--r)*400deg))}}
.ix-n p{margin:0 0 1.1em;font-size:clamp(16px,1.35vw,20px);line-height:2.05;color:#e9e1f2;word-break:keep-all;text-shadow:0 2px 6px #000;opacity:0;animation:ixN 1.1s ease forwards}
.ix-n p:last-child{margin-bottom:0}
@keyframes ixN{from{opacity:0;transform:translateY(8px);filter:blur(3px)}to{opacity:1;transform:none;filter:blur(0)}}
.ix-n.ix-out{opacity:0;filter:blur(4px)}
.ix-tap{position:absolute;z-index:5;left:0;right:0;bottom:7vh;text-align:center;font-size:12px;letter-spacing:.35em;color:rgba(220,188,255,.7);opacity:0;transition:opacity .4s;pointer-events:none}
/* 시스템 창 (아이템 정보) · To be continue (붉은 흔들림 → 4초 페이드아웃) */
.ix-sys{max-width:min(560px,86vw);margin:0 auto;padding:18px 22px;border:1px solid rgba(140,200,255,.55);border-radius:6px;background:linear-gradient(180deg,rgba(20,40,70,.82),rgba(8,16,32,.88));box-shadow:0 0 24px rgba(80,160,255,.35),inset 0 0 18px rgba(80,160,255,.15);opacity:0;animation:ixN 1.1s ease forwards;transition:opacity .6s}
.ix-sys b{display:block;margin-bottom:10px;font-size:clamp(16px,1.4vw,20px);color:#bfe3ff;text-shadow:0 0 10px rgba(90,170,255,.9);word-break:keep-all}
.ix-sys p{margin:6px 0 0;padding-left:1em;text-indent:-1em;font-size:clamp(14px,1.15vw,17px);line-height:1.8;color:#dbe8f5;word-break:keep-all}
.ix-sys p::before{content:"• ";color:#8fc7ff}
.ix-sys.ix-out{opacity:0}
.ix-tbc{margin:0;text-align:center;font:italic 700 clamp(30px,4.2vw,58px)/1.2 'Noto Serif KR',serif;letter-spacing:.08em;color:#ff3b4e;text-shadow:0 0 16px rgba(255,30,50,.95),0 0 50px rgba(170,0,20,.8);animation:ixTbcIn 1.2s ease forwards,ixTbcSh .09s steps(2) infinite}
.ix-tbc.ix-tbc-out{animation:ixTbcOut 4s ease forwards,ixTbcSh .09s steps(2) infinite}
@keyframes ixTbcIn{from{opacity:0;filter:blur(6px)}to{opacity:1;filter:blur(0)}}
@keyframes ixTbcOut{from{opacity:1}to{opacity:0}}
@keyframes ixTbcSh{0%{transform:translate(1px,-1px)}50%{transform:translate(-1.5px,1px)}100%{transform:translate(.5px,1.5px)}}
.ix-wait{cursor:pointer}.ix-wait .ix-tap{opacity:1;animation:bkPulse 1.6s infinite}
.ix-fall{animation:ixFall 1.9s cubic-bezier(.6,0,.9,.4) forwards}
.ix-fall .ix-smoke{animation:ixDrop 1.9s cubic-bezier(.6,0,.9,.4) forwards}
@keyframes ixFall{0%{background-color:transparent}100%{background:#000}}
@keyframes ixDrop{to{transform:scale(.15) translateY(-40%);opacity:0}}
/* 이야기책 */
.bk{position:fixed;inset:0;box-sizing:border-box;padding:64px 0 18px;background:radial-gradient(ellipse at 50% 40%,#1c140c,#050302 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Noto Serif KR',serif;animation:bkIn .6s ease both}
@keyframes bkIn{from{opacity:0}}
.bk-top{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;gap:12px;padding:14px 20px;color:#c9a96e;font:600 13px Cinzel,'Noto Serif KR',serif;letter-spacing:.24em;z-index:5}
.bk-top i{flex:1;height:1px;background:linear-gradient(90deg,rgba(201,169,110,.6),transparent)}
.bk-x{width:38px;height:38px;border:1px solid rgba(201,169,110,.45);background:rgba(0,0,0,.4);color:#c9a96e;font-size:18px;cursor:pointer}
.bk-book{position:relative;width:min(1680px,96vw);height:min(1060px,calc(100vh - 140px));flex:none;display:flex;perspective:4200px;padding:14px;border-radius:6px;box-sizing:border-box;transition:transform 1.05s cubic-bezier(.55,.1,.25,1)}
.bk-book::before{content:'';position:absolute;inset:0;border-radius:6px;background:linear-gradient(90deg,#2b1a10,#3a2415 48%,#1d110a 50%,#3a2415 52%,#2b1a10);box-shadow:0 30px 80px rgba(0,0,0,.85),inset 0 0 0 2px #5a3a1e,inset 0 0 0 6px #22140b,inset 0 0 0 7px rgba(201,169,110,.45);transition:opacity .6s .35s}
.bk-pg{position:relative;z-index:1;transition:opacity .5s .6s;flex:1;overflow:hidden;background:#e8dbbd;box-shadow:inset 0 0 60px rgba(120,80,30,.35)}
.bk-pg::before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 90% at 50% 50%,transparent 60%,rgba(90,55,20,.28)),repeating-linear-gradient(0deg,rgba(120,90,50,.035) 0 2px,transparent 2px 5px);z-index:2}
.bk-l{border-radius:3px 0 0 3px;box-shadow:inset -18px 0 30px -12px rgba(60,35,10,.55),inset 0 0 60px rgba(120,80,30,.35)}
.bk-r{border-radius:0 3px 3px 0;box-shadow:inset 18px 0 30px -12px rgba(60,35,10,.55),inset 0 0 60px rgba(120,80,30,.35)}
.bk-img{position:absolute;inset:22px;display:flex;align-items:center;justify-content:center;z-index:3}
.bk-img img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;box-shadow:0 0 0 1px #6b4a24,0 0 0 5px #e8dbbd,0 0 0 6px rgba(107,74,36,.6),0 6px 18px rgba(0,0,0,.35)}
.bk-img.bk-prev img{filter:sepia(.35) brightness(.75)}
.bk-cover{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#3b2611;text-align:center}
.bk-cover b{font-size:clamp(40px,3vw,56px);letter-spacing:.3em;font-weight:700}
.bk-cover i{width:120px;height:1px;background:#6b4a24}
.bk-cover small{font:600 12px Cinzel,serif;letter-spacing:.4em;color:#7a5530}
.bk-txt{position:absolute;inset:0;overflow-y:auto;padding:clamp(46px,4vw,74px) clamp(52px,4.4vw,86px) 44px;color:#2a1c10;font-size:clamp(16.5px,calc(.62vw + 8px),21px);line-height:1.95;word-break:keep-all;z-index:3}
.bk-txt::-webkit-scrollbar{width:5px}.bk-txt::-webkit-scrollbar-thumb{background:rgba(107,74,36,.4)}
.bk-txt p{margin:0 0 1.05em;text-indent:1em}
.bk-act{display:flex;justify-content:center;margin:1.4em 0 1.2em;text-indent:0}
.bk-actb{display:flex;flex-direction:column;align-items:center;gap:4px;padding:.75em 2.2em .7em;border:0;border-radius:6px;cursor:pointer;font:inherit;color:#fbe9ef;background:radial-gradient(120% 140% at 50% 0%,rgba(255,255,255,.12),transparent 60%),linear-gradient(180deg,#7a1f3a,#4a0f22);box-shadow:inset 0 1px 0 rgba(255,220,235,.25),0 0 0 1.5px #c9a35e,0 0 0 3px rgba(80,10,30,.6),0 6px 14px rgba(60,0,20,.45);animation:bkActGlow 1.8s ease-in-out infinite;transition:transform .15s}
.bk-actb b{font-family:'Noto Serif KR',serif;font-size:1.08em;letter-spacing:.24em;padding-left:.24em}
.bk-actb small{font-size:.72em;letter-spacing:.06em;opacity:.85}
.bk-actb:hover{transform:scale(1.04)}.bk-actb:active{transform:scale(.97)}
@keyframes bkActGlow{0%,100%{box-shadow:inset 0 1px 0 rgba(255,220,235,.25),0 0 0 1.5px #c9a35e,0 0 0 3px rgba(80,10,30,.6),0 6px 14px rgba(60,0,20,.45)}50%{box-shadow:inset 0 1px 0 rgba(255,220,235,.25),0 0 0 1.5px #e8c77e,0 0 0 3px rgba(80,10,30,.6),0 6px 14px rgba(60,0,20,.45),0 0 22px rgba(200,60,110,.7)}}
.bk-txt p.q{text-indent:0;padding-left:.6em;border-left:2px solid rgba(140,40,30,.45);color:#5a170f;font-weight:700}
.bk-txt p.sfx{text-indent:0;text-align:center;font:900 1.6em Cinzel,'Noto Serif KR',serif;letter-spacing:.06em;color:#6a1a10;margin:.8em 0}
.bk-txt p.first::first-letter{float:left;font-size:3.1em;line-height:.9;padding:6px 8px 0 0;color:#7a2a14;font-weight:700}
.bk-one{border-radius:3px}
.bk-one-sc{position:absolute;inset:0;overflow-y:auto;z-index:3;-webkit-overflow-scrolling:touch}
.bk-one-sc::-webkit-scrollbar{width:4px}.bk-one-sc::-webkit-scrollbar-thumb{background:rgba(107,74,36,.4)}
.bk-one .bk-img{position:static;display:block;padding:14px 14px 4px}
.bk-one .bk-img img{width:100%;max-height:none}
.bk-one .bk-cover{position:static;padding:46px 0 14px;gap:10px}
.bk-one .bk-txt{position:static;overflow:visible;padding-top:18px}
.bk-one .bk-txt::before{content:'';display:block;width:60px;height:1px;margin:0 auto 16px;background:#8a6a40}
.bk-leaf{position:absolute;top:14px;bottom:14px;width:calc(50% - 14px);left:50%;transform-origin:left center;background:#e3d4b2;box-shadow:inset 0 0 50px rgba(120,80,30,.4);z-index:6;pointer-events:none;animation:bkFlip .7s cubic-bezier(.4,.1,.3,1) forwards}
.bk-leaf.bk-back{animation-name:bkFlipB;left:14px;transform-origin:right center}
@keyframes bkFlip{0%{transform:rotateY(0);filter:brightness(1)}50%{filter:brightness(.7)}100%{transform:rotateY(-180deg);filter:brightness(1)}}
@keyframes bkFlipB{0%{transform:rotateY(0)}100%{transform:rotateY(180deg)}}
.bk-nav{display:flex;align-items:center;gap:18px;margin-top:18px;color:#c9a96e;font:600 14px Cinzel,serif;letter-spacing:.14em;z-index:5}
.bk-btn{min-width:120px;padding:11px 20px;border:1px solid rgba(201,169,110,.55);background:linear-gradient(180deg,#2c1d10,#160e07);color:#e6cf9e;font:600 14px 'Noto Serif KR',serif;letter-spacing:.12em;cursor:pointer;transition:.15s}
.bk-btn:hover{border-color:#e6cf9e;box-shadow:0 0 14px rgba(201,169,110,.3)}
.bk-btn[disabled]{opacity:.3;cursor:default;box-shadow:none}
.bk-go{border-color:#c9a96e;color:#fff1cf;box-shadow:0 0 16px rgba(201,169,110,.25)}
.bk-load{color:#c9a96e;font:600 13px Cinzel,serif;letter-spacing:.3em;animation:bkPulse 1.2s infinite}
@keyframes bkPulse{50%{opacity:.4}}
.bk-purple{background:radial-gradient(ellipse at 50% 40%,#1c1028,#050208 75%)}
.bk-purple .bk-top{color:#c9a8ea}.bk-purple .bk-top i{background:linear-gradient(90deg,rgba(190,150,235,.6),transparent)}
.bk-purple .bk-x{border-color:rgba(190,150,235,.45);color:#c9a8ea}
.bk-purple .bk-book::before{background:linear-gradient(90deg,#1f1129,#2f1a40 48%,#150a1d 50%,#2f1a40 52%,#1f1129);box-shadow:0 30px 80px rgba(0,0,0,.85),inset 0 0 0 2px #4a2d63,inset 0 0 0 6px #160b1f,inset 0 0 0 7px rgba(190,150,235,.45)}
.bk-purple .bk-pg{background:#e6dfe9;box-shadow:inset 0 0 60px rgba(90,50,120,.3)}
.bk-purple .bk-pg::before{background:radial-gradient(120% 90% at 50% 50%,transparent 60%,rgba(70,35,100,.25)),repeating-linear-gradient(0deg,rgba(90,60,120,.035) 0 2px,transparent 2px 5px)}
.bk-purple .bk-l{box-shadow:inset -18px 0 30px -12px rgba(50,25,75,.5),inset 0 0 60px rgba(90,50,120,.3)}
.bk-purple .bk-r{box-shadow:inset 18px 0 30px -12px rgba(50,25,75,.5),inset 0 0 60px rgba(90,50,120,.3)}
.bk-purple .bk-txt{color:#241830}
.bk-purple .bk-txt p.q{border-left-color:rgba(110,50,150,.5);color:#43185e}
.bk-purple .bk-txt p.sfx{color:#4a1a63}
.bk-purple .bk-txt p.first::first-letter{color:#5a2a7a}
.bk-purple .bk-img img{box-shadow:0 0 0 1px #5a3a74,0 0 0 5px #e6dfe9,0 0 0 6px rgba(90,58,116,.6),0 6px 18px rgba(0,0,0,.35)}
.bk-purple .bk-cover{color:#2e1840}.bk-purple .bk-cover i{background:#5a3a74}.bk-purple .bk-cover small{color:#6e4a8e}
.bk-purple .bk-one .bk-txt::before{background:#7a5a96}
.bk-purple .bk-leaf{background:#ddd3e3;box-shadow:inset 0 0 50px rgba(90,50,120,.35)}
.bk-purple .bk-nav{color:#c9a8ea}
.bk-purple .bk-btn{border-color:rgba(190,150,235,.55);background:linear-gradient(180deg,#26163a,#120a1c);color:#e2cff6}
.bk-purple .bk-btn:hover{border-color:#e2cff6;box-shadow:0 0 14px rgba(190,150,235,.3)}
.bk-purple .bk-go{border-color:#c9a8ea;color:#f6eefe}
.bk-purple .bk-load{color:#c9a8ea}

.bk-txt p i{font-style:italic}
.bk-txt p.th{text-indent:0;text-align:center;font-style:italic;color:#4b2e12;margin:1.1em 0}
.bk-txt p.sys{text-indent:0;display:table;margin:1.2em auto;padding:.45em 1.4em;border:1px solid rgba(138,100,30,.55);background:linear-gradient(180deg,rgba(255,236,190,.6),rgba(201,169,110,.18));font:700 1.2em Cinzel,'Noto Serif KR',serif;letter-spacing:.18em;color:#6b4a12;box-shadow:0 0 18px rgba(201,169,110,.35)}
.bk-purple .bk-txt p.th{color:#3e2056}
.bk-purple .bk-txt p.sys{border-color:rgba(110,70,150,.5);background:linear-gradient(180deg,rgba(245,232,255,.7),rgba(170,130,215,.18));color:#4a2470;box-shadow:0 0 18px rgba(170,130,215,.35)}
/* 표지: 닫힌 책 → 눌러서 펼치기 */
.bk-closed .bk-book{transform:translateX(-25%)}
.bk-closed .bk-book::before,.bk-closed .bk-pg{opacity:0;transition:none}
.bk-nav{transition:opacity .4s .9s}
.bk-closed .bk-nav,.bk-closed .bk-top span{opacity:0;pointer-events:none;transition:none}
.bk-lid{position:absolute;top:0;bottom:0;left:50%;width:50%;z-index:8;transform-origin:left center;transform-style:preserve-3d;transition:transform 1.15s cubic-bezier(.55,.1,.25,1),opacity .4s .8s;cursor:pointer;animation:bkLidIn .8s ease backwards}
@keyframes bkLidIn{from{opacity:0;transform:translateY(14px) scale(.97)}}
.bk-opening .bk-lid{transform:rotateY(-180deg)}
.bk-lf,.bk-lb{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.bk-lf{border-radius:3px 10px 10px 3px;transition:filter .2s;
 background:radial-gradient(130% 100% at 35% 22%,rgba(255,220,170,.12),transparent 55%),repeating-radial-gradient(circle at 20% 30%,rgba(0,0,0,.07) 0 1px,transparent 1px 3px),linear-gradient(90deg,#1a0e07 0,#3d2414 4%,#4a2c18 50%,#34200f);
 box-shadow:inset 9px 0 18px -6px rgba(0,0,0,.8),inset 0 0 0 1px #6b4a24,inset 0 0 50px rgba(0,0,0,.55),0 34px 80px rgba(0,0,0,.85)}
.bk-lid:hover .bk-lf{filter:brightness(1.1)}
.bk-lf-in{position:absolute;inset:clamp(22px,2.6vw,42px);border:1px solid rgba(201,169,110,.6);outline:1px solid rgba(201,169,110,.25);outline-offset:6px;box-shadow:inset 0 0 34px rgba(0,0,0,.4);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(14px,1.6vw,26px);text-align:center;padding:0 8%}
.bk-lf-in::before,.bk-lf-in::after{content:'◆';position:absolute;left:50%;transform:translateX(-50%);font-size:12px;line-height:1;color:#c9a96e;text-shadow:0 0 8px rgba(201,169,110,.7)}
.bk-lf-in::before{top:-7px}.bk-lf-in::after{bottom:-7px}
.bk-lf small{font:600 clamp(11px,.8vw,14px) Cinzel,'Noto Serif KR',serif;letter-spacing:.45em;color:#c9a96e}
.bk-lf em{font-style:normal;font-size:clamp(18px,1.6vw,28px);color:#e6cf9e;text-shadow:0 0 14px rgba(230,207,158,.7)}
.bk-lf b{font:700 clamp(34px,3.6vw,66px) 'Noto Serif KR',serif;letter-spacing:.16em;line-height:1.3;word-break:keep-all;background:linear-gradient(180deg,#fff1cf,#e0bd78 45%,#a57a3c);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 6px rgba(0,0,0,.75))}
.bk-lf i{width:46%;height:1px;background:linear-gradient(90deg,transparent,#c9a96e,transparent)}
.bk-lf span{position:absolute;bottom:clamp(18px,2.2vw,34px);font:600 12px 'Noto Serif KR',serif;letter-spacing:.3em;color:rgba(230,207,158,.75);animation:bkPulse 1.6s infinite}
.bk-lb{transform:rotateY(180deg);border-radius:10px 3px 3px 10px;background:#e8dbbd;box-shadow:inset -18px 0 30px -12px rgba(60,35,10,.55),inset 0 0 60px rgba(120,80,30,.35)}
.bk-purple .bk-lf{background:radial-gradient(130% 100% at 35% 22%,rgba(235,210,255,.12),transparent 55%),repeating-radial-gradient(circle at 20% 30%,rgba(0,0,0,.07) 0 1px,transparent 1px 3px),linear-gradient(90deg,#0e0614 0,#2a1640 4%,#341c4c 50%,#221234);box-shadow:inset 9px 0 18px -6px rgba(0,0,0,.8),inset 0 0 0 1px #5a3a74,inset 0 0 50px rgba(0,0,0,.55),0 34px 80px rgba(0,0,0,.85)}
.bk-purple .bk-lf-in{border-color:rgba(190,150,235,.6);outline-color:rgba(190,150,235,.25)}
.bk-purple .bk-lf-in::before,.bk-purple .bk-lf-in::after,.bk-purple .bk-lf small{color:#c9a8ea}
.bk-purple .bk-lf em{color:#e2cff6;text-shadow:0 0 14px rgba(200,160,240,.7)}
.bk-purple .bk-lf b{background-image:linear-gradient(180deg,#fbf3ff,#d4b6f2 45%,#8a64b4)}
.bk-purple .bk-lf i{background:linear-gradient(90deg,transparent,#c9a8ea,transparent)}
.bk-purple .bk-lf span{color:rgba(226,207,246,.75)}
.bk-purple .bk-lb{background:#e6dfe9}
/* 책장 로어북: 탁한 핑크 책 */
.bk-rose{background:radial-gradient(ellipse at 50% 40%,#26101a,#080205 75%)}
.bk-rose .bk-top{color:#dba3b8}.bk-rose .bk-top i{background:linear-gradient(90deg,rgba(215,145,172,.6),transparent)}
.bk-rose .bk-x{border-color:rgba(215,145,172,.45);color:#dba3b8}
.bk-rose .bk-book::before{background:linear-gradient(90deg,#28111b,#3d1a2a 48%,#1b0a12 50%,#3d1a2a 52%,#28111b);box-shadow:0 30px 80px rgba(0,0,0,.85),inset 0 0 0 2px #5e2d43,inset 0 0 0 6px #1d0b14,inset 0 0 0 7px rgba(215,145,172,.45)}
.bk-rose .bk-pg{background:#ebdfe3;box-shadow:inset 0 0 60px rgba(115,50,78,.3)}
.bk-rose .bk-pg::before{background:radial-gradient(120% 90% at 50% 50%,transparent 60%,rgba(95,35,62,.25)),repeating-linear-gradient(0deg,rgba(115,60,82,.035) 0 2px,transparent 2px 5px)}
.bk-rose .bk-l{box-shadow:inset -18px 0 30px -12px rgba(72,25,46,.5),inset 0 0 60px rgba(115,50,78,.3)}
.bk-rose .bk-r{box-shadow:inset 18px 0 30px -12px rgba(72,25,46,.5),inset 0 0 60px rgba(115,50,78,.3)}
.bk-rose .bk-txt{color:#2e1820}
.bk-rose .bk-txt p.q{border-left-color:rgba(140,50,90,.5);color:#581836}
.bk-rose .bk-txt p.sfx{color:#5e1a3d}
.bk-rose .bk-txt p.first::first-letter{color:#74294c}
.bk-rose .bk-img img{box-shadow:0 0 0 1px #6e3a52,0 0 0 5px #ebdfe3,0 0 0 6px rgba(110,58,82,.6),0 6px 18px rgba(0,0,0,.35)}
.bk-rose .bk-cover{color:#3c1826}.bk-rose .bk-cover i{background:#6e3a52}.bk-rose .bk-cover small{color:#8a4a64}
.bk-rose .bk-one .bk-txt::before{background:#905a72}
.bk-rose .bk-leaf{background:#e2d3d9;box-shadow:inset 0 0 50px rgba(115,50,78,.35)}
.bk-rose .bk-nav{color:#dba3b8}
.bk-rose .bk-btn{border-color:rgba(215,145,172,.55);background:linear-gradient(180deg,#371624,#1a0a11);color:#f2cdda}
.bk-rose .bk-btn:hover{border-color:#f2cdda;box-shadow:0 0 14px rgba(215,145,172,.3)}
.bk-rose .bk-go{border-color:#dba3b8;color:#fdeff4}
.bk-rose .bk-load{color:#dba3b8}
.bk-rose .bk-txt p.th{color:#521f36}
.bk-rose .bk-txt p.sys{border-color:rgba(140,70,100,.5);background:linear-gradient(180deg,rgba(255,232,240,.7),rgba(205,130,160,.18));color:#6a2444;box-shadow:0 0 18px rgba(205,130,160,.35)}
.bk-rose .bk-lf{background:radial-gradient(130% 100% at 35% 22%,rgba(255,210,225,.12),transparent 55%),repeating-radial-gradient(circle at 20% 30%,rgba(0,0,0,.07) 0 1px,transparent 1px 3px),linear-gradient(90deg,#13060b 0,#3d1628 4%,#481c31 50%,#321220);box-shadow:inset 9px 0 18px -6px rgba(0,0,0,.8),inset 0 0 0 1px #6e3a52,inset 0 0 50px rgba(0,0,0,.55),0 34px 80px rgba(0,0,0,.85)}
.bk-rose .bk-lf-in{border-color:rgba(215,145,172,.6);outline-color:rgba(215,145,172,.25)}
.bk-rose .bk-lf-in::before,.bk-rose .bk-lf-in::after,.bk-rose .bk-lf small{color:#dba3b8}
.bk-rose .bk-lf em{color:#f2cdda;text-shadow:0 0 14px rgba(230,160,188,.7)}
.bk-rose .bk-lf b{background-image:linear-gradient(180deg,#fff3f7,#e8b3c6 45%,#a8607e)}
.bk-rose .bk-lf i{background:linear-gradient(90deg,transparent,#dba3b8,transparent)}
.bk-rose .bk-lf span{color:rgba(242,205,218,.75)}
.bk-rose .bk-lb{background:#ebdfe3}
@media (max-aspect-ratio:1/1),(max-width:760px){
  .bk{padding:58px 0 14px}
  .bk-closed .bk-book{transform:none}
  .bk-lid{left:0;width:100%}
  .bk-opening .bk-lid{transform:rotateY(-110deg);opacity:0}
  .bk-lf b{font-size:clamp(28px,9vw,44px)}
  .bk-book{width:94vw;height:calc(100vh - 150px);padding:10px}
  .bk-book::before{border-radius:4px}
  .bk-txt{padding:30px 22px 26px;font-size:15.5px;line-height:1.9}
  .bk-img{inset:12px}
  .bk-cover b{font-size:30px}
  .bk-leaf{left:10px;width:calc(100% - 20px);top:10px;bottom:10px}
  .bk-btn{min-width:92px;padding:10px 14px}
  .bk-nav{gap:12px}
}
/* 신들의 개입 */
.pre{background:#000;animation:scr 7.5s ease-in-out forwards}
.pre .scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 2px,rgba(0,0,0,.35) 2px 4px);z-index:3;pointer-events:none}
.pre .red{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(160,0,0,.45),transparent 60%);animation:glow 7s ease-in-out both}
.pre .main{font-family:'Courier New',monospace;font-weight:900;font-size:46px;letter-spacing:8px;color:#f22;text-shadow:0 0 20px rgba(255,0,0,.85),0 0 60px rgba(139,0,0,.6)}
.pre .main::before,.pre .main::after{content:attr(data-t);position:absolute;inset:0}
.pre .main::before{color:#f00;clip-path:inset(0 0 62% 0);animation:g1 2.4s infinite}
.pre .main::after{color:#b00;clip-path:inset(62% 0 0 0);animation:g2 1.8s infinite}
.pre .sub{color:rgba(200,40,40,.85)}
@keyframes g1{0%,92%{transform:none}94%{transform:translate(-5px,1px)}97%{transform:translate(3px,-1px)}}
@keyframes g2{0%,88%{transform:none}90%{transform:translate(4px,-1px)}94%{transform:translate(-3px,1px)}}
/* 건설 시작: 망치 뚝딱뚝딱 */
.bld{background:radial-gradient(ellipse at 50% 60%,#2a1d10,#0b0806 70%);flex-direction:column}
.bld .stage{position:relative;width:260px;height:200px}
.bld .ground{position:absolute;left:10%;right:10%;bottom:30px;height:2px;background:linear-gradient(90deg,transparent,#8a6a3e,transparent)}
.bld .plank{position:absolute;left:50%;bottom:32px;width:120px;height:16px;margin-left:-60px;background:linear-gradient(#7a5530,#4e3419);border:1px solid #2a1a0c;border-radius:2px;animation:bldPl 1.3s .1s infinite}
.bld .ham{position:absolute;left:50%;bottom:44px;width:120px;height:120px;margin-left:-84px;transform-origin:8% 92%;animation:bldSw 1.3s infinite cubic-bezier(.5,0,.6,1)}
.bld .ham svg{width:100%;height:100%;filter:drop-shadow(0 4px 8px rgba(0,0,0,.7))}
.bld .hit{position:absolute;left:50%;bottom:40px;width:10px;height:10px;margin-left:-5px;border-radius:50%;opacity:0;animation:bldHit 1.3s infinite}
.bld .hit:before{content:"";position:absolute;inset:-40px;border-radius:50%;background:radial-gradient(circle,rgba(255,220,150,.85),rgba(255,160,60,.25) 40%,transparent 70%)}
.bld .dust{position:absolute;bottom:32px;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle,rgba(190,160,120,.55),transparent 70%);opacity:0;animation:bldDu 1.3s infinite}
.bld .d1{left:30%;--dx:-40px}.bld .d2{left:58%;--dx:40px}.bld .d3{left:44%;--dx:-10px}
.bld .sp{position:absolute;left:50%;bottom:44px;width:3px;height:3px;background:#ffd68a;border-radius:50%;opacity:0;animation:bldSp 1.3s infinite}
.bld .s1{--sx:-60px;--sy:-50px}.bld .s2{--sx:55px;--sy:-60px}.bld .s3{--sx:-30px;--sy:-80px}.bld .s4{--sx:35px;--sy:-35px}
.bld .ttk{position:absolute;font:900 44px/1 'Noto Serif KR',serif;color:#ffe2a8;text-shadow:0 3px 0 #6a3d12,0 0 22px rgba(255,170,60,.7);opacity:0}
.bld .k1{left:2%;top:4%;animation:bldTk 2.6s .62s infinite}.bld .k2{right:0;top:18%;animation:bldTk 2.6s 1.92s infinite}
.bld .tx{margin-top:18px;text-align:center}
.bld .main{font-family:'Noto Serif KR',serif;font-size:40px;font-weight:700;color:#f0d9a8;letter-spacing:.06em;animation:bldIn .8s .2s both}
.bld .sub{margin-top:8px;font-size:15px;letter-spacing:.4em;color:#c9a25c;animation:bldIn .8s .5s both}
@keyframes bldSw{0%,8%{transform:rotate(-70deg)}40%{transform:rotate(-78deg)}50%{transform:rotate(8deg)}56%{transform:rotate(0)}100%{transform:rotate(-70deg)}}
@keyframes bldHit{0%,48%{opacity:0;transform:scale(.4)}51%{opacity:1;transform:scale(1)}70%,100%{opacity:0;transform:scale(1.4)}}
@keyframes bldDu{0%,49%{opacity:0;transform:translate(0,0) scale(.6)}53%{opacity:1}100%{opacity:0;transform:translate(var(--dx),-26px) scale(2.2)}}
@keyframes bldSp{0%,49%{opacity:0;transform:translate(0,0)}51%{opacity:1}85%,100%{opacity:0;transform:translate(var(--sx),var(--sy))}}
@keyframes bldPl{0%,49%{transform:translateY(0)}52%{transform:translateY(3px)}60%,100%{transform:translateY(0)}}
@keyframes bldTk{0%{opacity:0;transform:scale(.4) rotate(-12deg)}6%{opacity:1;transform:scale(1.15) rotate(-6deg)}14%{transform:scale(1) rotate(-6deg)}34%{opacity:1}44%,100%{opacity:0;transform:scale(1) translateY(-14px) rotate(-6deg)}}
@keyframes bldIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media(max-width:600px){.main{font-size:30px!important;letter-spacing:8px!important}.boss .main{font-size:38px!important}.clr .main{font-size:42px!important}.prm .main{font-size:34px!important;letter-spacing:6px!important}.cvx .main{font-size:30px!important;letter-spacing:5px!important}
.cv-og .main{color:#ff4a30;text-shadow:0 0 3px #300,0 0 18px #e8402a,0 0 44px #a01000}.cv-og .tag{color:#ff7a5c}
.cv-bl .main{color:#5fe08a;text-shadow:0 0 3px #021,0 0 18px #2f9a50,0 0 44px #126a30}.cv-bl .tag{color:#7fd89a}
.cv-vp .main{color:#07020a;text-shadow:0 0 2px #d6a8ff,0 0 14px #a050ff,0 0 38px #6a18c8}.cv-vp .tag{color:#b88aff}}
/* 책장에서 연 책: 표지가 나와 옆으로 펼쳐짐 */
.sbi{position:fixed;inset:0;z-index:9;display:flex;align-items:center;justify-content:center;overflow:hidden}
.sbi-dim{position:absolute;inset:0;background:radial-gradient(60% 50% at 50% 45%,rgba(40,14,52,.6),rgba(5,2,10,.95));opacity:0;animation:sbiDim .35s ease-out forwards}
.sbi-p{position:relative;perspective:1300px}
.sbi-b{--w:min(44vw,32vh);position:relative;width:var(--w);height:calc(var(--w) * 342 / 221);transform-style:preserve-3d;opacity:0;animation:sbiIn .5s cubic-bezier(.2,.8,.2,1) .1s forwards,sbiShift .85s cubic-bezier(.65,0,.35,1) .62s forwards}
.sbi-sp{position:absolute;left:0;top:0;width:22.6%;height:100%;background:0 0/442.5% 100% no-repeat}
.sbi-pg{position:absolute;left:24%;top:9%;width:72%;height:78%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2vh;padding:0 6%;box-sizing:border-box;text-align:center;opacity:0;color:#4a2a12;font-family:'Noto Serif KR',serif;
 background:linear-gradient(90deg,#d9c7a4,#f6ecd6 8%,#fbf4e3 60%,#efe1c4);box-shadow:inset 0 0 18px rgba(120,80,30,.25);animation:sbiPg .3s ease-out .9s forwards}
.sbi-pg em{font-style:normal;font-family:Cinzel,serif;font-size:max(9px,1.2vh);letter-spacing:.3em;color:#8a6a3a}
.sbi-pg b{font-size:max(14px,2.3vh);letter-spacing:.06em;line-height:1.35;word-break:keep-all}
.sbi-pg i{width:50%;height:1px;background:linear-gradient(90deg,transparent,#a77a35,transparent)}
.sbi-fl{position:absolute;left:22.6%;top:0;width:77.4%;height:100%;transform-origin:0 50%;transform-style:preserve-3d;animation:sbiFlip .85s cubic-bezier(.65,0,.35,1) .62s forwards}
.sbi-fr,.sbi-bk{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.sbi-fr{background:100% 0/129.2% 100% no-repeat}
.sbi-bk{transform:rotateY(180deg);background:linear-gradient(90deg,var(--in1),var(--in2));box-shadow:inset 0 0 0 .6vh var(--in1),inset 0 0 0 calc(.6vh + 1px) #c9a35e,inset 0 0 2.4vh rgba(0,0,0,.6)}
.sbi-main{--in1:#3c0f14;--in2:#5a1a20}.sbi-hero{--in1:#14241a;--in2:#22382a}.sbi-back{--in1:#3a1626;--in2:#55243a}
.sbi.out{animation:sbiOut .4s ease-in forwards}
@keyframes sbiDim{to{opacity:1}}
@keyframes sbiIn{0%{opacity:0;transform:scale(.45) rotateY(30deg)}100%{opacity:1;transform:none}}
@keyframes sbiShift{from{translate:0}to{translate:calc(var(--w) * .36)}}
@keyframes sbiFlip{to{transform:rotateY(-168deg)}}
@keyframes sbiPg{to{opacity:1}}
@keyframes sbiOut{to{opacity:0;transform:scale(1.06)}}
/* 포로 반란: ① 어두운 화면에서 우당탕탕(흔들림·파편·효과음 글자) → ② 반란 그림 한 장 → ③ "포로 반란!" → 사라짐 (총 5초) */
.rv{background:#0d0404;overflow:hidden;animation:rvBg 5s ease forwards}
@keyframes rvBg{0%{opacity:0}4%{opacity:1}86%{opacity:1}100%{opacity:0}}
.rv-a{position:absolute;inset:0;animation:rvShake .16s linear 11 .1s,rvAOut .3s ease 1.75s forwards}
@keyframes rvAOut{to{opacity:0;visibility:hidden}}
@keyframes rvShake{0%{translate:0 0}25%{translate:-10px 6px}50%{translate:9px -7px}75%{translate:-6px -4px}100%{translate:0 0}}
.rv-fl{position:absolute;inset:0;background:#ff2a12;opacity:0;animation:rvFlash .36s steps(2) 5 .1s}
@keyframes rvFlash{50%{opacity:.22}}
.rv-db{position:absolute;top:-40px;width:var(--s);height:calc(var(--s) * .6);background:#5b3a22;border:2px solid #2b1a0e;border-radius:3px;opacity:0;animation:rvFall var(--d) cubic-bezier(.5,0,.8,1) var(--dl) forwards}
@keyframes rvFall{0%{opacity:1;transform:translateY(0) rotate(0)}100%{opacity:1;transform:translateY(110vh) rotate(var(--r))}}
.rv-bang{position:absolute;font:900 clamp(30px,9vw,64px)/1 'Noto Sans KR',sans-serif;color:#fff3c4;-webkit-text-stroke:3px #3a0d06;paint-order:stroke;text-shadow:0 6px 0 #3a0d06;opacity:0;transform:rotate(var(--r)) scale(.4);animation:rvBang .4s cubic-bezier(.3,1.6,.5,1) var(--dl) forwards}
@keyframes rvBang{to{opacity:1;transform:rotate(var(--r)) scale(1)}}
.rv-b{position:absolute;inset:0;opacity:0;animation:rvBIn .35s ease 1.8s forwards}
@keyframes rvBIn{to{opacity:1}}
.rv-im{position:absolute;inset:0;background:62% center/cover no-repeat;animation:rvZoom 3.2s ease-out 1.8s both}
@keyframes rvZoom{from{transform:scale(1.12)}to{transform:scale(1)}}
.rv-wf{position:absolute;inset:0;background:#fff;opacity:0;animation:rvW .5s ease 1.8s}
@keyframes rvW{0%{opacity:.85}100%{opacity:0}}
.rv-vg{position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.85),transparent 45%),radial-gradient(ellipse at center,transparent 45%,rgba(0,0,0,.6))}
.rv-tt{position:absolute;left:0;right:0;bottom:10%;text-align:center;opacity:0;animation:rvTt .5s ease 2.6s forwards}
.rv-tt b{display:block;font:900 clamp(34px,9vw,64px)/1.1 'Noto Serif KR',serif;color:#ff5a3c;text-shadow:0 0 20px #ff2a1288,0 3px 0 #2a0703;letter-spacing:.08em}
.rv-tt small{display:block;margin-top:8px;font-size:clamp(13px,3.6vw,18px);color:#ffd9c8}
@keyframes rvTt{from{opacity:0;transform:translateY(20px) scale(1.1)}to{opacity:1;transform:none}}
/* 회춘의 비약: 화면이 검게 → 핑크 약병이 기울어 약을 따름 → 핑크빛 + 글자 */
.rj{background:#000;animation:ptIn 6.2s ease forwards}
@keyframes ptIn{0%{background:rgba(0,0,0,0)}10%{background:#000}85%{background:#000}100%{background:rgba(0,0,0,0)}}
.pt-st{position:absolute;left:50%;top:50%;width:360px;height:560px;transform:translate(-50%,-50%) scale(var(--sc,1))}
.pt-bl{position:absolute;inset:0;background:radial-gradient(circle at calc(50% - 55px * var(--sc,1)) calc(50% + 145px * var(--sc,1)),#ff6fc0aa,#ff4fa833 calc(200px * var(--sc,1)),transparent calc(430px * var(--sc,1)));opacity:0;animation:ptBl 6.2s ease forwards}
@keyframes ptBl{0%,60%{opacity:0}72%{opacity:1}100%{opacity:0}}
.pt-bt{position:absolute;left:50%;top:22%;width:90px;margin-left:-45px;transform-origin:50% 80%;opacity:0;animation:ptBt 6.2s ease forwards}
@keyframes ptBt{0%,8%{opacity:0;transform:translateY(-40px) rotate(0)}18%{opacity:1;transform:translateY(0) rotate(0)}32%{transform:translate(40px,0) rotate(-115deg)}70%{opacity:1;transform:translate(40px,0) rotate(-115deg)}82%{opacity:0;transform:translate(40px,-20px) rotate(-60deg)}100%{opacity:0}}
.pt-sm{position:absolute;left:122px;top:50%;width:7px;height:0;border-radius:4px;background:linear-gradient(#ff9fd2,#ff4fa8);box-shadow:0 0 12px #ff6fc0,0 0 26px #ff4fa880;opacity:0;animation:ptSm 6.2s ease forwards}
@keyframes ptSm{0%,31%{height:0;opacity:0}33%{opacity:1}42%{height:27%}70%{height:27%;opacity:1;top:50%}80%{height:0;top:77%;opacity:0}100%{opacity:0}}
.pt-pl{position:absolute;left:125px;top:76%;width:0;height:14px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(#ff7cc4,#ff4fa800 70%);opacity:0;animation:ptPl 6.2s ease forwards}
@keyframes ptPl{0%,42%{width:0;opacity:0}55%{width:120px;opacity:1}75%{width:150px;opacity:.9}90%{opacity:0}}
.pt-sp{position:absolute;top:76%;width:5px;height:5px;border-radius:50%;background:#ffd1ea;box-shadow:0 0 8px #ff6fc0;opacity:0;animation:ptSp 2.4s ease-out var(--d) forwards}
@keyframes ptSp{0%{opacity:0;transform:translate(0,0)}15%{opacity:1}100%{opacity:0;transform:translate(var(--x),-170px)}}
.pt-tx{position:absolute;left:-40%;right:-40%;bottom:12%;text-align:center;opacity:0;font-family:'Noto Serif KR',serif;animation:ptTx 6.2s ease forwards}
@keyframes ptTx{0%,62%{opacity:0;transform:translateY(8px)}72%{opacity:1;transform:none}90%{opacity:1}100%{opacity:0}}
.pt-tx b{display:block;font-size:22px;letter-spacing:.2em;color:#ffc2e2;text-shadow:0 0 14px #ff4fa8}
.pt-tx small{display:block;margin-top:6px;font-size:13px;color:#e7c9da}
`;
const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function hexText(h){try{if(!h)return '';const b=new Uint8Array(h.match(/../g).map(x=>parseInt(x,16)));return new TextDecoder().decode(b)}catch{return ''}}
function particles(){let s='';const P=[[12,65,2,5,.5],[42,78,1.5,6,.8],[70,58,2.5,4.5,.3],[28,72,1,7,1],[55,82,2,5.5,.6],[85,50,1.5,6.5,1.2],[8,40,2,5,1.5],[90,68,1,4,.4]];
 for(const[x,y,z,d,dl]of P)s+=`<div class="pt" style="left:${x}%;top:${y}%;width:${z}px;height:${z}px;animation-duration:${d}s;animation-delay:${dl}s"></div>`;return s}
/* ---------- 아르카나 달성: 카드가 돌다가 아르카나가 떠오름 (그림은 깃허브 arcana/이름.webp, 뒷면 arcana/back.webp) ---------- */
function arcInfo(a){
 const t=String(a||'').replace(/[【】]/g,'').trim(),m=t.match(/^([0IVXL]+)\s*-\s*(.+)$/);
 const name=(m?m[2]:t).trim(),key=name.toLowerCase().replace(/^the\s+/,'').replace(/[^a-z]+/g,'_').replace(/^_+|_+$/g,'');
 return {num:m?m[1]:'',name,key};
}
const ARC_CSS=`
.arc{position:fixed;inset:0;overflow:hidden;background:radial-gradient(ellipse at 50% 42%,#1d1236 0%,#0a0614 55%,#030208 100%);font-family:'Cinzel','Noto Serif KR',serif;--W:min(54vw,34vh,300px);--Y:42%}
.arc-st i{position:absolute;background:#e9dcff;border-radius:50%;opacity:.2;animation:arcTw 2.8s ease-in-out infinite}@keyframes arcTw{50%{opacity:.9}}
.arc-ring{position:absolute;left:50%;top:var(--Y);width:calc(var(--W)*1.9);height:calc(var(--W)*1.9);translate:-50% -50%;opacity:0;animation:arcRin 1s ease .2s forwards,arcRot 40s linear infinite}
.arc-ring svg{width:100%;height:100%;display:block}.arc-ring line,.arc-ring circle,.arc-ring polygon{stroke:#c9a35a;stroke-width:1.2;fill:none}.arc-ring text{fill:#c9a35a;font-size:11px;text-anchor:middle;letter-spacing:1px}
.arc-ring2{width:calc(var(--W)*1.45);height:calc(var(--W)*1.45);animation:arcRin 1s ease .4s forwards,arcRot 25s linear infinite reverse}
@keyframes arcRin{from{opacity:0;scale:.6}to{opacity:.55;scale:1}}@keyframes arcRot{to{rotate:360deg}}
.arc-rays{position:absolute;left:50%;top:var(--Y);width:260vmax;height:260vmax;translate:-50% -50%;background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--c) 30%,#ffd98a 70%) 0 4deg,transparent 4deg 18deg);opacity:0;-webkit-mask:radial-gradient(circle,#000 0,transparent 30%);mask:radial-gradient(circle,#000 0,transparent 30%);animation:arcRay 1.2s ease 3.1s forwards,arcRot 60s linear 3.1s infinite}
@keyframes arcRay{to{opacity:.35}}
.arc-pt{position:absolute;left:50%;top:var(--Y);width:8px;height:8px;margin:-4px;border-radius:50%;background:#fff;box-shadow:0 0 30px 12px #b98cff;opacity:0;animation:arcPt 1s ease forwards}
@keyframes arcPt{0%{opacity:0;transform:scale(0)}60%{opacity:1;transform:scale(1.6)}100%{opacity:0;transform:scale(3)}}
.arc-stage{position:absolute;left:50%;top:var(--Y);perspective:1100px}
.arc-glow{position:absolute;left:calc(var(--W)*-.9);top:calc(var(--W)*-1.15);width:calc(var(--W)*1.8);height:calc(var(--W)*2.3);border-radius:50%;background:radial-gradient(ellipse,#ffcf7a99,transparent 65%);opacity:0;animation:arcGl .9s ease 3.25s forwards}@keyframes arcGl{40%{opacity:.9}to{opacity:.4}}
.arc-wrap{position:absolute;left:calc(var(--W)*-.5);top:calc(var(--W)*-.75);width:var(--W);height:calc(var(--W)*1.5);opacity:0;transform-style:preserve-3d;animation:arcWp .3s ease .7s forwards}@keyframes arcWp{to{opacity:1}}
.arc-card{position:absolute;inset:0;transform-style:preserve-3d;transform:scale(.25) rotateY(180deg);animation:arcSpin 2.6s cubic-bezier(.15,.6,.25,1) .7s forwards}
@keyframes arcSpin{0%{transform:scale(.25) rotateY(180deg)}100%{transform:scale(1) rotateY(1800deg)}}
.arc-face{position:absolute;inset:0;border-radius:4.5%/3%;background:#140c22 center/cover;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:0 0 0 1px #c9a35a88,0 10px 40px #000a}
.arc-back{transform:rotateY(180deg)}
.arc-flash{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,#fff,#ffe9b8 30%,transparent 70%);opacity:0;animation:arcFl .7s ease 3.25s forwards;pointer-events:none}@keyframes arcFl{25%{opacity:.95}to{opacity:0}}
.arc-dust b{position:absolute;top:calc(var(--Y) + var(--W)*.6);width:3px;height:3px;border-radius:50%;background:#ffd98a;box-shadow:0 0 6px #ffd98a;opacity:0;animation:arcDu 2.6s ease-out infinite}
@keyframes arcDu{0%{opacity:0;transform:none}20%{opacity:1}100%{opacity:0;transform:translate(var(--x),-46vh)}}
.arc-tt{position:absolute;left:0;right:0;top:calc(var(--Y) + var(--W)*.75 + 26px);text-align:center;padding:0 12px}
.arc-tt small{display:block;color:#b996ff;font-size:11px;letter-spacing:.6em;opacity:0;animation:arcUp .8s ease 3.6s forwards}
.arc-tt b{display:block;color:#f3d68e;font-size:clamp(20px,6.5vw,32px);font-weight:700;margin-top:10px;text-shadow:0 0 18px #c9a35a;opacity:0;letter-spacing:.5em;white-space:nowrap;animation:arcNm 1.2s ease 3.8s forwards}
.arc-tt .arc-ln{width:0;height:1px;margin:12px auto;background:linear-gradient(90deg,transparent,#c9a35a,transparent);animation:arcLn 1s ease 4.2s forwards}
.arc-tt span{display:block;color:#e6dccb;font:500 14px 'Noto Serif KR',serif;opacity:0;animation:arcUp .8s ease 4.5s forwards}
.arc-tt em{display:block;margin-top:22px;color:#fff8;font:12px sans-serif;font-style:normal;opacity:0;animation:arcUp .8s ease 5.4s forwards}
@keyframes arcUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes arcNm{to{opacity:1;letter-spacing:.06em}}@keyframes arcLn{to{width:min(240px,70vw)}}
`;
function arcFx(a,s,c){
 const I=arcInfo(a),img=GH_BASE?ghv(GH_BASE+'arcana/'+I.key+'.webp'):'',bk=GH_BASE?ghv(GH_BASE+'arcana/back.webp'):'';
 const title=(I.num?I.num+' · ':'')+I.name.toUpperCase();
 let ticks='',runes='',stars='',dust='';
 const nums=['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];
 for(let i=0;i<60;i++)ticks+=`<line x1="200" y1="14" x2="200" y2="${i%5?24:32}" transform="rotate(${i*6} 200 200)"/>`;
 nums.forEach((n,i)=>runes+=`<text x="200" y="52" transform="rotate(${(i*360/22).toFixed(2)} 200 200)">${n}</text>`);
 for(let i=0;i<60;i++)stars+=`<i style="left:${(i*37)%100}%;top:${(i*53)%100}%;animation-delay:${(i%7)*.4}s;width:${1+i%3}px;height:${1+i%3}px"></i>`;
 for(let i=0;i<26;i++)dust+=`<b style="left:${30+(i*17)%40}%;animation-delay:${(3+(i%9)*.18).toFixed(2)}s;--x:${(i*29)%60-30}px"></b>`;
 return {ms:12000,pre:[img,bk].filter(Boolean),html:`<style>${ARC_CSS}</style><div class="arc" style="--c:#${/^[0-9a-fA-F]{6}$/.test(c||'')?c:'c9a35a'}">
 <div class="arc-st">${stars}</div><div class="arc-rays"></div>
 <div class="arc-ring"><svg viewBox="0 0 400 400"><circle cx="200" cy="200" r="186"/><circle cx="200" cy="200" r="170"/>${ticks}${runes}</svg></div>
 <div class="arc-ring arc-ring2"><svg viewBox="0 0 400 400"><circle cx="200" cy="200" r="190"/><polygon points="200,20 356,290 44,290"/><polygon points="200,380 44,110 356,110"/></svg></div>
 <div class="arc-pt"></div>
 <div class="arc-stage"><div class="arc-glow"></div><div class="arc-wrap"><div class="arc-card"><div class="arc-face" style="background-image:url('${esc(img)}')"></div><div class="arc-face arc-back" style="background-image:url('${esc(bk)}')"></div></div></div></div>
 <div class="arc-dust">${dust}</div><div class="arc-flash"></div>
 <div class="arc-tt"><small>ARCANA AWAKENED</small><b>${esc(title)}</b><div class="arc-ln"></div>${s?`<span>${esc(s)}</span>`:''}<em>화면을 눌러 닫기</em></div></div>`};
}
const FX={
 potion:(a)=>({ms:6200,html:`<div class="fx rj" style="--sc:${Math.max(.7,Math.min(1.6,innerHeight/600,innerWidth/400))}"><div class="pt-bl"></div><div class="pt-st">
  <svg class="pt-bt" viewBox="0 0 90 140"><defs><linearGradient id="ptg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff9fd2"/><stop offset="1" stop-color="#d42a83"/></linearGradient></defs>
  <path d="M38 14h14v22c18 8 28 24 28 46 0 30-16 52-35 52S10 112 10 82c0-22 10-38 28-46z" fill="rgba(255,220,240,.12)" stroke="#ffd6ec" stroke-width="2.5"/>
  <path d="M41 30h8v9c17 8 27 23 27 43 0 28-14 48-31 48S14 110 14 82c0-20 10-35 27-43z" fill="url(#ptg)" opacity=".9"/><ellipse cx="30" cy="70" rx="5" ry="12" fill="#fff" opacity=".35"/></svg>
  <div class="pt-sm"></div><div class="pt-pl"></div>
  ${[[31,-20,3.9],[36,14,4.1],[28,-36,4.3],[39,30,4.0],[34,4,4.5]].map(([l,x,d])=>`<i class="pt-sp" style="left:${l}%;--x:${x}px;--d:${d}s"></i>`).join('')}
  <div class="pt-tx"><b>회춘의 비약</b><small>${esc(a)} — 전성기의 모습으로</small></div></div></div>`}),
 revolt:()=>{const im=GH_BASE?ghv(GH_BASE+'event/revolt.webp'):'';
  const db=[[8,26,1.1,.1,320],[22,18,1.3,.3,-260],[37,30,1.0,.2,410],[51,22,1.4,.5,-380],[66,28,1.2,.15,300],[80,20,1.0,.6,-340],[92,24,1.3,.35,280],[15,16,1.2,.7,-300],[45,34,.9,.8,360],[73,18,1.3,.9,-420]];
  const bang=[['우당탕!',10,24,-12,.15],['쾅!',64,18,10,.45],['탕탕!!',18,56,8,.75],['와장창!',56,46,-8,1.05],['우당탕탕!!',22,74,-4,1.3]];
  return {ms:5000,pre:im?[im]:[],html:`<div class="fx rv"><div class="rv-a"><div class="rv-fl"></div>
  ${db.map(([l,s,d,dl,r])=>`<i class="rv-db" style="left:${l}%;--s:${s}px;--d:${d}s;--dl:${dl}s;--r:${r}deg"></i>`).join('')}
  ${bang.map(([t,l,tp,r,dl])=>`<div class="rv-bang" style="left:${l}%;top:${tp}%;--r:${r}deg;--dl:${dl}s">${t}</div>`).join('')}</div>
  <div class="rv-b"><div class="rv-im" style="background-image:url('${im}')"></div><div class="rv-vg"></div><div class="rv-wf"></div>
  <div class="rv-tt"><b>포로 반란!</b><small>정산 중 포로들이 들고일어났다</small></div></div></div>`}},
 prologue:()=>({ms:8000,html:`<div class="fx pro"><div class="vig"></div>${particles()}
  <div class="ln" style="top:0;left:0;animation-delay:.3s"></div><div class="ln" style="bottom:0;right:0;animation-delay:.5s"></div>
  <div class="cn" style="top:28px;left:28px;border-top-width:1px;border-left-width:1px;animation-delay:.3s"></div><div class="cn" style="top:28px;right:28px;border-top-width:1px;border-right-width:1px;animation-delay:.4s"></div>
  <div class="cn" style="bottom:28px;left:28px;border-bottom-width:1px;border-left-width:1px;animation-delay:.5s"></div><div class="cn" style="bottom:28px;right:28px;border-bottom-width:1px;border-right-width:1px;animation-delay:.6s"></div>
  <div class="tx"><div class="sub">the curtain rises</div><div class="main">OVERTURE<div class="ul"></div></div></div></div>`}),
 boss:(a,s,c)=>({ms:7000,html:`<div class="fx boss" style="--c:#${c||'c84a3a'}"><div class="glow"></div><div class="flash"></div><div class="bars t"></div><div class="bars b"></div>
  <div class="tx"><div class="tag">RIVAL</div><div class="main">${esc(a)}</div>${s?`<div class="sub">${esc(s)}</div>`:''}</div></div>`}),
 clear:()=>({ms:8000,html:`<div class="fx" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0a0a0f;display:flex;align-items:center;justify-content:center;z-index:9999;animation:imScreen 8s ease-in-out forwards;"><style>@keyframes imScreen{0%{opacity:1;visibility:visible}80%{opacity:1;visibility:visible}95%{opacity:0;visibility:visible}100%{opacity:0;visibility:hidden;pointer-events:none}}@keyframes imPt{0%,100%{transform:translateY(0);opacity:0}10%{opacity:0.5}90%{opacity:0.5}100%{transform:translateY(-70px);opacity:0}}@keyframes imCnIn{0%{opacity:0}25%{opacity:1}80%{opacity:1}100%{opacity:0}}@keyframes imLnIn{0%{width:0}20%{width:100%}80%{width:100%}100%{width:0}}@keyframes imTxtIn{0%{opacity:0;transform:scale(0.88)}15%{opacity:1;transform:scale(1)}72%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.06)}}@keyframes imSubIn{0%{opacity:0;transform:translateY(8px)}18%{opacity:1;transform:translateY(0)}70%{opacity:1}100%{opacity:0}}@keyframes imMainIn{0%{opacity:0;transform:translateY(8px)}20%{opacity:1;transform:translateY(0)}68%{opacity:1}100%{opacity:0}}@keyframes imUlSweep{0%{width:0}25%{width:90px}65%{width:90px}100%{width:0}}</style><div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(20,18,30,0.2) 0%,rgba(0,0,0,0.95) 100%);pointer-events:none;"></div><div style="position:absolute;width:2px;height:2px;background:rgba(160,165,175,0.4);border-radius:50%;left:12%;top:65%;animation:imPt 5s ease-in-out 0.5s 2"></div><div style="position:absolute;width:1.5px;height:1.5px;background:rgba(160,165,175,0.3);border-radius:50%;left:42%;top:78%;animation:imPt 6s ease-in-out 0.8s 2"></div><div style="position:absolute;width:2.5px;height:2.5px;background:rgba(160,165,175,0.35);border-radius:50%;left:70%;top:58%;animation:imPt 4.5s ease-in-out 0.3s 2"></div><div style="position:absolute;width:1px;height:1px;background:rgba(160,165,175,0.5);border-radius:50%;left:28%;top:72%;animation:imPt 7s ease-in-out 1s 2"></div><div style="position:absolute;width:2px;height:2px;background:rgba(160,165,175,0.25);border-radius:50%;left:55%;top:82%;animation:imPt 5.5s ease-in-out 0.6s 2"></div><div style="position:absolute;width:1.5px;height:1.5px;background:rgba(160,165,175,0.3);border-radius:50%;left:85%;top:50%;animation:imPt 6.5s ease-in-out 1.2s 2"></div><div style="position:absolute;width:2px;height:2px;background:rgba(160,165,175,0.2);border-radius:50%;left:8%;top:40%;animation:imPt 5s ease-in-out 1.5s 2"></div><div style="position:absolute;width:1px;height:1px;background:rgba(160,165,175,0.4);border-radius:50%;left:90%;top:68%;animation:imPt 4s ease-in-out 0.4s 2"></div><div style="position:absolute;top:0;left:0;height:1px;background:linear-gradient(90deg,transparent,rgba(160,165,175,0.25),transparent);animation:imLnIn 7s ease-in-out 0.3s both"></div><div style="position:absolute;bottom:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(160,165,175,0.25),transparent);animation:imLnIn 7s ease-in-out 0.5s both"></div><div style="position:absolute;top:28px;left:28px;width:36px;height:36px;border-top:1px solid rgba(160,165,175,0.35);border-left:1px solid rgba(160,165,175,0.35);animation:imCnIn 7s ease-in-out 0.3s both"></div><div style="position:absolute;top:28px;right:28px;width:36px;height:36px;border-top:1px solid rgba(160,165,175,0.35);border-right:1px solid rgba(160,165,175,0.35);animation:imCnIn 7s ease-in-out 0.4s both"></div><div style="position:absolute;bottom:28px;left:28px;width:36px;height:36px;border-bottom:1px solid rgba(160,165,175,0.35);border-left:1px solid rgba(160,165,175,0.35);animation:imCnIn 7s ease-in-out 0.5s both"></div><div style="position:absolute;bottom:28px;right:28px;width:36px;height:36px;border-bottom:1px solid rgba(160,165,175,0.35);border-right:1px solid rgba(160,165,175,0.35);animation:imCnIn 7s ease-in-out 0.6s both"></div><div style="z-index:10;text-align:center;animation:imTxtIn 7s ease-in-out 0.8s both">  <div style="font-family:Georgia,'Noto Serif KR',serif;font-size:12px;letter-spacing:8px;color:rgba(160,165,175,0.7);text-transform:uppercase;margin-bottom:20px;animation:imSubIn 6.5s ease-in-out 1s both">the ACT clear</div>  <div style="font-family:Georgia,'Noto Serif KR',serif;font-size:clamp(20px,6vw,42px);font-weight:400;color:#c8cdd8;letter-spacing:clamp(3px,1.6vw,14px);white-space:nowrap;position:relative;animation:imMainIn 6s ease-in-out 1.4s both">   CONGRATULATIONS    <div style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);height:1px;background:linear-gradient(90deg,transparent,rgba(160,165,175,0.6),transparent);animation:imUlSweep 5.5s ease-in-out 1.8s both"></div>  </div></div></div>`}),
 promo:(a,s,c)=>({ms:6500,html:`<div class="fx prm" style="--c:#${c||'b4a078'}"><div class="beam"></div><div class="ring"></div><div class="ring r2"></div><div class="flash"></div>${particles()}
  <div class="tx"><div class="tag">전직</div><div class="main">${esc(a)}</div>${s?`<div class="sub">${esc(s)}</div>`:''}</div></div>`}),
 reborn:(a,s,c)=>({ms:11600,run:()=>fxReborn(c),html:`<div class="fx cvx" style="--c:#${c||'60c890'};--d:11.6s;--tt:7.9s"><canvas class="cv"></canvas><div class="cvt"><div class="tag">${esc(s)}</div><div class="main">${esc(a)}</div></div></div>`}),
 sysfail:()=>({ms:4200,html:`<div class="fx sfl"><div class="sfl-scan"></div><div class="sfl-box"><div class="sfl-t" data-t="SYSTEM : FAILED">SYSTEM : FAILED</div><div class="sfl-s">[ ERROR ]</div></div></div>`}),
 corrupt:(a,s,c)=>({ms:9000,run:()=>fxCorrupt(c),html:`<div class="fx cvx" style="--c:#${c||'c490e8'};--d:9s;--tt:6s"><canvas class="cv"></canvas><div class="cvt"><div class="tag">${esc(s)}</div><div class="main">${esc(a)}</div></div></div>`}),
 ogre:(a,s)=>({ms:9000,run:()=>fxOgre(),html:`<div class="fx cvx cv-og" style="--c:#e8402a;--d:9s;--tt:6s"><canvas class="cv"></canvas><div class="cvt"><div class="tag">${esc(s)}</div><div class="main">${esc(a)}</div></div></div>`}),
 blight:(a,s)=>({ms:9000,run:()=>fxBlight(),html:`<div class="fx cvx cv-bl" style="--c:#4fbe72;--d:9s;--tt:6s"><canvas class="cv"></canvas><div class="cvt"><div class="tag">${esc(s)}</div><div class="main">${esc(a)}</div></div></div>`}),
 vamp:(a,s)=>({ms:9000,run:()=>fxVamp(),html:`<div class="fx cvx cv-vp" style="--c:#a050ff;--d:9s;--tt:6s"><canvas class="cv"></canvas><div class="cvt"><div class="tag">${esc(s)}</div><div class="main">${esc(a)}</div></div></div>`}),
 build:(a,s)=>({ms:3600,html:`<div class="fx bld"><div class="stage"><div class="ground"></div><div class="plank"></div>
  <div class="dust d1"></div><div class="dust d2"></div><div class="dust d3"></div>
  <div class="sp s1"></div><div class="sp s2"></div><div class="sp s3"></div><div class="sp s4"></div><div class="hit"></div>
  <div class="ham"><svg viewBox="0 0 100 100"><rect x="4" y="80" width="70" height="9" rx="3" fill="#7a5230" stroke="#2a1a0c" stroke-width="2"/><rect x="64" y="62" width="28" height="36" rx="3" fill="#8b8f96" stroke="#2c2f33" stroke-width="2.5"/><rect x="64" y="62" width="28" height="7" rx="2" fill="#c3c7cd" opacity=".75"/><rect x="88" y="66" width="4" height="28" fill="#5d6166"/></svg></div>
  <div class="ttk k1">뚝딱!</div><div class="ttk k2">뚝딱!</div></div>
  <div class="tx"><div class="main">${esc(a)}</div><div class="sub">${esc(s||'건설 시작')}</div></div></div>`}),
 arcana:(a,s,c)=>arcFx(a,s,c),
 preend:()=>({ms:7500,html:`<div class="fx pre"><div class="red"></div><div class="scan"></div><div class="tx"><div class="sub">the gods intervene</div><div class="main" data-t="THE END BEGINS" style="position:relative">THE END BEGINS</div></div></div>`}),
};


/*CVFX-BEGIN  타락 / 마족 전생 연출: 캔버스에 직접 그림 (한 번 재생, 화면에서 사라지면 바로 멈춤) */
function rng32(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const hexRGB=c=>{const n=parseInt(c,16)||0;return[(n>>16)&255,(n>>8)&255,n&255]};
const sm=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)};
function fxCanvas(ms,draw){
 const cv=document.querySelector('canvas.cv');if(!cv)return;
 const x=cv.getContext('2d'),dpr=Math.min(window.devicePixelRatio||1,1.5);let w=0,h=0;
 const fit=()=>{w=cv.clientWidth||innerWidth;h=cv.clientHeight||innerHeight;cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);x.setTransform(dpr,0,0,dpr,0,0)};fit();
 const t0=performance.now();
 const loop=now=>{if(!cv.isConnected)return;if((cv.clientWidth||innerWidth)!==w||(cv.clientHeight||innerHeight)!==h)fit();
  const t=(now-t0)/1000;draw(x,w,h,t);if(t*1000<ms)requestAnimationFrame(loop)};
 requestAnimationFrame(loop);
}
/* 마족 전생: 검은 실이 모여 고치가 됨 → 두근두근 → 위에서부터 녹아내리며 안에서 나옴 */
function fxReborn(c){
 const[R,G,B]=hexRGB(c||'60c890'),rnd=rng32(7),N=190,ST=[],DR=[];
 for(let i=0;i<N;i++)ST.push({t0:rnd()*2.7,d:.9+rnd()*.6,a0:rnd()*6.283,turn:(1.1+rnd()*1.5)*(rnd()<.5?-1:1),k:.7+rnd()*.34,yo:(rnd()-.5)*.5,lw:.8+rnd()*1.9,hi:rnd()<.3,md:rnd()*1.35});
 for(let i=0;i<18;i++)DR.push({x:(rnd()-.5)*1.5,y:-.35+rnd()*1.1,d:rnd()*1.2,l:.3+rnd()*.9,w:1.8+rnd()*3.4});
 const BEATS=[3.45,4.15,4.75,5.2,5.55,5.8],TB=6.05;
 fxCanvas(11600,(x,w,h,t)=>{
  const cx=w/2,cy=h*.42,m=Math.min(w,h),rx=Math.min(m*.165,h*.155),ry=rx*1.75,D=Math.hypot(w,h)*.6,u=Math.max(0,t-TB),floor=ry*1.04;
  let beat=0;
  for(let i=0;i<BEATS.length;i++){const q=t-BEATS[i];if(q>-.25)beat+=(.6+i*.14)*(Math.exp(-((q/.07)**2))+.65*Math.exp(-(((q-.17)/.07)**2)))}
  x.fillStyle='#040204';x.fillRect(0,0,w,h);
  const gl=u?.5+.3*sm(0,2,u)+.05*Math.sin(t*4):.3+.3*sm(0,3,t)+beat*.5;
  const g=x.createRadialGradient(cx,cy,0,cx,cy,Math.max(w,h)*.55);
  g.addColorStop(0,`rgba(${R},${G},${B},${Math.min(.9,gl*.6)})`);g.addColorStop(.45,`rgba(${R>>1},${G>>1},${B>>1},${Math.min(.5,gl*.24)})`);g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g;x.fillRect(0,0,w,h);
  x.lineCap='round';x.lineJoin='round';
  const sc=1+beat*.06;x.save();x.translate(cx,cy);x.scale(sc,sc);
  // 안에서 나오는 빛의 형체 (녹은 자리부터 드러남)
  if(u){const a=sm(.25,1.9,u),pul=1+.035*Math.sin(t*4.2);x.save();x.translate(0,-ry*.03);x.scale(rx*.62*pul/100,ry*.88*pul/100);
   const fg=x.createRadialGradient(0,0,0,0,0,100);fg.addColorStop(0,`rgba(255,255,255,${a*.95})`);fg.addColorStop(.38,`rgba(${(R+255)>>1},${(G+255)>>1},${(B+255)>>1},${a*.8})`);fg.addColorStop(1,`rgba(${R},${G},${B},0)`);
   x.fillStyle=fg;x.beginPath();x.arc(0,0,100,0,6.283);x.fill();x.restore()}
  // 고치 몸통: 녹는 선 아래만 남음 (윗선은 흘러내리듯 울퉁불퉁)
  let landed=0;for(const s of ST)if(t>s.t0+s.d)landed++;
  const mp=sm(0,1.5,u),yM=-ry*1.05+2.1*ry*mp;
  if(mp<1){x.save();if(u){x.beginPath();x.moveTo(-rx*1.3,ry*1.2);for(let i=0;i<=24;i++){const px=-rx*1.3+rx*2.6*i/24;x.lineTo(px,yM+Math.sin(i*1.7+t*2.2)*ry*.035+Math.abs(Math.sin(i*.9))*ry*.09*Math.min(1,u))}x.lineTo(rx*1.3,ry*1.2);x.closePath();x.clip()}
   x.fillStyle=`rgba(3,2,4,${Math.min(1,landed/N*1.25)*(1-sm(.15,1.3,u))})`;x.beginPath();x.ellipse(0,0,rx*.98,ry*.98,0,0,6.283);x.fill();x.restore()}
  // 바닥에 고이는 웅덩이
  if(u){const e=sm(.3,2.4,u);x.fillStyle='#050307';x.beginPath();x.ellipse(0,floor,rx*(.3+1.35*e),ry*.075*e,0,0,6.283);x.fill();x.strokeStyle=`rgba(${R},${G},${B},${.4*e})`;x.lineWidth=1.2;x.stroke()}
  // 실: 날아와 감김 → 위쪽부터 녹아 바닥으로 흘러내림
  for(const s of ST){const p=(t-s.t0)/s.d;if(p<=0)continue;const done=p>=1,u1=done?1:p,u0=done?.62:Math.max(0,p-.45),ms=u?sm(s.md,s.md+1.1,u):0,ep=ms*ms;
   x.beginPath();for(let j=0;j<=44;j++){const q=u0+(u1-u0)*j/44,e=1-(1-q)**3,a=s.a0+s.turn*6.283*q,rr=1-e;let px=Math.cos(a)*(rx*s.k*e+D*rr),py=Math.sin(a)*(ry*s.k*e+D*rr)+s.yo*ry*e*.3;
    if(ep){px=px*(1+.6*ep)+Math.sin(py*.045+s.a0)*rx*.08*ep;py+=(floor-py)*ep}
    j?x.lineTo(px,py):x.moveTo(px,py)}
   if(!done||s.hi){x.strokeStyle=`rgba(${R},${G},${B},${done?.2:.3})`;x.lineWidth=s.lw+1.5;x.stroke()}
   x.strokeStyle='#060308';x.lineWidth=s.lw;x.stroke()}
  // 흘러내리는 방울
  if(u)for(const d of DR){const q=sm(d.d,d.d+.9,u);if(q<=0)continue;const fade=1-sm(d.d+1.3,d.d+2.1,u);if(fade<=0)continue;const x0=d.x*rx*.55,y0=d.y*ry*.9+ry*.9*sm(d.d+.5,d.d+2,u)*(1-d.y*.5),y1=Math.min(floor,y0+d.l*ry*.7*q);
   x.beginPath();x.moveTo(x0,y0);x.lineTo(x0,y1);x.strokeStyle=`rgba(${R},${G},${B},${.25*fade})`;x.lineWidth=d.w+1.6;x.stroke();x.strokeStyle=`rgba(5,3,7,${fade})`;x.lineWidth=d.w;x.stroke();
   if(y1<floor){x.fillStyle=`rgba(5,3,7,${fade})`;x.beginPath();x.arc(x0,y1,d.w*.95,0,6.283);x.fill()}}
  x.restore();
 });
}
/* 타락: 뱀 같은 검은 마법문자 줄이 감아 올라감 → 조여듦 → 물듦 */
function fxCorrupt(c){
 const[R,G,B]=hexRGB(c||'c490e8'),rnd=rng32(11),GL=[],M=44,SMAX=50,TC=5.75;
 for(let i=0;i<16;i++){const segs=[];let p=[(rnd()*3|0)-1,(rnd()*3|0)-1];for(let j=0;j<5;j++){const q=[(rnd()*3|0)-1,(rnd()*3|0)-1];if(q[0]!==p[0]||q[1]!==p[1])segs.push([p,q]);p=rnd()<.65?q:[(rnd()*3|0)-1,(rnd()*3|0)-1]}if(!segs.length)segs.push([[-1,-1],[1,1]]);GL.push(segs)}
 const CH=[0,1,2].map(i=>({ph:i*2.094,d:i*.38,g:Array.from({length:M},()=>rnd()*16|0)})),RING=Array.from({length:30},()=>rnd()*16|0);
 const glyph=(x,gi,px,py,sz,rot,al,bright)=>{if(al<=0)return;x.save();x.translate(px,py);x.rotate(rot);x.scale(sz,sz*1.25);x.beginPath();for(const[a,b]of GL[gi]){x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1])}
  x.lineWidth=.8;x.strokeStyle=`rgba(${R},${G},${B},${al*(bright?.95:.32)})`;x.stroke();x.lineWidth=.36;x.strokeStyle=`rgba(6,2,10,${al})`;x.stroke();x.restore()};
 fxCanvas(9000,(x,w,h,t)=>{
  const cx=w/2,cy=h*.4,H=Math.min(h*.66,Math.min(w,h)*1.05,760),yb=cy+H/2,Rb=H*.2;
  const cor=sm(.8,5.2,t),sq=sm(4.9,TC,t),af=t>TC?t-TC:0;
  x.fillStyle='#040206';x.fillRect(0,0,w,h);x.lineCap='round';x.lineJoin='round';
  const bg=x.createRadialGradient(cx,cy,0,cx,cy,Math.max(w,h)*.6);
  bg.addColorStop(0,`rgba(${R},${G},${B},${.1+cor*.14+(af?Math.max(0,.45-af*.3):0)})`);bg.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=bg;x.fillRect(0,0,w,h);
  const R1=Rb*(1-.34*cor-.34*sq)*(af?Math.max(.15,1-af*1.6):1),fade=af?Math.max(0,1-af/.7):1,pts=[];
  CH.forEach(ch=>{const head=Math.min(Math.max(0,t-ch.d)*10.5,SMAX);
   for(let i=0;i<M;i++){const s=head-i;if(s<0)continue;const th=s*.42+ch.ph+t*.55,z=Math.sin(th),rad=R1*(.72+.28*Math.sin(s/SMAX*3.1416))+Math.sin(s*.9-t*5)*H*.012;
    pts.push({z,px:cx+Math.cos(th)*rad,py:yb-s/SMAX*H+z*H*.018,sz:H*.0125*(1+.3*z)*(i?1:1.5),rot:-Math.cos(th)*.8,g:ch.g[i],b:!i||Math.sin(s*.35-t*4)>.82})}});
  for(const p of pts)if(p.z<0)glyph(x,p.g,p.px,p.py,p.sz,p.rot,.42*fade,p.b);
  // 가운데 형체: 옅은 빛 → 아래에서부터 검게 물듦
  const body=(col,a0,a1)=>{x.save();x.translate(cx,cy);x.scale(H*.105/100,H*.5/100);const gd=x.createRadialGradient(0,0,0,0,0,100);gd.addColorStop(0,`rgba(${col},${a0})`);gd.addColorStop(.55,`rgba(${col},${a1})`);gd.addColorStop(1,`rgba(${col},0)`);x.fillStyle=gd;x.beginPath();x.arc(0,0,100,0,6.283);x.fill();x.restore()};
  body('236,228,255',.95,.5);
  for(let k=0;k<8;k++){x.save();x.beginPath();x.rect(0,yb-cor*H*1.12+(k-4)*H*.03,w,h);x.clip();body('14,4,24',.34,.3);x.restore()}
  if(af){x.save();x.translate(cx,cy);x.scale(H*.075/100,H*.43/100);x.beginPath();x.arc(0,0,100,0,6.283);x.restore();x.strokeStyle=`rgba(${R},${G},${B},${Math.min(.7,af*1.2)*(.75+.25*Math.sin(t*5))})`;x.lineWidth=1.6;x.shadowColor=`rgb(${R},${G},${B})`;x.shadowBlur=18;x.stroke();x.shadowBlur=0}
  for(const p of pts)if(p.z>=0)glyph(x,p.g,p.px,p.py,p.sz,p.rot,fade,p.b);
  if(af){
   const rr=H*.36*(1-Math.exp(-af*4.5)),al=Math.min(1,af*3)*Math.max(0,1-Math.max(0,af-2.4)/.8);
   for(const k of[1,.86]){x.strokeStyle=`rgba(${R},${G},${B},${al*.55})`;x.lineWidth=1.2;x.beginPath();x.ellipse(cx,cy,rr*k,rr*k,0,0,6.283);x.stroke()}
   RING.forEach((gi,i)=>{const a=i/30*6.283+t*.35;glyph(x,gi,cx+Math.cos(a)*rr*.93,cy+Math.sin(a)*rr*.93,H*.0115,a+1.571,al,i%5===0)});
   if(af<1.2){x.strokeStyle=`rgba(${R>>1},${G>>2},${B>>1},${(1-af/1.2)*.9})`;x.lineWidth=5*(1-af/1.2)+1;x.beginPath();x.ellipse(cx,cy,af*Math.max(w,h)*.6,af*Math.max(w,h)*.6,0,0,6.283);x.stroke()}
   if(af<.4){x.fillStyle=`rgba(${Math.min(255,R+40)},${Math.min(255,G+40)},${Math.min(255,B+40)},${(1-af/.4)*.7})`;x.fillRect(0,0,w,h)}
  }
 });
}
/* 라이벌 타락 3종 (오우거 · 블라이트 · 뱀파이어): 가운데 빛 덩어리(타락 연출과 같은 모양) 위에 그림 */
const ORB={rx:.105,ry:.5};
function orbDraw(x,cx,cy,H,s,rgb,a0){
 x.save();x.translate(cx,cy);x.scale(H*ORB.rx*s/100,H*ORB.ry*s/100);
 const g=x.createRadialGradient(0,0,0,0,0,100);g.addColorStop(0,`rgba(${rgb},${a0})`);g.addColorStop(.55,`rgba(${rgb},${a0*.5})`);g.addColorStop(1,`rgba(${rgb},0)`);
 x.fillStyle=g;x.beginPath();x.arc(0,0,100,0,6.283);x.fill();x.restore();
}
const orbW=y=>ORB.rx*.62*Math.sqrt(Math.max(0,1-Math.pow(y/(ORB.ry*.8),2)));   // 높이 y에서 빛 덩어리의 반폭 (H 기준)
function figPt(rnd){const y=(rnd()*2-1)*ORB.ry*.7;return[(rnd()*2-1)*orbW(y),y]}
const lerp=(a,b,k)=>a+(b-a)*k,mix=(p,q,k)=>p.map((v,i)=>Math.round(lerp(v,q[i],k)));
/* 오우거: 몸이 불타오르며 커지고 붉게 변함 */
function fxOgre(){
 const rnd=rng32(23),P=[],TB=5.8,BE=[2.4,3.3,4.1,4.7,5.2,5.55];
 fxCanvas(9000,(x,w,h,t)=>{
  const cx=w/2,cy=h*.43,H=Math.min(h*.5,Math.min(w,h)*.8,560),heat=sm(.7,5.6,t),af=t>TB?t-TB:0;
  let beat=0;for(const b of BE)if(t>b-.05)beat=Math.max(beat,Math.exp(-(t-b)*7));
  const s=1+.4*heat+.05*beat,sh=t<TB?heat*(2+beat*7):Math.max(0,8-af*14);
  const ox=(rnd()-.5)*sh,oy=(rnd()-.5)*sh;
  x.fillStyle='#070203';x.fillRect(0,0,w,h);
  const bg=x.createRadialGradient(cx,cy,0,cx,cy,Math.max(w,h)*.6);bg.addColorStop(0,`rgba(220,50,20,${.08+heat*.3+beat*.12})`);bg.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=bg;x.fillRect(0,0,w,h);
  if(t<TB+.6)for(let i=0;i<2+heat*16;i++){const p=figPt(rnd);P.push({x:p[0],y:p[1],b:t,l:.5+rnd()*.8,v:.18+rnd()*.32,d:(rnd()-.5)*.08,r:.02+rnd()*.035})}
  const X=cx+ox,Y=cy+oy;
  // 불꽃(뒤)
  x.globalCompositeOperation='lighter';
  for(let i=P.length-1;i>=0;i--){const p=P[i],a=(t-p.b)/p.l;if(a>=1){P.splice(i,1);continue}
   const px=X+(p.x+p.d*a)*H*s,py=Y+p.y*H*s-a*p.v*H,r=p.r*H*(1-a*.6)*(.8+heat*.6);
   const c=a<.3?mix([255,230,140],[255,120,40],a/.3):mix([255,120,40],[150,10,5],(a-.3)/.7);
   const g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,`rgba(${c},${(1-a)*.85})`);g.addColorStop(1,`rgba(${c},0)`);x.fillStyle=g;x.beginPath();x.arc(px,py,r,0,6.283);x.fill()}
  x.globalCompositeOperation='source-over';
  // 몸: 옅은 빛 → 붉은 거구
  const col=mix([236,228,255],[220,36,22],heat);
  orbDraw(x,X,Y,H,s*(1+beat*.06),col.join(','),.95);
  if(heat>.2){x.save();x.globalCompositeOperation='lighter';orbDraw(x,X,Y,H,s*.7,'255,170,70',(heat-.2)*.55*(.6+.4*Math.sin(t*9))+beat*.3);x.restore()}
  if(af){const rr=af*Math.max(w,h)*.7;x.strokeStyle=`rgba(255,80,40,${Math.max(0,.8-af*.6)})`;x.lineWidth=6*Math.max(.2,1-af);x.beginPath();x.arc(X,Y,rr,0,6.283);x.stroke();
   if(af<.45){x.fillStyle=`rgba(255,70,30,${(1-af/.45)*.75})`;x.fillRect(0,0,w,h)}}
 });
}
/* 블라이트: 몸에 줄기가 자라고 붉은 꽃이 여기저기 핌 */
function fxBlight(){
 const rnd=rng32(41),V=[],F=[],PT=[],TB=5.8;
  for(let i=0;i<10;i++){const top=-.22-rnd()*.14,ph=rnd()*6.283,fq=(7+rnd()*6)*(i%2?1:-1),t0=.6+rnd()*1.4,pts=[];
  for(let k=0;k<=60;k++){const y=lerp(.4,top,k/60);pts.push([Math.sin(y*fq+ph)*orbW(y)*1.05,y])}
  V.push({pts,t0,dur:2.6+rnd()*1.2,w:1.4+rnd()*1.6});
  for(let f=0;f<3;f++){const k=12+(rnd()*48|0);F.push({v:i,k,r:.022+rnd()*.022,rot:rnd()*6.283})}}
 F.push({head:1,x:-.01,y:-.34,r:.038,rot:0,at:4.6},{head:1,x:.03,y:-.3,r:.026,rot:1,at:4.9});
 fxCanvas(9000,(x,w,h,t)=>{
  const cx=w/2,cy=h*.44,H=Math.min(h*.6,Math.min(w,h)*.95,680),gr=sm(.8,5.4,t),af=t>TB?t-TB:0;
  x.fillStyle='#030604';x.fillRect(0,0,w,h);
  const bg=x.createRadialGradient(cx,cy,0,cx,cy,Math.max(w,h)*.6);bg.addColorStop(0,`rgba(60,170,90,${.07+gr*.2})`);bg.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=bg;x.fillRect(0,0,w,h);
  orbDraw(x,cx,cy,H,1,mix([236,228,255],[110,200,120],gr).join(','),.9);
  const P=(p)=>[cx+p[0]*H,cy+p[1]*H];
  x.lineCap='round';x.lineJoin='round';
  const prog=V.map(v=>Math.max(0,Math.min(1,(t-v.t0)/v.dur)));
  V.forEach((v,i)=>{const n=Math.floor(prog[i]*60);if(n<1)return;
   x.beginPath();let q=P(v.pts[0]);x.moveTo(q[0],q[1]);for(let k=1;k<=n;k++){q=P(v.pts[k]);x.lineTo(q[0],q[1])}
   x.strokeStyle='#123a1c';x.lineWidth=v.w+2.5;x.stroke();x.strokeStyle='#3f9a52';x.lineWidth=v.w;x.stroke();
   for(let k=6;k<=n;k+=7){const a=P(v.pts[k]),b=P(v.pts[k-1]),an=Math.atan2(a[1]-b[1],a[0]-b[0])+(k%14?1.2:-1.2);
    x.save();x.translate(a[0],a[1]);x.rotate(an);x.fillStyle='#4fae62';x.beginPath();x.ellipse(H*.012,0,H*.013,H*.0055,0,0,6.283);x.fill();x.restore()}});
  for(const f of F){let bx,by,b;
   if(f.head){b=sm(f.at,f.at+.7,t);bx=cx+f.x*H;by=cy+f.y*H}
   else{const pv=prog[f.v];if(pv*60<f.k)continue;const tk=V[f.v].t0+V[f.v].dur*f.k/60;b=sm(tk+.2,tk+.9,t);const q=P(V[f.v].pts[f.k]);bx=q[0];by=q[1]}
   if(b<=0)continue;const r=f.r*H*b;
   x.save();x.translate(bx,by);x.rotate(f.rot+t*.15);x.shadowColor='rgba(255,40,40,.8)';x.shadowBlur=12*b;
   for(let p=0;p<5;p++){x.rotate(1.2566);x.fillStyle=p%2?'#d4202c':'#b8121e';x.beginPath();x.ellipse(r*.55,0,r*.55,r*.36,0,0,6.283);x.fill()}
   x.shadowBlur=0;x.fillStyle='#ffd25a';x.beginPath();x.arc(0,0,r*.22,0,6.283);x.fill();x.restore()}
  if(af){const rr=af*Math.max(w,h)*.7;x.strokeStyle=`rgba(90,220,120,${Math.max(0,.75-af*.6)})`;x.lineWidth=5*Math.max(.2,1-af);x.beginPath();x.arc(cx,cy,rr,0,6.283);x.stroke();
   for(let i=0;i<26;i++){const k=(i*.137+af*.18)%1,px=cx+Math.sin(i*2.3+af)*w*.45,py=-20+k*(h+40);x.save();x.translate(px,py);x.rotate(i+af*2);x.fillStyle=`rgba(200,25,35,${Math.min(1,af*1.5)*.8})`;x.beginPath();x.ellipse(0,0,6,3.5,0,0,6.283);x.fill();x.restore()}
   if(af<.4){x.fillStyle=`rgba(120,240,150,${(1-af/.4)*.6})`;x.fillRect(0,0,w,h)}}
 });
}
/* 뱀파이어: 보라색 핏줄이 여기저기 돋아나 온몸을 덮음 → 검게 */
function fxVamp(){
 const rnd=rng32(57),VN=[],TB=5.8;
 for(let i=0;i<30;i++){const p=figPt(rnd),t0=.9+Math.pow(rnd(),1.4)*3.4,segs=[];
  const grow=(x0,y0,an,n,dep,o)=>{let px=x0,py=y0;for(let k=0;k<n;k++){an+=(rnd()-.5)*.9;const nx=px+Math.cos(an)*.018,ny=py+Math.sin(an)*.018;segs.push([px,py,nx,ny,o+k,dep]);
   if(dep<2&&rnd()<.28)grow(nx,ny,an+(rnd()<.5?1:-1)*(.6+rnd()*.6),3+(rnd()*4|0),dep+1,o+k+1);px=nx;py=ny}};
  grow(p[0],p[1],rnd()*6.283,5+(rnd()*5|0),0,0);VN.push({p,t0,segs})}
 fxCanvas(9000,(x,w,h,t)=>{
  const cx=w/2,cy=h*.44,H=Math.min(h*.6,Math.min(w,h)*.95,680),dk=sm(3.6,5.7,t),af=t>TB?t-TB:0,pu=.6+.4*Math.sin(t*6);
  x.fillStyle='#050207';x.fillRect(0,0,w,h);
  const bg=x.createRadialGradient(cx,cy,0,cx,cy,Math.max(w,h)*.6);bg.addColorStop(0,`rgba(140,50,220,${.06+sm(1,5,t)*.18})`);bg.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=bg;x.fillRect(0,0,w,h);
  orbDraw(x,cx,cy,H,1,'236,228,255',.95*(1-dk));
  if(dk>0){for(let k=0;k<5;k++)orbDraw(x,cx,cy,H,1.02,'6,1,10',dk*.55)}
  // 핏줄이 돋은 자리부터 검게 번짐
  x.save();x.beginPath();x.rect(0,0,w,h);x.clip();
  for(const v of VN){const a=sm(v.t0+.3,v.t0+2.4,t)*(1-dk);if(a<=0)continue;const r=H*.07*a;const g=x.createRadialGradient(cx+v.p[0]*H,cy+v.p[1]*H,0,cx+v.p[0]*H,cy+v.p[1]*H,r);g.addColorStop(0,'rgba(10,2,16,.85)');g.addColorStop(1,'rgba(10,2,16,0)');x.fillStyle=g;x.beginPath();x.arc(cx+v.p[0]*H,cy+v.p[1]*H,r,0,6.283);x.fill()}
  x.restore();
  x.lineCap='round';x.shadowColor='rgb(170,70,255)';
  for(const v of VN){const st=(t-v.t0)*9;if(st<=0)continue;
   for(const[a,b,c,d,o,dep]of v.segs){if(o>st)continue;const al=Math.min(1,st-o);x.shadowBlur=10*pu;
    x.strokeStyle=`rgba(${190-dep*20},${80-dep*15},255,${al*(.75+.25*pu)})`;x.lineWidth=(2.6-dep*.6)*(H/600);
    x.beginPath();x.moveTo(cx+a*H,cy+b*H);x.lineTo(cx+(a+(c-a)*al)*H,cy+(b+(d-b)*al)*H);x.stroke()}}
  x.shadowBlur=0;
  if(af){const rr=af*Math.max(w,h)*.7;x.strokeStyle=`rgba(150,60,240,${Math.max(0,.75-af*.6)})`;x.lineWidth=5*Math.max(.2,1-af);x.beginPath();x.arc(cx,cy,rr,0,6.283);x.stroke();
   if(af<.5){x.fillStyle=`rgba(0,0,0,${(1-af/.5)*.85})`;x.fillRect(0,0,w,h)}}
 });
}
/*CVFX-END*/

function ensureHead(){
 if(document.getElementById('dfx-style'))return;
 const f=document.createElement('link');f.rel='stylesheet';f.href='https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Noto+Serif+KR:wght@500;700&display=swap';document.head.appendChild(f);
 const st=document.createElement('style');st.id='dfx-style';st.textContent=CSS;document.head.appendChild(st);
}
// 창을 닫지 않고 연출만 재생 (책 안 타락 버튼용 → 끝나면 책으로 돌아감)
async function fxInline(kind,a,s,c){
 const make=FX[kind];if(!make)return;
 try{
  ensureHead();const f=make(a,s,c);
  document.body.innerHTML=f.html+'<div class="skip">건너뛰기 ▶▶</div>';
  if(f.run)try{f.run()}catch(e){err('fx run',e)}
  let done;const end=new Promise(r=>done=r);
  const t=setTimeout(done,f.ms);
  const sk=()=>{clearTimeout(t);done()};
  const tt=setTimeout(()=>document.body.addEventListener('click',sk,{once:true}),1200);
  await end;clearTimeout(tt);document.body.removeEventListener('click',sk);
 }catch(e){err('fxinline',e)}
}
async function play(kind,a,s,c){
 const make=FX[kind];if(!make||playing)return;playing=true;diag.played++;
 try{
  ensureHead();const f=make(a,s,c);
  if(f.pre&&f.pre.length)await Promise.race([Promise.all(f.pre.map(u=>new Promise(r=>{const im=new Image();im.onload=im.onerror=r;im.src=u}))),new Promise(r=>setTimeout(r,3000))]);
  document.body.innerHTML=f.html+'<div class="skip">건너뛰기 ▶▶</div>';
  if(f.run)try{f.run()}catch(e){err('fx run',e)}
  let done;const end=new Promise(r=>done=r);
  const t=setTimeout(done,f.ms);
  setTimeout(()=>document.body.addEventListener('click',()=>{clearTimeout(t);done()},{once:true}),1200);
  await host.showContainer('fullscreen');
  await end;
 }catch(e){err('play',e)}
 document.body.innerHTML='';try{await host.hideContainer()}catch(e){err('close',e)}
 playing=false;
}

/* ---------- 공격 · 방어 전투 연출 (Lua가 결과를 계산해 넘김, 그림은 깃허브 battle 폴더) ----------
   P = {m:'atk'|'def', o:'fail'|'win'|'great'|'lose', us:아군 그림, ur:{anim,shot,pose}|null, en:적 그림, es:적 투사체,
        vt:마을 그림, gr:땅, cv:동굴 Lv, ttl:지역 이름, log:[전투 기록], rows:[[이름,값,색]], badge} */
const BT_CSS=`
.bt{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,rgba(43,36,24,.94),rgba(13,10,7,.97) 75%);font-family:'Noto Sans KR',sans-serif;z-index:9999}
.bt-wrap{width:568px;transform-origin:center}
.bt-card{position:relative;width:560px;box-sizing:border-box;border-radius:26px;background:#fff6e2;border:4px solid #6b4a2b;box-shadow:0 8px 0 #4a321c,0 20px 50px rgba(0,0,0,.6);padding:14px 16px 16px}
.bt-tt{display:flex;align-items:center;justify-content:center;gap:6px;font-weight:900;font-size:22px;color:#6b4a2b;margin:2px 0 10px}
.bt-tt i{font-style:normal;display:inline-block;animation:btBob 1s infinite}.bt-tt i+i{animation-delay:.15s}
@keyframes btBob{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}
.bt-win{position:relative;height:270px;border-radius:16px;overflow:hidden;border:3px solid #6b4a2b;background-repeat:repeat-x;background-size:auto 270px;animation:btSky 40s linear infinite;transition:height .4s}
@keyframes btSky{to{background-position:-630px 0}}
.bt-magma .bt-win::before{content:'';position:absolute;inset:0;background:linear-gradient(rgba(90,20,10,.55),rgba(160,60,20,.25))}
.bt-gr{position:absolute;inset:0;background-position:bottom;background-size:100% auto;background-repeat:no-repeat}
.bt-win img{position:absolute;pointer-events:none}
.bt-o{opacity:0}
.bt-bar{position:relative;margin-top:12px;height:22px;border-radius:12px;background:#ead8b5;border:3px solid #6b4a2b;overflow:hidden}
.bt-fill{height:100%;width:0;background:repeating-linear-gradient(-45deg,#8bc34a 0 10px,#9ccc65 10px 20px)}
.bt-pct{position:absolute;right:8px;top:0;line-height:16px;font-size:11px;font-weight:900;color:#4a321c}
.bt-tip{margin-top:9px;text-align:center;font-size:14px;color:#8a6a48;font-weight:700;min-height:20px}
.bt-log{position:absolute;left:8px;top:8px;z-index:9;font-size:12px;font-weight:900;color:#4a321c;background:rgba(255,246,226,.92);border:2px solid #6b4a2b;border-radius:10px;padding:3px 9px;opacity:0;transition:opacity .2s;max-width:70%}
.bt-ban{left:50%;top:6px;width:180px;transform:translateX(-50%) scale(.2);opacity:0;z-index:8}
.bt-big{position:absolute;left:50%;top:112px;transform:translateX(-50%);z-index:9;padding:3px 22px 3px 30px;border-radius:30px;background:#fff6e2;border:3px solid #6b4a2b;font-size:22px;font-weight:900;letter-spacing:.3em;white-space:nowrap;opacity:0}
.bt-res{display:none}.bt-rs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.bt-rc{background:#fff;border:2px solid #e2cba3;border-radius:12px;padding:8px 10px;font-size:13px;color:#6b4a2b}.bt-rc span{display:block;font-size:11px;color:#a58a66;font-weight:700}.bt-rc b{font-size:14.5px;line-height:1.35}
.bt-rc .n{color:#d0503a}.bt-rc .p{color:#5d9a2f}.bt-rc .o{color:#c98a12}
.bt-badge{margin-top:8px;text-align:center;font-size:12px;font-weight:900;color:#fff;background:#c0462e;border-radius:10px;padding:5px}
.bt-badge.ok{background:#5d9a2f}
.bt-ok{display:block;margin:12px auto 0;padding:9px 40px;border-radius:14px;border:3px solid #6b4a2b;background:#ffd56a;box-shadow:0 4px 0 #6b4a2b;font-weight:900;font-size:16px;color:#4a321c;cursor:pointer}
.bt-skip{position:absolute;right:14px;bottom:-34px;font-size:12px;color:#d8c4a0;background:none;border:0;cursor:pointer;opacity:.75}
`;
const btImg=n=>GH_BASE?ghv(GH_BASE+'battle/'+n+'.webp'):'';
/* ---------- 컷인 (숨은 네임드 참전 · 등장 대사 · 각성) : 그림은 깃허브 cutin 폴더 ID_cutin.webp ----------
   s: calm(침착) · hot(열정) · sly(음흉) / join·enter·awake: 대사 / img2: 각성 그림 */
const CUTIN={
 C014:{n:'안젤라',s:'calm',join:'......'},
 C024:{n:'하겐',s:'hot',join:'젊은이들에게만 맡겨둘순 없지!'},
 C004:{n:'유하오란',s:'hot',join:'덤벼라 악당 놈들!'},
 C053:{n:'미네아',s:'calm',join:'...죽어'},
 C073:{n:'엘레스트라',s:'sly',join:'무능한 것들, 사라지거라'},
 C501:{n:'나이엘라',s:'hot',enter:'살아서 돌아갈 생각은 포기하시지!',awake:'진심으로 간다.',img2:'C501_2'},
};
const CI_CSS=`
.ci{position:fixed;inset:0;z-index:10000;overflow:hidden;pointer-events:auto;font-family:'Noto Sans KR',sans-serif}
.ci-dim{position:absolute;inset:0;background:rgba(0,0,0,.62);animation:ciDim 2.6s ease both}
.ci-band{position:absolute;left:50%;top:50%;width:200vmax;max-width:none;height:min(66vw,46vh);transform:translate(-50%,-50%) rotate(-18deg);overflow:hidden;border-top:4px solid var(--c);border-bottom:4px solid var(--c);box-shadow:0 0 40px var(--g);background:#0b0912;animation:ciBand 2.6s cubic-bezier(.2,.9,.2,1) both}
.ci-band img{position:absolute;left:50%;top:0;height:100%;width:auto;min-width:122vw;max-width:none;object-fit:cover;transform:translateX(-50%);animation:ciFace 2.6s linear both}
.ci-line,.ci-name{position:absolute;color:#fff;transform:rotate(-18deg);animation:ciTxt 2.6s ease both}
.ci-line{left:5vw;top:calc(50% - min(33vw,23vh) - 12vh);transform-origin:left;font-size:clamp(18px,5.6vw,30px);font-weight:800;text-shadow:0 2px 8px #000,0 0 14px #000;white-space:nowrap}
.ci-name{right:5vw;top:calc(50% + min(33vw,23vh) + 2vh);transform-origin:right;text-align:right}
.ci-name i{display:block;font-style:normal;font-size:11px;letter-spacing:3px;color:var(--c)}
.ci-name b{display:block;font-size:clamp(24px,8vw,40px);font-weight:900;text-shadow:0 0 12px var(--g)}
.ci-skip{position:absolute;right:12px;top:12px;z-index:2;color:#fff;font-size:13px;font-weight:900;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.6);border-radius:8px;padding:4px 10px;cursor:pointer}
.ci.calm{--c:#b07cff;--g:#8a4dff88}
.ci.hot{--c:#ff7a3c;--g:#ff3c1e99}.ci.hot .ci-band{animation:ciBand 2.6s cubic-bezier(.2,.9,.2,1) both,ciShake .5s .3s linear 2}
.ci.sly{--c:#5fd18a;--g:#1e7a4a99}.ci.sly .ci-band img{animation:ciFace 2.6s linear both,ciGlitch .35s .3s steps(2) 3}
@keyframes ciDim{0%{opacity:0}10%,85%{opacity:1}100%{opacity:0}}
@keyframes ciBand{0%{transform:translate(50%,-50%) rotate(-18deg)}15%,85%{transform:translate(-50%,-50%) rotate(-18deg)}100%{transform:translate(-150%,-50%) rotate(-18deg)}}
@keyframes ciFace{0%{margin-left:3%}100%{margin-left:-3%}}
@keyframes ciTxt{0%,15%{opacity:0}25%,85%{opacity:1}100%{opacity:0}}
@keyframes ciShake{0%,100%{margin-top:0}25%{margin-top:-6px}75%{margin-top:6px}}
@keyframes ciGlitch{0%{filter:none}50%{filter:hue-rotate(90deg) contrast(1.6);margin-left:-2%}100%{filter:none}}
`;
// 컷인 하나 (그림을 못 받으면 건너뜀) — 끝나면 resolve
async function cutinPlay(c){
 const id=String(c.id||'').match(/^[A-Z]\d+/);const D=id&&CUTIN[id[0]];if(!D)return;
 const line=D[c.k]||(c.k==='join'?D.join:'');if(!line)return;
 const url=GH_BASE?ghv(GH_BASE+'cutin/'+(c.k==='awake'&&D.img2?D.img2:id[0])+'_cutin.webp'):'';
 if(!url||!await decodeImg(url))return;
 if(!document.getElementById('ci-style')){const st=document.createElement('style');st.id='ci-style';st.textContent=CI_CSS;document.head.appendChild(st)}
 const tag=c.k==='join'?'HIDDEN · 참전':c.k==='awake'?'각성':'';
 const el=document.createElement('div');el.className='ci '+(D.s||'calm');
 el.innerHTML=`<div class="ci-dim"></div><div class="ci-band"><img src="${url}"></div><div class="ci-line">「 ${esc(line)} 」</div><div class="ci-name">${tag?`<i>${tag}</i>`:''}<b>${esc(D.n)}</b></div><button class="ci-skip">건너뛰기 ▶▶</button>`;
 document.body.appendChild(el);
 await new Promise(res=>{const t=setTimeout(res,2600);el.querySelector('.ci-skip').onclick=()=>{clearTimeout(t);res()}});
 el.remove();
}
const BT_HIT={gob:'hit_gob',knight:'hit_knight',wolf:'hit_wolf',drake:'hit_drake',pal:'hit_elite',archer:'hit_archer',mage:'hit_mage',elfr:'hit_elfr',humr:'hit_humr'};
const BT_LOOT={gob:'lgob',knight:'lknight',wolf:'lwolf',drake:'ldrake',pal:'lelite',archer:'larcher',mage:'lmage',elfr:'lelfr',humr:'lhumr'};
const BT_STAND={gob:1,knight:1,wolf:1,drake:1,pal:1};   // 1번이 서 있는 그림인 세트 (나머지는 1~3이 모두 달리기)
async function battlePlay(P){
 if(playing||!P)return;playing=true;diag.played++;
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 try{
  ensureHead();
  if(!document.getElementById('bt-style')){const st=document.createElement('style');st.id='bt-style';st.textContent=BT_CSS;document.head.appendChild(st)}
  const atk=P.m!=='def',us=P.us||'gob',ur=P.ur||null,en=P.en||'e_vill';
  const runF=a=>BT_STAND[a]?[a+'1',a+'2',a+'3',a+'4']:[a+'1',a+'1',a+'2',a+'3'];
  const R=runF(us),RR=ur?runF(ur.anim):null,E=[en+'1',en+'2',en+'3'];
  const VS=P.vt==='basic'||!P.vt?['vil1','vil2','vil3','vil4']:[P.vt+'_a',P.vt+'_b',P.vt+'_b',P.vt+'_c'];
  const cv=Math.min(3,Math.max(1,+P.cv||1)),CA='cave'+cv+'_a',CB='cave'+cv+'_b',CC='cave'+cv+'_c',CD='cave'+cv+'_d';
  const lootK=BT_LOOT[us]||'lgob',L=[lootK+'1',lootK+'2',lootK+'3'],LF=us==='pal'?1:-1;
  const names=new Set(['sky','ground_'+(P.gr||'grass'),'cloud','cloud2','burst','swords','skull','win','lose','arrow1','fireball',...R,...E,...VS,CA,CB,CC,CD,...L,BT_HIT[us]||'hit_gob','hit_'+en.slice(2)]);
  if(RR){RR.forEach(n=>names.add(n));if(ur.pose)names.add(ur.pose)}
  const ALC=en==='e_alc';if(ALC)for(let i=1;i<=8;i++)names.add('e_alc'+i);
  // 그림 미리 받기 (최대 5초)
  const U={};await Promise.race([Promise.all([...names].map(async n=>{const u=btImg(n);if(u&&await decodeImg(u))U[n]=u})),wait(5000)]);
  const src=n=>U[n]||'';
  const fly=us==='drake',H={drake:95,wolf:105}[us]||110;
  const OK={fail:'실 패',win:'성 공',great:'대성공',lose:'방어 실패',pyrrhic:'상처뿐인 승리',retreat:'후 퇴'}[P.o]||'';
  const good=P.o==='win'||P.o==='great'||P.o==='pyrrhic';
  const rows=(P.rows||[]).map(r=>`<div class="bt-rc"><span>${esc(r[0])}</span><b class="${esc(r[2]||'')}">${esc(r[1])}</b></div>`).join('');
  document.body.innerHTML=`<div class="bt${P.gr==='magma'?' bt-magma':''}"><div class="bt-wrap"><div class="bt-card">
<div class="bt-tt"><span id="bx">${atk?'공격 중':'적의 습격'}</span><i>~</i><i>!</i></div>
<div class="bt-win" id="bw" style="background-image:url('${src('sky')}')"><div class="bt-gr" style="background-image:url('${src('ground_'+(P.gr||'grass'))}')"></div>
<img id="bcave" src="${src(CA)}" style="left:12px;bottom:50px;width:145px">
${atk?`<img id="bvil" src="${src(VS[0])}" style="right:16px;bottom:52px;width:190px">`:''}
<img id="ben" class="bt-o" style="height:105px;bottom:30px;z-index:6">
<img id="brg" class="bt-o" style="height:95px;bottom:30px;z-index:5">
<img id="bus" style="height:${H}px;bottom:${fly?115:30}px;z-index:6">
<img id="blt" class="bt-o" style="z-index:6">
<img id="bc1" class="bt-o" src="${src('cloud2')}" style="width:160px;z-index:7"><img id="bc2" class="bt-o" src="${src('cloud')}" style="width:110px;z-index:7">
<img id="bb1" class="bt-o" src="${src('burst')}" style="width:80px;z-index:8"><img id="bsw" class="bt-o" src="${src('swords')}" style="width:62px;z-index:8"><img id="bsk" class="bt-o" src="${src('skull')}" style="width:32px;z-index:8">
<img id="bpj" class="bt-o" style="z-index:9"><img id="bhb" class="bt-o" src="${src('burst')}" style="width:60px;z-index:9">
<img id="bban" class="bt-ban" src="${src(good?'win':'lose')}"><div class="bt-big" id="bbig" style="color:${good?'#d08a1c':'#c0462e'}">${OK}</div><div class="bt-log" id="blog"></div></div>
<div id="bload"><div class="bt-bar"><div class="bt-fill" id="bfill"></div><span class="bt-pct" id="bpct">0%</span></div><div class="bt-tip" id="btip"></div></div>
<div class="bt-res" id="bres"><div class="bt-rs">${rows}</div><div class="bt-badge${good?' ok':''}">${esc(P.badge||'')}</div><button class="bt-ok" id="bok">확인</button></div>
<button class="bt-skip" id="bskip">건너뛰기 ›</button>
</div></div></div>`;
  const $=i=>document.getElementById(i);
  const fit=()=>{const k=Math.min(1,(innerWidth-16)/568,(innerHeight-60)/600);$('bw')&&(document.querySelector('.bt-wrap').style.transform=`scale(${k})`)};fit();addEventListener('resize',fit);
  await host.showContainer('fullscreen');
  // ----- 시간표 -----
  const XS=atk?150:150,RX=60,XE0=560,XE=320;
  const shots=[];  // [시작, 그림, 방향(1=왼→오), 맞는 쪽('us'|'en')]
  let t=2.2;
  const ourShot=ur?ur.shot:'',enShot=P.es||'';
  if(ourShot||enShot){
   for(let i=0;i<2;i++){
    if(ourShot){shots.push([t,ourShot,1,atk?'vil':'en']);t+=.6}
    if(enShot){shots.push([t,enShot,-1,'us']);t+=.6}
   }
   t+=.5;
  }
  const tCharge=t,tMelee=t+.8,tMeleeEnd=tMelee+2.9,tBan=tMeleeEnd+.2;
  const tBack=tBan+.8,backDur=good&&atk?4:(atk?1.6:1.8),tArr=tBack+backDur,tRes=tArr+(good&&atk?1.1:.6);
  const logs=P.log||[],logT=logs.map((_,i)=>2.2+(tMeleeEnd-2.2)*i/Math.max(1,logs.length));
  const vEnd=atk?(P.o==='great'?3:P.o==='win'?2:1):0;
  const tip=(atk?[[0,(P.ttl||'')+' 마을로 출격하는 중...'],[2.2,'화살과 마법이 오가는 중...'],[tCharge,'마을로 돌격하는 중...'],[tMelee,'툭탁툭탁! 마을에서 싸우는 중...'],[tBan,good?'승리!':'퇴각!'],[tBack,good?'전리품을 챙겨 느긋하게 둥지로 돌아가는 중...':'둥지로 도망치는 중...']]
   :[[0,(P.ttl||'')+'의 병력이 둥지로 몰려오는 중...'],[2.2,'화살과 마법이 오가는 중...'],[tCharge,'적이 동굴로 돌격해 오는 중...'],[tMelee,'툭탁툭탁! 동굴 앞에서 싸우는 중...'],[tBan,good?'막아 냈다!':'둥지가 뚫렸다...'],[tBack,good?'적이 달아나는 중...':'적이 물러가는 중...']]);
  const ttl=atk?[[0,'공격 중'],[2.2,(ourShot||enShot)?'원거리 공격':'돌격'],[tCharge,'돌격'],[tMelee,'교전 중'],[tBan,good?'승리':'패배'],[tBack,good?'귀환 중':'후퇴'],[tRes,'결과']]
   :[[0,'적의 습격'],[2.2,(ourShot||enShot)?'원거리 공격':'적의 돌격'],[tCharge,'적의 돌격'],[tMelee,'방어 중'],[tBan,good?'방어 성공':'방어 실패'],[tRes,'결과']];
  const pick=(arr,s)=>{let v=arr[0][1];for(const[a,b]of arr)if(s>=a)v=b;return v};
  let done=false,skip=false,t0=null;
  $('bskip').onclick=()=>{skip=true};
  // 컷인: 해당 라운드 기록이 뜨는 시점에 전투를 멈추고 재생
  const cuts=(Array.isArray(P.cuts)?P.cuts:[]).filter(c=>c&&CUTIN[String(c.id||'').replace(/[^A-Z0-9].*$/,'')]);
  const maxR=Math.max(1,...logs.map(x=>+(String(x).match(/^(\d+)R/)||[])[1]||0));
  const cutT=cuts.map(c=>{const nm=(CUTIN[String(c.id).replace(/[^A-Z0-9].*$/,'')]||{}).n||'';
   let i=logs.findIndex(x=>String(x).startsWith(c.r+'R')&&(c.k==='enter'||String(x).includes(nm)));
   if(i<0)i=logs.findIndex(x=>String(x).startsWith(c.r+'R'));
   return i>=0?logT[i]:2.2+(tMeleeEnd-2.2)*(c.r-1)/maxR});
  {const o=cuts.map((c,i)=>[cutT[i],c]).sort((a,b)=>a[0]-b[0]);o.forEach(([t,c],i)=>{cutT[i]=t;cuts[i]=c})}
  let cutI=0,hold=0,holdAt=null;
  const finish=new Promise(res=>{$('bok').onclick=()=>res()});
  const W=$('bus');
  function frame(ts){
   if(done)return;if(t0===null)t0=ts;
   if(holdAt!==null){requestAnimationFrame(frame);return}
   let s=(ts-t0-hold)/1000;if(skip)s=Math.max(s,tRes+.01);
   if(!skip&&cutI<cuts.length&&s>=cutT[cutI]){const c=cuts[cutI++];holdAt=ts;
    cutinPlay(c).catch(e=>err('cutin',e)).finally(()=>{hold+=performance.now()-holdAt;holdAt=null});requestAnimationFrame(frame);return}
   const k=Math.floor(s*6),mv=(a,b,p)=>a+(b-a)*Math.min(1,Math.max(0,p));
   let hitUs=false,hitEn=false,hitV=false,pj=null;
   for(const[st,img,d,who]of shots){const p=(s-st)/.6;if(p>=0&&p<1)pj=[img,d,p];if(s>st+.6&&s<st+1.1){if(who==='us')hitUs=true;else if(who==='en')hitEn=true;else hitV=true}}
   // 아군 본대
   let ux,uImg,uFlip=1,uOp=1;
   if(atk){
    const moving=(s>.3&&s<2.1)||(s>tCharge&&s<tMelee);
    ux=s<tCharge?mv(20,XS,(s-.3)/1.8):mv(XS,300,(s-tCharge)/.8);
    uImg=hitUs?(BT_HIT[us]||'hit_gob'):moving?R[1+Math.floor(s*8)%3]:R[0];
    if(s>=tMelee)uOp=0;
    if(!good&&s>=tBack){uOp=s<tArr?1:0;ux=mv(330,0,(s-tBack)/backDur);uImg=R[1+Math.floor(s*10)%3];uFlip=-1}
   }else{
    ux=XS;uImg=hitUs?(BT_HIT[us]||'hit_gob'):R[0];
    if(s>=tMelee&&s<tMeleeEnd)uOp=0;
    if(s>=tMeleeEnd&&!good)uOp=0;
   }
   W.src=src(uImg);W.style.left=ux+'px';W.style.opacity=uOp;W.style.transform=`scaleX(${uFlip})`+(fly?` translateY(${Math.sin(s*7)*5}px)`:'')+(hitUs?` translateX(${Math.sin(s*60)*3}px)`:'');
   // 원거리 병력 (본대와 따로)
   const G=$('brg');
   if(RR&&s<(atk?tMeleeEnd:tMeleeEnd)){
    const firing=shots.some(([st,,d])=>d===1&&s>=st-.15&&s<st+.35);
    const rx=atk?mv(-40,RX,(s-.3)/1.8):RX;const moving=atk&&s>.3&&s<2.1;
    G.src=src(firing&&ur.pose?ur.pose:moving?RR[1+Math.floor(s*8)%3]:RR[0]);G.style.left=rx+'px';G.style.opacity=(!atk&&s>=tMelee)?0:1;
   }else G.style.opacity=0;
   // 적 (방어 때만 걸어 들어옴)
   const N=$('ben');
   if(!atk){
    let ex=s<tCharge?mv(XE0,XE,(s-.3)/1.8):mv(XE,190,(s-tCharge)/.8),flip=-1,img=(s>.3&&s<2.1)||(s>tCharge&&s<tMelee)?E[1+Math.floor(s*8)%2]:E[0],op=1;
    if(hitEn)img='hit_'+en.slice(2);
    if(ALC){ // 사람 → 펑 → 박쥐(이동) → 펑 → 사람 : 사람·펑일 때는 멈춤
     const leg=(a,b,t0,t1)=>{const d=t1-t0,p=(s-t0)/d;if(p<0||p>1)return null;
      if(p<.18)return[a,'e_alc1'];if(p<.3)return[a,'e_alc2'];
      if(p<.72){const q=(p-.3)/.42;return[mv(a,b,q),'e_alc'+(3+Math.floor(s*10)%3)]}
      if(p<.84)return[b,'e_alc6'];return[b,p<.92?'e_alc7':'e_alc8']};
     const L1=leg(XE0,XE,.3,2.1),L2=leg(XE,190,tCharge,tMelee);
     const L=L1||L2;if(L){ex=L[0];img=L[1]}else{img='e_alc8';ex=s<tCharge?XE:190}
     if(hitEn)img='e_alc8';flip=1}
    if(s>=tMelee&&s<tMeleeEnd)op=0;
    if(s>=tMeleeEnd){if(good){ex=mv(220,600,(s-tMeleeEnd)/1.6);flip=1;img=E[1+Math.floor(s*10)%2]}else{ex=mv(220,600,(s-tBack)/2);flip=1;img=E[1+Math.floor(s*8)%2];if(s<tBack)ex=220}
     if(ALC){img='e_alc'+(3+Math.floor(s*10)%3);flip=-1}}
    N.src=src(img);N.style.left=ex+'px';N.style.opacity=op;N.style.transform=`scaleX(${flip})`+(hitEn?` translateX(${Math.sin(s*60)*3}px)`:'');
   }
   // 투사체 (한 발씩)
   const PJ=$('bpj');
   if(pj){const[img,d,p]=pj;PJ.src=src(img);PJ.style.width=(img==='fireball'?90:70)+'px';
    const ax=atk?RX+70:RX+70,bx=atk?410:XE+20,x=d>0?mv(ax,bx,p):mv(bx,atk?XS+60:XS+60,p);
    PJ.style.left=x+'px';PJ.style.top=(150-Math.sin(p*Math.PI)*25)+'px';PJ.style.opacity=1;PJ.style.transform=`scaleX(${d})`}else PJ.style.opacity=0;
   const HB=$('bhb');HB.style.opacity=(hitV||hitEn)?1:0;HB.style.left=(atk?400:XE+30)+'px';HB.style.top='130px';
   // 근접 교전 (공격: 마을 위 / 방어: 동굴 앞)
   const fight=s>tMelee&&s<tMeleeEnd,cx=atk?380:70;
   const C1=$('bc1'),C2=$('bc2'),B1=$('bb1'),SW=$('bsw'),SK=$('bsk');
   C1.style.left=cx+'px';C1.style.bottom='70px';C2.style.left=(cx-30)+'px';C2.style.bottom='62px';B1.style.left=(cx+10)+'px';B1.style.bottom='160px';SW.style.left=(cx+120)+'px';SW.style.bottom='178px';SK.style.left=(cx+100)+'px';SK.style.bottom='84px';
   C1.style.opacity=fight?1:0;C1.style.transform=fight?`translate(${(k%2)*6-3}px,${(k%3)*-4}px)`:'';
   C2.style.opacity=fight&&k%2?1:0;B1.style.opacity=fight&&k%3===0?1:0;SW.style.opacity=fight&&k%4===1?1:0;SK.style.opacity=fight&&s>tMelee+1.4&&k%3===2?1:0;
   // 마을 · 동굴 상태
   if(atk){const st=s<tMelee?0:Math.min(vEnd,Math.floor((s-tMelee)/2.9*(vEnd+1)));$('bvil').src=src(VS[st]);$('bvil').style.transform=(fight||hitV)?`translateX(${(k%2)*4-2}px)`:''}
   const C=$('bcave');
   if(atk)C.src=src(good&&s>tArr-.1?CD:CA);
   else{C.src=src(s<tMelee?CA:s<tMeleeEnd?CB:(good?(s>tBack+1?CD:CB):CC));C.style.transform=fight?`translateX(${(k%2)*4-2}px)`:''}
   // 전리품 들고 천천히 귀환
   const LT=$('blt');
   if(atk&&good&&s>=tBack&&s<tArr){const r=(s-tBack)/backDur,lw=us==='pal'?115:135;LT.style.width=lw+'px';LT.style.bottom=fly?'95px':'24px';LT.style.left=mv(360,70,r)+'px';LT.style.opacity=r>.92?(1-r)/.08:1;LT.src=src(L[Math.floor(s*4)%3]);LT.style.transform=`scaleX(${LF}) translateY(${Math.abs(Math.sin(s*6))*-3}px)`}else LT.style.opacity=0;
   // 승패 표시 (사라지지 않음)
   const b=Math.min(1,Math.max(0,(s-tBan)/.45));$('bban').style.opacity=b;$('bban').style.transform=`translateX(-50%) scale(${.2+b*.8})`;$('bbig').style.opacity=b;
   // 글 · 진행 막대 · 전투 기록
   $('bx').textContent=pick(ttl,s);$('btip').textContent=pick(tip,s);
   const pc=Math.min(100,s/tRes*100);$('bfill').style.width=pc+'%';$('bpct').textContent=Math.floor(pc)+'%';
   let lg='';logs.forEach((x,i)=>{if(s>=logT[i])lg=x});$('blog').textContent=lg;$('blog').style.color=lg.includes('참전')?'#c0262a':'';$('blog').style.borderColor=lg.includes('참전')?'#c0262a':'';$('blog').style.opacity=lg&&s>2.1&&s<tMeleeEnd+.3?1:0;
   if(s>=tRes){done=true;$('bload').style.display='none';$('bskip').style.display='none';$('bres').style.display='block';
    $('bw').style.height='150px';$('bban').style.width='120px';$('bban').style.top='2px';$('bbig').style.top='76px';$('bbig').style.fontSize='17px';
    if($('bvil')){$('bvil').style.width='125px';$('bvil').style.bottom='24px';$('bvil').src=src(VS[vEnd])}
    C.style.width='100px';C.style.bottom='24px';W.style.opacity=0;$('brg').style.opacity=0;N.style.opacity=0;LT.style.opacity=0;
    [C1,C2,B1,SW,SK,PJ,HB].forEach(e=>e.style.opacity=0);$('blog').style.opacity=0;
    $('bx').textContent='결과';fit();return}
   requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
  await finish;
 }catch(e){err('battle',e)}
 document.body.innerHTML='';try{await host.hideContainer()}catch(e){err('close',e)}
 playing=false;
}

/* ---------- 정찰 연출 (만화 칸을 넘기듯) ----------
   성공: scp1~9 / 실패: scp1~7 → scx1~4 (화살 맞고 기절) */
const SC_CSS=`
.sc-card{position:relative;width:340px;box-sizing:border-box;border-radius:24px;background:#fff6e2;border:4px solid #6b4a2b;box-shadow:0 8px 0 #4a321c,0 20px 50px rgba(0,0,0,.6);padding:12px 14px 14px}
.sc-win{position:relative;height:430px;border-radius:14px;overflow:hidden;border:3px solid #6b4a2b;background:#2b2418}
.sc-win img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .14s}
.sc-win img.on{opacity:1}
.sc-shake{animation:scShake .35s steps(2) 2}
@keyframes scShake{0%{transform:translate(0)}50%{transform:translate(-7px,3px)}100%{transform:translate(6px,-2px)}}
.sc-flash{position:absolute;inset:0;background:#ff2a1a;opacity:0;pointer-events:none;z-index:4}
.sc-flash.on{animation:scFlash .5s ease-out}
@keyframes scFlash{0%{opacity:.55}100%{opacity:0}}
.sc-pop{position:absolute;left:50%;top:14px;transform:translateX(-50%) scale(.3);opacity:0;z-index:5;padding:4px 14px;border-radius:20px;background:#fff6e2;border:3px solid #6b4a2b;font-weight:900;font-size:15px;color:#c0262a;white-space:nowrap;transition:all .25s cubic-bezier(.3,1.6,.5,1)}
.sc-pop.on{opacity:1;transform:translateX(-50%) scale(1)}
.sc-big{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:6;padding:4px 18px 4px 24px;border-radius:26px;background:#fff6e2;border:3px solid #6b4a2b;font-size:20px;font-weight:900;letter-spacing:.25em;white-space:nowrap;opacity:0;transition:opacity .3s}
.sc-res .bt-rs{grid-template-columns:1fr}
`;
async function scoutPlay(P){
 if(playing||!P)return;playing=true;diag.played++;
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 try{
  ensureHead();
  if(!document.getElementById('bt-style')){const st=document.createElement('style');st.id='bt-style';st.textContent=BT_CSS;document.head.appendChild(st)}
  if(!document.getElementById('sc-style')){const st=document.createElement('style');st.id='sc-style';st.textContent=SC_CSS;document.head.appendChild(st)}
  const good=P.o==='great'||P.o==='ok';
  const seq=good?[['scp1',700],['scp2',600],['scp3',800],['scp4',800],['scp5',700],['scp6',700],['scp7',700],['scp8',1200],['scp9',900]]
   :[['scp1',700],['scp2',600],['scp3',800],['scp4',800],['scp5',700],['scp6',700],['scp7',700],['scx1',1000],['scx2',900],['scx3',1100],['scx4',1500]];
  const U={};await Promise.race([Promise.all([...new Set(seq.map(x=>x[0]))].map(async n=>{const u=btImg(n);if(u&&await decodeImg(u))U[n]=u})),wait(5000)]);
  const tip={scp1:'풀숲으로 숨어드는 중...',scp3:'살금살금 고개를 내미는 중...',scp4:'망원경으로 살피는 중...',scp8:'적어 두는 중...',scp9:'몰래 빠져나오는 중...',scx1:'적어 두는 중...',scx2:'들켰다!',scx3:'화살이 날아왔다!',scx4:'정찰병이 쓰러졌다...'};
  const OK={great:'대성공',ok:'성 공',fail:'실 패',worst:'대실패'}[P.o]||'';
  const rows=(P.rows||[]).map(r=>`<div class="bt-rc"><span>${esc(r[0])}</span><b class="${esc(r[2]||'')}">${esc(r[1])}</b></div>`).join('');
  document.body.innerHTML=`<div class="bt"><div class="bt-wrap" style="width:348px"><div class="sc-card">
<div class="bt-tt"><span id="sx">정찰 중</span><i>~</i><i>!</i></div>
<div class="sc-win" id="sw">${seq.map(([n],i)=>`<img data-i="${i}" src="${U[n]||''}">`).join('')}<i class="sc-flash" id="sf"></i><div class="sc-pop" id="sp">!! 숨은 전투원 발견</div><div class="sc-big" id="sb" style="color:${good?'#d08a1c':'#c0462e'}">${OK}</div></div>
<div id="sload"><div class="bt-bar"><div class="bt-fill" id="sfill"></div><span class="bt-pct" id="spct">0%</span></div><div class="bt-tip" id="stip">${esc((P.ttl||'')+' 근처 풀숲으로 숨어드는 중...')}</div></div>
<div class="bt-res sc-res" id="sres"><div class="bt-rs">${rows}</div><div class="bt-badge${good?' ok':''}">${esc(P.badge||'')}</div><button class="bt-ok" id="sok">확인</button></div>
<button class="bt-skip" id="sskip">건너뛰기 ›</button>
</div></div></div>`;
  const $=i=>document.getElementById(i);
  const fit=()=>{const w=document.querySelector('.bt-wrap');if(w)w.style.transform=`scale(${Math.min(1,(innerWidth-16)/348,(innerHeight-50)/640)})`};fit();addEventListener('resize',fit);
  await host.showContainer('fullscreen');
  let skip=false;$('sskip').onclick=()=>{skip=true};
  const imgs=[...document.querySelectorAll('#sw img')];
  const total=seq.reduce((a,b)=>a+b[1],0);let t=0;
  for(let i=0;i<seq.length;i++){
   if(skip)break;
   const [n,ms]=seq[i];
   imgs.forEach((im,j)=>im.classList.toggle('on',j===i));
   if(tip[n])$('stip').textContent=tip[n];
   if(n==='scp3'||n==='scp4')$('sx').textContent='정찰 중';
   if(n==='scx2'){$('sx').textContent='들켰다';}
   if(n==='scx3'){$('sw').classList.remove('sc-shake');void $('sw').offsetWidth;$('sw').classList.add('sc-shake');$('sf').classList.remove('on');void $('sf').offsetWidth;$('sf').classList.add('on')}
   if(n==='scp8'&&P.hid)$('sp').classList.add('on');
   const st=performance.now();
   while(performance.now()-st<ms&&!skip){const p=Math.min(100,(t+performance.now()-st)/total*100);$('sfill').style.width=p+'%';$('spct').textContent=Math.floor(p)+'%';await wait(40)}
   t+=ms;
  }
  imgs.forEach((im,j)=>im.classList.toggle('on',j===seq.length-1));
  $('sfill').style.width='100%';$('spct').textContent='100%';
  $('sx').textContent=good?'정찰 성공':'정찰 실패';$('sb').style.opacity=1;
  if(P.o==='worst'){$('sf').classList.remove('on');void $('sf').offsetWidth;$('sf').classList.add('on')}
  await wait(skip?200:900);
  $('sload').style.display='none';$('sskip').style.display='none';$('sres').style.display='block';$('sw').style.height='230px';$('sx').textContent='결과';fit();
  await new Promise(r=>{$('sok').onclick=()=>r()});
 }catch(e){err('scout',e)}
 document.body.innerHTML='';try{await host.hideContainer()}catch(e){err('close',e)}
 playing=false;
}

/* ---------- 보스 등장 연출 (보내주신 E005/E006/E007/E003 정규식을 그대로 옮김) ----------
   움직임은 원본과 같고, 렉을 줄이려고 left/right/top·filter 대신 transform·opacity로만 움직임(GPU 처리).
   봇 이미지 주소를 쓰려고 메인 화면 위에 직접 그림. Lua가 숨겨 둔 dm-fxa-char/bg/mbg/mark 에서 주소를 읽음.
   A = E005·E003 타이밍, B = E006·E007 타이밍(중앙 마크 있음). from/to = charSlideInPC 시작/끝. */
const BOSS_T={E005:{p:'A',to:'52%',d:202},E003:{p:'A',to:'45%',d:115},
 E006:{p:'B',to:'47.5%',d:197.5},E007:{p:'B',to:'45%',d:195}};
const BOSS_P={
 A:{fade:9.2,bg:3.0,wb:0,ch:0,bar:5.1,nm:5.5,mbg:2.0,mdk:5.0,mch:5.0,mbar:7.0,mnm:7.4},
 B:{fade:10.5,bg:3.5,wb:1.5,ch:1.5,bar:5.8,nm:6.2,mbg:2.5,mdk:5.5,mch:5.5,mbar:7.5,mnm:7.9}};
function bossCSS(code){
 const t=BOSS_T[code],q=BOSS_P[t.p],K='bfx'+code+'_';
 const src=`
.P-intro{position:fixed;inset:0;width:100vw;height:100vh;background:#000;z-index:9999;overflow:hidden;animation:${K}fadeOut .8s ease ${q.fade}s forwards}
.P-mark{position:absolute;top:50%;left:50%;width:450px;height:450px;transform:translate(-50%,-50%);background-size:contain;background-repeat:no-repeat;background-position:center;z-index:0;opacity:1}
.P-full{position:absolute;top:0;left:0;width:100vw;height:100vh;background-size:cover;background-position:center;z-index:1;transform:translateX(-100vw);will-change:transform;animation:${K}bgSlideFull 2.5s cubic-bezier(.22,1,.36,1) ${q.bg}s forwards}
.P-full::after{content:'';position:absolute;inset:0;background:#000;opacity:0}
.P-mo{display:none}
.P-wbar{position:absolute;top:0;left:20%;width:150px;height:100vh;background:white;z-index:3;transform:translateY(-100vh);will-change:transform;animation:${K}slideDown 3s ${q.wb}s forwards}
.P-char{position:absolute;top:50%;right:${t.to};height:110vh;width:auto;max-width:none;transform:translate(250vw,-50%);will-change:transform;z-index:4;animation:${K}charSlideInPC 3s cubic-bezier(.45,.05,.55,.95) ${q.ch}s forwards}
.P-gbar{position:absolute;top:72%;left:0;width:100%;height:240px;box-sizing:content-box;background:#2d6a30;border-top:10px solid #b7ff00;border-bottom:10px solid #b7ff00;z-index:5;transform:scaleX(0);transform-origin:left;animation:${K}barGrow .8s ease ${q.bar}s forwards;display:flex;align-items:center;padding-left:8%}
.P-name{font-family:'Impact',sans-serif;font-size:140px;line-height:normal;color:#ffff00 !important;font-style:italic;-webkit-text-stroke:16px #0055ff;paint-order:stroke fill;text-shadow:-8px -8px 0 #0055ff,8px -8px 0 #0055ff,-8px 8px 0 #0055ff,8px 8px 0 #0055ff,12px 12px 0 #000;opacity:0;animation:${K}fadeInText .8s ease ${q.nm}s forwards;white-space:nowrap}
@media (max-aspect-ratio:1/1){
.P-mark{width:80vw;height:80vw}
.P-pc{display:none}.P-mo{display:block}
.P-full{top:0;left:0;background-size:cover;z-index:1;animation:${K}bgSlideFull 3.5s cubic-bezier(.22,1,.36,1) ${q.mbg}s forwards}
.P-full::after{animation:${K}bgDarken 1.5s ease ${q.mdk}s forwards}
.P-char{height:113vh;top:50%;right:15vw;z-index:4;animation:${K}charSlideInMobile 2.5s cubic-bezier(.45,.05,.55,.95) ${q.mch}s forwards}
.P-wbar{left:8%;width:50px;z-index:3}
.P-gbar{height:18vh;top:75%;z-index:5;animation:${K}barGrow .8s ease ${q.mbar}s forwards}
.P-name{font-size:8vh;-webkit-text-stroke:8px #0055ff;text-shadow:-4px -4px 0 #0055ff,4px -4px 0 #0055ff,-4px 4px 0 #0055ff,4px 4px 0 #0055ff,6px 6px 0 #000;animation:${K}fadeInText .8s ease ${q.mnm}s forwards}
}`;
 const kf=`
@keyframes ${K}bgDarken{to{opacity:.6}}
@keyframes ${K}charSlideInMobile{0%{transform:translate(165vw,-50%)}100%{transform:translate(0,-50%)}}
@keyframes ${K}slideDown{0%{transform:translateY(-100vh)}100%{transform:none}}
@keyframes ${K}bgSlideFull{0%{transform:translateX(-100vw)}100%{transform:none}}
@keyframes ${K}charSlideInPC{0%{transform:translate(${t.d}vw,-50%)}100%{transform:translate(0,-50%)}}
@keyframes ${K}barGrow{to{transform:scaleX(1)}}
@keyframes ${K}fadeInText{to{opacity:1;transform:skewX(-12deg)}}
@keyframes ${K}fadeOut{to{opacity:0;visibility:hidden;pointer-events:none}}`;
 return src.replace(/\.P-/g,'.bfx-')+src.replace(/\.P-/g,'.x-risu-bfx-')+kf;
}

/* ---------- 보스 연출 v2: 플러그인 화면 안에서 재생 (렉 해결) ----------
   봇 에셋을 플러그인이 직접 읽어서(getCharacter → readImage) 플러그인 전용 화면에 그림.
   채팅 화면(무거운 메인 화면)과 분리되고, 이미지를 미리 다 풀어 둔 뒤 시작해서 중간에 끊기지 않음.
   BGM: 보스 표에 bgm 파일 이름이 있으면 같이 재생하고, 끝날 때 서서히 줄임. */
const assetCache=new Map();let charAssets=null,charAssetsAt=0;
async function assetList(){
 if(charAssets&&Date.now()-charAssetsAt<60000)return charAssets;
 const c=await host.getCharacter();charAssets=(c&&c.additionalAssets)||[];charAssetsAt=Date.now();return charAssets;
}
const MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',m4a:'audio/mp4',aac:'audio/aac',webm:'audio/webm'};
async function assetURL(name){
 if(!name)return '';if(assetCache.has(name))return assetCache.get(name);
 const want=name.toLowerCase(),bare=want.replace(/\.[a-z0-9]+$/,'');
 const list=await assetList();
 const e=list.find(x=>{const n=String(x[0]||'').toLowerCase(),ext=String(x[2]||'').toLowerCase();return n===want||n+'.'+ext===want||n===bare||n.replace(/\.[a-z0-9]+$/,'')===bare});
 if(!e)return '';
 const data=await host.readImage(e[1]);if(!data)return '';
 const ext=(String(e[2]||'')||(name.match(/\.([a-z0-9]+)$/i)||[])[1]||'png').toLowerCase();
 const url=URL.createObjectURL(new Blob([data],{type:MIME[ext]||'application/octet-stream'}));
 assetCache.set(name,url);return url;
}
async function decodeImg(url){if(!url)return false;const im=new Image();im.src=url;try{await im.decode();return true}catch{return false}}
const ghBoss=n=>GH_BASE&&n?ghv(GH_BASE+'boss/'+n.replace(/\.[a-z0-9]+$/i,'')+'.'+IMG_EXT):'';
/* ---------- BGM ----------
   1) 플러그인 화면에서 재생 (깃허브 → 봇 에셋 순서, 서서히 커지고 줄어듦)
   2) 브라우저가 플러그인 화면의 자동 재생을 막으면, 채팅 화면에 숨긴 오디오로 재생 (크기 조절은 안 됨) */
let bgmNow=null;
function fadeTo(au,to,ms,then){const from=au.volume,t0=performance.now();let fin=false;const end=()=>{if(fin)return;fin=true;clearInterval(iv);try{au.volume=to}catch{}if(then)then()};
 const iv=setInterval(()=>{const k=Math.min(1,(performance.now()-t0)/ms);try{au.volume=from+(to-from)*k}catch{}if(k>=1)end()},40);setTimeout(end,ms+150)}
async function bgmStart(kind,mainUrl,name){
 await bgmStop();
 const cur={kind};bgmNow=cur;
 const file=name||BGM_FILES[kind],loop=kind==='destiny';
 const gh=GH_BASE&&file?ghv(GH_BASE+'bgm/'+file+'.'+BGM_EXT):'';
 let blocked=false;
 for(const get of [async()=>gh,async()=>assetURL(file).catch(()=>'')]){
  const u=await get();if(!u)continue;
  try{const au=new Audio(u);au.loop=loop;au.volume=0;await au.play();if(bgmNow!==cur){au.pause();return}cur.au=au;fadeTo(au,BGM_VOL,900);return}
  catch(e){if(e&&e.name==='NotAllowedError'){blocked=true;break}}
 }
 const srcs=[gh,mainUrl].filter(Boolean);
 if(!srcs.length||!doc||bgmNow!==cur)return;
 try{
  const body=await doc.querySelector('body');const r=await doc.createElement('div');await r.setClassName('dfx-bgm');
  await r.setInnerHTML('<audio autoplay'+(loop?' loop':'')+' preload="auto">'+srcs.map(u=>'<source src="'+dsEsc(u)+'">').join('')+'</audio>');
  await body.appendChild(r);release(body);
  if(bgmNow!==cur){try{await r.remove()}catch{}release(r);return}
  cur.el=r;if(blocked)diag.errors.push('bgm: 플러그인 화면 자동재생 막힘 → 채팅 화면에서 재생');
 }catch(e){err('bgm',e)}
}
async function bgmStop(){
 const cur=bgmNow;bgmNow=null;if(!cur)return;
 if(cur.au){const a=cur.au;fadeTo(a,0,800,()=>{try{a.pause();a.currentTime=0;a.removeAttribute('src');a.load()}catch{}})}
 if(cur.el){try{await cur.el.remove()}catch{}release(cur.el)}
}
async function bossPlayLocal(code,name,f){
 if(!BOSS_T[code]||playing)return false;
 playing=true;
 // 이미지 주소: 깃허브 → 안 되면 봇 에셋. 다 풀어 둔 뒤 시작 → 움직이는 중에 끊기지 않음
 const u={};
 try{
  await Promise.all(['char','bg','mbg','mark'].map(async k=>{
   if(!f[k])return;const g=ghBoss(f[k]);
   if(g&&await decodeImg(g)){u[k]=g;return}
   const a=await assetURL(f[k]).catch(()=>'');if(a&&await decodeImg(a))u[k]=a}));
 }catch(e){err('boss asset',e)}
 if(!u.char||!u.bg){playing=false;return false}
 diag.played++;
 const main=await bossAssets().catch(()=>({}));
 try{
  ensureHead();
  const e=dsEsc,q=BOSS_P[BOSS_T[code].p];
  let h='<style>'+bossCSS(code)+'.bfx-intro{contain:strict}</style><div class="bfx-intro">';
  if(BOSS_T[code].p==='B'&&u.mark)h+=`<div class="bfx-mark" style="background-image:url('${e(u.mark)}')"></div>`;
  h+=`<div class="bfx-full bfx-pc" style="background-image:url('${e(u.bg)}')"></div>`;
  h+=`<div class="bfx-full bfx-mo" style="background-image:url('${e(u.mbg||u.bg)}')"></div>`;
  h+=`<div class="bfx-wbar"></div><img src="${e(u.char)}" class="bfx-char" alt=""><div class="bfx-gbar"><div class="bfx-name">${e(name)}</div></div></div><div class="skip">건너뛰기 ▶▶</div>`;
  document.body.innerHTML=h;
  bgmStart('boss',main.bgm,f.bgm).catch(e=>err('bgm',e));
  let done;const end=new Promise(r=>done=r);
  const ms=(q.fade+0.9)*1000,t=setTimeout(done,ms);
  setTimeout(()=>document.body.addEventListener('click',()=>{clearTimeout(t);done()},{once:true}),1200);
  await host.showContainer('fullscreen');
  await end;
 }catch(e){err('boss local',e)}
 bgmStop().catch(()=>{});
 document.body.innerHTML='';try{await host.hideContainer()}catch(e){err('close',e)}
 playing=false;return true;
}

/* ---------- 운명 선택 직후: 대사(보라색, 떠올랐다 사라짐) / 지문(누르면 다음) ---------- */
const INTRO=[["q", "\"헤에~ 그걸 골랐구나. 내 생각과는 다른 운명의 길이야.\""], ["n", ["그녀는 턱을 괴고 몸을 앞으로 살짝 기울이며, 당신의 눈을 똑바로 쳐다봅니다. 깊이를 알 수 없는 푸른 눈동자가 기묘하게 반짝입니다."]], ["q", "\"내가 이길지, 그녀가 이길지... 재밌게 지켜보고 있을게.\""], ["n", ["그 순간, 당신은 그녀의 맑은 눈동자 표면에 비친 '자신의 모습'을 보았습니다.\n거기에는 인간이 아닌, 흉측하고 일그러진 초록색 괴물의 얼굴이 비치고 있었습니다.", "경악하여 비명을 지르기도 전에, 발밑의 공간이 무너지며 당신의 몸이 거대한 심연 속으로 빨려들 듯이 뒤로 쓰러집니다."]]];
// 단계: ['q',대사,색(p 보라/g 초록/r 빨강)] 떠올랐다 자동으로 사라짐 · ['n',[지문...]] 누르면 다음 · ['img',이름] 삽화(누르면 다음, 이후 배경으로)
//       ['sfx',효과음] 크게 흔들림 · ['petals'] 붉은 꽃잎 흘러내림 시작 · ['boss',코드] 보스 등장 연출
const userName=(t,u)=>String(t).replace(/\{\{user\}\}/gi,u||'User');
async function scenePlay(steps,opt){
 opt=opt||{};const U=t=>userName(t,opt.user);
 if(playing)return false;playing=true;diag.played++;
 let onTap=null,bossDone=false;
 try{
  ensureHead();
  document.body.innerHTML=`<div class="ix ix-${opt.theme||'violet'}"><div class="ix-bd"></div><div class="ix-smoke"></div><div class="ix-smoke ix-s2"></div><div class="ix-pet"></div><div class="ix-stage"></div><div class="ix-pic"></div><div class="ix-tap">눌러서 계속</div></div>`;
  await host.showContainer('fullscreen');
  let root=document.querySelector('.ix');
  const $=c=>root.querySelector(c);
  // 삽화 미리 받아 두기
  const urls={};
  await Promise.all([...new Set(steps.filter(x=>x[0]==='img'||x[0]==='full'||x[0]==='scroll'||x[0]==='pan').flatMap(x=>x[0]==='pan'?[x[1],x[2]]:[x[1]]))].map(async n=>{urls[n]=await eventImg(n).catch(()=>'')}));
  let wake=null;onTap=ev=>{if(ev.type==='keydown'&&!/^(Enter| |ArrowRight)$/.test(ev.key))return;if(wake){const w=wake;wake=null;w()}};
  // 건너뛰기 (우측 상단): 남은 장면을 모두 넘김
  let skipped=false;const waiters=new Set();
  const wait=ms=>skipped?Promise.resolve():new Promise(r=>{const f=()=>{clearTimeout(t);waiters.delete(f);r()};const t=setTimeout(f,ms);waiters.add(f)});
  {const sk=document.createElement('button');sk.className='ix-skip';sk.textContent='건너뛰기 ▶▶';
   sk.addEventListener('click',ev=>{ev.stopPropagation();if(skipped)return;skipped=true;sk.remove();[...waiters].forEach(f=>f());if(wake){const w=wake;wake=null;w()}});
   document.body.appendChild(sk)}
  document.addEventListener('click',onTap);document.addEventListener('keydown',onTap);
  const tap=async()=>{if(skipped)return;root.classList.add('ix-wait');await new Promise(r=>{wake=r});root.classList.remove('ix-wait')};
  await wait(700);
  for(let si=0;si<steps.length;si++){if(skipped)break;const st=steps[si];
   const k=st[0],v=st[1];
   if(k==='q'){
    const ms=3400+v.length*55;
    $('.ix-stage').innerHTML=`<p class="ix-q ix-q-${st[2]||'p'}" style="animation-duration:${ms}ms">${st[2]==='rs'?`<span class="ix-shk">${esc(U(v))}</span>`:esc(U(v))}</p>`;
    await wait(ms+250);
   }else if(k==='n'){
    $('.ix-stage').innerHTML='<div class="ix-n">'+v.map((p,i)=>`<p style="animation-delay:${(i*.9).toFixed(1)}s">${esc(U(p)).replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>').replace(/\*([^*\n]+)\*/g,'<i>$1</i>').replace(/\n/g,'<br>')}</p>`).join('')+'</div>';
    await wait(900+(v.length-1)*900);
    await tap();
    const n=$('.ix-stage').firstChild;if(n)n.classList.add('ix-out');
    await wait(650);$('.ix-stage').innerHTML='';
   }else if(k==='img'){
    const u=urls[v];if(!u)continue;root.classList.remove('ix-black');
    $('.ix-pic').innerHTML=`<img src="${dsEsc(u)}" alt="">`;$('.ix-pic').classList.add('ix-on');
    await wait(1100);await tap();
    $('.ix-bd').style.backgroundImage=`url("${u.replace(/"/g,'%22')}")`;$('.ix-bd').classList.add('ix-on');
    $('.ix-pic').classList.remove('ix-on');await wait(700);$('.ix-pic').innerHTML='';
   }else if(k==='full'){
    // 화면 전체를 덮는 삽화 (클라이맥스) — 누르면 살짝 어두워진 채 뒤에 남음
    const u=urls[v];if(!u)continue;
    const f=document.createElement('div');f.className='ix-full';f.style.backgroundImage=`url("${u.replace(/"/g,'%22')}")`;
    root.insertBefore(f,$('.ix-stage'));await wait(60);f.classList.add('ix-on');
    await wait(1600);await tap();if(si<steps.length-1){f.classList.add('ix-dim');await wait(600)}
   }else if(k==='sfx'){
    $('.ix-stage').innerHTML=`<p class="ix-sfx">${esc(v)}</p>`;root.classList.add('ix-shake');
    await wait(1800);root.classList.remove('ix-shake');$('.ix-stage').innerHTML='';
   }else if(k==='petals'){
    let h='';for(let i=0;i<54;i++){const f=i%4===0,sz=f?(20+Math.random()*16):(9+Math.random()*13);
     h+=`<i class="${f?'ix-pf':''}" style="--l:${(Math.random()*104-2).toFixed(1)}%;--s:${sz.toFixed(0)}px;--d:${(f?5.5:7)+Math.random()*6}s;--dl:${(Math.random()*7).toFixed(2)}s;--x:${(Math.random()*16-8).toFixed(1)}vw;--r:${Math.random()<.5?-1:1}"></i>`}
    $('.ix-pet').innerHTML=h;$('.ix-pet').classList.add('ix-on');
   }else if(k==='boss'){
    const bo=opt.boss;if(!bo||!bo.f||bossDone)continue;
    // 보스 연출이 같은 화면을 쓰므로 잠깐 떼어 두었다가 다시 붙임
    const keep=root;keep.remove();playing=false;
    let okb=false;try{okb=await bossPlayLocal(bo.code,bo.name,bo.f);if(!okb)okb=await bossPlay(bo.code,bo.name)}catch(e){err('boss',e)}
    bossDone=true;playing=true;
    document.body.innerHTML='';document.body.appendChild(keep);root=keep;
    await host.showContainer('fullscreen');await wait(500);
   }else if(k==='fx'){
    const kind=opt.variant;if(kind!=='reborn'&&kind!=='corrupt')continue;
    const keep=root;keep.remove();playing=false;
    try{await play(kind,opt.who||'루카',kind==='reborn'?'마족 전생':'타락',kind==='reborn'?'60c890':'c490e8')}catch(e){err('fx',e)}
    playing=true;ensureHead();document.body.innerHTML='';document.body.appendChild(keep);root=keep;
    await host.showContainer('fullscreen');await wait(400);
   }else if(k==='sys'){
    // 시스템 창: ['sys', 제목, [줄...]] → 누르면 다음
    $('.ix-stage').innerHTML=`<div class="ix-sys"><b>${esc(U(v))}</b>${(st[2]||[]).map(l=>`<p>${esc(U(l))}</p>`).join('')}</div>`;
    await wait(1200);await tap();
    const n=$('.ix-stage').firstChild;if(n)n.classList.add('ix-out');await wait(650);$('.ix-stage').innerHTML='';
   }else if(k==='tbc'){
    // To be continue: 붉게 흔들리며 떠오름 → 잠시 머묾 → 4초 동안 천천히 사라짐
    root.classList.add('ix-black');$('.ix-bd').classList.remove('ix-on');
    $('.ix-stage').innerHTML=`<p class="ix-tbc">${esc(v)}</p>`;
    await wait(2600);const t=$('.ix-stage').firstChild;if(t)t.classList.add('ix-tbc-out');
    await wait(4100);$('.ix-stage').innerHTML='';
   }else if(k==='sysfail'){
    const f=document.createElement('div');f.className='sfl ix-sfl';
    f.innerHTML='<div class="sfl-scan"></div><div class="sfl-box"><div class="sfl-t" data-t="SYSTEM : FAILED">SYSTEM : FAILED</div><div class="sfl-s">[ ERROR ]</div></div>';
    root.appendChild(f);await wait(3600);f.classList.add('ix-sfl-out');await wait(500);f.remove();
   }else if(k==='pan'){
    // 세로 그림: 화면을 꽉 채워(모바일은 양옆이 조금 잘림) 아래→위로 올라가 얼굴(맨 위)에서 멈춤
    // → 글(있으면, 누르면 넘어감) → 두 번째 그림으로 번뜩 → 2초 → 끝
    const u1=urls[v],u2=urls[st[2]],paras=st[3]||[];if(!u1)continue;
    const pn=document.createElement('div');pn.className='ix-pan';
    const a=new Image(),b=new Image();a.src=u1;if(u2)b.src=u2;b.className='ix-pan-b';
    pn.appendChild(a);if(u2)pn.appendChild(b);
    const dk=document.createElement('i');dk.className='ix-pan-dk';pn.appendChild(dk);
    const fl=document.createElement('i');fl.className='ix-flash';pn.appendChild(fl);
    root.appendChild(pn);
    await new Promise(r=>{if(a.naturalHeight)r();else{a.onload=r;a.onerror=r}});
    const iw=a.naturalWidth||832,ih=a.naturalHeight||1216;
    const sc=Math.max(innerWidth/iw,innerHeight*1.3/ih);
    const w=iw*sc,h=ih*sc,dist=Math.max(0,h-innerHeight),top0=-dist;
    const eyeY=ih*.29*sc,topEnd=Math.min(0,Math.max(-dist,innerHeight*.42-eyeY));// 멈출 곳: 눈이 화면 42% 높이
    for(const im of [a,b]){im.style.width=w+'px';im.style.top=top0+'px'}
    fl.style.setProperty('--fy',Math.min(90,(topEnd+eyeY)/innerHeight*100).toFixed(1)+'%');// 눈 높이에서 번뜩
    await wait(60);pn.classList.add('ix-on');await wait(1200);
    const run=topEnd-top0;
    if(run>0){const dur=Math.max(4000,run*4.5),t0=performance.now();
     await new Promise(r=>{function f(t){const p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,3);
      const y=(top0+run*e)+'px';a.style.top=y;b.style.top=y;if(p<1)requestAnimationFrame(f);else r()}requestAnimationFrame(f)})}
    else await wait(1500);
    await wait(700);
    if(paras.length){
     root.classList.add('ix-pantxt');pn.classList.add('ix-pan-dark');
     $('.ix-stage').innerHTML='<div class="ix-n">'+paras.map((p,i)=>`<p style="animation-delay:${(i*.9).toFixed(1)}s">${esc(U(p))}</p>`).join('')+'</div>';
     await wait(900+(paras.length-1)*900);await tap();
     const n=$('.ix-stage').firstChild;if(n)n.classList.add('ix-out');await wait(650);$('.ix-stage').innerHTML='';
     pn.classList.remove('ix-pan-dark');root.classList.remove('ix-pantxt');await wait(500);
    }
    if(u2){pn.classList.add('ix-pan-2');root.classList.add('ix-shake');await wait(500);root.classList.remove('ix-shake')}
    await wait(2000);
    // 뒤에 장면이 더 있으면: 바뀐 그림을 배경으로 남기고 덮개를 걷음 (마지막 장면이면 예전처럼 그대로)
    if(si<steps.length-1){const ub=u2||u1;$('.ix-bd').style.backgroundImage=`url("${ub.replace(/"/g,'%22')}")`;$('.ix-bd').classList.add('ix-on');
     pn.style.transition='opacity .7s';pn.style.opacity='0';await wait(750);pn.remove()}
   }else if(k==='scroll'){
    // 웹툰 스크롤: 세로로 긴 이미지를 위→아래로 천천히 스크롤
    const u=urls[v];if(!u)continue;
    root.classList.add('ix-black');$('.ix-bd').classList.remove('ix-on');$('.ix-bd').style.backgroundImage='';
    const sc=document.createElement('div');sc.className='ix-scroll';
    const im=new Image();im.src=u;
    sc.appendChild(im);root.insertBefore(sc,$('.ix-stage'));
    await wait(100);
    // 이미지 로드 후 높이 계산
    await new Promise(r=>{if(im.naturalHeight)r();else{im.onload=r;im.onerror=r}});
    const ih=im.naturalHeight||4352,iw=im.naturalWidth||896;
    const vw=Math.min(innerWidth,896),scale=vw/iw,realH=ih*scale;
    const viewH=innerHeight;
    im.style.width=vw+'px';im.style.top='0px';
    sc.classList.add('ix-on');
    await wait(1200);
    // 스크롤 애니메이션: 위에서 아래로
    const scrollDist=Math.max(0,realH-viewH);
    const duration=Math.max(6000,scrollDist*4.5);// 느리고 자연스럽게
    const start=performance.now();
    await new Promise(r=>{
     function frame(t){
      const p=Math.min(1,(t-start)/duration);
      const ease=p<0.5?2*p*p:(1-Math.pow(-2*p+2,2)/2);// easeInOutQuad
      im.style.top=(-scrollDist*ease)+'px';
      if(p<1)requestAnimationFrame(frame);else r()
     }
     requestAnimationFrame(frame);
    });
    await wait(1500);// 끝에서 잠시 머무름
    sc.classList.remove('ix-on');
    await wait(1200);sc.remove();
   }
  }
  $('.ix-stage').innerHTML='';root.classList.add('ix-fall');
  await wait(1900);
 }catch(e){err('scene',e)}
 if(onTap){document.removeEventListener('click',onTap);document.removeEventListener('keydown',onTap)}
 document.body.innerHTML='';try{await host.hideContainer()}catch(e){err('close',e)}
 playing=false;
 return bossDone;
}
const INTRO_OUTER=[["n",["아무것도 보이지 않는다.","칠흑같은 어둠 속...","양의 울음소리만이 메아리 친다."]],
 ["q","\"잘왔단다 사랑하는 아가\"","rs"],
 ["n",["당신은 누군가가 자신을 껴안아 주는듯한 느낌이 들었다.","아무런 생각도 들지 않는다. 당신은 그저 어머니의 품속에서 심연으로 빨려들어갔다."]]];
const introPlay=id=>id==='outer'?(()=>{try{if(GH_BASE){const au=new Audio(ghv(GH_BASE+'sfx/bleat.mp3'));au.volume=.7;setTimeout(()=>au.play().catch(()=>{}),1600)}}catch{}return scenePlay(INTRO_OUTER,{theme:'blood'})})():scenePlay(INTRO,{theme:'violet'});
// 이야기 재생: 책(text) → 화면 글자 연출(tail/scene) → 보스 (연출 안에서 이미 나왔으면 생략)
// 책장에서 연 이야기: 펼침 연출 → (책이면 덮개 없이) 이야기
async function shelfStory(id,cat,user,variant){
 const st=STORIES[id];if(!st)return;
 if(cat){await shelfIntro(cat,st.title);if(st.text)autoOpen=true}
 try{await storyPlay(id,null,user,variant)}finally{autoOpen=false}
}
async function storyPlay(id,boss,user,variant,who){
 const st=STORIES[id];if(!st)return;
 if(st.text)await bookPlay(id);
 let sc=st.scene||st.tail;let used=false;
 if(st.open){const o=st.open[variant]||st.open.corrupt;const c=sc.map(x=>x.slice());c[0]=['n',[o.lead,...c[0][1]]];sc=o.steps.concat(c)}
 if(sc)used=await scenePlay(sc,{theme:st.theme,boss,user,variant,who});
 if(boss&&boss.f&&!used){if(!await bossPlayLocal(boss.code,boss.name,boss.f))await bossPlay(boss.code,boss.name)}
}

/* ---------- 이야기책: 정해진 이벤트를 책처럼 보여 줌 ----------
   글은 아래 STORIES 원문 그대로. [img|이름.png] = 바로 앞 글의 삽화, *** = 장면 전환.
   삽화는 깃허브 event/ 폴더(webp) → 없으면 같은 이름의 봇 에셋.
   PC: 왼쪽 삽화 · 오른쪽 글 / 모바일: 삽화 한 장 → 글 한 장 */
/* kind: 'main' = 메인 책장(도착 시 자동) / 'back' = 뒷면책장(답변 아래 "펼쳐보기"로만, 보라색) */
const STORIES={
 moonwell:{title:"니플락시스의 각성",kind:'main',theme:'green',text:"엘프 자치령의 외곽, 영웅 나이엘라의 은거지이자 진보파의 상징인 마을 ‘문웰(Moonwell)’.\n전통적인 목조 건축만을 고집하는 엘프 사회의 금기를 깨고 단단한 석조 건물들이 들어선 이곳은, 인간과 드워프, 수인들이 엘프들과 한데 어울려 살아가는 기묘하고도 평화로운 마을이었다. 대장간에서는 쇳소리가 경쾌하게 울려 퍼지고, 거리에는 타 종족들의 활기찬 웃음소리가 끊이지 않았다.\n\n그 평화로운 마을을 굽어보는 언덕 위에는 순백의 대리석으로 지어진 장엄한 ‘세계수 신전’이 우뚝 솟아 있었다. 천장의 스테인드글라스를 통과한 따스한 햇살이 신전 내부로 쏟아져 내리고 있었으나, 바깥의 활기와는 대조적으로 신전 안은 숨이 막힐 듯이 고요하고 서늘했다.\n\n[img|E006.EVENT.1.png]\n\n그 거대한 성소의 제단 앞, 은빛이 감도는 아름다운 머리카락을 길게 늘어뜨린 하이 프리스트 라이라가 홀로 무릎을 꿇고 앉아 있었다. 평소 신도들과 마을 사람들에게 보여주던 한없이 자애롭고 다정한 눈웃음은 온데간데없었다. 두 손을 모으고 기도하는 그녀의 얼굴에는 심연처럼 깊고 서늘한 어둠만이 무겁게 내려앉아 있었다.\n\n겉으로 보기에 그녀는 모든 종족의 화합을 노래하는 고결한 성직자였으나, 그 아름다운 껍데기 아래 감춰진 그녀의 내면은 언제나 시커먼 증오와 뒤틀린 열망으로 가득 차 있었다.\n\n조용히 기도를 마친 라이라가 천천히 자리에서 일어나, 신전 테라스 너머로 펼쳐진 아래쪽 마을의 전경을 내려다보았다.\n\n[img|E006.EVENT.2.png]\n\n따스한 햇살 아래에서 아무런 걱정도 없이 하하호호 웃고 떠드는 어리석은 군중들. 그리고 그 평화로운 풍경 한가운데서, 라이라의 차가운 시선이 단 한 사람에게로 꽂혔다.\n\n전대 하이 프리스트이자, 한때 라이라가 자신의 세계 그 자체로 여기며 동경하고 우러러보았던 완벽한 우상, ‘에이라’.\n고결하고 숭고해야만 했던 그 스승은 지금, 천박하고 볼품없는 드워프 대장장이(빌리언)의 옆에 서서 더할 나위 없이 행복하고 온화한 미소를 짓고 있었다. 엘프의 긍지도, 하이 프리스트의 책무도 한낱 수컷 하나 때문에 내던져 버린 배신자.\n\n[img|E006.EVENT.3.png]\n\n*‘다 죽여버리고 싶네요.’*\n\n우아하게 포개어 쥔 라이라의 손끝에 핏기가 가실 정도의 힘이 들어갔다. 에이라가 저토록 평범하고 천박한 행복에 안주하여 웃을 때마다, 과거 그녀를 신처럼 따랐던 라이라의 자존심과 신념은 갈기갈기 찢겨 나가는 듯했다.\n\n*‘언니가 틀렸다는 것을... 당신이 버린 이 자리에서 내가 얼마나 위대한 영웅이 되는지, 저 어리석은 선택이 얼마나 끔찍한 대가를 치르게 될지 내 손으로 똑똑히 증명해 보이겠어요.’*\n\n그녀의 시선이 배신자인 스승에게서 한 치도 떨어지지 않고 살의를 불태우던 바로 그때였다.\n\n*\"...여기다.\"*\n\n정적에 잠긴 신전 등 뒤에서, 누군가 귓가에 대고 속삭이는 듯한 어둡고 축축한 목소리가 울려 퍼졌다.\n\n\"...누구시죠?\"\n\n[img|E006.EVENT.4.png]\n\n라이라가 흠칫 놀라며 황급히 뒤를 돌아보았다. 아무도 없어야 할 신전 중앙 홀. 그러나 그녀가 시선을 돌린 순간, 둔중한 파열음과 함께 순백의 대리석 바닥 일부가 아래로 무너져 내리며 칠흑 같은 어둠을 머금은 비밀스러운 지하 통로가 입을 벌렸다.\n\n계단 아래에서부터 뿜어져 나오는 것은 수백 년 동안 빛을 보지 못한 묵은 흙냄새와, 본능적인 공포를 자극하는 불길하고도 매혹적인 기운이었다. 이성적으로는 절대 저 안으로 발을 들여놓아서는 안 된다는 경고가 머릿속에서 울리고 있었다.\n\n하지만 라이라는 홀린 듯이, 자신의 지팡이 ‘봉인의 지팡이’를 고쳐 쥐고 그 어두운 계단 아래로 또각또각 걸음을 옮겼다.\n\n[img|E006.EVENT.5.png]\n\n지하 깊숙한 곳으로 내려갈수록 현대의 건축 양식은 사라지고, 수천 년 전 고대 엘프들의 양식으로 지어진 거대하고도 음산한 지하 성소가 모습을 드러냈다. 그리고 그 가장 깊은 심연의 끝에, 겹겹의 고대 주술과 금줄로 단단히 봉인된 하나의 사당(Shrine)이 자리 잡고 있었다.\n\n사당에 가까워질수록, 아까부터 들려오던 그 정체불명의 목소리는 더욱 선명하고 달콤하게 라이라의 뇌리를 파고들었다. 라이라는 저 봉인 너머에 도사린 존재가 세계의 멸망을 부르는 마수 ‘니플락시스’라는 사실을 알지 못했다. 다만 그 목소리가 자신의 가장 깊은 상처와 욕망을 정확히 꿰뚫어 보고 있다는 것만은 알 수 있었다.\n\n*\"복수하고 싶지?\"*\n\n사당 안에서 흘러나오는 목소리가 뱀처럼 라이라의 귓바퀴를 감쌌다. \n에이라의 행복한 미소를 박살 내고, 모든 이들이 자신에게 매달려 구원을 갈구하게 만들 수 있는 힘. 라이라는 마른침을 삼키며 떨리는 손을 뻗어, 수백 년간 닫혀 있던 사당의 봉인을 열어젖혔다. 그리고 그 안에 안치되어 있던 불길하고도 매혹적인 검은 씨앗을 손아귀에 움켜쥐었다.\n\n\"당신은 누구신가요?\"\n\n라이라가 씨앗을 쥐자, 그녀의 지팡이 속에 봉인되어 있던 ‘마왕의 씨앗’ 파편과 사당의 씨앗이 공명하며 검붉은 마기가 폭발하듯 피어올랐다. 흐릿하게 메아리치던 목소리가 마침내 바로 옆에서 속삭이는 것처럼 완벽하고 또렷한 여자의 음성으로 바뀌었다.\n\n[img|E006.EVENT.6.png]\n\n**\"안녕~? 사랑스러운 아이야, 난 세계수란다.\"**\n\n***\n\n그로부터 이틀의 시간이 흘렀다.\n여느 때와 다름없이 고요한 세계수 신전의 긴 회랑. 하이 프리스트 라이라가 다른 엘프 사제 한 명과 함께 복도를 걸어가고 있었다. 두 사람 사이에는 어떠한 대화도 오가지 않았고, 오직 대리석 바닥을 울리는 발소리만이 정적을 채우고 있었다.\n\n[img|E006.EVENT.9.png]\n\n앞서 걷는 라이라의 하얀 손아귀 안에는, 이틀 전 지하 성소에서 손에 넣은 ‘어둠의 씨앗’이 은밀하게 감춰져 있었다. 손바닥을 간지럽히는 씨앗의 불길한 고동을 느끼며, 라이라는 조용히 두 눈을 감고 깊은 고뇌에 잠겼다.\n\n[img|E006.EVENT.10.png]\n\n*‘세계수의 어두운 이면, 파괴의 사신 니플락시스...’*\n\n지난 이틀간 그 존재와 교감하며, 라이라는 자신이 깨운 것이 단순한 정령이 아니라 세상을 멸망시킬 수도 있는 끔찍한 괴물이라는 사실을 알게 되었다. 과연 이 괴물의 부활을 돕는 것이 옳은 일일까? 모든 연극이 끝나는 마지막 순간에, 세계수의 하이 프리스트인 자신의 힘으로 이 흉악한 마수를 완벽하게 통제하고 토벌하여 영웅이 될 수 있을까?\n\n찰나의 망설임이 그녀의 발걸음을 무겁게 붙잡던 바로 그 순간이었다.\n\n[img|E006.EVENT.11.png]\n\n라이라의 뇌리 속으로, 오늘 아침에도 드워프 남편의 팔짱을 끼고 마을 사람들과 환하게 웃고 있던 ‘에이라’의 행복한 얼굴이 선명하게 떠올랐다.\n\n*울컥—!*\n\n그 얼굴을 떠올리자마자, 라이라의 아랫배—자궁 깊숙한 곳에서부터 시커멓고 사악한 감정의 격류가 용암처럼 부글부글 끓어올랐다. 이성적인 고민 따위는 그 검은 열기 앞에서 순식간에 증발해 버렸다. 에이라가 틀렸다는 것을 증명하기 위해서라면, 자신이 진정한 영웅으로 추앙받기 위해서라면 이 무대 위의 어떤 희생도 정당화될 수 있었다.\n\n망설임은 짧았다.\n\n[img|E006.EVENT.12.png]\n\n라이라가 우뚝 걸음을 멈추고, 뒤따라오던 엘프 사제를 향해 천천히 몸을 돌렸다. \n언제나 온화하고 다정한 미소만을 띠고 있던 하이 프리스트 라이라. 그러나 지금 뒤를 돌아본 그녀의 얼굴에는 어떠한 감정도 읽을 수 없는 싸늘하고 죽은 듯한 무표정(Deadpan)만이 걸려 있었다. 태어나서 처음 마주하는 라이라의 낯설고 소름 끼치는 표정에, 뒤따르던 사제가 당황하여 걸음을 멈추고 눈을 크게 떴다.\n\n\"라, 라이라 님...?\"\n\n\"미안해요.\"\n\n사제가 미처 반문하거나 몸을 피할 틈조차 없었다. 다정하고 나긋나긋한 존댓말과 함께, 라이라의 손이 번개처럼 뻗어 나가 사제의 가슴팍 한가운데에 ‘어둠의 씨앗’을 사정없이 쑤셔 박았다.\n\n[img|E006.EVENT.13.png]\n\n\"무, 무슨...\"\n\n그것이 불쌍한 엘프 사제가 자신의 의지로 내뱉은 마지막 목소리였다.\n\n가슴팍을 파고든 씨앗이 심장과 신경계를 단숨에 잠식하자마자, 끔찍한 파열음과 함께 사제의 가슴에서 검푸른 식물 줄기와 촉수들이 폭발하듯 뿜어져 나왔다. 살아 움직이는 덩굴들이 비명을 지를 새도 없이 사제의 전신을 휘감아 덮쳤고, 피부는 치명적인 초록빛으로 물들며 머리 위로는 피처럼 붉은 꽃봉오리가 기괴하게 피어올랐다.\n\n[img|E-Blight corruption.png]\n\n순식간에 완료된 ‘블라이트(Blight) 타락’.\n원래 사제가 가지고 있던 자아와 영혼은 흔적도 없이 씹어 삼켜지고, 그 빈 껍데기 속으로 거대한 마수의 분신이 내려앉았다.\n\n바닥에 쓰러져 부들부들 경련하던 사제의 육체가 기괴한 관절 소리를 내며 천천히 몸을 일으켜 세웠다.",tail:[["img", "E006.EVENT.14.png"], ["n", ["초록빛으로 변이된 얼굴 위로 분홍빛 안광이 번뜩이고, 입가에는 찢어질 듯한 고혹적인 미소가 걸렸다. 그녀의 붉은 입술 사이로 흘러나온 목소리는 더 이상 라이라가 알던 그 성실한 사제의 것이 아니었다."]], ["q", "\"아~ 좋네, 육체라는 것은... 안 그러니~? 내 아이야.\"", "g"], ["n", ["신성해야 할 세계수의 신전 한복판에, 달콤하고도 역겨운 죽음의 꽃향기가 진하게 퍼져 나가기 시작했다."]]]},
 nifl:{title:"마왕수 강림",kind:'main',theme:'blood',scene:[["n", ["얼마나 지났을까. 심장 고동 소리가 멎는 것과 동시에, 꽃봉오리 안에서 맑고도 소름 끼치는 여자의 웃음소리가 메아리쳤다."]], ["q", "\"아하하하하하—!!\"", "r"], ["n", ["웃음소리가 울려 퍼지자마자, 따스한 빛이 감돌던 하늘이 순식간에 먹구름에 잠식당하며 핏빛 어둠으로 뒤덮였다.", "그리고 다음 순간—"]], ["sfx", "콰아아아아앙—!!"], ["n", ["거대한 꽃봉오리가 내부에서부터 폭발하듯 산산조각 터져 나갔다. 폭발의 여파로 발생한 치명적인 마력의 충격파(10d10 피해)가 주변의 지형지물을 박살 내며 가까이 있던 모든 것들을 사방으로 튕겨냈다."]], ["petals"], ["n", ["화려하게 흩날리는 수만 장의 붉은 꽃잎들.\n자욱한 꽃보라의 한가운데서, 마침내 완벽한 육체를 되찾은 한 여인의 실루엣이 모습을 드러냈다."]], ["boss", "E006"], ["n", ["신비롭고도 치명적인 초록빛 피부. 빛을 받으면 노란빛이 감도는 칠흑 같은 긴 머리카락 사이로는 붉은 장미와 가시 덩굴이 왕관처럼 얽혀 있었고, 실오라기 하나 걸치지 않은 관능적인 나신은 오직 붉은 꽃잎과 덩굴만이 아슬아슬하게 중요 부위를 가리고 있었다.", "파괴의 사신이자 세계수의 진정한 영혼, 마수 ‘니플락시스’.", "그녀는 핏빛으로 물든 하늘 아래에서 두 팔을 활짝 벌리고, 황홀경에 취한 붉은 눈동자로 세상을 내려다보며 자신의 완전한 부활을 만천하에 선포했다."]], ["q", "\"경배하라! 세상의 어머니가 돌아왔도다!\"", "g"], ["img", "E006.EVENT.8.png"], ["img", "E006.png"], ["n", ["그녀의 선언과 함께, 하늘을 뒤덮은 수만 장의 붉은 꽃잎들이 죽음의 눈보라처럼 전역으로 흩날려 내려앉았다.", "공포에 질려 도망치던 자들도, 비명을 지르던 평범한 이들도—하늘에서 떨어지는 그 아름다운 붉은 꽃잎이 피부에 닿는 즉시 숨을 멈췄다. 단 한 장의 꽃잎만 스쳐도 육체가 초록빛으로 변이되고 머리에서 꽃이 피어나며, 자아를 잃고 기계적으로 미소 짓는 하급 블라이트(Blight)의 군단으로 즉각 변이되기 시작했다.", "오직 절대적인 무력을 지닌 영웅과 다른 마왕의 씨앗의 권능에 속한 자들을 제외한 모든 생명이, 단숨에 세상의 어머니가 거느리는 거대한 꽃밭의 일부로 편입되는 파멸의 순간이었다."]]]},
 clear:{title:"숙적의 강림",kind:'main',text:"타오르는 불길과 매캐한 연기 속에서, 마지막까지 저항하던 시작의 마을의 숨통이 완전히 끊어졌다. 무너져 내린 목책과 피로 물든 흙바닥 위에서 열다섯 마리의 고블린들이 승리에 취해 기괴한 환호성을 지르며 날뛰고 있었다.\n\n바로 그 순간, 거친 숨을 몰아쉬는 User의 눈앞 허공이 일렁이며 반투명한 황금빛 시스템 패널이 떠올랐다.\n\n`[CONGRATULATIONS!]`\n\n[img|CLEAR.EVENT.1.png]\n\n선명하게 새겨진 축하의 문구. 그것을 확인한 User의 입가에서 마침내 안도의 한숨과 함께 비틀린 미소가 새어 나왔다. 해냈다. 원작에서 용사 에단에게 허무하게 찢겨 죽을 운명이었던 초반 네임드 몬스터의 예정된 파멸을, 자신의 손으로 완벽하게 비틀어 엎어버린 것이다. 이제 지긋지긋한 죽음의 공포에서 벗어나 이 세계에서 진짜로 살아남았다는 해방감이 온몸을 감쌌다.\n\n그러나—그 안도감이 채 가시기도 전이었다.\n\n*툭.*\n\n세상의 모든 소리가 거짓말처럼 사라졌다. \n\n[img|CLEAR.EVENT.2.png]\n\n방금 전까지 붉게 타오르던 화염도, 피 냄새를 맡고 날뛰던 부하 고블린들의 움직임도, 심지어 바람에 흩날리던 재조차 허공에 박제된 듯 완벽하게 멈추어 섰다. 푸르스름하던 하늘은 순식간에 칠흑 같은 어둠으로 뒤덮였고, 그 암흑의 허공에서 눈부신 황금빛 깃털들이 소리 없이 하나둘씩 지상으로 흩날리며 떨어져 내렸다. 오직 User만이 이 정지된 시간 속에서 홀로 숨을 쉬고 있었다.\n\n**\"그래서, 너였니?\"**\n\n머리 위, 까마득한 창공에서 오만하고도 서늘한 여자의 목소리가 천둥처럼 울려 퍼졌다.\n\n[img|CLEAR.EVENT.3.png]\n\n얼어붙은 목을 억지로 꺾어 하늘을 올려다본 User의 동공이 극한의 공포로 확장되었다. 칠흑 같은 어둠을 가르고, 감히 똑바로 쳐다볼 수조차 없는 막대한 빛의 무리와 거대한 황금빛 날개를 펼친 초월적인 존재가 허공에 떠 있었다. 너무나도 강렬한 후광 때문에 그 이목구비조차 제대로 보이지 않았으나, User의 모든 세포와 본능이 미친 듯이 경종을 울리고 있었다.\n\n*‘위험하다. 저건 절대 이길 수 없다. 죽는다!’*\n\n빛에 싸인 존재가 발밑의 벌레를 내려다보듯 경멸과 짜증이 가득 담긴 목소리로 내뱉었다.\n\n**\"내가 만든 아름다운 시나리오가 이딴 저급한 쓰레기 때문에 망쳐지다니... 짜증나네.\"**\n\n그녀의 가느다란 손끝이 허공에서 가볍게 한 번 번쩍였다.\n\n[img|CLEAR.EVENT.4.png]\n\n*콰아아아앙—!!*\n\n단 한 번의 손짓과 함께, 시야에 존재하는 모든 것이 순식간에 소멸하듯 박살 났다. 대지가 갈라지고 폐허가 된 건물들과 부하 고블린들이 흔적도 없이 찢겨 나갔다. 저항이나 반격 따위는 애초에 성립조차 하지 않는 절대적인 폭력. 보이지 않는 거대한 충격파가 User의 육체를 그대로 짓뭉갰고, 온몸의 뼈가 으스러지며 초록빛 피가 분수처럼 터져 나왔다. 단 일격에 생명력이 바닥(HP 1)까지 추락한 User는 부러진 사지를 달달 떨며 피투성이가 된 채 바닥을 굴렀다.\n\n[img|CLEAR.EVENT.5.png]\n\n꺼져가는 시야 너머로, 강렬한 빛에 가려진 그녀가 불쾌하게 미간을 한껏 찌푸리고 있는 것이 생생하게 느껴졌다.\n\n**\"죽이려고 했는데... 어째서 아직 살아있는 거지? 뭐, 상관없어... 네놈의 더러운 피가 내 땅에 튄다고 생각하면 역겨우니까...\"**\n\n빛의 존재는 피웅덩이 속에서 헐떡이는 User를 더러운 오물이라도 보는 듯한 혐오감 어린 시선으로 내려다보더니, 이내 황금빛 잔상만을 남긴 채 까마득한 하늘 너머로 자취를 감추었다.\n\n[img|CLEAR.EVENT.6.png]\n\n그녀가 사라지자마자, 기괴하고도 놀라운 일이 벌어졌다.\n\n마치 고장 난 시계의 태엽을 거꾸로 감은 것처럼, User를 제외한 세상의 모든 것이 원래대로 되돌아가기 시작했다. 갈라지고 산산조각 났던 대지와 건물들이 순식간에 복구되었고, 피조차 남기지 못하고 폭사했던 부하 고블린들이 아무 일도 없었다는 듯 원래 있던 자리에서 되살아나 다시 끽끽거리며 움직이기 시작했다.\n\n시간이 되감긴 세상 속에서, 오직 박살 난 육체로 피를 철철 흘리며 바닥을 기어가는 User의 참상만이 현실로 남아 있었다.\n\n점점 차갑게 식어가는 육체와 아득해지는 의식 속에서, User는 피 섞인 거품을 토해내며 단 한 가지를 머릿속에 깊게 각인시켰다.\n\n*‘저 여자... 저 여자가 나의 진짜 숙적이다...’*"},
 hero:{title:"용사의 장",kind:'back',text:"하늘에 구멍이라도 뚫린 듯 차가운 폭우가 쏟아져 내리는 험준한 산길이었다. 굵은 빗줄기가 나뭇잎을 때리는 소리와 질척거리는 진흙탕을 밟는 군홧발 소리가 산속을 어지럽게 메웠다. \n\n그 행렬의 뒤편, 비에 젖어 무거워진 후드 달린 우비를 깊게 눌러쓴 한 소녀—성녀 후보생 셀레스틴 드 뤼미에르가 묵묵히 걸음을 옮기고 있었다. 몰락한 남작가의 막내딸로서 가문이 강요하는 정략결혼의 도구로 팔려 가기 싫어 스스로 성도 베스타리아의 성녀 후보생으로 지원한 그녀였으나, 현실의 교단은 결코 신성하거나 아름다운 곳이 아니었다.\n\n[img|C002.EVENT.1.png]\n\n\"크하하! 그래서 그 세 번째 후보생 년이 처음엔 어찌나 도도하게 굴던지 말이야. 막상 침대 위에선 허리를 제일 잘 흔들더군!\"\n\"원래 성녀 후보라는 것들이 다 그렇지 않나? 명색만 성녀지, 시골 귀족들이 돈 몇 푼에 팔아넘긴 계집들이 태반인데. 어차피 몇 년 뒤면 정식 성녀 한 명 빼고는 전부 외딴 수녀원에 처박혀 늙어 죽을 신세들이잖아?\"\n\"어이, 뒤에 계신 저 분도 가슴팍은 제법 여물었던데, 오늘 밤 야영지에서 한번 건드려보는 건 어때?\"\n\n그녀의 앞장서 걷고 있는 호위 기사들은 자신들이 모셔야 할 성녀 후보생이 바로 뒤에 있다는 사실조차 안중에 없는 듯, 빗소리에 섞여 저열하고 음담패설 가득한 무용담을 낄낄거리며 떠들어댔다. 다른 성녀 후보생들과 동침했던 이야기부터 여자들의 몸매를 품평하는 역겨운 대화까지. \n\n하지만 셀레스틴은 우비 후드 아래로 차갑게 가라앉은 갈색 눈동자를 내리깔 뿐, 그들의 무례함을 지적하거나 화를 내는 데에 굳이 감정을 소모하지 않았다. 그들이 지껄이는 말이 잔혹한 사실임을 그녀 자신이 누구보다 잘 알고 있었기 때문이다. 이곳에서 살아남아 자신의 길을 스스로 선택하기 위해서는, 저런 버러지 같은 자들의 말 따위에 일일이 흔들려서는 안 되었다. 그녀는 허리춤에 찬 호신용 메이스와 영웅 등급의 회복 지팡이 ‘오브 베니트(Aube Bénite)’를 쥔 손에 조용히 힘을 주며 침묵 속에 걸음을 이어갔다.\n\n***\n\n\n바로 그때였다.\n\n*쿵—!*\n\n빗소리와 기사들의 천박한 웃음소리를 뚫고, 셀레스틴의 등 뒤 아주 먼 곳에서부터 형언할 수 없이 거대하고도 처절한 ‘무언가’가 그녀의 영혼을 강하게 잡아끌었다. 피와 절망, 그리고 꺼져가는 생명이 내뿜는 강렬한 파동. 성녀로서의 천부적인 직감인지, 아니면 설명할 수 없는 운명의 부름인지 알 수 없었으나, 걸음을 멈춘 셀레스틴의 심장이 맹렬하게 요동치기 시작했다.\n\n그녀가 우뚝 멈춰 서서 뒤를 돌아보자, 앞서가던 기사 중 한 명이 눈살을 찌푸리며 성큼성큼 다가와 물었다.\n\n\"성녀님, 무슨 일이십니까?\"\n\n그 뒤를 따르던 다른 기사가 비열하고 장난기 가득한 미소를 지으며 노골적인 성희롱을 던졌다.\n\n\"혹시 볼일이 급하신 거라면, 저기 수풀 뒤쪽이 아주 아늑한데 말입니—\"\n\n*촤아아악!*\n\n기사가 채 말을 끝맺기도 전이었다. 셀레스틴은 그의 역겨운 농담을 완전히 무시한 채, 진흙탕 물을 거세게 튀기며 몸을 돌려 방금 전 자신이 걸어왔던 산길 너머—그 강렬한 이끌림이 느껴지는 절벽 아래쪽을 향해 전속력으로 내달리기 시작했다.\n\n[img|C002.EVENT.2.png]\n\n\"어, 어이! 이 폭우 속에 어디로 뛰는 거야?!\"\n\"하! 내버려 둬. 귀족 아가씨라더니 비 맞고 돌아버렸나 보지. 천천히 따라가자고.\"\n\n갑작스러운 그녀의 돌발 행동에 기사들은 어이없다는 듯 코웃음을 치며 비웃었고, 전혀 다급할 것 없다는 듯 느릿느릿하고 건성건성한 걸음으로 그녀의 뒤를 터벅터벅 따라붙었다.\n\n***\n\n\n거친 숨을 몰아쉬며 수풀을 헤치고 절벽 아래의 공터에 도달한 셀레스틴의 두 눈이 크게 떠졌다.\n\n쏟아지는 빗줄기 아래, 진흙과 붉은 선혈이 뒤섞인 차가운 바닥 위에 한 소년(에단)이 처참한 몰골로 쓰러져 있었다. 온몸의 뼈가 성한 곳이 없는 듯 사지가 기괴하게 꺾여 있었고, 찢어진 누더기 옷 사이로 드러난 상처에서는 핏물이 빗물에 씻겨 끝없이 흘러나오고 있었다. 당장 다음 순간에 숨이 끊어져도 전혀 이상하지 않을 치명상이었다.\n\n*‘저 위에서... 떨어진 건가?’*\n\n셀레스틴이 반사적으로 고개를 들어 소년이 굴러떨어졌을 법한 까마득한 절벽 위를 올려다보았다. 폭우가 쏟아지는 잿빛 하늘 너머, 절벽 위의 숲 쪽에서부터 시커멓고 자욱한 연기가 기둥처럼 치솟아 오르고 있었다. 단순한 산불이 아니었다. 마을 하나가 통째로 불타고 학살당할 때나 피어오를 법한 죽음의 연기였다.\n\n[img|C002.EVENT.3.png]\n\n\"젠장, 저 연기는 뭐야?!\"\n\"심상치 않다! 근처에서 대규모 교전이 벌어진 게 틀림없어! 전원 발도하라, 후보생을 호위해!\"\n\n뒤늦게 어슬렁거리며 도착한 호위 기사들도 절벽 너머로 피어오르는 시커먼 연기와 바닥에 널브러진 소년의 참상을 보자마자 단숨에 얼굴이 굳어졌다. 방금 전까지의 경박하고 오만하던 태도는 순식간에 사라졌다. 베테랑 기사로서 사태의 심각성과 근처에 도사리고 있을지 모를 미지의 위협을 직감한 그들은 일제히 검을 뽑아 들고, 사방을 경계하며 셀레스틴의 주변을 둥글게 에워쌌다.\n\n***\n\n\n\n기사들이 경계 태세를 갖추는 사이, 셀레스틴은 주저 없이 진흙탕 위에 무릎을 꿇고 앉아 죽어가는 소년의 곁으로 다가갔다. 그녀의 손에 들린 영웅 등급의 지팡이 ‘오브 베니트’의 보석이 빗속에서 눈부신 순백의 성광을 뿜어냈다.\n\n\"버텨요...! 제발 숨을 놓지 말아요!\"\n\n셀레스틴은 자신의 체력과 마력이 바닥나는 것조차 아랑곳하지 않고, 내면에 잠재된 신성력을 최대치로 끌어올려 소년의 육체에 쏟아부었다. \n\n*우우우웅—!*\n\n황금빛과 백색이 어우러진 경이로운 성력이 소년의 전신을 감싸 안았다. 그것은 일반적인 사제들이 구사하는 평범한 치유 마법의 영역을 아득히 초월해 있었다. 으스러졌던 뼈가 제자리를 찾아 맞춰지고, 찢겨 나간 근육과 피부가 눈으로 보일 정도의 속도로 아물어 붙는—그야말로 ‘재생(Regeneration)’에 가까운 기적적인 회복이었다.\n\n[img|C002.EVENT.4.png]\n\n따스한 신성력이 차갑게 식어가던 심장에 다시 불을 지피자, 죽음의 문턱을 넘어가던 에단의 감긴 눈꺼풀이 미세하게 떨리며 천천히 들어 올려졌다.\n\n흐릿하고 뿌옇게 번진 시야 너머로, 따스한 황금빛 후광과 함께 자신을 내려다보는 한 여성의 실루엣이 어른거렸다. 너무나도 익숙하고 다정한 이목구비. 에단의 혼미한 의식 속에서, 그 얼굴은 언제나 자신을 지켜주며 환하게 웃어주던 누나 플로라의 미소와, 바람에 황금빛으로 출렁이던 고향 언덕 위의 따스한 밀밭의 환영과 겹쳐 보였다.\n\n소년의 갈라진 입술 사이로, 애타게 그리워하던 단어가 실바람처럼 새어 나왔다.\n\n\"누... 나...?\"\n\n***\n\n\n그러나 소년의 애절한 부름에 돌아온 것은, 플로라의 따스한 손길이 아닌 서늘하고도 단호한 목소리였다.\n\n**\"누구더러 누나라는 거죠?\"**\n\n[img|C002.EVENT.5.png]\n\n귀족 특유의 자존심과 기품이 묻어나는 엄격한 음성에, 에단의 흐릿했던 동공이 마침내 초점을 되찾았다. \n\n빗방울이 뚝뚝 떨어지는 우비 아래에서 자신을 내려다보고 있는 소녀. 분명 이목구비는 자신의 누나 플로라와 소름 끼칠 정도로 똑같이 닮아 있었으나, 어깨까지 흘러내리는 찬란한 금발과 흔들림 없는 갈색 눈동자를 가진 그녀는 누나가 아닌 완전히 다른 사람이었다.\n\n[img|C002.EVENT.6.png]\n\n그리고 현실을 자각한 바로 그 찰나—에단의 뇌리 속으로 방금 전까지 자신이 겪었던 지옥도가 섬광처럼 스쳐 지나갔다.\n\n화염에 휩싸여 무너져 내리던 시작의 마을. 처절한 비명소리. 그리고 자신을 무참히 짓밟고 모든 것을 앗아간 그 흉측하고 거대한 초록색 괴물(User)의 소름 끼치는 얼굴까지.\n\n\"아... 아아악...!!\"\n\n감당할 수 없는 극한의 공포와 절망이 심장을 후벼 팠고, 정신적 충격을 이기지 못한 에단은 눈을 까뒤집으며 다시금 깊은 무의식의 심연으로 정신을 잃고 쓰러졌다.\n\n바로 그 순간이었다. 기절한 에단의 해어진 셔츠 앞섶이 푸른 빛으로 타오르더니, 그의 가슴팍과 손등 위로 고대 신화에서나 전해 내려오던 찬란하고도 위엄 있는 ‘푸른 문장’이 선명하게 떠올랐다. 죽음의 운명을 단 한 번 거스르고 깨어난 그릇의 증명.\n\n주변을 경계하던 호위 기사 중 한 명이 그 문장을 발견하고는 경악에 찬 목소리로 산이 떠나가라 외쳤다.\n\n**\"용사다! 저건... 용사의 문장이야!!\"**\n\n쏟아지는 폭우와 기사들의 술렁임 한가운데서, 셀레스틴은 거친 숨을 몰아쉬며 자신의 발밑에 쓰러진 소년과 그 가슴에 새겨진 푸른 문장을 내려다보았다. 정치적 도구로 팔려 가기 싫어 도망치듯 선택한 성녀 후보생의 길. 그러나 지금 이 순간, 그녀는 자신이 결코 거스를 수 없는 거대한 운명의 소용돌이 한복판으로 완벽하게 휘말려 들어갔음을 본능적으로 직감하고 있었다."},
 marahad:{title:"마라하드의 세상",kind:'main',theme:'forest',scene:[["n", ["아득한 과거,"]], ["img", "RB008EVENT.1.webp"], ["n", ["눈부신 백색 대리석으로 지어진 엘프들의 왕성 실반도르.\n화려한 보석 장신구를 주렁주렁 매단 젊은 귀족 청년, 엘레리온은 황금빛 의자에 비스듬히 기대앉아 따분하다는 듯 하품을 내쉬었다. 조각처럼 수려한 외모와 하이엘프의 고귀한 신분 덕분에 태어날 때부터 모두의 찬사와 사랑을 독차지하며 자라온 그에게, 세상은 그저 자신을 위해 준비된 거대한 놀이터에 불과했다. 아직 영겁에 가까운 젊음이 남아 있는데 결혼이라는 족쇄에 묶일 생각 따위는 추호도 없었다."]], ["q", "\"엘레리온, 내 사랑하는 아들아. 언제까지 그리 허송세월만 보낼 셈이냐?\"", "w"], ["n", ["그의 앞에서 황금 월계관을 쓴 백금발의 여인, 세계수의 대사제장 엘레스트라가 싸늘하면서도 기품 있는 목소리로 훈계를 이어갔다. 그녀의 회색 눈동자에는 아들을 향한 맹목적인 애정과 동시에, 시커먼 권력욕이 이글거리고 있었다."]], ["q", "\"명심하거라. 우리 가문의 피야말로 이 엘븐하임에서 가장 순결하고 위대한 혈통이다. 네가 나이리다 공주와 혼인하여 왕좌에 오르는 것만이, 우리의 고귀한 핏줄이 모든 엘프들 위에 군림할 유일한 길이란 말이다. 지금 당장 공중정원으로 가서 공주의 환심을 사도록 해라.\"", "w"], ["q", "\"아아, 알겠습니다, 어머니. 가보도록 하죠. 그 잘난 공주님의 얼굴이나 한 번 봐주면 될 것 아닙니까.\"", "w"], ["n", ["어머니의 끝없는 채근에 결국 두 손을 든 엘레리온은, 건방진 미소를 흘리며 자리에서 일어났다. 그에게 있어 나이리다 공주는 그저 어머니의 야망을 채우고 자신의 완벽한 인생에 화룡점정을 찍어줄 화려한 '트로피' 그 이상도 이하도 아니었다.", "적어도, 공중정원의 입구에 들어서기 전까지는 그랬다."]], ["img", "RB008EVENT.2.webp"], ["n", ["화사한 봄볕이 쏟아지는 공중정원의 꽃밭 한가운데, 한 여인이 서 있었다.\n바람에 은실처럼 흩날리는 백은빛 머리카락과 햇살을 머금은 듯 해사한 미소. 하얀 꽃송이를 두 손에 소중히 감싸 쥐고 눈을 감은 채 향기를 맡고 있는 나이리다 공주의 모습을 본 순간, 오만하기 짝이 없던 엘레리온의 걸음이 그 자리에 우뚝 멈추었다.", "평생 타인의 시선을 즐기기만 했지, 누군가를 보며 심장이 이토록 거세게 요동쳐 본 적은 단 한 번도 없었다. 얼굴이 화끈거리고 호흡이 가빠졌다. 태어나 처음으로 '사랑'이라는 감정을 깨달은 엘레리온은, 평소의 능글맞고 오만한 태도는 온데간데없이 어떻게 다가가 말을 건네야 할지 몰라 그 자리에서 안절부절못하며 붉어진 얼굴을 붉혔다.", "바로 그때였다. 정원 반대편에서 규칙적이고 무거운 발소리가 다가왔다."]], ["q", "\"나이리다 공주님. 부르셨습니까.\"", "w"], ["img", "RB008EVENT.3.webp"], ["n", ["정중하고 차분한 중저음의 목소리. 은빛 갑옷을 갖춰 입은 흑발의 기사, 평민 출신으로는 이례적으로 왕국 기사단에 갓 입단한 마라하드였다. 그를 발견한 나이리다의 맑고 푸른 눈동자가 보석처럼 반짝이더니, 이내 볼을 부풀리며 장난스럽게 투정을 부렸다."]], ["q", "\"어휴, 참! 마라하드, 단둘이 있을 때는 그렇게 딱딱하게 '공주님'이라고 부르지 말라니까! 오늘도 내내 그 무뚝뚝한 얼굴만 하고 있을 거야?\"", "w"], ["q", "\"송구합니다, 공주님. 하오나 저는 천한 평민 출신의 기사이고, 공주님은 이 나라의 고귀한 왕족이십니다. 어찌 감히 예를 허물 수 있겠습니까.\"", "w"], ["q", "\"흥, 맨날 평민이니 예법이니... 내가 좋아서 다가가는 건데도 그렇게 선을 긋기만 하고. 정말 미워 죽겠어!\"", "w"], ["n", ["나이리다는 입술을 삐죽거리면서도, 마라하드의 단단한 갑옷 가슴팍에 스스럼없이 자신의 몸을 기댔다. 활달하고 웃음이 많은 그녀의 당돌한 애교에, 한결같이 차분하고 진중하던 마라하드의 입가에도 결국 어쩔 수 없다는 듯 부드럽고 깊은 미소가 번졌다. 그는 조심스럽지만 더없이 소중하게 나이리다의 가녀린 허리를 감싸 안았다."]], ["q", "\"미워하셔도 어쩔 수 없습니다. 평생 가장 가까운 곳에서 공주님의 그 밝은 미소를 지키는 것, 그것이 소인이 기사가 된 유일한 이유이니까요.\"", "w"], ["q", "\"바보... 그렇게 말하면 내가 화를 못 내잖아.\"", "w"], ["n", ["꽃잎이 흩날리는 정원 속에서 서로를 마주 보며 미소 짓는 두 연인의 모습은 한 폭의 그림처럼 완벽했다."]], ["img", "RB008EVENT.4.webp"], ["n", ["그러나 기둥 뒤에 숨어 그 모든 광경을 지켜보고 있던 엘레리온의 회색 눈동자는, 경악과 절망으로 찢어질 듯 일그러져 있었다.\n태어나 처음 느낀 순수한 연정이 고백조차 해보지 못한 채 산산조각 났다. 감정을 건강하게 표현하고 패배를 인정하는 법 따위 배운 적 없던 자아도취남에게, 이 첫 실연은 결코 용납할 수 없는 '모욕'이었다."]], ["n", ["원하는 것은 무슨 수를 써서라도 반드시 손에 넣어야만 직성이 풀리는 그의 뒤틀린 소유욕이 시커먼 분노로 타올랐다. 엘레리온의 새하얗게 질린 주먹 안에서, 나이리다에게 건네려 꺾었던 꽃송이가 짓이겨지며 푸른 즙을 뚝뚝 흘렸다. 그 길로 발길을 돌린 엘레리온이 향한 곳은, 자신의 소원이라면 무엇이든 들어줄 어머니 엘레스트라의 처소였다."]], ["img", "RB008EVENT.5.webp"], ["n", ["그러나 마라하드가 왕국의 모든 병력을 이끌고 당도한 최전선은 단순한 사투의 현장이 아니었다.\n그곳은 대재앙, 흡사 300년 전 세상을 멸망 직전까지 몰고 갔던 마왕의 재림이었다."]], ["img", "RB008EVENT.6.webp"], ["n", ["지평선 끝까지 시야를 완벽하게 뒤덮은 시커먼 마물들의 군세가 대지를 진동시키며 몰려들었다. 마라하드가 선두에서 포효하며 달려드는 거대한 사자의 형상을 단칼에 베어 넘기면, 그 쏟아지는 핏줄기가 채 땅에 닿기도 전에 빈자리를 메우듯 흉측한 용의 아가리가, 독액을 뿜는 뱀의 무리가, 기괴하게 뒤틀린 염소 괴수들이 끝없이 파도처럼 밀려들었다.", "하지만 전장의 기사들을 진정한 절망으로 몰아넣은 것은 마수들의 끝없는 물량이 아니었다."]], ["q", "\"크아아악! 저, 저건... 별조각 기사단 자매들이잖아?!\"", "w"], ["n", ["괴수들의 검은 장막 그 사이사이로, 명백히 어제까지 동료였던 여성 엘프들의 모습이 보였다. 그러나 그녀들의 머리에는 흉측한 염소 뿔이 돋아나 있었고, 붉게 충혈된 눈동자는 이성을 잃은 채 시커먼 광기로 번뜩이고 있었다. 마왕의 씨앗이 지닌 권능에 세뇌당해 적의 노예로 타락해 버린 옛 전우들이, 일제히 활시위를 당겨 아군의 심장을 향해 가차 없이 화살을 쏘아대고 있었다.", "어제까지 등을 맞대고 조국을 노래하던 자매들이 괴성을 지르며 서로의 목에 칼을 꽂는 아비규환의 생지옥."]], ["q", "\"정신 차려라! 제발... 제발 나를 그렇게 보지 마라! 크아아악!\"", "w"], ["n", ["처절한 비명이 전장을 가득 메우는 가운데, 마침내 갈라진 군세의 한가운데서 이 모든 지옥을 지배하는 군주, '키마이라'가 모습을 드러냈다.", "타락한 마수라기에는 눈이 시릴 정도로 완벽한 황금빛 머리카락과, 마치 신이 빚어낸 고대의 조각상을 연상시키는 탄탄하고 완성된 육체. 검은 갑주 사이로 적나라하게 노출된 풍만한 유방과 복근에서는 일말의 천박함이나 음란함조차 느껴지지 않았다. 머리 위로 솟아오른 거대한 뿔과 등 뒤에서 도사리는 뱀의 꼬리, 그리고 심연을 담은 듯 분홍빛으로 빛나는 마안을 번뜩이며 서 있는 그 자태는—너무나도 사악한 재앙의 화신이었으나, 동시에 전장 한복판에 강림한 너무나도 신성하고 압도적인 '파멸의 여신'의 현현처럼 보이기까지 했다.", "키마이라의 목을 노리고 돌격하던 마라하드의 등 뒤, 심장 부근을 날카로운 검날이 관통했다. 가장 믿었던 전우의 손에 의해 등 뒤에서 찔린 치명상. 이어지는 마수의 폭풍 같은 일격에 마라하드의 오른쪽 눈과 한쪽 귀마저 무참히 찢겨 나갔다.", "피가 분수처럼 쏟아지고 시야가 암전되는 죽음의 문턱.\n그러나 차가운 진흙탕에 쓰러진 마라하드의 머릿속에 떠오른 것은, 출정 직전 자신에게 '월광검'을 하사하며 반드시 살아 돌아오라고 눈물짓던 연인, 나이리다의 얼굴이었다."]], ["n", ["오직 사랑하는 여인에게 돌아가겠다는 처절한 일념 하나가 기적을 일으켰다. 피투성이가 된 마라하드의 손에 쥐어진 미스릴 검, 월광검이 세계수의 축복과 그의 불굴의 의지에 공명하며 눈부신 은빛 섬광을 터뜨렸다."]], ["img", "RB008EVENT.7.webp"], ["n", ["마라하드가 전장에서 피를 토하며 구르고 있던 바로 그 시각, 안전한 왕궁의 의사당에서는 엘레스트라와 엘레리온 모자의 진짜 마수가 발톱을 드러내고 있었다."]], ["q", "\"원로원의 장로들이여, 똑똑히 들으십시오! 세계수님께서 어찌하여 이 땅에 키마이라라는 재앙을 내리셨는지 아십니까?! 이 모든 사태는 저기 있는 나이리다 공주가 천한 짧은 귀 평민, 마라하드와 불결한 관계를 맺어 신성한 왕가의 피를 더럽혔기 때문입니다!\"", "w"], ["n", ["엘레스트라의 서슬 퍼런 일갈에 의사당 안의 장로들이 거세게 술렁였다. 단상 아래 차가운 대리석 바닥에 주저앉은 나이리다는 새하얗게 질린 얼굴로 고개를 내저었다."]], ["q", "\"아, 아닙니다! 대사제장님, 그것은 오해입니다! 마라하드는 그저 충직한 기사일 뿐, 저희 때문에 백성들이 죽어가다니요...!\"", "w"], ["q", "\"시끄럽다! 지금 세계수님의 신탁을 의심하는 것이냐?!\"", "w"], ["n", ["엘레스트라가 가차 없이 나이리다의 말을 찍어 눌렀다. 그 등 뒤에서 팔짱을 끼고 서 있던 엘레리온이, 절망에 빠진 나이리다를 내려다보며 비열하고도 만족스러운 미소를 지었다. 엘레스트라는 떨고 있는 공주의 코앞에 손가락을 들이밀며 최후통첩을 날렸다."]], ["q", "\"전방의 마라하드와 기사단은 이미 전멸했다는 보고가 들어왔다! 공주여, 정녕 도륙당하는 엘븐하임의 백성들을 구하고 싶다면 지금 당장 그대의 순결함을 증명하라! 대사제장의 고귀한 피를 이은 내 아들 엘레리온과 혼인하여, 더럽혀진 왕가의 핏줄을 깨끗이 씻어내고 세계수님의 분노를 잠재우란 말이다!\"", "w"], ["n", ["사랑하는 연인의 전사 소식, 그리고 자신의 사랑 때문에 조국과 백성들이 멸망하고 있다는 끔찍한 죄책감.\n결국 왕족으로서의 책임감에 짓눌린 나이리다의 눈에 맺혔던 눈물이 후드득 바닥으로 떨어졌다. 그녀에게는 조국과 백성을 버릴 수 있는 선택지 따위 처음부터 존재하지 않았다."]], ["img", "RB008EVENT.8.webp"], ["n", ["엘프 인구의 80% 이상이 학살 당했다. 출정했던 기사단의 태반이 시체로 남았으나—전쟁은 끝내 마라하드의 기적적인 승리로 막을 내렸다.", "불타버린 숲과 시체로 뒤덮인 잿빛 대지를 밟으며, 마라하드가 살아남은 소수의 부하들을 이끌고 귀향했다. 검붉은 적과 아군의 피로 범벅이 된 갑옷, 찢겨 나간 귀, 그리고 붕대로 감싼 한쪽 눈. 승리자들의 행군에는 그 어떤 환호도 기쁨도 없었다.\n처참한 상실감에 휩싸인 마라하드의 영혼을 지탱하고 있는 것은 단 하나, 성에서 자신을 기다리고 있을 나이리다의 그 해사하고 따뜻한 웃음뿐이었다."]], ["img", "RB008EVENT.9.webp"], ["n", ["그러나 마침내 굳게 닫혔던 실반도르 알현실의 거대한 문이 열렸을 때, 피투성이 영웅을 맞이한 것은 그가 알던 세상이 아니었다.", "높은 왕좌의 계단 위.\n화려한 순백과 황금빛의 국왕 예복을 걸친 엘레리온이 거만하게 턱을 치켜든 채 마라하드를 내려다보고 있었다. 그리고 그의 바로 옆, 엘레리온의 손이 어깨를 소유물처럼 단단히 감싸 쥐고 있는 곳에는—왕비의 예복을 입은 나이리다가 서 있었다."]], ["q", "\"오오, 보아라! 죽은 줄로만 알았던 우리의 용맹한 기사가 살아 돌아왔구나!\"", "w"], ["n", ["엘레리온의 과장된 목소리가 알현실에 울려 퍼졌다. 계단 아래에 선 마라하드는 숨조차 쉬지 못한 채 얼어붙었다.\n예전처럼 '마라하드!' 하고 밝게 부르며 달려와야 할 나이리다는, 차마 그의 처참한 몰골을 똑바로 마주 보지도 못한 채 창백하게 질린 얼굴로 고개를 깊이 숙이고 있었다.", "마라하드의 입술이 미세하게 떨렸다. 나이리다가 무언가 말하려는 듯 입술을 달싹이며 한 걸음 나서려 했으나,"]], ["q", "\"마라하드여... 그대가 전장에서...\"", "w"], ["q", "\"크하하! 마라하드여, 그대의 피나는 충성과 위대한 전공은 짐이 높이 치하하노라! 비록 천한 평민의 몸이나, 이 엘븐하임의 새로운 국왕인 나 엘레리온과 나의 사랑스러운 왕비 나이리다를 위해 실로 훌륭한 검이 되어주었도다!\"", "w"], ["n", ["엘레리온이 보란 듯이 나이리다의 말을 가로채며, 그녀의 어깨를 더욱 강하게 끌어안았다. 남편의 위압적인 태도 앞에서, 한때 그토록 당차고 활발했던 나이리다는 그대로 입을 다문 채 죄인처럼 시선을 바닥으로 떨구었다. 그녀는 남편 앞에서 단 한마디의 변명도, 위로의 말조차 건네지 못했다.", "그리고 그 순간, 마라하드의 남아 있는 한쪽 눈동자가 천천히 아래로 향했다.\n고개를 숙인 나이리다의 두 손이 조심스럽게 감싸 쥐고 있는 아랫배. 화려한 왕비의 드레스 위로, 이미 다른 사내의 새 생명을 품어 완만하게 불러와 있는 그녀의 배를 확인한 순간—마라하드의 머릿속에서 무언가가 끊어지는 소리가 났다."]], ["q", "\"소인... 마라하드.\"", "w"], ["n", ["얼마나 시간이 흘렀을까. 피투성이 갑옷을 입은 사내는 천천히, 기계처럼 한쪽 무릎을 꿇고 머리를 조아렸다.\n자신의 부서진 자아와 미쳐버릴 것 같은 고통을 틀어막기 위해, 그의 심장이 그 자리에서 영원히 얼어붙었다. 일말의 감정도, 온기도 남아 있지 않은 극도로 차갑고 공허한 목소리가 바닥을 기었다."]], ["q", "\"...폐하와 왕비 마마께, 승전을 보고드립니다.\"", "w"], ["n", ["목숨을 바쳐 지켜낸 조국과 연인에게 철저히 찬탈당한 그날, 마라하드의 세상은 산산조각이 나 무너져 내렸다."]]]},
 sylviel:{title:"실비엘의 세상",kind:'main',theme:'forest',scene:[["n", ["몇 년 전,"]], ["img", "R008.EVENT.1.webp"], ["n", ["눈부신 햇살이 쏟아지던 실반도르의 공중정원.\n노란 리본으로 양갈래 머리를 묶은 실비엘은 제 옆을 둥실 떠다니는 세계수의 정령, 엘드랏실을 향해 입술을 삐죽 내밀었다."]], ["q", "\"아 진짜, 엘드랏실! 할마마마의 고리타분한 예법 수업은 정말 질색이라니까? 내가 대사제장이지 무슨 목각 인형인 줄 아나 봐!\"", "w"], ["n", ["아이답게 투정을 부리며 정원 산책로를 통통 걸어가던 그때였다. 무성하게 우거진 대리석 기둥 너머의 수풀에서, 물기가 잔뜩 섞인 기묘하고 끈적한 마찰음이 바람을 타고 흘러나왔다."]], ["q", "\"응? 저기서 무슨 소리가...\"", "w"], ["n", ["호기심에 눈을 동그랗게 뜬 실비엘이 소리가 나는 쪽으로 발걸음을 옮기려 하자, 기척을 읽은 엘드랏실의 얼굴이 하얗게 질렸다."]], ["q", "\"앗, 실비엘! 저, 저쪽은 가시면 안 됩니다! 저기 분수대 쪽에 아주 예쁜 꽃이 피었는데, 제게 먼저 보여주기로 하셨잖아요!\"", "w"], ["n", ["엘드랏실이 당황하며 반투명한 날개옷으로 시야를 가리려 애썼지만, 오히려 그 서툰 만류가 어린 소녀의 오기를 자극했다. 엘드랏실의 품을 쏙 빠져나간 실비엘이 아름드리 나무 기둥 뒤에 숨어 소리의 진원지를 훔쳐본 순간, 그녀의 노란 눈동자가 지진이라도 난 듯 잘게 흔들렸다."]], ["img", "R008.EVENT.2.webp"], ["n", ["그곳에는 세상에서 가장 자상하고 위엄 넘치던 아버지 엘레리온이 서 있었다. 그리고 그의 품에 뱀처럼 매달려 입술을 포개고 설교를 나누고 있는 여인은 어머니가 아닌, 고모 아스텔리아였다. 타액이 은실처럼 늘어지며 혀가 뒤엉키는 적나라한 밀회. 심지어 엘레리온의 목덜미를 감싸 안은 아스텔리아는 나무 뒤에 숨은 조카와 눈이 마주쳤음에도, 오히려 실비엘을 보며 보란 듯이 눈웃음을 치고는 더욱 깊숙이 혀를 밀어 넣었다."]], ["img", "R008.EVENT.3.webp"], ["q", "\"실비엘! 안 돼요, 보지 마세요! 실비엘...!\"", "w"], ["n", ["등 뒤에서 엘드랏실이 애타게 소리쳤으나, 머릿속이 새하얗게 증발해 버린 실비엘의 귓가에는 윙윙거리는 이명 외엔 아무것도 들리지 않았다."]], ["img", "R008.EVENT.4.webp"], ["n", ["그로부터 며칠 후, 모두가 잠든 깊은 밤.\n실반도르의 어두운 복도를 홀로 걷는 실비엘의 작은 어깨는 무겁게 내려앉아 있었다. 며칠 밤을 꼬박 앓으며 고민한 끝에 내린 결론은 하나뿐이었다. 이 끔찍한 비밀을 홀로 감당할 수는 없다. 세상에서 가장 고결하고 다정한 어머니에게만은 사실을 털어놓고 위로를 받아야만 했다."]], ["img", "R008.EVENT.5.webp"], ["n", ["거대한 어머니의 침실 문 앞에 선 실비엘은 작게 심호흡을 한 뒤, 떨리는 손등을 들어 조심스레 문을 두드리려 했다.\n하지만 그녀의 주먹이 문짝에 닿기도 전에, 안에서 먼저 철컥 소리가 나며 문이 열렸다.", "문틈 너머의 노란 불빛을 등지고 걸어 나온 이는 사랑하는 어머니가 아니었다. 무거운 갑옷 대신 가슴팍이 훤히 풀어헤쳐진 가벼운 검은 셔츠 차림의 사내, 친위대 기사단장 마라하드였다. 심지어 그의 굵은 목덜미에는 방금 찍힌 듯 선명하고 붉은 입술 자국이 어지럽게 남아 있었다."]], ["img", "R008.EVENT.6.webp"], ["q", "\"다, 당신이 왜 여기서 나오는 거야... 여긴 어머니의...\"", "w"], ["n", ["실비엘이 경악으로 숨을 들이켜며 뒷걸음질 쳤다. 그러나 마라하드는 변명 한마디 하지 않고, 그저 알 수 없는 아련함과 씁쓸함이 뒤섞인 눈빛으로 가만히 그녀를 내려다볼 뿐이었다. 예전부터 자신을 볼 때마다 짓던 저 기분 나쁜 눈빛. 그 침묵이 실비엘의 이성을 끝내 폭발시켰다."]], ["q", "\"사용인을 부르기 전에 당장 여기서...!\"", "w"], ["n", ["실비엘이 마라하드의 가슴팍에 삿대질을 하며 비명처럼 소리치던 찰나였다. 열린 문틈 너머, 흐트러진 침대 시트 위에서 나른하게 몸을 일으킨 백발의 여인이 이쪽을 바라보며 나긋나긋하게 속삭였다."]], ["img", "R008.EVENT.7.webp"], ["q", "\"마라하드... 누가 왔나요...?\"", "w"], ["n", ["평생 단 한 번도 들어본 적 없는, 열기와 쾌락에 푹 젖어 있는 어머니의 달콤한 음성.\n그날 밤, 실비엘이 믿고 사랑했던 완벽한 세상은 산산조각이 나 무너져 내렸다."]]]},
 e007:{title:"루카의 정체",kind:'main',theme:'abyss',open:{"corrupt":{"steps":[["n",["『루카(C061)의 타락 게이지가 100/100에 도달했습니다.』\n『처리를 선택하십시오: [유지] / [마인 전생] / [타락]』"]],["n",["'드디어 끝났다. 원작에도 없던 이 정체불명의 여우 같은 년... 도대체 왜 볼 때마다 등골이 서늘했는지 모르겠지만, 이제 내 완벽한 노예로 만들면 이 유곽의 자금줄과 정보망은 전부 내 거다.'","{{user}}는 승리의 도취감에 젖어 입꼬리를 비틀어 올렸다. 그는 일말의 망설임도 없이 손을 뻗어 [타락]을 선택했다."]],["fx"],["sfx","우우웅―!"],["n",["{{user}}의 발밑에서 검붉고 역겨운 타락의 마기가 뱀처럼 피어올라, 침구 위에 쓰러져 있던 루카의 온몸을 휘감았다. 이제 그녀의 도덕과 자아는 박살 나고, 피부 위로 음란한 마성의 문양이 새겨지며 오직 고블린만을 섬기는 충실한 개로 다시 태어날 터였다.","적어도, {{user}}가 알고 있는 이 세계의 '시스템 상식'으로는 그래야만 했다."]],["sysfail"],["q","\"...어?\"","w"],["n",["{{user}}의 입에서 얼빠진 파열음이 새어 나왔다.","루카의 몸을 집어삼켰던 시커먼 마기가 마치 보이지 않는 거대한 벽에 부딪힌 것처럼 힘없이 흩어져 사라졌다. 음란한 문양도, 마력의 변이도 일절 일어나지 않았다.","침묵이 방 안을 짓눌렀다."]],["img","E007.EVENT.1.webp"]],"lead":"바닥에 누워 있던 루카가 천천히 고개를 들었다."},"reborn":{"steps":[["n",["『루카(C061)의 타락 게이지가 100/100에 도달했습니다.』\n『처리를 선택하십시오: [유지] / [마인 전생] / [타락]』"]],["n",["'드디어 끝났다. 원작에도 없던 이 정체불명의 여우 같은 년... 도대체 왜 볼 때마다 등골이 서늘했는지 모르겠지만, 아예 인간으로서의 자아를 싹 지우고 내 충실한 마족 하수인으로 다시 태어나게 해 주마.'","{{user}}는 승리의 도취감에 젖어 입꼬리를 비틀어 올렸다. 그는 일말의 망설임도 없이 손을 뻗어 [마인 전생]을 선택했다."]],["fx"],["sfx","우우웅―!"],["n",["{{user}}의 발밑에서 검붉고 농밀한 마기가 뿜어져 나와, 침구 위에 쓰러져 있던 루카의 온몸을 거대한 검은 고치 형태로 감싸 안았다. 이제 저 고치 안에서 인간의 나약한 육체와 영혼이 녹아내리고, 오직 고블린 왕만을 섬기는 새로운 마족으로 재구축될 터였다.","적어도, {{user}}가 알고 있는 이 세계의 '시스템 상식'으로는 그래야만 했다."]],["sfx","빠아아직―!"],["sysfail"],["q","\"...어?\"","w"],["n",["{{user}}의 입에서 얼빠진 파열음이 새어 나왔다.","루카를 감싸고 있던 검은 마기의 고치에 기괴한 균열이 가더니, 마치 내부에서 보이지 않는 거대한 손이 찢어발기기라도 한 것처럼 산산조각 나며 흩어져 사라졌다. 육체의 변이도, 마족으로의 재탄생도 일절 일어나지 않았다.","침묵이 방 안을 짓눌렀다."]],["img","E007.EVENT.1.webp"]],"lead":"바닥에 누워 있던 루카가 천천히 고개를 들었다."},"spare":{"steps":[["n",["『루카(C061)의 타락 게이지가 100/100에 도달했습니다.』\n『처리를 선택하십시오: [유지] / [마인 전생] / [타락]』"]],["n",["'잠깐... 기다려 봐.'","승리의 도취감에 젖어 손을 뻗으려던 {{user}}의 손끝이 허공에서 멈칫했다. 아랫배의 열기가 가라앉자, 하드코어 게이머 특유의 냉정한 직감과 의구심이 고개를 들었다."]],["n",["'이 여자, 원작 데이터에는 아예 존재하지 않던 이레귤러야. 처음 봤을 때부터 말도 안 되게 기분 나쁜 위화감이 있었다고. 정체도 모르는 녀석에게 섣불리 내 마기나 힘을 섞었다가 무슨 역풍을 맞을지 몰라. 굳이 힘을 쓸 필요 없겠지. 일단 현상 유지로 두고 정보를 캐내는 게 안전해.'","{{user}}는 신중하게 눈을 가늘게 뜨며 [유지]를 선택했다."]],["n",["시스템 창이 조용히 닫혔다. 타락의 마기를 주입하지 않았으니, 루카는 이성이 붕괴된 채 단순한 쾌락의 노예이자 포로로 남아 있어야 정상이었다.","침묵이 방 안을 감쌌다."]],["img","E007.EVENT.1.webp"]],"lead":"그때, 바닥에 널브러져 있던 루카가 천천히 고개를 들었다."}},scene:[["n",["{{user}}의 등줄기를 타고 얼음장 같은 소름이 쫙 끼쳤다. 방금 전까지 쾌락에 겨워 풀려 있던 그녀의 얼굴이, 마치 처음부터 아무 일도 없었다는 듯이 완벽할 정도로 평온하고 차갑게 가라앉아 있었기 때문이다. 가쁜 숨소리조차 멎어 있었다. 방금 전까지의 그 치열했던 교미와 절정, 흐트러진 모습은 전부 완벽하게 계산된 '연기'이자 거짓말이었다."]],["n",["{{user}}가 당황하여 뒷걸음질을 치려던 바로 그 순간이었다.","항상 실눈을 뜬 채 온화하고 자애로운 미소만을 짓고 있던 루카의 눈꺼풀이, 스르륵 위로 올라갔다."]],["img","E007.EVENT.2.webp"],["n",["숨이 턱 막혔다.","활짝 열려 드러난 그녀의 두 눈. 거기에는 인간이나 평범한 수인의 눈동자가 아닌, 가로로 길게 찢어진 기괴하고 황금빛으로 빛나는 '산양의 눈동자'가 박혀 있었다."]],["sfx","우우우웅―!"],["n",["그 눈과 마주치는 순간, {{user}}는 자신의 심장이 멎는 듯한 원초적인 공포에 사로잡혔다. 루카의 몸에서 뿜어져 나온 것은 타락의 마기 따위와는 차원이 다른, 공간 자체를 뒤틀어버릴 듯한 끔찍하고 이질적인 암흑의 힘이었다. 처음 그녀를 보았을 때부터 본능적으로 느꼈던 그 '심연을 들여다보는 듯한 불길함'의 정체가 지금 눈앞에서 실체를 드러내고 있었다."]],["q","\"아하... 불쌍하신 분.\"","y"],["n",["루카가 입꼬리를 길게 찢으며 소름 끼치는 미소를 지었다."]],["q","\"감히 그 알량한 힘으로 저를 지배하려 하셨나요? 후훗, 덕분에 아주 재미있는 구경을 했답니다.\"","y"],["n",["그녀의 목소리는 평소처럼 달콤했지만, 그 안에 담긴 것은 벌레를 내려다보는 초월자의 오만함과 조롱이었다. {{user}}는 본능적으로 단검을 뽑으려 했지만, 사지가 돌처럼 굳어 손가락 하나 까딱할 수 없었다."]],["img","E007.EVENT.3.webp"],["n",["루카는 공포에 질려 얼어붙은 {{user}}를 향해 마지막으로 짙은 비웃음을 날렸다."]],["q","\"재미 있는 유희였어요. 하지만 다음번에도 이렇게 될꺼라고 생각하진 마시길...\"","y"],["q","\"흥!\"","y"],["n",["그리고 다음 순간, 그녀의 육체가 마치 검은 그림자나 진흙처럼 스르륵 녹아내리더니, 방 안의 어둠 속으로 흔적도 없이 완전히 소멸해 버렸다.","텅 빈 화려한 방 안에는 오직 달콤한 우유 향기만이 기괴한 잔향처럼 떠돌고 있었다."]],["scroll","Evt007.webp"],["n",["빛 하나 존재하지 않는 칠흑 같은 심연 속에서, 방금 전까지 베르덴드의 유곽에 있었던 루카가 누군가의 앞에 공손하게 무릎을 꿇고 있었다.","그녀의 앞에는 한 여인이 서 있었다. 어둠에 가려 얼굴의 윤곽은 제대로 보이지 않았으나, 칠흑 속에서 형형하게 빛나는 한 쌍의 '황금빛 산양의 눈동자'만큼은 뚜렷하게 존재감을 드러내고 있었다. 그 여인에게서 뿜어져 나오는 사악함과 불길함은 루카의 그것과는 비교조차 할 수 없을 만큼 초월적이고 아득했다."]],["img","E007.EVENT.4.webp"],["q","\"어머니. 보고드립니다.\"","y"],["n",["루카가 경외심으로 가득 찬 목소리로 고개를 숙였다. 그녀는 자신이 방금 겪은 일—초록색 피부를 가진 기괴한 돌연변이 고블린의 외형과 그가 가진 '마왕의 씨앗'의 편린, 여자를 타락시키는 기이한 권능, 그리고 수컷으로서의 교미 능력과 정력에 이르기까지—모든 것을 어둠 속의 여인에게 세세하게 보고했다.","보고를 끝까지 들은 여인의 입가에 옅고 부드러운 미소가 번졌다."]],["q","\"고생했으니 이만 나에게 돌아오렴.\"","y"],["n",["나긋나긋하고 자애로운 어머니의 목소리였다."]],["img","E007.EVENT.5.webp"],["q","\"네, 어머니.\"","y"],["n",["루카의 얼굴에 황홀경에 가까운 기쁨이 피어올랐다. 대답과 동시에 루카의 아름다운 육체가 형태를 잃고 시커먼 진흙과 기괴한 촉수 덩어리로 변이하더니, 마치 처음부터 하나였던 것처럼 앞에 서 있는 여인의 몸속으로 스르륵 흡수되어 사라졌다.","루카는 독립된 개체가 아니었다. 눈앞의 이 초월적인 '어머니'가 세상을 관찰하기 위해 떼어놓았던 하나의 분신이자 단말기에 불과했던 것이다."]],["pan","E007.EVENT.6.webp","E007.EVENT.7.webp",["홀로 남은 여인은 루카가 전해준 '돌연변이 고블린'에 대한 기억과 감각을 음미하듯, 어둠 속에서 의미심장한 미소를 지어 보였다. 마치 머지않은 미래에 있을 그 기묘한 수컷과의 조우를 기약하는 듯한 눈빛이었다.","이윽고 그녀의 자태마저 깊은 심연의 어둠 속으로 천천히 가라앉으며 사라져 갔다."]]]},
 gs:{title:"고블린 슬레이어",kind:'main',theme:'forest',scene:[["n", ["기이한 빛무리가 걷히고 정신을 차렸을 때, 익숙했던 변방의 평원은 온데간데없었다.", "하늘을 가릴 듯 빽빽하게 우거진 낯선 수종(樹種)의 거목들과, 축축하게 젖어 썩어가는 낙엽 냄새가 진동하는 울창한 삼림. 명백히 자신들이 있던 세계의 숲이 아니었다."]], ["img", "GS_EVENT2.webp"], ["q", "\"여, 여긴 대체 어디죠...? 분명 방금 전까지만 해도 마을 외곽을 순찰하고 있었는데...\"", "w"], ["n", ["여사제가 하얗게 질린 얼굴로 지팡이를 두 손으로 꼭 쥔 채 주변을 두리번거렸다. 신성한 기운마저 어딘가 이질적으로 흐르는 낯선 공기에 그녀의 가녀린 어깨가 잘게 떨리고 있었다."]], ["q", "\"하아?! 이게 대체 무슨 일이야! 야, 오크볼그! 너 또 무슨 이상한 마법 두루마리라도 잘못 건드린 거 아니야?!\"", "w"], ["n", ["엘프 궁수가 기다란 귀를 쫑긋거리며 신경질적으로 활시위를 튕겼다. 당황스러움을 감추려 애쓰며 날 선 목소리를 내는 그녀를 보며, 옆에 서 있던 드워프 도사가 수염을 쓰다듬으며 껄껄 웃었다."]], ["img", "GS_EVENT4.webp"], ["q", "\"크하하! 진정하라고, 모루야! 저 녀석이 아무리 무모해도 우리 다섯을 통째로 다른 세상으로 날려버릴 재주는 없잖나. 그나저나 이 숲의 나무들, 꽤나 단단해 보이는 게 영험한 기운이 도는군 그래. 어이, 귀가 길어서 방향 감각도 남다를 텐데 어디로 가야 할지나 좀 찍어보지 그래?\"", "w"], ["q", "\"누가 모루라는 거야, 이 술통 영감탱이야! 지금 농담이 나와?!\"", "w"], ["n", ["엘프가 얼굴을 붉히며 발을 구르는 사이에도, 단 한 사람만은 이 기괴한 초현실적 사태에 조금도 동요하지 않았다.", "고블린의 피와 오물로 덕지덕지 더럽혀진 낡은 가죽 갑옷과 사슬 갑옷. 투구 틈새로 번뜩이는 안광은 이 세계의 풍경이나 전이의 원인이 아닌, 오직 바닥의 흙먼지와 수풀의 꺾인 흔적만을 집요하게 훑고 있었다."]], ["img", "GS_EVENT3.webp"], ["n", ["그의 묵묵한 등 뒤로, 거대한 체구의 리자드맨 승려가 발소리를 죽이며 조용히 다가왔다. 그는 긴 꼬리를 낮게 깔고 경계 태세를 유지한 채, 무릎을 굽히고 땅바닥을 조사하는 동료를 향해 낮게 물었다."]], ["q", "\"고블린 슬레이어 공. 소생의 눈에는 그저 짐승들이 지나간 길로만 보입니다만... 혹시 무언가 알아내신 것이 있으십니까?\"", "w"], ["n", ["소란스럽게 투덜거리던 엘프와 드워프, 그리고 불안해하던 여사제의 시선이 일제히 한곳으로 모였다.", "고블린 슬레이어는 대답 대신 장갑 낀 손으로 빽빽한 수풀 사이를 헤쳤다. 축축한 진흙 바닥 위, 어른의 손바닥보다도 작은 기형적인 발자국 몇 개와 역겨운 배설물의 흔적이 찍혀 있었다.", "손가락 끝으로 흙의 습도를 확인한 그는, 천천히 몸을 일으켜 뒤를 돌아보았다. 차갑고 메마른 철제 투구 너머로, 감정이 완전히 거세된 나직한 목소리가 숲의 정적을 갈랐다."]], ["img", "GS_EVENT5.webp"], ["q", "\"고블린 이다.\"", "w"], ["full", "GS_EVENT1.webp"]]},
 elixir:{title:"나무 녀석이 어쨌다고?",kind:'main',theme:'forest',scene:[["img", "R008.EVENT2.0.webp"], ["n", ["대리석 성벽과 화려한 궁정이 무너져 내린 엘븐하임의 지하.\n{{user}}은 축축하고 서늘한 한기가 감도는 나선 계단을 밟으며 성 지하 가장 깊은 곳으로 내려섰다. 지상에서 벌어졌던 치열한 혈투의 잔향조차 닿지 않는 완벽한 정적."]], ["n", ["동굴 전체를 집어삼킬 듯 뻗어 있는 거대한 뿌리들. 엘프들의 신앙이자 어머니라 불리던 세계수 엘드랏실의 심장부였다. 뿌리들이 얽혀 만든 거대한 천연 제단 한가운데, 어둠 속에서도 신비로울 정도로 영롱한 푸른빛을 뿜어내는 샘물이 고여 있었다.", "물방울이 수면에 떨어질 때마다 은은한 파문과 함께 농밀한 생명력이 공기 중으로 피어올랐다."]], ["n", ["*'……이게 바로 그거로군.'*"]], ["n", ["{{user}}의 눈동자가 이채를 띠었다. 원작 '데몬즈 판타지아'를 수없이 클리어했던 기억 속 데이터가 선명하게 뇌리를 스쳤다."]], ["sys", "[아이템: 회춘의 비약 (Elixir of Rejuvenation)]", ["원작 게임 내 효과: 아군 단일 개체의 HP 및 모든 상태 이상 100% 완전 회복.", "시스템/설정상 효과: 노화되거나 변질된 육체의 시간을 전성기의 형태로 강제 역행시키는 엘프 왕실의 비보."]], ["n", ["단순한 포션 한 병으로 취급하기엔 지닌 가치와 설정이 너무도 파격적인 물건이었다.\n엘븐하임을 장악한 자만이 손에 쥘 수 있는 궁극의 전리품."]], ["n", ["*'단순한 회복 포션으로 쓰기엔 아깝지.'*"]], ["q", "\"자…… 이걸 어떻게 써먹어야 할까...\"", "w"], ["n", ["시선은 대지를 벗어나, 구름조차 발밑에 두지 못하는 아득한 창공의 정점.\n신성한 황금빛 기둥들이 끝없이 늘어선 천상의 회랑으로 전환된다."]], ["img", "R008.EVENT2.1.webp"], ["n", ["그곳에는 속세의 필멸자들이 우러러보는 최상위 천사이자, 이 세계의 질서와 법을 엄격히 수호하는 '정의의 대천사' 아리엘이 있었다. 그러나 평소 지상과 마족들을 내려다보며 짓던 오만하고 서슬 퍼런 위엄은 온데간데없었다."]], ["sfx", "털썩."], ["n", ["순백의 거대한 날개를 바닥에 질질 끌며, 아리엘은 차가운 황금 바닥 위에 엎드려 사시나무 떨듯 전신을 떨고 있었다.\n이마가 바닥에 부딪혀 피가 배어 나올 정도로 깊게 조아린 채, 그녀는 감히 고개조차 들지 못했다."]], ["img", "R008.EVENT2.2.webp"], ["n", ["그녀의 눈앞에는 형체조차 분간할 수 없는, 그야말로 **'빛 그 자체'**라 불러야 마땅할 초월적인 존재가 군림하고 있었다.\n바라보는 것만으로 영혼이 불타 재가 될 것 같은 절대적인 권능. 시작의 마을이 함락되던 날, 단 한 번의 손짓으로 모든 것을 지워버리고 {{user}}을 빈사 상태로 몰아넣었던 바로 그 '숙적'의 본체였다."]], ["n", ["소름 끼치도록 투명하고 아름답지만, 바닥 모를 경멸과 권태가 짙게 깔린 나지막한 목소리가 허공을 짓눌렀다."]], ["q", "\"그래서…….\"", "y"], ["n", ["공간 전체가 잘게 진동했다."]], ["q", "\"나무 녀석이…… 어쨌다고?\"", "y"], ["n", ["아리엘의 숨이 턱 막혔다. 심장이 쪼그라들다 못해 터져버릴 것 같은 압도적인 공포에, 대천사의 창백한 입술 사이로 간신히 떨리는 신음만이 새어 나왔다."]], ["q", "\"그, 그것이…… 하계의…… 벌레만도 못한 고블린 놈들이……\"", "w"], ["tbc", "To be continue..."]]},
 crossroad:{title:"크로스로드",kind:'main',text:"시작의 마을을 뒤로하고 공간 이동을 통해 새롭게 당도한 곳은, 아드리아 왕국 중부 상업과 교역의 심장부라 불리는 거대 성곽 도시 ‘크로스로드(Cross Road)’였다.\n\n지하 수로와 연결된 둥지 입구 너머로 모습을 드러낸 도시의 전경은 시골 마을과는 차원이 다른 위용을 자랑했다. 사방을 둘러싼 거대하고 두꺼운 회색빛 석조 성벽 위로는 철갑을 두른 경비병들이 장창(Pike)과 쇠뇌로 무장한 채 쉴 새 없이 성곽을 순찰하고 있었다. 성문 밖 가도에는 대륙 각지에서 몰려든 상단들의 마차와 호위 용병들이 끝없는 행렬을 이루었고, 성벽 안쪽의 상업 지구와 여관 거리에서는 수천 명의 인파가 내뿜는 열기와 소음이 하늘을 찌를 듯 피어올랐다.\n\n그러나 그 화려한 번영의 이면에는 극단적인 명암이 드리워져 있었다. 도시 중심부의 시청과 대교역소, 그리고 부유층의 저택들이 자리한 구역은 넓고 쾌적한 부지 위에 삼엄한 경비가 펼쳐져 있었으나, 성벽 외곽으로 밀려난 빈민가는 숨이 막힐 정도로 좁은 판잣집들이 다닥다닥 붙어 악취와 질병, 범죄의 온상이 되어 있었다. 영주 대신 막대한 자본으로 시장(Mayor)의 자리에 오른 거상 기드온이 지배하는 이 도시는, 모든 것이 돈과 숫자로 환산되는 철저하고도 냉혹한 자본의 요새였다.\n\n***\n\n같은 시각, 크로스로드에서 가장 화려하고 삼엄한 경비를 자랑하는 기드온의 대저택 집무실.\n\n최고급 융단이 깔리고 금박 장식이 빛나는 넓은 집무실 안에는 무거운 침묵만이 감돌고 있었다. 정교하게 조각된 참나무 책상 뒤에 앉은 시장 기드온은, 깃털 펜을 쥔 흰 장갑 낀 손만을 사각거리며 눈앞에 쌓인 서류 더미를 처리하는 데에만 열중하고 있었다. 그의 짙은 갈색 머리카락 아래로 비치는 차가운 푸른 눈동자는 단 한 번도 맞은편의 방문객을 향하지 않았다.\n\n집무실 한편의 고급 손님용 소파에는 동방의 붉은 치파오를 입은 한 소녀—유하오란이 앉아 있었다. 일가족을 몰살한 맹독의 원료인 ‘마족의 뿔’ 밀매업자를 추적해 동방 ‘롱(Long)’ 제국에서 바다를 건너온 제41황녀였다. 그러나 기드온은 그녀를 투명 인간 취급하며 철저히 무시했고, 그의 곁에 서 있는 검은 고양이 수인 메이드 네라는 지루한 듯 입을 벌려 하품을 하면서도 날카로운 노란 눈동자로 유하오란의 일거수일투족을 경계하고 있었다.\n\n[img|C004.EVENT.1.png]\n\n한 시간, 두 시간... 벽시계의 초침 소리가 유하오란의 인내심을 조금씩 갉아먹었다. 팔짱을 낀 채 다리를 꼬고 앉아 분노를 삭이던 유하오란은, 결국 한계에 달한 듯 자리를 박차고 일어났다. 검은 스파이크 너클이 장착된 그녀의 주먹이 부르르 떨렸다. 그녀는 거침없는 걸음으로 기드온의 책상 앞까지 성큼성큼 걸어가 책상 상판을 짚으며 거세게 항의했다.\n\n\"언제까지 기다리게 할 생각이야?\"\n\n집무실의 공기를 가르는 카랑카랑한 목소리. 그제야 기드온은 움직이던 깃털 펜을 멈추고 천천히 잉크병에 꽂아 넣었다. 그는 등을 의자 등받이에 기대며, 마치 성가신 파리라도 보는 듯한 시선으로 유하오란을 올려다보았다.\n\n[img|C004.EVENT.2.png]\n\n기드온은 작게 한숨을 내쉬더니, 입꼬리만을 비스듬히 올리며 어이가 없다는 듯 비릿한 미소를 지었다.\n\n\"...그래, 무슨 용무였었지?\"\n\n사람의 속을 뒤집어 놓는 그 오만한 태도에 유하오란의 미간이 일그러진 순간, 기드온의 옆을 지키고 서 있던 메이드 네라가 무심하고 나른한 목소리로 대신 대답했다.\n\n\"마족의 뿔 관련 이에요.\"\n\n\"언제?\"\n\n기드온이 짧게 묻자, 네라는 아무런 말 없이 자신의 품 안에서 미리 정리해 두었던 서류철 중 하나를 꺼내 기드온의 책상 위로 조용히 건넸다. 서류를 훑어보는 기드온의 태연자약한 모습에, 유하오란은 그동안 억눌러왔던 피 맺힌 울분을 참지 못하고 버럭 소리를 질렀다.\n\n\"내가 모를 줄 알아? 당신 때문에 내 가족들은! 당신이 판매한 그 독 때문에!\"\n\n어머니와 형제들이 피를 토하며 죽어가던 끔찍한 밤의 기억이 그녀의 갈색 눈동자를 붉게 물들였다. 그러나 그녀의 절규에도 기드온의 표정은 미동조차 하지 않았다. 오히려 그는 서류를 덮으며 정말로 황당하다는 듯 차갑게 코웃음을 쳤다.\n\n\"말은 똑바로 해야지. 내가 판매한 것은 독이 아니야.\"\n\n[img|C004.EVENT.3.png]\n\n기드온은 깍지 낀 두 손을 턱밑에 괴고는, 감정이 전혀 담기지 않은 상인의 목소리로 말을 이었다.\n\n\"마족의 뿔은 사용하기에 따라 다양한 용도로 이용 가능하지, 희귀한 도구 레어 아이템 그야말로 만능의 도구다. 거기다 구매한 도구를 어떻게 사용 하는지는 상인의 이해범위 밖이다.\"\n\n철저하게 책임을 회피하며 피해자의 고통을 단순한 상거래의 논리로 치부하는 파렴치한 궤변. 유하오란의 이성이 끊어지며 책상을 뛰어넘어 다시 한번 고함을 치려던 바로 그 찰나였다.\n\n콰아아아앙—!!\n\n집무실의 두꺼운 유리창이 깨질 듯이 덜컥거리고, 저택 전체와 거리 전체를 뒤흔드는 귀가 멀 것 같은 굉음이 도시 외곽에서부터 울려 퍼졌다.\n\n***\n\n시선은 거대한 굉음의 진원지, 크로스로드의 성벽 밖 평원으로 향한다.\n\n평화로워야 할 성벽 너머의 드넓은 평원 위에, 어느새 거대한 짐승의 가죽과 해골로 장식된 야만적인 군막들이 세워져 있었다. 그리고 그 막사들 앞에는 흉포한 기세를 뿜어내는 오우거 부족, ‘붉은 뿔 부족’의 대군이 대지를 시커멓게 뒤덮은 채 진열을 갖추고 있었다.\n\n[img|E005.EVENT.1.png]\n\n\"히, 히이이익...! 저, 저게 다 뭐야?! 오우거가 왜 저렇게 많아?!\"\n\n성벽 위 망루를 지키던 경비대장 한스와 경비병들은 눈앞에 펼쳐진 비현실적인 광경에 완전히 패닉에 빠졌다. 한스는 허리춤의 술통을 잡으려던 손조차 덜덜 떨며, 과거 동료 발터를 눈앞에서 잃었던 오우거 토벌전의 악몽에 사로잡혀 다리가 풀릴 지경이었다.\n\n평균 신장이 2미터를 훌쩍 넘어 저 높고 견고한 크로스로드의 성벽마저 낮아 보이게 만드는 거대한 오우거 무리. 그 압도적인 괴물들의 행렬 한가운데서, 유독 핏빛처럼 붉은 피부를 가진 거대한 아카오니—오우거 족장 바르가스가 묵직한 발걸음을 내딛으며 앞으로 걸어 나왔다.\n\n230cm에 달하는 암석 같은 근육질 거구를 자랑하는 바르가스는, 성벽 위에서 벌벌 떨고 있는 인간들을 보며 사나운 송곳니를 드러내고 비웃었다. 그리고는 발치에 박혀 있던, 성인 남성 수십 명도 들지 못할 터무니없이 거대한 바위를 마치 조약돌이라도 줍듯 한 손으로 가볍게 집어 들었다.\n\n\"크하하하핫—!!\"\n\n바르가스가 근육을 부풀리며 팔을 휘두르자, 거대한 바위가 포탄처럼 허공을 갈랐다.\n\n쿠구구구궁—! 콰아아앙!!\n\n바위는 크로스로드의 정면 성벽에 그대로 처박히며 끔찍한 파열음을 냈다. 돌조각과 파편이 비처럼 쏟아져 내리고 성벽 전체가 지진이 난 듯 흔들리자, 성벽 위의 경비병들은 비명을 지르며 바닥에 나뒹굴었다.\n\n[img|E005.EVENT.2.png]\n\n자욱하게 피어오르던 흙먼지가 바람에 조금씩 가라앉자, 바르가스는 거대한 가슴팍을 부풀려 잠시 숨을 고르더니 도시 전체가 떠나갈 듯한 우렁찬 목소리로 선전포고를 내질렀다.\n\n\"너희들의 도시를 내놓아라! 마음만 먹으면 너희를 모두 죽이고 차지할 수 있으나, 우리는 싸움을 매우 좋아한다. 도전자가 있다면 얼마든지 받아주마!\"\n\n고막을 찢는 듯한 괴물의 포효에 경비대장 한스는 창을 짚은 채 넋이 나가 입만 뻐끔거렸다. 공포에 질려 아무도 대답하지 못하는 인간들을 향해, 바르가스는 거대한 못 박힌 몽둥이를 어깨에 걸치며 계속해서 외쳤다.\n\n\"이기지 못해도 상관없다! 나는 강한 이를 매우 좋아하거든! 잠재력을 보이는 강인한 자 모두 부족으로 받아주마!\"\n\n[img|E005.EVENT.3.png]\n\n바로 그때, 바르가스의 뒤편에서 인간 마법사의 찢어진 로브를 걸치고 작은 지팡이를 쥔 오우거 메이지—부관 코르그가 다가와 바르가스의 귓가에 무언가를 나지막이 속삭였다. 코르그의 조언을 들은 바르가스는 금빛 눈동자를 번뜩이며 고개를 끄덕이더니, 다시 한번 성벽을 향해 쩌렁쩌렁하게 외쳤다.\n\n\"아아, 잊을뻔 했군! 도전자가 없다면 3일마다 재물을 바쳐라! 그렇지 않다면 너희들의 도시를 순식간에 묵사발로 만들어줄 것이다!\"\n\n외곽 평원을 지배한 붉은 뿔 부족의 족장 바르가스의 선전포고와 함께, 거대한 상업 도시 크로스로드에 피와 폭력의 전운이 무겁게 드리워지고 있었다."},
};
function bookPages(text){
 const pages=[];let paras=[];
 const flush=img=>{if(paras.length||img)pages.push({img:img||'',paras});paras=[]};
 for(const block of text.split(/\n\s*\n/)){
  const t=block.trim();if(!t)continue;
  const m=t.match(/^\[img\|([^\]]+)\]$/);
  if(m){flush(m[1].trim());continue}
  if(/^\*{3,}$/.test(t)){flush('');continue}
  paras.push(t);
 }
 flush('');
 let last='';for(const p of pages){if(p.img)last=p.img;else if(last){p.img=last;p.prev=true}}
 return pages;
}
const ghEvent=n=>GH_BASE&&n?ghv(GH_BASE+'event/'+encodeURIComponent(n.replace(/\.[a-z0-9]+$/i,''))+'.'+IMG_EXT):'';
async function eventImg(n){
 const g=ghEvent(n);if(g&&await decodeImg(g))return g;
 const a=await assetURL(n).catch(()=>'');if(a&&await decodeImg(a))return a;
 return '';
}
function inlHTML(t){return esc(t).replace(/`([^`]+)`/g,'<b>$1</b>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\*([^*]+)\*/g,'<i>$1</i>').replace(/\n/g,'<br>')}
/* 책 안 [타락|인물|라이벌] 버튼 — 지금 열린 책의 정보 (cbkPlay가 채움) */
let BKCTX=null;
const BKACT={E003:{k:'vamp',ko:'뱀파이어 타락',c:'a050ff'},E005:{k:'ogre',ko:'아카오니 타락',c:'e8402a'},E006:{k:'blight',ko:'블라이트 타락',c:'4fbe72'}};
function actHTML(c,e){
 if(!BKCTX)return '';
 const a=(BKCTX.acts||[]).find(x=>x.c===c&&x.e===e);if(!a||BKCTX.done.has(c+'|'+e))return '';
 const m=BKACT[e]||{ko:e+' 타락'};
 return `<div class="bk-act"><button class="bk-actb" data-a="act" data-v="${esc(c+'|'+e)}"><b>타락시킨다</b><small>${esc(a.n||c)} · ${esc(m.ko)}</small></button></div>`;
}
function paraHTML(t,i){
 const am=t.trim().match(/^\[타락\|\s*([CS]\d+[A-Z]?)\s*\|\s*(E-?\d+)\s*\]$/);if(am)return actHTML(am[1],am[2]);
 const raw=t.replace(/[*`]/g,'').trim(),e=inlHTML(t),wholeI=/^\*[^*][\s\S]*\*$/.test(t)&&!/^\*\*/.test(t);
 if(/^`[^`]+`$/.test(t))return `<p class="sys">${esc(raw)}</p>`;                       // `[CONGRATULATIONS!]` → 시스템 창
 if(/^["“].*["”]$/s.test(raw))return `<p class="q">${e}</p>`;                          // 대사
 if(wholeI&&/^[‘'"]/.test(raw))return `<p class="th">${esc(raw)}</p>`;                 // *‘속마음’*
 if(raw.length<30&&(wholeI||(/[—!]$/.test(raw)&&!/[.?]/.test(raw))))return `<p class="sfx">${esc(raw)}</p>`; // *쾅—!*
 return `<p${i===0?' class="first"':''}>${e}</p>`;
}
/* ---------- 책장 로어북 (책장1, 책장2 …): Lua가 채팅 변수 cbk_이름 에 {t:제목, b:본문}을 넣어 둠 → 핑크 책으로 ----------
   한 줄 = 한 문단 · [img|이름] = 그림 (줄 중간에 있어도 따로 뺌) · 문단 사이에 단독으로 있는 "대사"는 대사 문단으로 */
function cbkText(b){
 let t=String(b||'').replace(/\r/g,'');
 t=t.replace(/[ \t]*(\[img\|[^\]]+\])[ \t]*/g,'\n$1\n');
 t=t.replace(/[ \t]*(\[타락\|[^\]]+\])[ \t]*/g,'\n$1\n');
 t=t.replace(/(^|[ \t])(["“][^"”\n]+["”])(?=[ \t]|$)/gm,'\n$2\n');
 return t.split('\n').map(x=>x.trim()).filter(Boolean).join('\n\n');
}
/* ---------- 책장에서 연 책: 표지(GitHub ui/cover_분류.webp)가 나와 옆으로 펼쳐진 뒤 책 화면으로 ---------- */
let autoOpen=false;
const SBI_EN={main:'CHRONICLES',hero:'THE HERO',back:'HIDDEN PAGES'};
async function shelfIntro(cat,title){
 if(!GH_BASE||!SBI_EN[cat])return;
 const cv=GH_BASE+'ui/cover_'+cat+'.webp';
 const ok=await new Promise(r=>{const im=new Image();im.onload=()=>r(true);im.onerror=()=>r(false);im.src=cv;setTimeout(()=>r(false),2500)});
 if(!ok)return;
 ensureHead();
 const u=dsEsc(cv);
 document.body.innerHTML=`<div class="sbi sbi-${cat}"><div class="sbi-dim"></div><div class="sbi-p"><div class="sbi-b"><div class="sbi-pg"><em>${SBI_EN[cat]}</em><b>${esc(title||'')}</b><i></i></div><div class="sbi-sp" style="background-image:url('${u}')"></div><div class="sbi-fl"><div class="sbi-fr" style="background-image:url('${u}')"></div><div class="sbi-bk"></div></div></div></div></div>`;
 await host.showContainer('fullscreen');
 await new Promise(r=>setTimeout(r,1650));
 const el=document.querySelector('.sbi');if(el)el.classList.add('out');
 await new Promise(r=>setTimeout(r,380));
}
async function cbkData(key){
 const name=key.slice(3);
 const ci=await host.getCurrentCharacterIndex(),ch=await host.getCurrentChatIndex();
 const chat=await host.getChatFromIndex(ci,ch);
 const raw=chat&&chat.scriptstate&&chat.scriptstate['$cbk_'+name];
 let d=null;try{d=JSON.parse(raw)}catch{}
 return d&&d.b?{title:String(d.t||name),text:d.b,acts:Array.isArray(d.acts)?d.acts:[]}:null;
}
// 책 안 버튼 → 채팅 변수 dm_bkact 에 남김 (Lua가 다음 실행 때 적용). 운명 선택과 같은 저장 방식
let actBusy=false;
async function actClick(btn){
 if(actBusy||!BKCTX)return false;actBusy=true;
 const [c,e]=String(btn.dataset.v||'').split('|');
 try{
  const ci=await host.getCurrentCharacterIndex(),ch=await host.getCurrentChatIndex();
  const chat=await host.getChatFromIndex(ci,ch);if(!chat)throw Error('채팅을 찾지 못했어요');
  if(chat.isStreaming)throw Error('AI 답변이 끝난 뒤 눌러 주세요');
  const next=JSON.parse(JSON.stringify(chat));next.scriptstate=next.scriptstate||{};
  const v=JSON.stringify({k:BKCTX.key,c,e,t:Date.now()});
  next.scriptstate['$dm_bkact']=v;
  await host.setChatToIndex(ci,ch,next);
  const chk=await host.getChatFromIndex(ci,ch);
  if(!chk||!chk.scriptstate||chk.scriptstate['$dm_bkact']!==v)throw Error('저장 권한이 거부됐어요. 새로고침 뒤 다시 누르고 확인 창에서 YES를 눌러 주세요');
  BKCTX.done.add(c+'|'+e);
  const a=(BKCTX.acts||[]).find(x=>x.c===c&&x.e===e)||{};
  BKCTX.fx={kind:(BKACT[e]||{}).k,name:a.n||c,ko:(BKACT[e]||{}).ko||'타락',col:(BKACT[e]||{}).c||'c490e8'};
  return true;
 }catch(er){err('bkact',er);const sm=btn.querySelector('small');if(sm)sm.textContent=String(er.message||er);return false}
 finally{actBusy=false}
}
// 이미 타락했거나(상태 G) 반영 대기 중이면 버튼을 그리지 않음
async function actDoneSet(acts){
 const done=new Set();
 try{
  const ci=await host.getCurrentCharacterIndex(),ch=await host.getCurrentChatIndex();
  const chat=await host.getChatFromIndex(ci,ch);const ss=(chat&&chat.scriptstate)||{};
  let G=null;try{G=JSON.parse(ss['$G']||'null')}catch{}
  let P=null;try{P=JSON.parse(ss['$dm_bkact']||'null')}catch{}
  const cor=(G&&G.cor)||{};
  for(const a of acts||[]){
   const base=a.c.replace(/[A-Z]$/,'');
   if(Object.keys(cor).some(k=>(k===a.c||k===base||k.replace(/[A-Z]$/,'')===base)&&/^E-?\d+$/.test(String(cor[k]||''))))done.add(a.c+'|'+a.e);
   if(P&&P.c===a.c&&P.e===a.e)done.add(a.c+'|'+a.e);
  }
 }catch(e){err('actdone',e)}
 return done;
}
async function cbkPlay(key,cat){
 const d=await cbkData(key);
 if(!d)return;
 STORIES[key]={title:d.title,kind:'back',theme:'rose',text:cbkText(d.text)};
 BKCTX={key,acts:d.acts||[],done:await actDoneSet(d.acts||[]),fx:null};
 if(cat){await shelfIntro(cat,d.title);autoOpen=true}
 try{await bookPlay(key)}finally{autoOpen=false}
 const fx=BKCTX&&BKCTX.fx;BKCTX=null;
 // 연출이 남아 있으면 닫은 뒤 재생 (보통은 책 안에서 이미 재생됨)
 if(fx&&fx.kind&&FX[fx.kind])await play(fx.kind,fx.name,fx.ko,fx.col);
}
async function bookPlay(id){
 const st=STORIES[id];if(!st||playing)return;
 const back=st.kind==='back',bc=st.theme==='rose'?' bk-rose':(back?' bk-purple':'');
 playing=true;diag.played++;
 try{
  ensureHead();
  const pages=bookPages(st.text);
  document.body.innerHTML='<div class="bk'+bc+'"><div class="bk-load">LOADING</div></div>';
  await host.showContainer('fullscreen');
  const urls={};await Promise.all([...new Set(pages.map(p=>p.img).filter(Boolean))].map(async n=>{urls[n]=await eventImg(n)}));
  const mobile=()=>innerWidth<=760||innerWidth<=innerHeight;
  let pi=0,busy=false,done,opened=false,opening=false;const end=new Promise(r=>done=r);
  if(autoOpen){opened=true;autoOpen=false}
  const lid=`<div class="bk-lid" data-a="open"><div class="bk-lf"><div class="bk-lf-in"><small>${back?'뒷면책장':'SYSTEM NARRATIVE EVENT'}</small><em>✦</em><b>${esc(st.title)}</b><i></i><span>눌러서 펼치기</span></div></div><div class="bk-lb"></div></div>`;
  function openBook(){
   if(opened||opening)return;opening=true;
   const r=document.querySelector('.bk');if(r){r.classList.remove('bk-closed');r.classList.add('bk-opening')}
   setTimeout(()=>{opened=true;opening=false;const l=document.querySelector('.bk-lid');if(l)l.remove();const r2=document.querySelector('.bk');if(r2)r2.classList.remove('bk-opening')},1250);
  }
  const total=()=>pages.length,cur=()=>pi;
  const left=p=>p.img&&urls[p.img]?`<div class="bk-img${p.prev?' bk-prev':''}"><img src="${dsEsc(urls[p.img])}" alt=""></div>`
   :`<div class="bk-cover"><small>${back?'뒷면책장':'SYSTEM NARRATIVE EVENT'}</small><b>${esc(st.title)}</b><i></i></div>`;
  const right=p=>`<div class="bk-txt">${p.paras.map(paraHTML).join('')}</div>`;
  function draw(){
   const m=mobile(),p=pages[pi];
   const n=cur(),t=total(),lastPg=n>=t-1;
   // 넓은 화면: 펼친 책(왼쪽 삽화 · 오른쪽 글) / 좁은 화면: 한 장에 삽화(위) + 글(아래)
   const inner=m?`<div class="bk-pg bk-one"><div class="bk-one-sc">${left(p)}${right(p)}</div></div>`
    :`<div class="bk-pg bk-l">${left(p)}</div><div class="bk-pg bk-r">${right(p)}</div>`;
   const shut=!opened&&!opening;
   document.body.innerHTML=`<div class="bk${bc}${shut?' bk-closed':''}"><div class="bk-top"><span>${esc(st.title)}</span><i></i><button class="bk-x" data-a="x">✕</button></div>
    <div class="bk-book${m?' bk-single':''}">${inner}${shut?lid:''}</div>
    <div class="bk-nav"><button class="bk-btn" data-a="prev"${n<=0?' disabled':''}>◀ 이전</button><span>${n+1} / ${t}</span><button class="bk-btn${lastPg?' bk-go':''}" data-a="next">${lastPg?'닫기':'다음 ▶'}</button></div></div>`;
   document.querySelectorAll('.bk-txt,.bk-one-sc').forEach(x=>x.scrollTop=0);
  }
  function go(d){
   if(!opened){if(d>0)openBook();return}
   if(busy)return;const n=cur(),t=total();
   if(d>0&&n>=t-1){done();return}
   if(d<0&&n<=0)return;
   busy=true;
   const book=document.querySelector('.bk-book');
   if(book){const leaf=document.createElement('div');leaf.className='bk-leaf'+(d<0?' bk-back':'');book.appendChild(leaf)}
   setTimeout(()=>{pi=Math.max(0,Math.min(pages.length-1,pi+d));draw();busy=false},330);
  }
  draw();
  let fxOn=false;
  const onClick=ev=>{if(fxOn)return;const a=ev.target.closest&&ev.target.closest('[data-a]');if(!a)return;const k=a.dataset.a;if(k==='x')done();else if(k==='open')openBook();else if(k==='next')go(1);else if(k==='prev')go(-1);else if(k==='act')actClick(a).then(async ok=>{if(!ok)return;const fx=BKCTX&&BKCTX.fx;if(BKCTX)BKCTX.fx=null;
   if(fx&&fx.kind&&FX[fx.kind]){fxOn=true;await fxInline(fx.kind,fx.name,fx.ko,fx.col);fxOn=false}
   draw()})};
  const onKey=ev=>{if(fxOn)return;if(ev.key==='ArrowRight'||ev.key===' ')go(1);else if(ev.key==='ArrowLeft')go(-1);else if(ev.key==='Escape')done()};
  let tx0=null;const onTs=ev=>{tx0=ev.touches[0].clientX},onTe=ev=>{if(fxOn||tx0==null)return;const dx=ev.changedTouches[0].clientX-tx0;tx0=null;if(Math.abs(dx)>60)go(dx<0?1:-1)};
  let lastM=mobile();const onResize=()=>{if(!fxOn&&mobile()!==lastM){lastM=mobile();draw()}};
  document.addEventListener('click',onClick);document.addEventListener('keydown',onKey);document.addEventListener('touchstart',onTs,{passive:true});document.addEventListener('touchend',onTe);addEventListener('resize',onResize);
  await end;
  document.removeEventListener('click',onClick);document.removeEventListener('keydown',onKey);document.removeEventListener('touchstart',onTs);document.removeEventListener('touchend',onTe);removeEventListener('resize',onResize);
 }catch(e){err('book',e)}
 document.body.innerHTML='';try{await host.hideContainer()}catch(e){err('close',e)}
 playing=false;
}
let boss=null;
async function bossAssets(){
 const a={};
 const l=await doc.querySelectorAll('[class*="dm-fxa-"]');const n=l?await l.length():0;
 for(let i=0;i<n;i++){const el=await l.at(i);try{const cls=await el.getClassName()||'',st=await el.getStyleAttribute()||'';
  const k=(cls.match(/dm-fxa-([a-z]+)/)||[])[1],u=(st.match(/url\((['"]?)(.*?)\1\)/)||[])[2];if(k&&u)a[k]=u}finally{release(el)}}
 return a;
}
async function bossClose(){
 if(!boss)return;const b=boss;boss=null;clearTimeout(b.t);bgmStop().catch(()=>{});
 try{await b.root.remove()}catch{}release(b.root);playing=false;
}
// 성공하면 true (이미지가 없거나 모르는 보스면 false → 기본 연출로)
async function bossPlay(code,name){
 if(!BOSS_T[code]||boss||playing||!doc)return false;
 const a=await bossAssets();if(!a.char||!a.bg)return false;
 playing=true;diag.played++;
 const e=dsEsc,q=BOSS_P[BOSS_T[code].p];
 let h='<div class="bfx-intro">';
 if(BOSS_T[code].p==='B'&&a.mark)h+=`<div class="bfx-mark" style="background-image:url('${e(a.mark)}')"></div>`;
 h+=`<div class="bfx-full bfx-pc" style="background-image:url('${e(a.bg)}')"></div>`;
 h+=`<div class="bfx-full bfx-mo" style="background-image:url('${e(a.mbg||a.bg)}')"></div>`;
 h+=`<div class="bfx-wbar"></div><img src="${e(a.char)}" class="bfx-char" alt="" decoding="async"><div class="bfx-gbar"><div class="bfx-name">${e(name)}</div></div></div>`;
 try{
  const body=await doc.querySelector('body');
  const root=await doc.createElement('div');await root.setClassName('bfx-root');
  const style=await doc.createElement('style');await style.setTextContent(bossCSS(code));await root.appendChild(style);
  const view=await doc.createElement('div');await root.appendChild(view);
  await view.setInnerHTML(h);
  await body.appendChild(root);release(body);
  boss={root,t:setTimeout(bossClose,(q.fade+0.9)*1000)};
  bgmStart('boss',a.bgm).catch(e=>err('bgm',e));
  const t0=Date.now();
  // 눌러서 건너뛰기 (기존 연출과 같게, 1.2초 뒤부터)
  await root.addEventListener('click',ev=>{if(Date.now()-t0<1200)return;if(!(Number.isFinite(ev?.clientX))||(ev.clientX===0&&ev.clientY===0))return;bossClose()});
 }catch(e){err('boss',e);await bossClose();playing=false;return false}
 return true;
}

/* ---------- 운명 선택 (메인 화면 위에 직접 그림 — 봇 이미지 주소를 그대로 쓰기 위해) ----------
   Lua의 CHOOSE YOUR DESTINY 버튼이 dm-dsreq-<번호>를 올리면 열림.
   고르면 채팅 변수 ds_pick / JOB / J01~J07 만 기록 → 봇 Lua가 다음 행동 때 직업을 확정. */
/* ▼▼▼ 운명선택 이미지 주소 ▼▼▼
   주소는 맨 위 GH_BASE 하나로 정해요 (destiny/ 폴더).
   파일 이름은 아래 IMG_FILES 그대로 맞춰 주세요. */
const IMG_BASE=GH_BASE?GH_BASE+'destiny/':'';
const IMG_FILES={J01:'J01.webp',J02:'J02.webp',J03:'J03.webp',J04:'J04.webp',J05:'J05.webp',J06:'J06.webp',J07:'J07.webp',
 A1:'ANI01.webp',A2:'ANI02.webp',A3:'ANI03.webp',A4:'ANI04.webp',A5:'ANI05.webp',A6:'ANI06.webp',A7:'ANI07.webp',A8:'ANI08.webp',A9:'ANI09.webp',
 CB:'card_back.webp',J08:'J08.webp',J08X:'J08X.webp',CB8:'CB8.webp',CRK:'crack.webp'};
// 주소가 있으면 플러그인이 켜질 때 미리 받아 둠 (처음 열 때도 끊김 없이)
const dsPre=[];if(IMG_BASE)for(const k in IMG_FILES){try{const im=new Image();im.src=ghv(IMG_BASE+IMG_FILES[k]);dsPre.push(im)}catch{}}
const JOBS=[{"n": 1, "name": "전사", "sub": "⚔ Warrior", "growth": "STR ★★★★★ | CON ★★★★★\nDEX ★★☆ | INT ★ | WIS ★ | CHA ★", "color": "#FFD700", "desc": "수많은 고블린은 검을 쥔다. 그러나 검은 누구에게나 주인을 허락하지 않는다.\n\n전사는 싸움을 즐기는 존재가 아니다.\n끝까지 쓰러지지 않는 자. 동료보다 먼저 앞으로 걷는 자.\n\n\"네 피가 대지를 적신다면, 그곳이 곧 부족의 성벽이 되리라.\"", "master": "ALL MASTER → 【IV - The Emperor】", "asset": "J01.png", "id": "warrior", "stats": "S13 D10 C13 I9 W9 Ch8 | HP60", "hidden": [["High Warrior + Guardman", "Juggernaut"], ["Guardman + Swordsman", "Royal Guardian"], ["High Warrior + Swordsman", "Blade Warlord"]], "cols": [["Power", "#e8c65a", ["High Warrior", "Veteran", "Champion", "Dread Champion", "Titan", "Avatar of War"], "【XI - Strength】"], ["Defense", "#6a9fd8", ["Guardman", "Shield Bearer", "Fortress Knight", "Iron Bastion", "Aegis Lord", "Living Fortress"], "【VII - Chariot】"], ["Sword", "#e86a6a", ["Swordsman", "Duelist", "Blade Master", "Sword Saint", "Void Edge", "Fate Breaker"], "【X - Wheel of Fortune】"]], "arcana": "【IV - The Emperor】"}, {"n": 2, "name": "마법사", "sub": "🔮 Mage", "growth": "INT ★★★★★ | WIS ★★★★\nDEX ★★ | CON ★★ | CHA ★★ | STR -", "color": "#E53935", "desc": "모든 고블린이 불을 피울 수는 있다.\n하지만 불이 스스로 피어오르게 만드는 것은 선택받은 자뿐이다.\n\n마법사는 주문을 외우는 존재가 아니다.\n세상이 잊은 언어를 기억하는 존재이다.\n\n\"별은 너에게 말을 걸지 않는다. 그러나 언젠가, 너는 별에게 대답하게 될 것이다.\"", "master": "ALL MASTER → 【XXI - The World】", "asset": "J02.png", "id": "mage", "stats": "S8 D9 C9 I14 W12 Ch10 | HP39", "hidden": [["Elementalist + Warlock", "Chaos Mage"], ["Warlock + Shaman", "Witch Doctor"], ["Elementalist + Shaman", "Spirit Sage"]], "cols": [["Element", "#ff6b35", ["Elementalist", "Flame Sage", "Storm Caller", "Arc Mage", "Grand Magus", "Elemental Lord"], "【I - The Magician】"], ["Curse", "#9c27b0", ["Warlock", "Hex Master", "Soul Binder", "Abyss Caster", "Demon Scholar", "Void Prophet"], "【XVI - The Tower】"], ["Spirit", "#4caf50", ["Shaman", "Spirit Walker", "Totem Master", "Ancestor Speaker", "Great Shaman", "World Shaman"], "【IX - The Hermit】"]], "arcana": "【XXI - The World】"}, {"n": 3, "name": "궁수", "sub": "🏹 Crossbowman", "growth": "DEX ★★★★★ | STR ★★★\nCON ★★ | INT ★★ | WIS ★★ | CHA ★", "color": "#9C27B0", "desc": "궁수는 하늘을 본다.\n석궁수는 적의 눈을 본다.\n\n한 발. 단 한 발이면 충분하다.\n누군가는 그것을 비겁하다 말하지만, 살아남은 자는 언제나 두 번째 화살을 장전한다.\n\n\"가장 먼 곳을 보는 눈이, 가장 가까운 죽음을 만든다.\"", "master": "ALL MASTER → 【XVII - The Star】", "asset": "J03.png", "id": "crossbow", "stats": "S12 D13 C10 I9 W9 Ch9 | HP48", "hidden": [["Sniper + Repeater", "Death Shooter"], ["Repeater + Engineer", "Siege Master"], ["Sniper + Engineer", "Hunter General"]], "cols": [["Sniper", "#ffd54f", ["Marksman", "Deadeye", "Eagle Eye", "Silent Killer", "One Shot"], "【XIX - The Sun】"], ["Repeater", "#ef5350", ["Repeater", "Rapid Shooter", "Bolt Storm", "Suppression Master", "Iron Rain"], "【VIII - Justice】"], ["Engineer", "#78909c", ["Siege Engineer", "Trap Master", "Ballista Master", "Fortress Breaker", "Iron Architect"], "【XVIII - The Moon】"]], "arcana": "【XVII - The Star】"}, {"n": 4, "name": "광대", "sub": "🎭 Jester", "growth": "DEX ★★★★ | CHA ★★★★\nINT ★★★ | WIS ★★ | CON ★ | STR ★", "color": "#1A237E", "desc": "광대는 웃긴다.\n하지만 웃음은 칼보다 깊게 파고든다.\n\n진실은 농담 속에 숨고, 죽음은 박수갈채와 함께 찾아온다.\n\n\"세상이 웃는 동안, 너는 이미 승리했다.\"", "master": "ALL MASTER → 【0 - The Fool】", "asset": "J04.png", "id": "jester", "stats": "S10 D13 C10 I9 W10 Ch10 | HP48", "hidden": [["Actor + Deceiver", "Faceless One"], ["Actor + Entertainer", "Carnival King"], ["Deceiver + Entertainer", "Puppet Master"]], "cols": [["Actor\n(연기자)", "#7e57c2", ["Stage Actor", "Master Actor", "Thousand Faces", "Perfect Impersonator", "Living Mask"], "【XIV - Temperance】"], ["Deceiver\n(기만자)", "#e53935", ["Swindler", "Con Artist", "Master Deceiver", "Lord of Lies", "Prince of Deception"], "【XV - The Devil】"], ["Entertainer\n(흥행사)", "#ffa726", ["Bard", "Ringmaster", "Festival Master", "Idol", "King of Entertainment"], "【VI - The Lovers】"]], "arcana": "【0 - The Fool】"}, {"n": 5, "name": "지휘관", "sub": "👑 Commander", "growth": "CHA ★★★★★ | WIS ★★★★\nSTR ★★★ | CON ★★★ | INT ★★★ | DEX ★★", "color": "#2E7D32", "desc": "깃발은 싸우지 않는다.\n그러나 모두가 깃발을 따라 죽는다.\n\n지휘란 명령이 아니다. 희망을 믿게 만드는 일이다.\n\n\"가장 높은 곳에 선 자는 가장 먼저 화살을 맞는다.\"", "master": "ALL MASTER → 【III - The Empress】", "asset": "J05.png", "id": "commander", "stats": "S11 D9 C11 I10 W10 Ch11 | HP57", "hidden": [["Chief + Commander", "Supreme Chief"], ["Commander + King", "King General"], ["Chief + King", "Great King"]], "cols": [["Tribal Chief", "#8d6e63", ["Goblin Chief", "Great Chief", "Chieftain", "High Chieftain", "Goblin Lord"], "【V - Hierophant】"], ["Military", "#b71c1c", ["Captain", "Commander", "Marshal", "Grand Marshal", "Warlord"], "【King of Swords】"], ["Royal", "#c9a84c", ["Noble Goblin", "Prince", "Crown Prince", "Regent", "Goblin King"], "【King of Pentacles】"]], "arcana": "【III - The Empress】"}, {"n": 6, "name": "평화주의자", "sub": "☮ Pacifist", "growth": "CHA ★ | WIS ★ | INT ★\nDEX ★ | CON ★ | STR -", "color": "#EF6C00", "desc": "그는 싸우지 않는다. 칼도 들지 않는다.\n언제나 웃는다. 언제나 양보한다.\n\n그리고 전쟁이 끝났을 때, 마지막까지 살아남아 있는 것은 언제나 그였다.\n\n\"가장 순한 양이, 가장 오래 늑대를 길들인다.\"", "master": "ALL MASTER → 【XX - Judgement】", "asset": "J06.png", "id": "pacifist", "stats": "S9 D9 C10 I11 W13 Ch10 | HP48", "hidden": [["Agitator + False Saint", "Silver Tongue"], ["False Saint + Cult Leader", "False Savior"], ["Agitator + Cult Leader", "Kingmaker"]], "cols": [["Agitator\n(선동가)", "#e53935", ["Demagogue", "Firebrand", "Voice of Revolt", "Master Agitator", "Harbinger of Chaos"], "【Knight of Swords】"], ["False Saint\n(거짓 성자)", "#e8c65a", ["Blessed One", "Miracle Worker", "Living Saint", "Holy Icon", "Divine Fraud"], "【II - High Priestess】"], ["Cult Leader\n(사이비 교주)", "#7e57c2", ["Apostle", "Prophet", "False Messiah", "Living God", "One True Faith"], "【XII - The Hanged Man】"]], "arcana": "【XX - Judgement】"}, {"n": 7, "name": "영웅", "desc": "영웅은 가장 강한 자가 아니다.\n가장 오래 살아남은 자도 아니다.\n모두가 포기한 길을, 끝까지 걸어간 자이다.\n\n그래서 카드에는 얼굴이 없다. 오직 등을 보일 뿐.\n\n\"운명은 선택받은 자를 만들지 않는다. 선택한 자를 운명이라 부른다.\"", "sub": "⭐ Hero", "growth": "STR ★★★ | DEX ★★★ | CON ★★★\nINT ★★★ | WIS ★★★ | CHA ★★★", "color": "#1565C0", "arcana": "【XIII - Death】→【King of Wands】", "hiddenTitle": "특수 전직 (Hero Hidden)", "master": "King of Heroes → 【King of Wands】", "asset": "J07.png", "id": "hero", "stats": "S13 D13 C13 I12 W12 Ch13 | HP67", "hidden": [["Hero + Warrior", "Brave King"], ["Hero + Mage", "Spellblade"], ["Hero + Commander", "King of Heroes"]], "cols": [["Hero Path", "#1565c0", ["Fake Hero", "Dark Hero", "Demon Hero", "Hero of Ruin", "Hero of the Abyss", "The Hero"], "【XIII - Death】"]], "masterSub": "운명조차 예측하지 못한 존재."}, {"n": 8, "name": "외신의 축복자", "sub": "👁 Outsider", "growth": "WIS ★★★★★ | CHA ★★★★\nCON ★★★ | INT ★★ | DEX ★★ | STR ★", "color": "#8B1E3F", "desc": "별 너머에서 무언가가 그를 보았다.\n그것은 신이 아니다. 신들이 이름 부르기를 두려워하는 무언가다.\n축복은 선물이 아니다. 표식이다.\n\n\"숲의 검은 양이여, 천의 새끼를 거느린 이여—\"", "master": "", "asset": "J08.png", "id": "outer", "stats": "S5 D5 C5 I5 W20 Ch20 | HP60", "hidden": [], "cols": [["Black Goat\n(검은 양)", "#8B1E3F", ["Lamb of the Woods", "Herald of the Goat", "Vessel of the Mother", "Black Shepherd", "Avatar of the Black Goat", "Mother of a Thousand Young"], "【Queen of Pentacles】"]], "arcana": "【Queen of Pentacles】", "hide": true}];
const DS_CSS_SRC=`
.P-root{position:fixed;inset:0;z-index:100000;background:#05000c;color:#e8d5ff;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;user-select:none;-webkit-user-select:none;overflow:hidden}
.P-root *{box-sizing:border-box}
.P-x{position:absolute;top:12px;right:12px;z-index:50;width:40px;height:40px;border-radius:8px;border:1px solid rgba(201,168,76,.45);background:rgba(10,0,20,.75);color:#c9a84c;font-size:18px;cursor:pointer}
.P-frame{--F:min(680px,100vw,64vh);position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:var(--F);height:calc(var(--F)*1.5);border:2px solid #c9a84c;overflow:hidden;background:#0a0014 center top/cover no-repeat;box-shadow:0 0 30px rgba(201,168,76,.18)}
.P-f{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;animation:P-in .1s forwards}
@keyframes P-in{to{opacity:1}}
.P-start{position:absolute;z-index:5;bottom:12%;left:50%;transform:translateX(-50%);padding:16px 44px;background:linear-gradient(rgba(42,26,62,.92),rgba(13,6,24,.95));color:#c9a84c;border:1px solid #c9a84c;border-radius:4px;font-size:15px;font-weight:700;letter-spacing:4px;white-space:nowrap;opacity:0;animation:P-in .3s 2s forwards;cursor:pointer}
.P-dim{position:absolute;inset:0;background:rgba(10,0,20,.35);z-index:1}
.P-stage{position:absolute;inset:0;z-index:3;--w:calc(var(--F)*.46)}
.P-card{position:absolute;left:50%;top:50%;width:var(--w);height:calc(var(--w)*1.5);transform:translate(-50%,-50%);perspective:1000px;z-index:5;cursor:pointer}
.P-inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transform:rotateY(180deg)}
.P-back,.P-front{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:8px;overflow:hidden;border:3px solid var(--cc);box-shadow:0 0 30px var(--cc)}
.P-back{border-color:#6a3d9a;box-shadow:0 0 20px rgba(106,61,154,.6)}
.P-front{transform:rotateY(180deg)}
.P-back img,.P-front img{width:100%;height:100%;object-fit:fill;display:block}
.P-e-reveal .P-inner{animation:P-flip .75s cubic-bezier(.3,.7,.3,1) both}
.P-e-next{animation:P-inR .5s cubic-bezier(.2,.8,.25,1) both}.P-e-prev{animation:P-inL .5s cubic-bezier(.2,.8,.25,1) both}
.P-e-next .P-inner,.P-e-prev .P-inner{animation:P-flip .55s .18s cubic-bezier(.3,.7,.3,1) both}
@keyframes P-flip{from{transform:rotateY(0)}to{transform:rotateY(180deg)}}
@keyframes P-inR{from{transform:translate(-50%,-50%) translateX(95%) rotate(6deg) scale(.6);opacity:.3}to{transform:translate(-50%,-50%)}}
@keyframes P-inL{from{transform:translate(-50%,-50%) translateX(-95%) rotate(-6deg) scale(.6);opacity:.3}to{transform:translate(-50%,-50%)}}
.P-ghost{position:absolute;left:50%;top:50%;width:var(--w);height:calc(var(--w)*1.5);transform:translate(-50%,-50%);z-index:4;pointer-events:none;border-radius:8px;overflow:hidden;border:3px solid var(--pc)}
.P-ghost img{width:100%;height:100%;object-fit:fill;display:block}
.P-g-next{animation:P-outL .45s ease-in forwards}.P-g-prev{animation:P-outR .45s ease-in forwards}
@keyframes P-outL{to{transform:translate(-50%,-50%) translateX(-110%) rotate(-8deg) scale(.6);opacity:0}}
@keyframes P-outR{to{transform:translate(-50%,-50%) translateX(110%) rotate(8deg) scale(.6);opacity:0}}
.P-deck{position:absolute;top:50%;width:calc(var(--w)*.46);height:calc(var(--w)*.69);transform:translateY(-50%);z-index:3;border:0;padding:0;background:none;cursor:pointer;filter:brightness(.55);transition:filter .2s}
.P-deck:hover{filter:brightness(.8)}
.P-deck img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.6)}
.P-deck img:nth-child(1){transform:translate(-6px,4px) rotate(-4deg)}.P-deck img:nth-child(2){transform:translate(-3px,2px) rotate(-2deg)}
.P-dr img:nth-child(1){transform:translate(6px,4px) rotate(4deg)}.P-dr img:nth-child(2){transform:translate(3px,2px) rotate(2deg)}
.P-dl{left:3%}.P-dr{right:3%}
.P-bottom{position:absolute;bottom:3%;left:0;right:0;z-index:4;text-align:center}
.P-count{color:#c9a84c;font-size:12px;letter-spacing:3px;font-weight:700;margin-bottom:8px}
.P-dots{display:flex;justify-content:center;gap:8px}
.P-dots span{width:6px;height:6px;border-radius:50%;background:rgba(201,168,76,.2);border:1px solid rgba(201,168,76,.4)}
.P-dots .P-on{background:#c9a84c;transform:scale(1.4);box-shadow:0 0 8px rgba(201,168,76,.6)}
.P-hint{color:rgba(201,168,76,.55);font-size:11px;letter-spacing:2px;margin-top:8px}
.P-ov{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(5,0,10,.93)}
.P-modal{position:relative;display:flex;gap:20px;width:700px;max-width:100%;max-height:92vh;overflow-y:auto;padding:24px;border-radius:4px;background:linear-gradient(135deg,#1a0033,#0d001a);border:1px solid var(--cc)}
.P-ml{flex:0 0 42%}.P-ml img{width:100%;aspect-ratio:2/3;object-fit:fill;display:block;border-radius:6px;border:2px solid var(--cc)}
.P-mr{flex:1;display:flex;flex-direction:column;gap:10px;font-size:14px;line-height:1.5}
.P-name{font-size:24px;font-weight:700;letter-spacing:2px;text-shadow:0 0 15px currentColor}
.P-sub{color:#9a7bc7;font-style:italic}.P-arc{font-size:11px;color:#c9a84c;letter-spacing:2px}
.P-sep{height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,.35),transparent)}
.P-desc{font-size:13px;line-height:1.75;color:#c5b0e0;white-space:pre-line}
.P-sec{font-size:10px;color:#c9a84c;letter-spacing:3px}
.P-stats{font-size:12px;color:#b388ff;padding:9px;border-radius:4px;background:rgba(201,168,76,.05);border:1px solid rgba(201,168,76,.15);white-space:pre-line}
.P-btn{padding:11px;border-radius:4px;background:transparent;color:rgba(201,168,76,.8);border:1px solid rgba(201,168,76,.3);font-size:12px;letter-spacing:3px;cursor:pointer}
.P-sel{padding:14px;border-radius:4px;background:linear-gradient(#2a1a3e,#0d0618);color:#c9a84c;border:1px solid #c9a84c;font-size:14px;font-weight:700;letter-spacing:3px;cursor:pointer}
.P-path{position:relative;width:520px;max-width:100%;max-height:92vh;display:flex;flex-direction:column;border-radius:4px;background:linear-gradient(135deg,#1a0033,#0d001a);border:1px solid var(--cc)}
.P-ph{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(201,168,76,.18)}
.P-ph b{font-size:16px;letter-spacing:2px}
.P-pb{padding:16px;overflow-y:auto}
.P-cols{display:flex;gap:8px;margin-bottom:14px}
.P-col{flex:1;display:flex;flex-direction:column;align-items:center}
.P-cn{width:100%;text-align:center;font-size:12px;font-weight:700;color:var(--bc);padding:6px 2px;border-bottom:2px solid var(--bc);margin-bottom:6px;white-space:pre-line}
.P-node{width:100%;text-align:center;padding:5px 3px;font-size:10.5px;color:#d4c0f0;background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.12);border-radius:3px}
.P-ar{font-size:10px;color:rgba(201,168,76,.4);padding:2px 0}
.P-fin{width:100%;text-align:center;padding:6px 3px;font-size:10.5px;font-weight:700;color:#c9a84c;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);border-radius:3px}
.P-hid{padding:12px;border-radius:6px;background:rgba(106,61,154,.08);border-left:3px solid #7b2fff;font-size:12px;line-height:1.9;color:#c5b0e0}
.P-hid b{color:#c9a84c}.P-ht{font-weight:700;color:#b388ff}
.P-mas{margin-top:10px;text-align:center;padding:8px;border:1px solid rgba(201,168,76,.3);border-radius:4px;color:#c9a84c;font-weight:700}
.P-mas small{display:block;font-weight:400;color:#9a7bc7;font-size:11px;margin-top:4px}
.P-say{position:absolute;left:50%;top:5%;z-index:40;width:max-content;max-width:calc(var(--F)*.92);text-align:center;font:500 clamp(14px,calc(var(--F)*.03),20px)/1.75 'Noto Serif KR',serif;letter-spacing:.03em;color:#dcbcff;text-shadow:0 0 10px rgba(160,90,255,.9),0 0 28px rgba(110,40,200,.65),0 2px 4px #000;pointer-events:none;word-break:keep-all;animation:Psay 6s ease forwards}
@keyframes Psay{0%{opacity:0;transform:translate(-50%,10px);filter:blur(5px)}14%{opacity:1;transform:translate(-50%,0);filter:blur(0)}76%{opacity:1;transform:translate(-50%,0);filter:blur(0)}100%{opacity:0;transform:translate(-50%,-8px);filter:blur(4px)}}
.P-tapz{position:absolute;top:50%;right:3%;width:calc(var(--w)*.46);height:calc(var(--w)*.69);transform:translateY(-50%);z-index:6;border:0;padding:0;background:transparent;cursor:default;-webkit-tap-highlight-color:transparent}
.P-say.P-say-t{animation:Ptsay .35s ease forwards}.P-say.P-say-r{color:#ff4646;font-weight:700;text-shadow:0 0 10px rgba(255,0,0,.9),0 0 26px rgba(160,0,0,.8),0 2px 4px #000;animation:Ptsay .35s ease forwards,Pshk .3s ease}
@keyframes Ptsay{0%{opacity:0;transform:translate(-50%,6px);filter:blur(3px)}100%{opacity:1;transform:translate(-50%,0);filter:blur(0)}}
.P-shk{animation:Pfshk .28s ease}
@keyframes Pfshk{0%,100%{translate:0 0}25%{translate:calc(var(--k)*1px) calc(var(--k)*-.6px)}50%{translate:calc(var(--k)*-1px) calc(var(--k)*.5px)}75%{translate:calc(var(--k)*.6px) calc(var(--k)*.4px)}}
@keyframes Pshk{0%,100%{margin-left:0}30%{margin-left:-5px}60%{margin-left:5px}}
.P-crk{position:absolute;inset:0;z-index:30;pointer-events:none;overflow:hidden}
.P-crk img{position:absolute;max-width:none;transform:translate(-50%,-50%)}
.P-crk .P-crkd{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,transparent 30%,rgba(40,0,8,.65))}
.P-shd{position:absolute;inset:0;z-index:0;pointer-events:none}
.P-sh{position:absolute;inset:0;background:#0a0014 center top/cover no-repeat}
.P-fall .P-sh{animation:Pfall 1.7s cubic-bezier(.5,0,.9,.6) forwards}
@keyframes Pfall{to{transform:translate(var(--dx),calc(var(--F)*1.7)) rotate(var(--r));opacity:.1}}
.P-fall .P-stage,.P-fall .P-dim,.P-fall .P-bottom{transition:opacity .5s;opacity:0}
.P-fall .P-crk{transition:opacity .6s;opacity:0}
.P-dark{background:radial-gradient(ellipse at 50% 45%,#2a0612 0%,#0b0206 55%,#000 100%)!important}
.P-bleat{position:absolute;left:0;right:0;top:44%;z-index:40;text-align:center;color:#c33;font:500 clamp(18px,calc(var(--F)*.05),28px) 'Noto Serif KR',serif;letter-spacing:.2em;text-shadow:0 0 14px #800;opacity:0;animation:Pbl 2.2s ease 1.7s forwards}
@keyframes Pbl{20%{opacity:1}80%{opacity:1}100%{opacity:0}}
.P-say.P-say-m{color:#ff9aa6;text-shadow:0 0 10px rgba(200,20,50,.9),0 0 28px rgba(120,0,20,.75),0 2px 4px #000;animation:Psay 10s ease forwards;opacity:0}
.P-say.P-say-late{animation-delay:2.6s}
.P-say-m em{display:block;margin-top:6px;font-size:.8em;font-style:italic;color:#b7a6b0;text-shadow:0 2px 4px #000}
.P-say-m small{display:block;font-size:.72em;letter-spacing:.35em;color:#c9707c;margin-bottom:4px}
.P-alt{position:absolute;inset:0;opacity:0;transition:opacity .45s}
.P-card:hover .P-alt,.P-card:active .P-alt{opacity:1}
.P-front{position:absolute}
.P-e-hid{animation:Phidin 3.2s cubic-bezier(.2,.7,.25,1) both}
.P-e-hid .P-inner{animation:Phidsp 3.2s cubic-bezier(.2,.7,.25,1) both}
@keyframes Phidin{0%{transform:translate(-50%,-50%) scale(.15);opacity:0;filter:drop-shadow(0 0 0 #f00)}12%{opacity:1}100%{transform:translate(-50%,-50%) scale(1);opacity:1;filter:drop-shadow(0 0 22px rgba(200,20,40,.7))}}
@keyframes Phidsp{0%{transform:rotateY(0)}100%{transform:rotateY(1980deg)}}
.P-msg{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);z-index:60;width:max-content;max-width:92vw;text-align:center;line-height:1.6;padding:10px 18px;border-radius:8px;background:#2a0d0d;border:1px solid #c44;color:#fbb;font-size:13px}
@media(max-width:600px){.P-modal{flex-direction:column;padding:14px}.P-ml{flex:none;text-align:center}.P-ml img{height:34vh;width:auto;margin:0 auto}}
`;
// 카드가 앞으로 올 때 그녀가 하는 한마디 (보라색 글자, 떠올랐다 사라짐)
const DS_SAY_MOM="여덟 번째 카드, 외신의 축복. 숲의 검은 양이 고른 아이만 이 길을 걷는단다. 몸은 약하지만, 정신은 별 너머에 닿지...",DS_SAY_MOM2="(두 사람의 목소리가 들리는 것 같다)";
const DS_SAY={"warrior": "검을 쥐려고? 끝까지 쓰러지지 않는 자… 네 피가 곧 성벽이 되는 길이야.", "mage": "세상이 잊은 언어를 기억하는 길이네. 언젠가 별에게 대답하게 될지도 몰라.", "crossbow": "한 발이면 충분하대. 비겁하다고? 살아남은 쪽이 이기는 거야.", "jester": "후후, 광대라니. 웃음 뒤에 칼을 숨기는 길이야. 세상이 웃는 동안 넌 이미 이긴 거고.", "commander": "깃발이구나. 모두가 널 따라 죽게 될 거야. 가장 높은 곳엔 화살이 먼저 날아오고.", "pacifist": "싸우지 않는 길? 재밌네. 웃으면서 양보하는 애가… 마지막엔 꼭 살아남더라.", "hero": "어머, 얼굴 없는 카드를 집었네. 모두가 포기한 길을 끝까지 걷겠다고?"};
const DS_CSS=DS_CSS_SRC.replace(/\.P-/g,'.dsx-')+DS_CSS_SRC.replace(/\.P-/g,'.x-risu-dsx-').replace(/@keyframes [\s\S]*?\}\}/g,'');
const dsEsc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let ds=null; // {root,view,assets,mode,idx,detail,path,anim}
const A=k=>IMG_BASE?ghv(IMG_BASE+(IMG_FILES[k]||'')):(ds&&ds.assets[k]?ds.assets[k]:'');
function dsImg(k,cls){return `<img class="${cls||''}" src="${dsEsc(A(k))}" alt="">`}

const dsList=()=>JOBS.filter(j=>!j.hide||(ds&&ds.outer));
const DS_TAP={5:'…응? 거긴 아무것도 없어.',6:'카드는 일곱 장뿐이야. 세어 봐.',7:'탁자가 좀 낡았지? 그냥 흠집이야.',8:'그만 만지고 고르기나 해.',9:'후후, 꽤 끈질기네. 그래도 없는 건 없는 거야.',
 10:'그만두라고 했잖아.',11:'거기서 손 떼.',12:'너는 그게 뭔지 몰라.',13:'듣고 있어? 그만해!',14:'그건 카드가 아니야. 문이야.',15:'열면… 다시는 닫을 수 없어!',
 16:'제발… 부탁이야. 다른 걸 골라.',17:'나도 그걸 본 적 있어. 그래서 이렇게 된 거야.',18:'왜 하필 너는…!',19:'……',20:'…좋아. 마음대로 해. 대신 나는 경고했어.'};
const DS_TAP_RED=[10,11,12,13,14,15,18];
// 금: 누를 때마다 새 충격점, 먼저 생긴 금은 점점 커짐. 19번부터 화면 전체가 조각으로 갈라짐
const DS_CRK=[[82,50,0],[62,28,40],[28,64,-30],[72,80,75],[20,22,120],[46,48,200],[90,14,-80],[12,88,160],[55,10,15],[36,94,-120],[50,36,260]];
function dsCrack(t){
 if(t<10)return '';
 const k=Math.min(11,t-9);let h='<div class="dsx-crk">';
 for(let j=0;j<k;j++){const [x,y,r]=DS_CRK[j],age=k-j;let w=(j===0?70:45)+age*(j===0?14:10);if(t>=19)w*=1.35;if(t>=20)w*=1.15;
  h+=`<img src="${dsEsc(A('CRK'))}" style="left:${x}%;top:${y}%;width:${Math.round(w)}%;rotate:${r}deg;opacity:${Math.min(1,.55+age*.1).toFixed(2)}" alt="">`}
 if(t>=16)h+=`<div class="dsx-crkd" style="opacity:${t>=19?1:t>=18?.7:.4}"></div>`;
 return h+'</div>';
}
function dsShards(lv){
 // 바탕 그림을 삼각형 조각으로 잘라 살짝 어긋나게 (lv 1=19번 · 2=20번 · 3=떨어짐)
 let seed=77;const R=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const cols=5,rows=8,pt=[];let h=`<div class="dsx-shd">`;
 for(let y=0;y<=rows;y++){pt.push([]);for(let x=0;x<=cols;x++){const jx=(x>0&&x<cols)?(R()-.5)*.7:0,jy=(y>0&&y<rows)?(R()-.5)*.7:0;pt[y].push([(x+jx)/cols*100,(y+jy)/rows*100])}}
 const bgi=`background-image:url('${dsEsc(A('A9'))}')`,m=lv===1?.6:1.8;
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=pt[y][x],b=pt[y][x+1],c=pt[y+1][x+1],d=pt[y+1][x];
  for(const t of(R()<.5?[[a,b,c],[a,c,d]]:[[a,b,d],[b,c,d]])){const dx=R()-.5,dy=R()-.5,rr=R()-.5,br=R(),dl=R();
   h+=`<div class="dsx-sh" style="${bgi};clip-path:polygon(${t.map(p=>p[0].toFixed(1)+'% '+p[1].toFixed(1)+'%').join(',')});transform:translate(${(dx*m).toFixed(2)}%,${(dy*m*.6).toFixed(2)}%)${lv>=2?` rotate(${(rr*3).toFixed(1)}deg)`:''};filter:brightness(${(lv>=2?.5+br*.6:.75+br*.4).toFixed(2)});animation-delay:${(dl*.5+y/rows*.4).toFixed(2)}s;--r:${(rr*140).toFixed(0)}deg;--dx:${(dx*120).toFixed(0)}px"></div>`}}
 return h+'</div>';
}
function dsOuterKey(k){return 'dsx-outer:'+(k||'')}
function dsHTML(){
 const s=ds;let h='<button class="dsx-x dsx-act-close">✕</button>';
 if(s.mode==='intro'){
  h+='<div class="dsx-frame">';for(let i=1;i<=9;i++)h+=`<img class="dsx-f" style="animation-delay:${(i-1)*.2}s" src="${dsEsc(A('A'+i))}" alt="">`;
  return h+'<button class="dsx-start dsx-act-reveal">REVEAL THE CARDS</button></div>';
 }
 const j=dsList()[s.idx-1],deck=`${dsImg('CB')}${dsImg('CB')}${dsImg('CB')}`;
 const dark=j.id==='outer'||s.fall,shk=s.taps>=10&&s.enter==='tap';
 h+=`<div class="dsx-frame${dark?' dsx-dark':''}${shk?' dsx-shk':''}${s.fall?' dsx-fall':''}" style="${dark?'':`background-image:url('${dsEsc(A('A9'))}');`}--k:${s.taps>=10?3+s.taps/3:1.5}">`;
 if(s.taps>=19&&j.id==='hero')h+=dsShards(s.fall?3:s.taps>=20?2:1);
 h+=`<div class="dsx-dim"></div><div class="dsx-stage">`;
 if(s.idx>1)h+=`<button class="dsx-deck dsx-dl dsx-act-prev">${deck}</button>`;
 if(s.idx<dsList().length)h+=`<button class="dsx-deck dsx-dr dsx-act-next">${deck}</button>`;
 else if(j.id==='hero'&&!s.outer&&!s.fall&&s.taps<20)h+=`<button class="dsx-tapz dsx-act-tap" aria-label=""></button>`;
 if(s.ghost){const g=dsList()[s.ghost-1];h+=`<div class="dsx-ghost dsx-g-${s.enter}" style="--pc:${g.color}">${dsImg(g.asset.replace('.png',''))}</div>`}
 h+=`<div class="dsx-card dsx-act-detail${s.enter?' dsx-e-'+s.enter:''}" style="--cc:${j.color}"><div class="dsx-inner"><div class="dsx-back">${dsImg(j.id==='outer'?'CB8':'CB')}</div><div class="dsx-front">${dsImg(j.asset.replace('.png',''))}${j.id==='outer'?dsImg('J08X','dsx-alt'):''}</div></div></div>`;
 h+=`</div><div class="dsx-bottom"><div class="dsx-count">${s.idx} / ${dsList().length}</div><div class="dsx-dots">`;
 for(let i=1;i<=dsList().length;i++)h+=`<span class="${i===s.idx?'dsx-on':''}"></span>`;
 h+='</div><div class="dsx-hint">카드를 눌러 자세히 보기 · 양옆 카드 또는 밀어서 넘기기</div></div>';
 if(s.taps>=5&&!s.fall&&j.id==='hero'&&DS_TAP[s.taps])h+=`<div class="dsx-say dsx-say-t${DS_TAP_RED.includes(s.taps)?' dsx-say-r':''}">${dsEsc(DS_TAP[s.taps])}</div>`;
 else if(s.say&&j.id==='outer')h+=`<div class="dsx-say dsx-say-m${s.enter==='hid'?' dsx-say-late':''}"><small>— 어머니 —</small>${dsEsc(DS_SAY_MOM)}<em>${dsEsc(DS_SAY_MOM2)}</em></div>`;
 else if(s.say&&DS_SAY[j.id])h+=`<div class="dsx-say">${dsEsc(DS_SAY[j.id])}</div>`;
 if(j.id==='hero'&&!s.fall)h+=dsCrack(s.taps);
 if(s.fall)h+='<div class="dsx-bleat">— 메에에… —</div>';
 h+='</div>';
 if(s.detail){
  h+=`<div class="dsx-ov"><div class="dsx-modal" style="--cc:${j.color}"><div class="dsx-ml">${dsImg(j.asset.replace('.png',''))}</div><div class="dsx-mr">
   <div class="dsx-name" style="color:${j.color}">${dsEsc(j.name)}</div><div class="dsx-sub">${dsEsc(j.sub)}</div><div class="dsx-arc">${dsEsc(j.arcana)}</div>
   <div class="dsx-sep"></div><div class="dsx-desc">${dsEsc(j.desc)}</div><div class="dsx-sep"></div>
   <div class="dsx-sec">STATS</div><div class="dsx-stats">${dsEsc(j.stats)}</div><div class="dsx-sec">GROWTH</div><div class="dsx-stats">${dsEsc(j.growth)}</div>
   <button class="dsx-btn dsx-act-path">CLASS PATH</button><div class="dsx-sep"></div>
   <button class="dsx-sel dsx-act-select">SELECT THIS FATE</button><button class="dsx-btn dsx-act-back">RETURN</button></div></div></div>`;
 }
 if(s.path){
  h+=`<div class="dsx-ov"><div class="dsx-path" style="--cc:${j.color}"><div class="dsx-ph"><b style="color:${j.color}">${dsEsc(j.name)} — CLASS PATH</b><button class="dsx-btn dsx-act-pathclose">✕</button></div><div class="dsx-pb"><div class="dsx-cols">`;
  for(const c of j.cols){h+=`<div class="dsx-col" style="--bc:${c[1]}"><div class="dsx-cn">${dsEsc(c[0])}</div>`;for(const n of c[2])h+=`<div class="dsx-node">${dsEsc(n)}</div><div class="dsx-ar">↓</div>`;h+=`<div class="dsx-fin">${dsEsc(c[3])}</div></div>`}
  h+='</div>';
  if(j.hidden.length||j.master){h+=`<div class="dsx-hid"><div class="dsx-ht">${dsEsc(j.hiddenTitle||'Hidden')}</div>`;for(const x of j.hidden)h+=`<div>${dsEsc(x[0])} = <b>${dsEsc(x[1])}</b></div>`;
   h+=`<div class="dsx-mas">${dsEsc(j.master)}${j.masterSub?`<small>${dsEsc(j.masterSub)}</small>`:''}</div></div>`}
  h+='</div></div></div>';
 }
 if(s.msg)h+=`<div class="dsx-msg">${dsEsc(s.msg)}</div>`;
 return h;
}
let dsBusy=false,dsLastTap=0;
async function dsRender(){
 if(!ds)return;
 await ds.view.setInnerHTML(dsHTML());
 const list=await ds.view.querySelectorAll('[class*="dsx-act-"]');const n=await list.length();
 for(let i=0;i<n;i++){const el=await list.at(i);const cls=await el.getClassName()||'';const m=cls.match(/dsx-act-([a-z]+)/);if(!m)continue;const act=m[1];
  await el.addEventListener('click',async ev=>{
   try{if(!(Number.isFinite(ev?.clientX))||(ev.clientX===0&&ev.clientY===0))return;
    const r=await el.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)return;
    const now=Date.now();if(now-dsLastTap<250)return;dsLastTap=now;await dsAct(act)}catch(e){err('ds click',e)}});
 }
 // 좌우로 밀어 넘기기
 if(ds.mode==='cards'&&!ds.detail&&!ds.path){
  const st=await ds.view.querySelector('[class*="dsx-stage"]');
  if(st){let x0=null;
   await st.addEventListener('pointerdown',ev=>{x0=ev.clientX});
   await st.addEventListener('pointerup',ev=>{if(x0===null)return;const dx=ev.clientX-x0;x0=null;if(Math.abs(dx)>50){dsLastTap=Date.now();dsAct(dx<0?'next':'prev')}});}
 }
}
async function dsAct(a){
 const s=ds;if(!s)return;
 if(s.fall&&a!=='close')return; // 깨지는 중엔 다른 입력 무시
 s.msg='';s.enter='';s.ghost=0;s.say=a==='reveal'||a==='next'||a==='prev';
 if(a!=='tap'&&a!=='close'&&s.taps<20)s.taps=0; // 다른 걸 누르면 처음부터
 if(a==='close')return dsClose();
 if(a==='tap'){
  if(s.outer||dsList()[s.idx-1].id!=='hero'||s.taps>=20)return;
  s.taps++;s.enter='tap';
  if(s.taps===20)dsShatter(s);
  return dsRender();
 }
 if(a==='reveal'){s.mode='cards';s.idx=1;s.enter='reveal'}
 else if(a==='next'&&s.idx<dsList().length){s.ghost=s.idx;s.idx++;s.enter='next'}
 else if(a==='prev'&&s.idx>1){s.ghost=s.idx;s.idx--;s.enter='prev'}
 else if(a==='detail')s.detail=true;
 else if(a==='back'){s.detail=false;s.path=false}
 else if(a==='path')s.path=true;
 else if(a==='pathclose')s.path=false;
 else if(a==='select'){
  if(dsBusy)return;dsBusy=true;
  // 저장 권한 확인 창이 이 화면 뒤에 가려지지 않도록, 저장하는 동안 화면을 잠시 숨김
  try{await s.root.setStyle('display','none')}catch{}
  try{const pj=dsList()[s.idx-1];await dsSave(pj);dsBusy=false;await dsClose(true);introPlay(pj.id).catch(e=>err('intro',e)).finally(()=>bgmStop().catch(()=>{}));return}
  catch(e){s.msg=String(e?.message||e);err('ds save',e)}
  dsBusy=false;if(ds!==s)return;
  try{await s.root.setStyle('display','')}catch{}
 }
 else return;
 await dsRender();
}
// 20번째: 대사 → 화면이 깨져 떨어짐 → 양 울음소리 → 어둠 속에서 8번째 카드가 돌며 나타남
function dsShatter(s){
 const ok=()=>ds===s;
 setTimeout(()=>{if(!ok())return;s.fall=true;s.enter='';bgmStop().catch(()=>{});dsRender()},2600);
 // 다시 그리면 떨어지던 조각이 처음부터 다시 떨어지므로, 울음소리는 소리만 냄 (글자는 CSS 지연으로 나타남)
 setTimeout(()=>{if(!ok())return;
  try{if(GH_BASE){const au=new Audio(ghv(GH_BASE+'sfx/bleat.mp3'));au.volume=.9;au.play().catch(()=>{})}}catch{}},4300);
 setTimeout(()=>{if(!ok())return;s.fall=false;s.outer=true;s.taps=0;s.idx=dsList().length;s.enter='hid';s.say=true;
  try{localStorage.setItem(dsOuterKey(s.key),'1')}catch{}
  dsRender()},6600);
}
async function dsSave(j){
 const ci=await host.getCurrentCharacterIndex(),ch=await host.getCurrentChatIndex();
 const chat=await host.getChatFromIndex(ci,ch);if(!chat)throw Error('채팅을 찾지 못했어요');
 if(chat.isStreaming)throw Error('AI 답변이 끝난 뒤 골라 주세요');
 const next=JSON.parse(JSON.stringify(chat));next.scriptstate=next.scriptstate||{};
 next.scriptstate['$ds_pick']=j.id;next.scriptstate['$JOB']=String(j.n);
 for(let k=1;k<=8;k++)next.scriptstate['$J0'+k]=k===j.n?'1':'';
 await host.setChatToIndex(ci,ch,next);
 const chk=await host.getChatFromIndex(ci,ch);
 if(!chk||!chk.scriptstate||chk.scriptstate['$ds_pick']!==j.id)throw Error('저장 권한이 거부된 상태예요. RisuAI를 새로고침한 뒤 다시 고르고, Confirm 창에서 YES를 눌러 주세요');
}
async function dsClose(keepBgm){
 if(!ds)return;const r=ds.root;ds=null;if(!keepBgm)bgmStop().catch(()=>{});
 try{await r.remove()}catch{}release(r);
}
async function dsOpen(){
 if(ds||!doc)return;
 const assets={};
 const l=await doc.querySelectorAll('[class*="dm-dsa-"]');const n=l?await l.length():0;
 for(let i=0;i<n;i++){const el=await l.at(i);try{const cls=await el.getClassName()||'',st=await el.getStyleAttribute()||'';
  const k=(cls.match(/dm-dsa-([A-Za-z0-9]+)/)||[])[1],u=(st.match(/url\((['"]?)(.*?)\1\)/)||[])[2];if(k&&u)assets[k]=u}finally{release(el)}}
 bgmStart('destiny',assets.BGM).catch(e=>err('bgm',e));
 const body=await doc.querySelector('body');
 const root=await doc.createElement('div');await root.setClassName('dsx-root');
 const style=await doc.createElement('style');await style.setTextContent(DS_CSS);await root.appendChild(style);
 const view=await doc.createElement('div');await root.appendChild(view);
 await body.appendChild(root);release(body);
 const key=await chatKey();let outer=false;try{outer=localStorage.getItem(dsOuterKey(key))==='1'}catch{}
 ds={root,view,assets,mode:'intro',idx:1,detail:false,path:false,enter:'',ghost:0,msg:'',taps:0,key,outer};
 await dsRender();
}
let dsLastReq=null,dsLastChat=null;
async function dsScan(){
 const key=await chatKey();
 if(key!==dsLastChat){dsLastChat=key;dsLastReq=null;if(ds)dsClose()}
 const l=await doc.querySelectorAll('[class*="dm-dsreq-"]');const n=l?await l.length():0;
 if(!n)return;
 const el=await l.at(n-1);let cls='';try{cls=await el.getClassName()||''}finally{release(el)}
 const req=+((cls.match(/dm-dsreq-(\d+)/)||[])[1]||0);
 if(dsLastReq===null){dsLastReq=req;return}
 if(req>dsLastReq){dsLastReq=req;dsOpen().catch(e=>err('ds open',e))}
 else if(req<dsLastReq)dsLastReq=req;
}

let lastN=null,lastChat=null;
async function chatKey(){try{return (await host.getCurrentCharacterIndex())+':'+(await host.getCurrentChatIndex())}catch{return null}}
async function scan(){
 // Lua의 간이 연출은 숨김 (플러그인이 대신 재생)
 try{const l=await doc.querySelectorAll('[class*="dm-fx"]');if(l){const n=await l.length();for(let i=0;i<n;i++){const el=await l.at(i);try{await el.setStyle('display','none')}catch{}release(el)}}}catch(e){err('hide',e)}
 const key=await chatKey();
 if(key!==lastChat){lastChat=key;lastN=null}
 const list=await doc.querySelectorAll('[class*="dfx-q"]');if(!list)return;
 const n=await list.length();diag.seen=n;if(n>diag.maxSeen)diag.maxSeen=n;
 if(!n){if(lastN===null)lastN=0;return}
 const el=await list.at(n-1);let cls='';try{cls=await el.getClassName()||''}catch{}finally{release(el)}
 const g=k=>{const m=cls.match(new RegExp('dfx-'+k+'-([A-Za-z0-9_]+)'));return m?m[1]:''};
 const req=+g('n')||0;
 const rec=t=>{diag.hist.push(new Date().toLocaleTimeString()+' '+t);if(diag.hist.length>8)diag.hist.shift()};
 if(diag.lastReq!==String(req)){diag.lastReq=String(req);rec('표식 #'+req+' ('+g('k')+') 발견 · 기준 '+lastN+(playing?' · 재생 중이라 대기':''))}
 if(lastN===null){lastN=req;rec('첫 검사 → 기준만 잡음 (재생 안 함)');return}
 if(req>lastN){lastN=req;const k=g('k'),b=g('b');
  if(k==='book'){const pa=hexText(g('a')).split('|'),ev=pa[0],un=hexText(g('u'));
   if(pa[1]==='reborn'||pa[1]==='corrupt'){storyPlay(ev,null,un,pa[1],pa[2]).catch(e=>err('story',e));return}
   const bo=b?{code:b,name:hexText(g('t')),f:{char:hexText(g('fc')),bg:hexText(g('fb')),mbg:hexText(g('fm')),mark:hexText(g('fk')),bgm:hexText(g('fg'))}}:null;
   storyPlay(ev,bo,un,pa[1]||'spare').catch(e=>err('story',e));return}
  if(k==='battle'){let P=null;try{P=JSON.parse(hexText(g('a')))}catch(e){err('battle json',e)}if(P&&P.m==='scout')scoutPlay(P).catch(e=>err('scout',e));else if(P)battlePlay(P).catch(e=>err('battle',e));return}
  if(k==='boss'&&b){const f={char:hexText(g('fc')),bg:hexText(g('fb')),mbg:hexText(g('fm')),mark:hexText(g('fk')),bgm:hexText(g('fg'))};
   if(await bossPlayLocal(b,hexText(g('t')),f))return;
   if(await bossPlay(b,hexText(g('t'))))return}
  play(k,hexText(g('a')),hexText(g('s')),g('c'))}
 else if(req<lastN)lastN=req;
}
// 답변 아래 "다시보기 / 펼쳐보기" → dm-bkreq-<번호> 가 오르면 그 책을 엶
let bkLastReq=null,bkLastChat=null;
async function bkScan(){
 const key=await chatKey();
 if(key!==bkLastChat){bkLastChat=key;bkLastReq=null}
 const l=await doc.querySelectorAll('[class*="dm-bkreq-"]');const n=l?await l.length():0;
 if(!n)return;
 // 표식이 여러 개(둥지 버튼 줄 + 각 답변 아래 책 버튼)면 가장 큰 번호를 씀 → 일부만 다시 그려져도 놓치지 않음
 let req=-1,id='',un='';
 for(let i=0;i<n;i++){const el=await l.at(i);let cls='';try{cls=await el.getClassName()||''}finally{release(el)}
  const r=+((cls.match(/dm-bkreq-(\d+)/)||[])[1]||0);if(r>req){req=r;id=hexText((cls.match(/dm-bkid-([0-9a-f]+)/)||[])[1]||'');un=hexText((cls.match(/dm-bku-([0-9a-f]+)/)||[])[1]||'')}}
 if(bkLastReq===null){bkLastReq=req;return}
 if(req>bkLastReq){bkLastReq=req;const ip=id.split('|');const sc=(ip[2]||'').startsWith('S:')?ip[2].slice(2):'';if(ip[0].startsWith('lb:'))cbkPlay(ip[0],sc).catch(e=>err('cbk',e));else if(STORIES[ip[0]])shelfStory(ip[0],sc,un,ip[1]||undefined).catch(e=>err('story',e))}
 else if(req<bkLastReq)bkLastReq=req;
}

/* ---------- 새 채팅 옮기기 (베타): 저장 코드 만들기 / 불러오기 ----------
   만들기: 이 채팅의 상태($G)를 코드로 → 복사
   불러오기: 코드를 붙여 넣으면 채팅 변수 dm_import 에 넣음 → 채팅 화면의 [불러오기] 버튼으로 Lua 가 적용 */
const SV_TAG='DMSAVE1';
function svB64(str){const b=new TextEncoder().encode(str);let o='';for(let i=0;i<b.length;i+=0x8000)o+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(o)}
function svUnB64(b64){const bin=atob(b64);const b=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);return new TextDecoder().decode(b)}
function svMake(json){const S=JSON.parse(json);delete S.snap;delete S.bk;delete S.hpf;const js=JSON.stringify(S);const b=svB64(js);return SV_TAG+'.'+b.length+'.'+b}
function svRead(code){
 const c=String(code||'').replace(/\s+/g,'');
 const m=c.match(/^DMSAVE1\.(\d+)\.([A-Za-z0-9+/=]+)$/);
 if(!m)throw Error('저장 코드 형식이 아니에요. 처음(DMSAVE1.)부터 끝까지 전부 붙여 넣었는지 확인해 주세요.');
 if(+m[1]!==m[2].length)throw Error('코드가 잘렸어요 (길이 '+m[2].length+' / '+m[1]+'). 복사할 때 끝까지 선택됐는지 확인해 주세요.');
 let S;try{S=JSON.parse(svUnB64(m[2]))}catch{throw Error('코드를 풀지 못했어요. 다시 복사해 주세요.')}
 if(!S||typeof S!=='object'||!S.reg||!Array.isArray(S.codex))throw Error('이 봇의 저장 코드가 아니에요.');
 return S;
}
function svWin(title,inner){
 document.body.innerHTML=`<div class="sv"><div class="sv-box"><div class="sv-h"><b>${esc(title)}</b><small>베타</small><button class="sv-x" data-a="x">✕</button></div>${inner}<div class="sv-msg"></div></div></div>`;
}
async function svOpen(kind){
 if(playing)return;playing=true;
 let onClick=null;
 try{
  ensureHead();
  const ci=await host.getCurrentCharacterIndex(),ch=await host.getCurrentChatIndex();
  if(kind==='x'){
   const chat=await host.getChatFromIndex(ci,ch);const g=chat&&chat.scriptstate&&chat.scriptstate['$G'];
   let code='',e='';try{if(!g)throw Error('아직 저장된 진행이 없어요.');code=svMake(g)}catch(x){e=String(x.message||x)}
   svWin('저장 코드 만들기',e?`<p class="sv-p">${esc(e)}</p><div class="sv-btns"><button class="sv-b" data-a="x">닫기</button></div>`
    :`<p class="sv-p">지금 진행 상태(도감·포로·둥지·레벨·지역·게이지)를 담은 코드예요. 전부 복사해서 새 채팅의 <b>저장 코드 불러오기</b>에 붙여 넣으세요. 이야기 본문은 옮겨지지 않아요.</p>
     <textarea class="sv-t" readonly>${esc(code)}</textarea><p class="sv-s">${(code.length/1024).toFixed(1)} KB</p>
     <div class="sv-btns"><button class="sv-b sv-go" data-a="copy">복사</button><button class="sv-b" data-a="x">닫기</button></div>`);
  }else{
   svWin('저장 코드 불러오기',`<p class="sv-p">다른 채팅에서 만든 저장 코드를 전부 붙여 넣으세요. 확인 창이 뜨면 YES를 눌러 주세요.</p>
    <textarea class="sv-t" placeholder="DMSAVE1. 으로 시작하는 코드"></textarea>
    <div class="sv-btns"><button class="sv-b sv-go" data-a="load">불러오기</button><button class="sv-b" data-a="x">닫기</button></div>`);
  }
  await host.showContainer('fullscreen');
  const msg=t=>{const m=document.querySelector('.sv-msg');if(m)m.textContent=t};
  let done;const end=new Promise(r=>done=r);let busy=false;
  onClick=async ev=>{
   const a=ev.target.closest&&ev.target.closest('[data-a]');if(!a||busy)return;const k=a.dataset.a;
   if(k==='x')return done();
   const t=document.querySelector('.sv-t');
   if(k==='copy'){
    let ok=false;try{await navigator.clipboard.writeText(t.value);ok=true}catch{}
    if(!ok){try{t.focus();t.select();t.setSelectionRange(0,t.value.length);ok=document.execCommand('copy')}catch{}}
    msg(ok?'복사했어요.':'자동 복사가 막혀 있어요. 위 칸을 길게 눌러 전체 선택 → 복사해 주세요.');
    if(!ok){t.focus();t.select()}
   }
   if(k==='load'){
    busy=true;
    try{
     const S=svRead(t.value);
     msg('저장하는 중… 확인 창이 뜨면 YES');
     const chat=await host.getChatFromIndex(ci,ch);if(!chat)throw Error('채팅을 찾지 못했어요.');
     if(chat.isStreaming)throw Error('AI 답변이 끝난 뒤 해 주세요.');
     const next=JSON.parse(JSON.stringify(chat));next.scriptstate=next.scriptstate||{};
     next.scriptstate['$dm_import']=JSON.stringify(S);
     await host.setChatToIndex(ci,ch,next);
     const chk=await host.getChatFromIndex(ci,ch);
     if(!chk||!chk.scriptstate||!chk.scriptstate['$dm_import'])throw Error('저장 권한이 거부된 상태예요. RisuAI를 새로고침한 뒤 다시 하고, 확인 창에서 YES를 눌러 주세요.');
     msg('받았어요. 채팅 화면에 뜬 [불러오기] 버튼을 눌러 적용해 주세요.');
     setTimeout(done,1600);
    }catch(x){msg(String(x.message||x))}
    busy=false;
   }
  };
  document.addEventListener('click',onClick);
  await end;
 }catch(e){err('save',e)}
 if(onClick)document.removeEventListener('click',onClick);
 document.body.innerHTML='';try{await host.hideContainer()}catch(e){err('close',e)}
 playing=false;
}
let svLast=null,svChat=null;
async function svScan(){
 const key=await chatKey();
 if(key!==svChat){svChat=key;svLast=null}
 const l=await doc.querySelectorAll('[class*="dm-xreq-"]');const n=l?await l.length():0;
 if(!n)return;
 let x=0,im=0;
 for(let i=0;i<n;i++){const el=await l.at(i);let c='';try{c=await el.getClassName()||''}finally{release(el)}
  x=Math.max(x,+((c.match(/dm-xreq-(\d+)/)||[])[1]||0));im=Math.max(im,+((c.match(/dm-ireq-(\d+)/)||[])[1]||0))}
 if(svLast===null){svLast={x,im};return}
 if(x>svLast.x){svLast.x=x;svOpen('x').catch(e=>err('save',e))}
 else if(im>svLast.im){svLast.im=im;svOpen('i').catch(e=>err('save',e))}
 if(x<svLast.x)svLast.x=x;if(im<svLast.im)svLast.im=im;
}
async function refresh(){
 if(stopped||!doc)return;
 if(running){if(diag.runSince&&Date.now()-diag.runSince>8000){diag.hist.push('검사 멈춤 → 다시 시작');running=false}else{again=true;return}}
 running=true;diag.runSince=Date.now();diag.scans++;diag.lastScan=Date.now();
 try{await scan()}catch(e){err('scan',e)}
 try{await dsScan()}catch(e){err('ds',e)}
 try{await bkScan()}catch(e){err('bk',e)}
 try{await svScan()}catch(e){err('sv',e)}
 finally{running=false;if(again){again=false;schedule()}}
}
function schedule(){if(stopped)return;clearTimeout(timer);timer=setTimeout(refresh,60)}

let asked=false;
async function attach(){
 if(doc||stopped)return;
 try{
  if(!asked&&typeof host.requestPluginPermission==='function'){asked=true;try{diag.perm=String(await host.requestPluginPermission('mainDom'))}catch(e){diag.perm='오류'}}
  const d=await host.getRootDocument();
  if(!d){diag.doc='권한 없음';return}
  doc=d;diag.doc='연결됨';
  observer=await host.createMutationObserver(()=>schedule());
  // 화면이 통째로 다시 그려지지 않고 class 만 바뀌는 경우도 잡음
  try{await observer.observe(doc,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})}
  catch{await observer.observe(doc,{childList:true,subtree:true})}
  schedule();
 }catch(e){diag.doc='오류';err('attach',e)}
}
await attach();
const poll=setInterval(()=>{if(!doc)attach();else if(!playing)schedule()},1500);

async function showDiag(){
 ensureHead();
 document.body.innerHTML='<div style="position:fixed;inset:0;overflow:auto;background:#0d0b08;color:#e6dccb;font:13px/1.8 sans-serif;padding:20px;white-space:pre-wrap" id="d"></div>';
 document.getElementById('d').textContent=['둥지 시스템 연출 + 운명선택 진단 v1.55.4','','페이지 접근: '+diag.doc+' (권한 응답: '+diag.perm+')','연출 표식 발견: '+diag.seen+'개 (지금까지 최대 '+diag.maxSeen+'개)','재생 횟수: '+diag.played,'화면 검사: '+diag.scans+'번 · 마지막 '+(diag.lastScan?Math.round((Date.now()-diag.lastScan)/1000)+'초 전':'없음'),'재생 중 표시: '+(playing?'예':'아니오')+' · 검사 중 표시: '+(running?'예':'아니오'),'','최근 기록:',...(diag.hist.length?diag.hist:['(없음)']),'',
  '최근 오류:',...(diag.errors.length?diag.errors:['없음']),'','[미리보기] 아래 화면을 누르면 닫혀요.'].join('\n');
 document.body.addEventListener('click',async()=>{document.body.innerHTML='';try{await host.hideContainer()}catch{}},{once:true});
 await host.showContainer('fullscreen');
}
if(typeof host.registerSetting==='function'){try{await host.registerSetting('둥지 시스템 연출 진단',showDiag,'✦','html','demon-fx-diag')}catch(e){err('setting',e)}}
if(typeof host.onUnload==='function')await host.onUnload(async()=>{stopped=true;try{await dsClose()}catch{}try{await bossClose()}catch{}clearInterval(poll);clearTimeout(timer);try{await observer?.disconnect()}catch{}});
})();
