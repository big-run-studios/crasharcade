/* Select 100 Mate-in-Five setups from the Lichess dump (CC0).
   Filters for quality, verifies the source solution line with our engine,
   proves the SHORTEST forced mate (so multiplier buckets are honest),
   and normalizes every position to White-to-move. */
'use strict';
const fs=require('fs'), readline=require('readline');
const CH=require('../lib/chess.js');

const QUOTA={1:10,2:25,3:30,4:20,5:15};
const OVERCOLLECT=6;             // gather 6x quota per bucket, then pick a rating spread
const MAX_PIECES=12;             // total pieces incl. kings, mobile readability
const MIN_POP=92, MIN_PLAYS=800;
const RATING_MIN=600, RATING_MAX=2200;
const PROVE_CAP=400000;

const buckets={1:[],2:[],3:[],4:[],5:[]};
const need=n=>buckets[n].length<QUOTA[n]*OVERCOLLECT;
let rows=0,kept=0,proved=0,capped=0,lineBad=0;

const g=new CH.Game();

function pieceCount(game){
  let n=0;
  for(let s=0;s<128;s++)if(CH.okSq(s)&&game.bd[s])n++;
  return n;
}

const rl=readline.createInterface({input:fs.createReadStream('mate-candidates.csv'),crlfDelay:Infinity});
rl.on('line',line=>{
  rows++;
  if((rows%200000)===0)console.error(`rows=${rows} kept=${kept} proved=${proved} capped=${capped} buckets=${[1,2,3,4,5].map(n=>buckets[n].length).join('/')}`);
  const f=line.split(',');
  if(f.length<8)return;
  const [id,fen,movesStr,rating,,pop,plays,themes]=f;
  const m5=/mateIn([1-5])\b/.exec(themes);
  if(!m5)return;
  const X=+m5[1];
  if(!need(X))return;
  if(+pop<MIN_POP||+plays<MIN_PLAYS)return;
  if(+rating<RATING_MIN||+rating>RATING_MAX)return;
  if(!/\bendgame\b/.test(themes))return;
  const moves=movesStr.split(' ');
  if(moves.length%2!==0)return;          // opponent setup + alternating, ends on player mate
  if(moves.length/2!==X)return;          // mateIn5 = "5 or more" on lichess; require exact
  try{ g.loadFEN(fen); }catch(e){ return; }
  // apply the setup move (lichess FEN is the position BEFORE the opponent's setup move)
  const setup=g.fromUci(moves[0]);
  if(!setup){lineBad++;return;}
  g.make(setup);
  if(pieceCount(g)>MAX_PIECES)return;
  // engine-verify the rest of the source line is legal and ends in checkmate
  let okLine=true;
  let made=0;
  for(let i=1;i<moves.length;i++){
    const mv=g.fromUci(moves[i]);
    if(!mv){okLine=false;break;}
    g.make(mv); made++;
  }
  if(okLine&&g.status()!=='mate')okLine=false;
  for(let i=0;i<made;i++)g.unmake();
  if(!okLine){lineBad++;return;}
  // prove the shortest forced mate == X
  const dist=g.mateDistance(X,PROVE_CAP);
  if(dist===-1){capped++;return;}
  if(dist!==X)return;                    // faster mate exists (or none proven) — bucket would lie
  proved++;
  // normalize: player is always White
  let pfen=g.fen(), refLine=moves.slice(1);
  if(g.turn===CH.B){ pfen=CH.flipFEN(pfen); refLine=refLine.map(CH.flipUci); }
  buckets[X].push({id,fen:pfen,mateIn:X,rating:+rating,pop:+pop,plays:+plays,line:refLine});
  kept++;
  if([1,2,3,4,5].every(n=>!need(n))){rl.close();}
});
rl.on('close',()=>{
  // pick a rating spread per bucket: sort by rating, take evenly spaced
  const out=[];
  for(const n of [1,2,3,4,5]){
    const arr=buckets[n].sort((a,b)=>a.rating-b.rating);
    const q=QUOTA[n];
    if(arr.length<q){console.error(`bucket ${n}: only ${arr.length}/${q}!`);}
    const picked=[];
    for(let i=0;i<q&&arr.length;i++){
      const idx=Math.min(arr.length-1,Math.round(i*(arr.length-1)/Math.max(1,q-1)));
      picked.push(arr[idx]);
    }
    // dedupe (evenly-spaced idx can repeat when arr is small)
    const seen=new Set();
    for(const p of picked){if(!seen.has(p.id)){seen.add(p.id);out.push(p);}}
    let j=0;
    while(seen.size<Math.min(q,arr.length)&&j<arr.length){
      if(!seen.has(arr[j].id)){seen.add(arr[j].id);out.push(arr[j]);}
      j++;
    }
  }
  // final sanity: every emitted FEN is white to move, legal, and mates in exactly mateIn
  const v=new CH.Game();
  let bad=0;
  for(const p of out){
    v.loadFEN(p.fen);
    if(v.turn!==CH.W){bad++;console.error('not white to move:',p.id);continue;}
    const d=v.mateDistance(p.mateIn,PROVE_CAP*2);
    if(d!==p.mateIn){bad++;console.error(`prove mismatch ${p.id}: want ${p.mateIn} got ${d}`);continue;}
    // verify flipped ref line still checkmates
    let made=0,okL=true;
    for(const u of p.line){const mv=v.fromUci(u);if(!mv){okL=false;break;}v.make(mv);made++;}
    if(okL&&v.status()!=='mate')okL=false;
    for(let i=0;i<made;i++)v.unmake();
    if(!okL){bad++;console.error('ref line broken after flip:',p.id);}
  }
  console.error(`rows=${rows} kept=${kept} proved=${proved} capped=${capped} lineBad=${lineBad} out=${out.length} bad=${bad}`);
  fs.writeFileSync('puzzles.json',JSON.stringify(out.map(p=>({id:p.id,fen:p.fen,mateIn:p.mateIn,rating:p.rating,line:p.line}))));
  console.error('wrote puzzles.json');
});
