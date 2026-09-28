const sample=[
[1,10,23,29,33,37,40],[2,9,13,21,25,32,42],[3,11,16,19,21,27,31],[4,14,27,30,31,40,42],
[5,16,24,29,40,41,42],[6,14,15,26,27,40,42],[7,2,9,16,25,26,40],[8,8,19,25,34,37,39],
[9,2,4,16,17,36,39],[10,9,25,30,33,41,44],[11,1,7,36,37,41,42],[12,2,11,21,25,39,45],
[13,22,23,25,37,38,42],[14,2,6,12,31,33,40],[15,3,4,16,30,31,37],[16,6,7,24,37,38,40],
[17,3,4,9,17,32,37],[18,3,12,13,19,32,35],[19,6,30,38,39,40,43],[20,10,14,18,20,23,30],
[21,6,12,17,18,31,32],[22,4,5,6,8,17,39],[23,5,13,17,18,33,42],[24,7,8,27,29,36,43],
[25,2,4,21,26,43,44],[26,4,5,7,18,20,25],[27,1,20,26,28,37,43],[28,9,18,23,25,35,37],
[29,1,5,13,34,39,40],[30,8,17,20,35,36,44]];
let draws=sample.map(r=>r.slice(1)), prior=45, decay=.35, temperature=.55, gameCount=5;
const $=s=>document.querySelector(s);

function stats(data=draws){
 const n=data.length,a0=prior*6/45,b0=prior-a0,out=[];
 for(let x=1;x<=45;x++){
   let w=0,kw=0;
   data.forEach((d,i)=>{const recency=i/Math.max(1,n-1),wt=1+decay*recency*2;w+=wt;if(d.includes(x))kw+=wt});
   const a=a0+kw,b=b0+w-kw;
   out.push({x,a,b,mean:a/(a+b),variance:(a*b)/((a+b)**2*(a+b+1))});
 }
 return out
}
// Gamma/Beta sampling: posterior 자체에서 매 요청마다 새 확률을 뽑는다.
function normal(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function gamma(k){
 if(k<1)return gamma(k+1)*Math.pow(Math.random(),1/k);
 const d=k-1/3,c=1/Math.sqrt(9*d);
 while(true){let x=normal(),v=1+c*x;if(v<=0)continue;v=v*v*v;let u=Math.random();if(u<1-.0331*x**4||Math.log(u)<.5*x*x+d*(1-v+Math.log(v)))return d*v}
}
function beta(a,b){const x=gamma(a),y=gamma(b);return x/(x+y)}
function weightedPick(items,weights){
 let sum=weights.reduce((a,b)=>a+b,0),r=Math.random()*sum;
 for(let i=0;i<items.length;i++){r-=weights[i];if(r<=0)return items[i]}
 return items.at(-1)
}
function tooPatterned(arr){
 const s=[...arr].sort((a,b)=>a-b);
 let consecutive=0;for(let i=1;i<s.length;i++)if(s[i]===s[i-1]+1)consecutive++;
 return consecutive>=3 || s.every(n=>n<=31);
}
function generateGame(previous=[]){
 const posterior=stats().map(o=>({x:o.x,p:beta(o.a,o.b)}));
 let chosen=[];
 while(chosen.length<6){
   const pool=posterior.filter(o=>!chosen.includes(o.x));
   const weights=pool.map(o=>{
     // 탐색형일수록 균등분포에 가까워진다.
     const exponent=2.4-(temperature*2.1);
     let w=Math.pow(Math.max(o.p,.0001),exponent);
     if($('#diverse').checked){
       const used=previous.reduce((n,g)=>n+(g.includes(o.x)?1:0),0);
       w*=Math.pow(.48,used);
     }
     // 당첨확률 보정이 아니라, 흔한 인간 선택과의 중복을 완화하기 위한 별도 휴리스틱.
     if($('#avoidPopular').checked && o.x<=31) w*=.90;
     return w;
   });
   chosen.push(weightedPick(pool,weights).x);
 }
 chosen.sort((a,b)=>a-b);
 if($('#avoidPopular').checked && tooPatterned(chosen)) return generateGame(previous);
 return chosen;
}
function cls(n){return n<=10?'b1':n<=20?'b2':n<=30?'b3':n<=40?'b4':'b5'}
function renderGames(){
 let games=[];
 for(let i=0;i<gameCount;i++)games.push(generateGame(games));
 $('#games').innerHTML=games.map((g,i)=>`<div class="game"><div class="game-name">GAME ${i+1}</div><div class="balls">${g.map(n=>`<div class="ball ${cls(n)}">${n}</div>`).join('')}</div></div>`).join('')+
 `<div class="why">각 게임은 고정된 상위 번호를 그대로 쓰지 않고, 분석 결과에서 매번 다시 뽑아 서로 다른 조합을 만듭니다. (전문용어: Beta posterior sampling)</div>`;
}
function renderRank(){
 let s=stats().sort((a,b)=>b.mean-a.mean),max=s[0].mean;
 $('#ranking').innerHTML=s.slice(0,12).map(o=>`<div class="rank"><b>${o.x}</b><div class="bar"><div class="fill" style="width:${o.mean/max*100}%"></div></div><span>${(o.mean*100).toFixed(2)}%</span></div>`).join('')
}
function backtest(){
 if(draws.length<12){$('#bayesHit').textContent='데이터 부족';return}
 let hits=0,c=0;
 for(let i=Math.max(10,draws.length-100);i<draws.length;i++){
   let s=stats(draws.slice(0,i)).sort((a,b)=>b.mean-a.mean).slice(0,6).map(x=>x.x);
   hits+=s.filter(x=>draws[i].includes(x)).length;c++;
 }
 $('#bayesHit').textContent=(hits/c).toFixed(3)
}
function render(){renderGames();renderRank();backtest();$('#status').textContent=`${draws.length}회 데이터 분석 중`}
$('#draw').onclick=renderGames;
$('#decay').oninput=e=>{decay=+e.target.value;$('#decayLabel').textContent=decay.toFixed(2);render()}
$('#prior').oninput=e=>{prior=+e.target.value;$('#priorLabel').textContent=prior;render()}
$('#temp').oninput=e=>{temperature=+e.target.value/100;$('#tempLabel').textContent=temperature<.35?'안정형':temperature<.7?'균형형':'탐색형';renderGames()}
$('#gameCount').oninput=e=>{gameCount=+e.target.value;$('#gameLabel').textContent=`${gameCount}게임`;renderGames()}
$('#diverse').onchange=renderGames;$('#avoidPopular').onchange=renderGames;
$('#sample').onclick=()=>{draws=sample.map(r=>r.slice(1));render()}
$('#csv').onchange=e=>{let f=e.target.files[0];if(!f)return;let rd=new FileReader();rd.onload=()=>{let rows=rd.result.trim().split(/\r?\n/).slice(1).map(x=>x.split(',').map(Number)).filter(r=>r.length>=7&&r.slice(1,7).every(n=>n>=1&&n<=45));if(rows.length){draws=rows.map(r=>r.slice(1,7));render()}else alert('CSV 형식을 확인해주세요.');};rd.readAsText(f)}
render();