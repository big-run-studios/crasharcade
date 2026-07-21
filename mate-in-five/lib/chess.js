/* Mate in Five — chess core (0x88). Runs in Node (pipeline) and browser (game).
   Full legal movegen incl. castling / en passant / promotion; check, mate,
   stalemate, insufficient material, repetition, 50-move; alpha-beta search
   with mate-distance scores; forced-mate prover for content validation. */
'use strict';
const CH=(()=>{
const EMPTY=0,PAWN=1,KNIGHT=2,BISHOP=3,ROOK=4,QUEEN=5,KING=6;
const W=0,B=8; // color bit
const T=p=>p&7, C=p=>p&8;
const N_OFF=[31,33,14,18,-31,-33,-14,-18];
const K_OFF=[1,-1,16,-16,15,17,-15,-17];
const B_OFF=[15,17,-15,-17];
const R_OFF=[1,-1,16,-16];
const SLIDE={[BISHOP]:B_OFF,[ROOK]:R_OFF,[QUEEN]:K_OFF};
const PIECE_CH=' pnbrqk';
const VAL=[0,100,300,320,500,950,20000];
const sq=(f,r)=>r*16+f, file=s=>s&15, rank=s=>s>>4;
const ok=s=>!(s&0x88);
const ALG=s=>'abcdefgh'[file(s)]+(rank(s)+1);
const FROMALG=a=>sq(a.charCodeAt(0)-97,a.charCodeAt(1)-49);

// ---- zobrist (deterministic LCG so runs are reproducible) ----
let _seed=0x9e3779b9;
function rnd32(){_seed^=_seed<<13;_seed^=_seed>>>17;_seed^=_seed<<5;return _seed>>>0;}
const ZP=[],ZLO=[],ZHI=[];
for(let p=0;p<16;p++){ZLO[p]=[];ZHI[p]=[];for(let s=0;s<128;s++){ZLO[p][s]=rnd32();ZHI[p][s]=rnd32();}}
const ZTURN_LO=rnd32(),ZTURN_HI=rnd32();
const ZCR_LO=[rnd32(),rnd32(),rnd32(),rnd32()],ZCR_HI=[rnd32(),rnd32(),rnd32(),rnd32()];
const ZEP_LO=[],ZEP_HI=[];for(let f=0;f<8;f++){ZEP_LO[f]=rnd32();ZEP_HI[f]=rnd32();}

function Game(){
  this.bd=new Int8Array(128);
  this.turn=W; this.cr=0; this.ep=-1; this.half=0; this.full=1;
  this.kings=[0,0]; // [white,black] king squares
  this.hist=[]; this.klo=0; this.khi=0; this.reps=[];
}
const G=Game.prototype;

G.hashInit=function(){
  let lo=0,hi=0;
  for(let s=0;s<128;s++){ if(!ok(s))continue; const p=this.bd[s]; if(p){lo^=ZLO[p][s];hi^=ZHI[p][s];} }
  if(this.turn===B){lo^=ZTURN_LO;hi^=ZTURN_HI;}
  for(let i=0;i<4;i++) if(this.cr&(1<<i)){lo^=ZCR_LO[i];hi^=ZCR_HI[i];}
  if(this.ep>=0){lo^=ZEP_LO[file(this.ep)];hi^=ZEP_HI[file(this.ep)];}
  this.klo=lo>>>0; this.khi=hi>>>0;
};
G.key=function(){return this.klo*4294967296+this.khi;};

G.loadFEN=function(fen){
  const parts=fen.trim().split(/\s+/);
  this.bd.fill(0);
  let s=sq(0,7);
  for(const ch of parts[0]){
    if(ch==='/'){s=sq(0,rank(s)-1);}
    else if(ch>='1'&&ch<='8'){s+=+ch;}
    else{
      const t=PIECE_CH.indexOf(ch.toLowerCase());
      const p=t|(ch===ch.toLowerCase()?B:W);
      this.bd[s]=p; if(t===KING)this.kings[C(p)?1:0]=s; s++;
    }
  }
  this.turn=parts[1]==='b'?B:W;
  this.cr=0;
  if(parts[2]&&parts[2]!=='-'){
    if(parts[2].includes('K'))this.cr|=1; if(parts[2].includes('Q'))this.cr|=2;
    if(parts[2].includes('k'))this.cr|=4; if(parts[2].includes('q'))this.cr|=8;
  }
  this.ep=(parts[3]&&parts[3]!=='-')?FROMALG(parts[3]):-1;
  this.half=+(parts[4]||0); this.full=+(parts[5]||1);
  this.hist.length=0; this.reps.length=0;
  this.hashInit(); this.reps.push(this.key());
  return this;
};
G.fen=function(){
  let out='';
  for(let r=7;r>=0;r--){
    let run=0;
    for(let f=0;f<8;f++){
      const p=this.bd[sq(f,r)];
      if(!p){run++;continue;}
      if(run){out+=run;run=0;}
      const ch=PIECE_CH[T(p)];
      out+=C(p)?ch:ch.toUpperCase();
    }
    if(run)out+=run;
    if(r)out+='/';
  }
  out+=this.turn===B?' b ':' w ';
  let cr='';
  if(this.cr&1)cr+='K'; if(this.cr&2)cr+='Q'; if(this.cr&4)cr+='k'; if(this.cr&8)cr+='q';
  out+=(cr||'-')+' '+(this.ep>=0?ALG(this.ep):'-')+' '+this.half+' '+this.full;
  return out;
};

G.attacked=function(s,by){ // is square s attacked by color `by`
  const bd=this.bd;
  // pawns
  const pd=by===W?-16:16;
  for(const d of [pd-1,pd+1]){const t=s+d; if(ok(t)&&bd[t]===(PAWN|by))return true;}
  for(const d of N_OFF){const t=s+d; if(ok(t)&&bd[t]===(KNIGHT|by))return true;}
  for(const d of K_OFF){const t=s+d; if(ok(t)&&bd[t]===(KING|by))return true;}
  for(const d of B_OFF){let t=s+d;while(ok(t)){const p=bd[t];if(p){if(C(p)===by&&(T(p)===BISHOP||T(p)===QUEEN))return true;break;}t+=d;}}
  for(const d of R_OFF){let t=s+d;while(ok(t)){const p=bd[t];if(p){if(C(p)===by&&(T(p)===ROOK||T(p)===QUEEN))return true;break;}t+=d;}}
  return false;
};
G.inCheck=function(col){
  col=col===undefined?this.turn:col;
  return this.attacked(this.kings[col?1:0],col?W:B);
};

// move: {from,to,piece,capt,promo,ep,castle,dbl}
G.pseudo=function(){
  const ms=[],bd=this.bd,me=this.turn,opp=me^8;
  for(let s=0;s<128;s++){
    if(!ok(s))continue;
    const p=bd[s]; if(!p||C(p)!==me)continue;
    const t=T(p);
    if(t===PAWN){
      const fwd=me===W?16:-16, startR=me===W?1:6, promoR=me===W?7:0;
      let d=s+fwd;
      if(ok(d)&&!bd[d]){
        if(rank(d)===promoR){for(const pr of [QUEEN,ROOK,BISHOP,KNIGHT])ms.push({from:s,to:d,piece:p,capt:0,promo:pr|me});}
        else{ms.push({from:s,to:d,piece:p,capt:0});
          if(rank(s)===startR){const d2=d+fwd;if(!bd[d2])ms.push({from:s,to:d2,piece:p,capt:0,dbl:true});}}
      }
      for(const off of [fwd-1,fwd+1]){
        const c=s+off; if(!ok(c))continue;
        if(bd[c]&&C(bd[c])===opp){
          if(rank(c)===promoR){for(const pr of [QUEEN,ROOK,BISHOP,KNIGHT])ms.push({from:s,to:c,piece:p,capt:bd[c],promo:pr|me});}
          else ms.push({from:s,to:c,piece:p,capt:bd[c]});
        }else if(c===this.ep&&this.ep>=0){
          ms.push({from:s,to:c,piece:p,capt:PAWN|opp,ep:true});
        }
      }
    }else if(t===KNIGHT||t===KING){
      for(const d of (t===KNIGHT?N_OFF:K_OFF)){
        const c=s+d; if(!ok(c))continue;
        if(!bd[c])ms.push({from:s,to:c,piece:p,capt:0});
        else if(C(bd[c])===opp)ms.push({from:s,to:c,piece:p,capt:bd[c]});
      }
      if(t===KING){
        const home=me===W?sq(4,0):sq(4,7);
        if(s===home&&!this.inCheck(me)){
          const ks=me===W?1:4,qs=me===W?2:8;
          if((this.cr&ks)&&!bd[s+1]&&!bd[s+2]&&bd[s+3]===(ROOK|me)&&!this.attacked(s+1,opp)&&!this.attacked(s+2,opp))
            ms.push({from:s,to:s+2,piece:p,capt:0,castle:'k'});
          if((this.cr&qs)&&!bd[s-1]&&!bd[s-2]&&!bd[s-3]&&bd[s-4]===(ROOK|me)&&!this.attacked(s-1,opp)&&!this.attacked(s-2,opp))
            ms.push({from:s,to:s-2,piece:p,capt:0,castle:'q'});
        }
      }
    }else{
      for(const d of SLIDE[t]){
        let c=s+d;
        while(ok(c)){
          if(!bd[c]){ms.push({from:s,to:c,piece:p,capt:0});}
          else{if(C(bd[c])===opp)ms.push({from:s,to:c,piece:p,capt:bd[c]});break;}
          c+=d;
        }
      }
    }
  }
  return ms;
};

const CR_MASK=new Int8Array(128).fill(15);
CR_MASK[sq(4,0)]=15&~3; CR_MASK[sq(0,0)]=15&~2; CR_MASK[sq(7,0)]=15&~1;
CR_MASK[sq(4,7)]=15&~12; CR_MASK[sq(0,7)]=15&~8; CR_MASK[sq(7,7)]=15&~4;

G.make=function(m){
  const bd=this.bd,me=this.turn;
  const u={m,cr:this.cr,ep:this.ep,half:this.half,klo:this.klo,khi:this.khi};
  this.hist.push(u);
  let lo=this.klo,hi=this.khi;
  const movedTo=m.promo||m.piece;
  // remove captured
  if(m.capt){
    const cs=m.ep?(m.to+(me===W?-16:16)):m.to;
    lo^=ZLO[bd[cs]][cs];hi^=ZHI[bd[cs]][cs];
    bd[cs]=0;
  }
  lo^=ZLO[m.piece][m.from];hi^=ZHI[m.piece][m.from];
  lo^=ZLO[movedTo][m.to];hi^=ZHI[movedTo][m.to];
  bd[m.from]=0; bd[m.to]=movedTo;
  if(m.castle){
    const r=ROOK|me;
    const [rf,rt]=m.castle==='k'?[m.to+1,m.to-1]:[m.to-2,m.to+1];
    lo^=ZLO[r][rf];hi^=ZHI[r][rf];lo^=ZLO[r][rt];hi^=ZHI[r][rt];
    bd[rf]=0;bd[rt]=r;
  }
  if(T(m.piece)===KING)this.kings[me?1:0]=m.to;
  // castling rights
  const ncr=this.cr&CR_MASK[m.from]&CR_MASK[m.to];
  for(let i=0;i<4;i++){const b=1<<i;if((this.cr&b)!==(ncr&b)){lo^=ZCR_LO[i];hi^=ZCR_HI[i];}}
  this.cr=ncr;
  // ep
  if(this.ep>=0){lo^=ZEP_LO[file(this.ep)];hi^=ZEP_HI[file(this.ep)];}
  this.ep=m.dbl?(m.from+(me===W?16:-16)):-1;
  if(this.ep>=0){lo^=ZEP_LO[file(this.ep)];hi^=ZEP_HI[file(this.ep)];}
  this.half=(m.capt||T(m.piece)===PAWN)?0:this.half+1;
  if(me===B)this.full++;
  this.turn=me^8; lo^=ZTURN_LO;hi^=ZTURN_HI;
  this.klo=lo>>>0;this.khi=hi>>>0;
  this.reps.push(this.key());
  return u;
};
G.unmake=function(){
  const u=this.hist.pop(); if(!u)return;
  this.reps.pop();
  const m=u.m,bd=this.bd;
  this.turn^=8;
  const me=this.turn;
  if(me===B)this.full--;
  this.cr=u.cr;this.ep=u.ep;this.half=u.half;this.klo=u.klo;this.khi=u.khi;
  bd[m.from]=m.piece; bd[m.to]=0;
  if(m.capt){const cs=m.ep?(m.to+(me===W?-16:16)):m.to; bd[cs]=m.capt;}
  if(m.castle){const r=ROOK|me;const [rf,rt]=m.castle==='k'?[m.to+1,m.to-1]:[m.to-2,m.to+1];bd[rt]=0;bd[rf]=r;}
  if(T(m.piece)===KING)this.kings[me?1:0]=m.from;
};

G.legal=function(){
  const out=[],me=this.turn;
  for(const m of this.pseudo()){
    this.make(m);
    if(!this.inCheck(me))out.push(m);
    this.unmake();
  }
  return out;
};

G.repCount=function(){
  const k=this.key(); let n=0;
  for(let i=this.reps.length-1;i>=0;i--)if(this.reps[i]===k)n++;
  return n;
};
G.insufficient=function(){
  let minors=0,other=0,bcol=-1,sameB=true;
  for(let s=0;s<128;s++){
    if(!ok(s))continue; const p=this.bd[s]; if(!p)continue;
    const t=T(p);
    if(t===KING)continue;
    if(t===KNIGHT)minors++;
    else if(t===BISHOP){minors++;const c=(file(s)+rank(s))&1;if(bcol<0)bcol=c;else if(bcol!==c)sameB=false;}
    else other++;
  }
  if(other)return false;
  if(minors<=1)return true;
  // only bishops all on same color = dead
  let knights=0;
  for(let s=0;s<128;s++){if(ok(s)&&T(this.bd[s])===KNIGHT)knights++;}
  return knights===0&&sameB;
};
// 'play' | 'mate' (side to move is mated) | 'stalemate' | 'draw'
G.status=function(){
  if(this.legal().length===0)return this.inCheck()?'mate':'stalemate';
  if(this.insufficient())return 'draw';
  if(this.half>=100)return 'draw';
  if(this.repCount()>=3)return 'draw';
  return 'play';
};

G.uci=function(m){return ALG(m.from)+ALG(m.to)+(m.promo?PIECE_CH[T(m.promo)]:'');};
G.fromUci=function(u){
  for(const m of this.legal())if(this.uci(m)===u)return m;
  return null;
};

// ---------------- search ----------------
const MATE=100000;
G.evalMat=function(){
  let sc=0;
  const bd=this.bd;
  for(let s=0;s<128;s++){
    if(!ok(s))continue; const p=bd[s]; if(!p)continue;
    let v=VAL[T(p)];
    if(T(p)!==KING){ // mild centralization so the AI develops threats, not shuffles
      const cf=Math.min(file(s),7-file(s)),crk=Math.min(rank(s),7-rank(s));
      v+=(cf+crk)*3;
    }
    sc+=C(p)===this.turn?v:-v;
  }
  // small bonus for giving check (threats against the enemy king)
  if(this.inCheck(this.turn^8)===false&&this.inCheck(this.turn)) sc-=25;
  return sc;
};
G.search=function(opts){
  opts=opts||{};
  const deadline=opts.timeMs?Date.now()+opts.timeMs:Infinity;
  const maxDepth=opts.depth||6;
  const tt=new Map();
  let nodes=0,abort=false;
  const self=this;
  function order(ms,ttMove){
    for(const m of ms){
      m._s=(m.capt?10000+VAL[T(m.capt)]-VAL[T(m.piece)]/10:0)+(m.promo?9000:0);
      if(ttMove&&m.from===ttMove.from&&m.to===ttMove.to&&(m.promo|0)===(ttMove.promo|0))m._s=1e9;
    }
    ms.sort((a,b)=>b._s-a._s);
  }
  function qsearch(alpha,beta,ply){
    nodes++;
    const stand=self.evalMat();
    if(stand>=beta)return beta;
    if(stand>alpha)alpha=stand;
    const ms=self.legal().filter(m=>m.capt||m.promo);
    order(ms,null);
    for(const m of ms){
      self.make(m);
      const sc=-qsearch(-beta,-alpha,ply+1);
      self.unmake();
      if(sc>=beta)return beta;
      if(sc>alpha)alpha=sc;
    }
    return alpha;
  }
  function ab(depth,alpha,beta,ply){
    nodes++;
    if((nodes&1023)===0&&Date.now()>deadline){abort=true;return 0;}
    if(ply>0){
      if(self.repCount()>=3||self.half>=100||self.insufficient())return 0;
    }
    const ms=self.legal();
    if(ms.length===0)return self.inCheck()?-(MATE-ply):0;
    if(depth<=0)return qsearch(alpha,beta,ply);
    // mate-distance pruning
    alpha=Math.max(alpha,-(MATE-ply)); beta=Math.min(beta,MATE-ply-1);
    if(alpha>=beta)return alpha;
    const k=self.key();
    const e=tt.get(k);
    let ttMove=e?e.m:null;
    if(e&&e.d>=depth&&ply>0){
      if(e.f===0)return e.v;
      if(e.f<0&&e.v<=alpha)return e.v;
      if(e.f>0&&e.v>=beta)return e.v;
    }
    order(ms,ttMove);
    let best=-Infinity,bm=null,f=-1;
    for(const m of ms){
      self.make(m);
      const sc=-ab(depth-1,-beta,-alpha,ply+1);
      self.unmake();
      if(abort)return 0;
      if(sc>best){best=sc;bm=m;}
      if(sc>alpha){alpha=sc;f=0;}
      if(alpha>=beta){f=1;break;}
    }
    tt.set(k,{d:depth,v:best,f,m:bm?{from:bm.from,to:bm.to,promo:bm.promo|0}:null});
    return best;
  }
  let best=null,bestScore=0;
  for(let d=1;d<=maxDepth;d++){
    const ms=this.legal();
    if(!ms.length)break;
    order(ms,best?{from:best.from,to:best.to,promo:best.promo|0}:null);
    let a=-Infinity,bm=null;
    for(const m of ms){
      this.make(m);
      const sc=-ab(d-1,-MATE,-a===Infinity?MATE:-a,1); // note: full window at root below alpha
      this.unmake();
      if(abort)break;
      if(sc>a){a=sc;bm=m;}
    }
    if(abort)break;
    if(bm){best=bm;bestScore=a;}
    if(Math.abs(a)>MATE-100)break; // found forced mate either way; deeper won't change it
    if(Date.now()>deadline)break;
  }
  return {move:best,score:bestScore,nodes};
};

// forced-mate prover: can side to move force mate within n of its own moves?
// returns the first mating move found, or null. nodeCap aborts (throws 'cap').
G.proveMate=function(n,cap){
  const self=this;
  let nodes=0;
  const budget=cap||300000;
  function attacker(k){ // k attacker moves remaining; returns mating move or null
    if(k<=0)return null;
    if(++nodes>budget)throw 'cap';
    let ms=self.legal();
    // order: checks first (cheap proxy: try captures+all, but checks matter most)
    const scored=[];
    for(const m of ms){
      self.make(m);
      const chk=self.inCheck();
      const st=self.legal().length===0;
      self.unmake();
      scored.push({m,chk,st,s:(st?2:0)+(chk?1:0)});
    }
    scored.sort((a,b)=>b.s-a.s);
    for(const {m,chk,st} of scored){
      self.make(m);
      if(st&&chk){self.unmake();return m;} // checkmate
      if(st){self.unmake();continue;}      // stalemate — dead end
      if(k>1&&defender(k-1)){self.unmake();return m;}
      self.unmake();
    }
    return null;
  }
  function defender(k){ // all defender replies must still lose within k attacker moves
    if(++nodes>budget)throw 'cap';
    const ms=self.legal();
    for(const m of ms){
      self.make(m);
      const win=attacker(k)!==null;
      self.unmake();
      if(!win)return false;
    }
    return true;
  }
  try{return attacker(n);}catch(e){if(e==='cap')return 'cap';throw e;}
};
// shortest forced mate distance in [1..maxN], or 0 if none proven, or -1 if node-capped
G.mateDistance=function(maxN,cap){
  for(let n=1;n<=maxN;n++){
    const r=this.proveMate(n,cap);
    if(r==='cap')return -1;
    if(r)return n;
  }
  return 0;
};

G.perft=function(d){
  if(d===0)return 1;
  let n=0;
  for(const m of this.legal()){this.make(m);n+=this.perft(d-1);this.unmake();}
  return n;
};

// mirror position vertically + swap colors → same puzzle with White to move
function flipFEN(fen){
  const p=fen.trim().split(/\s+/);
  const ranks=p[0].split('/');
  const swapped=ranks.reverse().map(r=>[...r].map(ch=>{
    if(ch>='1'&&ch<='8')return ch;
    return ch===ch.toLowerCase()?ch.toUpperCase():ch.toLowerCase();
  }).join('')).join('/');
  const turn=p[1]==='w'?'b':'w';
  let cr=p[2];
  if(cr!=='-'){
    cr=[...cr].map(ch=>ch===ch.toLowerCase()?ch.toUpperCase():ch.toLowerCase()).sort((a,b)=>{
      const ord='KQkq';return ord.indexOf(a)-ord.indexOf(b);
    }).join('');
  }
  let ep=p[3];
  if(ep!=='-')ep=ep[0]+(9-+ep[1]);
  return [swapped,turn,cr,ep,p[4]||'0',p[5]||'1'].join(' ');
}
function flipUci(u){
  const f=s=>s[0]+(9-+s[1]);
  return f(u.slice(0,2))+f(u.slice(2,4))+(u[4]||'');
}

return {Game,flipFEN,flipUci,ALG,FROMALG,T,C,PAWN,KNIGHT,BISHOP,ROOK,QUEEN,KING,W,B,MATE,VAL,sqOf:sq,fileOf:file,rankOf:rank,okSq:ok};
})();
if(typeof module!=='undefined')module.exports=CH;
