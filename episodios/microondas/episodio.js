/* =====================================================================
   GUIA DE EDIÇÃO — leia primeiro
   Tudo aqui é função do tempo t (em segundos): R(t) desenha o quadro do instante t.
   Por isso dá para pausar, voltar e pular cenas sem estado escondido.

   QUERO MUDAR...                          → ONDE MEXER
   ---------------------------------------------------------------------
   Texto / tempo da narração e legenda     → window.CUES (script acima)
   Início de cada cena, nomes, duração     → tabela SCENES (logo abaixo deste guia)
   Enquadramento / movimento da câmera     → SHOTS + camAt()
   Cartões coloridos (chips)               → CHIPS  (ATENÇÃO: estão ocultos pelo CSS
                                              ".chip{display:none!important}")
   Etiquetas com linha apontando           → TAGS
   Sinais + e − da molécula                → CHG
   Cores de tudo                           → paleta C  (e cores do fundo em R())
   Cozinha (piso, parede, geladeira...)    → kitchenRoom()
   Micro-ondas (corpo, porta, painel)      → microwave()
   Personagem (o do site)                  → personagem()  (corpo: personagem-site.js)
   Tigela de lámen                         → ramen()
   Molécula de água                        → water()
   Garfo e faíscas                         → fork(), sparks()
   Ondas (partículas ciano)                → waves()
   O que aparece em cada cena              → drawMicrowave() (1-4) / drawBread() (5-6)
                                              / drawMolecules() (7-9) / drawKitchen() (10-13)

   NUMERAÇÃO DAS CENAS (sc = índice em ST + 1)
     1  A pergunta (0:00)              8  Ondas giram as moléculas (0:33)
     2  Por dentro: Magnetron (0:02)   9  Energia vira calor (0:40)
     3  As micro-ondas (0:07)          10 Por que garfo não pode (0:46)
     4  A comida tem água (0:15)       11 O prato giratório (0:52)
     5  Pão e biscoito (0:20)          12 Não fica radioativa (1:00)
     6  Água vira calor (0:26)         13 Não é magia (1:05)
     7  Molécula de água (0:28)

   TEMPOS RELATIVOS: os instantes das animações são escritos como at(n, d) =
   "d segundos depois do início da cena n" (at(n) = início da cena n). Por isso,
   mudar o t0 de uma cena em SCENES move junto câmera, cortes, chips, etiquetas,
   sinais +/-, termômetro, faíscas etc.
   Exceções (continuam absolutos): CUES (narração/legenda, presos ao áudio) e as
   fases contínuas como Math.sin(t*7) (balanço, giro), que não são "eventos".
   Se mover uma cena e quiser que a fala acompanhe, ajuste também os CUES.
   ===================================================================== */

/* =====================================================================
   TABELA DE CENAS — ÚNICA FONTE DA VERDADE
   Cada linha = uma cena. Mudou o início de uma cena? Edite só o t0 aqui:
   câmera (plano), cortes (escurecimento), player e lista de cenas seguem.
     n     número da cena            name  nome (botões e dicas)
     t0    início da cena (s)        shot  plano de câmera usado (índice em SHOTS)
     cut   true = escurece rapidinho ao entrar na cena
     navy  true = fundo azul-marinho (em vez da cozinha)
     draw  função que desenha a cena (definidas antes de R())
   O fim do vídeo é SCENES_END.
   ===================================================================== */
const SCENES=[
 {n:1, name:'A pergunta',               t0:0,     shot:0, draw:(t,sc)=>drawMicrowave(t,sc)},
 {n:2, name:'Por dentro: o Magnetron',  t0:2.35,  shot:0, draw:(t,sc)=>drawMicrowave(t,sc)},
 {n:3, name:'As micro-ondas',           t0:7.95,  shot:1, cut:true, draw:(t,sc)=>drawMicrowave(t,sc)},
 {n:4, name:'A comida tem água',        t0:15.71, shot:1, draw:(t,sc)=>drawMicrowave(t,sc)},
 {n:5, name:'Até no pão e no biscoito', t0:20.91, shot:2, cut:true, navy:true, draw:(t,sc)=>drawBread(t,sc)},
 {n:6, name:'Água vira calor',          t0:26.11, shot:2, navy:true, draw:(t,sc)=>drawBread(t,sc)},
 {n:7, name:'Molécula de água',         t0:28.35, shot:3, cut:true, navy:true, draw:(t,sc)=>drawMolecules(t,sc)},
 {n:8, name:'Ondas giram as moléculas', t0:33.47, shot:3, cut:true, navy:true, draw:(t,sc)=>drawMolecules(t,sc)},
 {n:9, name:'Energia vira calor',       t0:40.39, shot:3, navy:true, draw:(t,sc)=>drawMolecules(t,sc)},
 {n:10,name:'Por que garfo não pode',   t0:46.83, shot:4, cut:true, draw:(t,sc)=>drawKitchen(t,sc)},
 {n:11,name:'O prato giratório',        t0:52.11, shot:5, cut:true, draw:(t,sc)=>drawKitchen(t,sc)},
 {n:12,name:'Não fica radioativa',      t0:60.23, shot:6, cut:true, draw:(t,sc)=>drawKitchen(t,sc)},
 {n:13,name:'Não é magia',              t0:65.83, shot:7, cut:true, draw:(t,sc)=>drawKitchen(t,sc)}
];
const SCENES_END=71.6;
function sceneAt(t){let s=SCENES[0];for(const c of SCENES)if(t>=c.t0)s=c;return s}
// at(n,d) = instante que fica d segundos depois do início da cena n (at(n) = início da cena n).
// Todos os tempos internos das animações usam at(): mover o t0 de uma cena move tudo junto.
const at=(n,d=0)=>Math.round((SCENES[n-1].t0+d)*1000)/1000;
const T_WAVES=at(2,4.95); // instante em que as micro-ondas começam a sair do magnetron

/* ===== MOTOR 3D (WebGL próprio, sem bibliotecas) ===== */

// ================= [1] MATEMÁTICA (matrizes 4x4, helpers) — raramente precisa mexer =================
const M4={
 id(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])},
 mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o},
 T(x,y,z){const m=M4.id();m[12]=x;m[13]=y;m[14]=z;return m},
 S(x,y,z){const m=M4.id();m[0]=x;m[5]=y;m[10]=z;return m},
 RX(a){const m=M4.id(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m},
 RY(a){const m=M4.id(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m},
 RZ(a){const m=M4.id(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m},
 persp(fov,asp,n,f){const t=1/Math.tan(fov/2);return new Float32Array([t/asp,0,0,0,0,t,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0])},
 look(e,t,u){let z=[e[0]-t[0],e[1]-t[1],e[2]-t[2]];let l=Math.hypot(...z);z=z.map(v=>v/l);
  let x=[u[1]*z[2]-u[2]*z[1],u[2]*z[0]-u[0]*z[2],u[0]*z[1]-u[1]*z[0]];l=Math.hypot(...x);x=x.map(v=>v/l);
  const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];
  const d=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-d(x,e),-d(y,e),-d(z,e),1])}
};
const tf=(...ms)=>ms.reduce((a,b)=>M4.mul(a,b));
const T=M4.T,S=M4.S,RX=M4.RX,RY=M4.RY,RZ=M4.RZ;
function normMat(M){const a=(r,c)=>M[c*4+r];
 const C=[a(1,1)*a(2,2)-a(1,2)*a(2,1),-(a(1,0)*a(2,2)-a(1,2)*a(2,0)),a(1,0)*a(2,1)-a(1,1)*a(2,0),
 -(a(0,1)*a(2,2)-a(0,2)*a(2,1)),a(0,0)*a(2,2)-a(0,2)*a(2,0),-(a(0,0)*a(2,1)-a(0,1)*a(2,0)),
 a(0,1)*a(1,2)-a(0,2)*a(1,1),-(a(0,0)*a(1,2)-a(0,2)*a(1,0)),a(0,0)*a(1,1)-a(0,1)*a(1,0)];
 // C rows r: C[r*3+c]; mat3 column-major
 return new Float32Array([C[0],C[3],C[6],C[1],C[4],C[7],C[2],C[5],C[8]])}
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const sm=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10)};
const lerp=(a,b,t)=>a+(b-a)*t;
const lerp3=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// ================= [2] MALHAS 3D BÁSICAS (box, esfera, cilindro, tubo...) — raramente precisa mexer =================
function mk(){return{v:[]}}
function pushTri(m,a,b,c,sm_n){let u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],w=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
 let n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];const l=Math.hypot(...n)||1;n=n.map(v=>v/l);
 const P=[a,b,c];for(let i=0;i<3;i++){const nn=sm_n?sm_n[i]:n;m.v.push(P[i][0],P[i][1],P[i][2],nn[0],nn[1],nn[2])}}
function box(){const m=mk(),h=.5;const p=[];for(let i=0;i<8;i++)p.push([(i&1?h:-h),(i&2?h:-h),(i&4?h:-h)]);
 const q=[[0,1,3,2],[4,6,7,5],[0,2,6,4],[1,5,7,3],[0,4,5,1],[2,3,7,6]];
 for(const f of q){pushTri(m,p[f[0]],p[f[1]],p[f[2]]);pushTri(m,p[f[0]],p[f[2]],p[f[3]])}return m}
function ico(d,smooth){const t=(1+Math.sqrt(5))/2;let v=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(a=>{const l=Math.hypot(...a);return a.map(x=>x/l)});
 let f=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
 const cache={};const mid=(a,b)=>{const k=a<b?a+'_'+b:b+'_'+a;if(cache[k]!==undefined)return cache[k];const p=[(v[a][0]+v[b][0])/2,(v[a][1]+v[b][1])/2,(v[a][2]+v[b][2])/2];const l=Math.hypot(...p);v.push(p.map(x=>x/l));return cache[k]=v.length-1};
 for(let i=0;i<d;i++){const nf=[];for(const[a,b,c]of f){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);nf.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca])}f=nf}
 const m=mk();for(const[a,b,c]of f)pushTri(m,v[a],v[b],v[c],smooth?[v[a],v[b],v[c]]:null);return m}
function lathe(prof,seg,smooth){const m=mk();for(let i=0;i<prof.length-1;i++)for(let s=0;s<seg;s++){
 const a0=s/seg*Math.PI*2,a1=(s+1)/seg*Math.PI*2;const P=(p,a)=>[Math.cos(a)*p[0],p[1],Math.sin(a)*p[0]];
 const A=P(prof[i],a0),B=P(prof[i],a1),C=P(prof[i+1],a1),D=P(prof[i+1],a0);
 if(smooth){const dr=prof[i+1][0]-prof[i][0],dy=prof[i+1][1]-prof[i][1];const nn=(a)=>{let n=[Math.cos(a)*dy,-dr,Math.sin(a)*dy];const l=Math.hypot(...n)||1;return n.map(x=>x/l)};
  pushTri(m,A,B,C,[nn(a0),nn(a1),nn(a1)]);pushTri(m,A,C,D,[nn(a0),nn(a1),nn(a0)])}else{pushTri(m,A,B,C);pushTri(m,A,C,D)}}return m}
function cyl(seg,rt){rt=rt===undefined?1:rt;const m=lathe([[0,-.5],[1,-.5],[rt,.5],[0,.5]],seg,false);return m}
function tube(pts,r,seg){const m=mk();const rings=[];for(let i=0;i<pts.length;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];
 let t=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];let l=Math.hypot(...t);t=t.map(x=>x/l);let up=Math.abs(t[1])>.9?[1,0,0]:[0,1,0];
 let n=[t[1]*up[2]-t[2]*up[1],t[2]*up[0]-t[0]*up[2],t[0]*up[1]-t[1]*up[0]];l=Math.hypot(...n);n=n.map(x=>x/l);
 let bn=[t[1]*n[2]-t[2]*n[1],t[2]*n[0]-t[0]*n[2],t[0]*n[1]-t[1]*n[0]];const ring=[];
 for(let s=0;s<seg;s++){const an=s/seg*Math.PI*2;ring.push([pts[i][0]+(n[0]*Math.cos(an)+bn[0]*Math.sin(an))*r,pts[i][1]+(n[1]*Math.cos(an)+bn[1]*Math.sin(an))*r,pts[i][2]+(n[2]*Math.cos(an)+bn[2]*Math.sin(an))*r])}rings.push(ring)}
 for(let i=0;i<rings.length-1;i++)for(let s=0;s<seg;s++){const s2=(s+1)%seg;pushTri(m,rings[i][s],rings[i][s2],rings[i+1][s2]);pushTri(m,rings[i][s],rings[i+1][s2],rings[i+1][s])}return m}

// ================= [3] WEBGL: shaders e funções de desenho =================
// Atalhos para desenhar: D(malha, matriz, cor, opções) é o básico.
//   B  = caixa      B(cor, x,y,z, largura,altura,profundidade, opções)
//   CY = cilindro   CY(cor, x,y,z, raio, altura, opções)
//   SP = esfera     SP(malha, cor, x,y,z, sx,sy,sz, opções)
// Opções: a=opacidade, e=brilho próprio, u=sem sombreamento, s=brilho especular.
const cv=document.getElementById('c');const gl=cv.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true});const RS=1.5;cv.width=720*RS;cv.height=1280*RS;
// k = tom por vértice (multiplica a cor). Todas as malhas comuns têm k = 1,1,1; só o cabelo do personagem usa tons diferentes por faceta.
const VS=`attribute vec3 p;attribute vec3 n;attribute vec3 k;uniform mat4 uVP,uM;uniform mat3 uN;varying vec3 vN,vW,vK;
void main(){vec4 w=uM*vec4(p,1.);vW=w.xyz;vN=uN*n;vK=k;gl_Position=uVP*w;}`;
const FS=`precision mediump float;varying vec3 vN,vW,vK;uniform vec3 uCol,uEye,uSky,uGnd;uniform float uA,uE,uU,uS;
void main(){vec3 N=normalize(vN);vec3 V=normalize(uEye-vW);if(dot(N,V)<0.)N=-N;
vec3 uC=uCol*vK;
vec3 L=normalize(vec3(-.45,.85,.55));float d=max(dot(N,L),0.);float h=.5+.5*N.y;
vec3 amb=mix(uGnd,uSky,h);vec3 lit=uC*(amb*.82+vec3(1.,.96,.9)*d*.72);
vec3 H=normalize(L+V);float sp=pow(max(dot(N,H),0.),38.)*uS;
float fr=pow(1.-max(dot(N,V),0.),3.);
vec3 c=mix(lit,uC,uU)+uC*uE+vec3(sp)+vec3(fr*.08*uS);
gl_FragColor=vec4(c*uA,uA);}`;
function sh(t,s){const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(x);return x}
const prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);gl.useProgram(prog);
const U={};for(const k of['uVP','uM','uN','uCol','uEye','uSky','uGnd','uA','uE','uU','uS'])U[k]=gl.getUniformLocation(prog,k);
const aP=gl.getAttribLocation(prog,'p'),aN=gl.getAttribLocation(prog,'n'),aK=gl.getAttribLocation(prog,'k');gl.enableVertexAttribArray(aP);gl.enableVertexAttribArray(aN);gl.enableVertexAttribArray(aK);
// upload(m): m.v = posição+normal (6 números por vértice); m.c (opcional) = tom por vértice (3 números por vértice). Sem m.c o tom é 1,1,1.
function upload(m){const nv=m.v.length/6,a=new Float32Array(nv*9);for(let i=0;i<nv;i++){for(let j=0;j<6;j++)a[i*9+j]=m.v[i*6+j];for(let j=0;j<3;j++)a[i*9+6+j]=m.c?m.c[i*3+j]:1}
 const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,a,gl.STATIC_DRAW);return{b,n:nv}}
const MESH={box:upload(box()),cyl:upload(cyl(14)),cyl8:upload(cyl(8)),cylT:upload(cyl(16,1.14)),cone:upload(cyl(12,0)),sph:upload(ico(1,false)),sphS:upload(ico(3,true)),sph0:upload(ico(0,false)),
 drop:upload(lathe([[0,-1],[.55,-.62],[.92,-.12],[.62,.5],[.0,1.35]].map(a=>[a[0],a[1]]),10,true)),
 bowlO:upload(lathe([[0,0],[.36,0],[.42,.02],[.70,.3],[.88,.62],[.92,.67]],30,false)),
 bowlI:upload(lathe([[.86,.67],[.84,.62],[.66,.3],[.3,.12],[0,.1]],30,false))};
let VP,EYE,SKY=[.85,.82,.78],GND=[.55,.5,.46];
function D(mesh,M,col,o){o=o||{};const m=MESH[mesh];gl.bindBuffer(gl.ARRAY_BUFFER,m.b);gl.vertexAttribPointer(aP,3,gl.FLOAT,false,36,0);gl.vertexAttribPointer(aN,3,gl.FLOAT,false,36,12);gl.vertexAttribPointer(aK,3,gl.FLOAT,false,36,24);
 const a=o.a===undefined?1:o.a;if(a<=.001)return;gl.depthMask(a>=.99||o.dw);
 gl.uniformMatrix4fv(U.uVP,false,VP);gl.uniformMatrix4fv(U.uM,false,M);gl.uniformMatrix3fv(U.uN,false,normMat(M));
 gl.uniform3fv(U.uCol,col);gl.uniform3fv(U.uEye,EYE);gl.uniform3fv(U.uSky,SKY);gl.uniform3fv(U.uGnd,GND);
 gl.uniform1f(U.uA,a);gl.uniform1f(U.uE,o.e||0);gl.uniform1f(U.uU,o.u||0);gl.uniform1f(U.uS,o.s===undefined?.25:o.s);gl.drawArrays(gl.TRIANGLES,0,m.n)}
const B=(c,x,y,z,sx,sy,sz,o,rot)=>D('box',tf(T(x,y,z),rot||M4.id(),S(sx,sy,sz)),c,o);
const CY=(c,x,y,z,r,h,o,rot)=>D('cyl',tf(T(x,y,z),rot||M4.id(),S(r,h,r)),c,o);
const SP=(m,c,x,y,z,sx,sy,sz,o,rot)=>D(m,tf(T(x,y,z),rot||M4.id(),S(sx,sy===undefined?sx:sy,sz===undefined?sx:sz)),c,o);

// ================= static tube meshes (noodles, wires) =================
const R0=rng(7);
function addTube(name,pts,r,seg){MESH[name]=upload(tube(pts,r,seg))}
const NOOD=[];
for(let k=0;k<11;k++){const z0=-.62+k*.124;const half=Math.sqrt(Math.max(.02,.72*.72-z0*z0));const pts=[];
 for(let i=0;i<=14;i++){const u=i/14;const x=-half+u*2*half;pts.push([x,.015*Math.sin(u*9+k),z0+.05*Math.sin(u*7+k*1.7)])}
 addTube('nd'+k,pts,.028,5);NOOD.push('nd'+k)}
for(let k=0;k<7;k++){const pts=[];const a0=R0()*6.28,rad=.15+R0()*.35;for(let i=0;i<=12;i++){const a=a0+i*.5;pts.push([Math.cos(a)*rad*(1+.2*Math.sin(i)),.05*Math.sin(i*1.3)+.03,Math.sin(a)*rad])}addTube('np'+k,pts,.03,5);NOOD.push('np'+k)}
addTube('wire1',[[1.35,1.2,-.2],[1.2,1.0,0.1],[1.25,.85,.35],[1.55,.8,.4]],.035,5);
addTube('wire2',[[1.9,1.3,.1],[2.0,1.0,.2],[1.9,.8,.3]],.035,5);

// ================= [4] PALETA DE CORES (RGB de 0 a 1) — mude as cores aqui =================
const C={cream:[.95,.93,.88],metal:[.78,.81,.85],metalD:[.55,.58,.63],wood:[.82,.62,.42],wall:[.95,.9,.82],white:[.97,.97,.95],
 skin:[.95,.8,.66],hair:[.1,.08,.1],blue:[.16,.44,.92],navy:[.1,.12,.25],dark:[.1,.1,.12],red:[.92,.28,.22],cyan:[.35,.88,1],
 yolk:[1,.76,.1],noodle:[.98,.83,.38],broth:[.52,.25,.08],green:[.3,.75,.3],drop:[.28,.68,1],orange:[1,.5,.12],glass:[.35,.45,.55],
 brown:[.5,.28,.14],bread:[.86,.55,.25],cookie:[.9,.7,.4],choc:[.27,.14,.08],silver:[.82,.84,.88],gold:[.9,.7,.25]};

// ================= [5] PERSONAGEM E OBJETOS: personagem(), ramen(), droplet() =================
// personagem(x,y,z,s,t,o) = o personagem da página principal (Personagem 1: cabelo 1, camiseta e shorts, cores padrão do site).
//   x,y,z = onde ficam os PÉS (y = chão)    s = tamanho (altura ≈ 2,02·s·TAM, ≈ 2,02·s)    t = tempo (s)
//   o.ry   = para onde olha (0 = de frente para o espectador; gira em torno do eixo y)
//   o.armR / o.armL = ângulo dos braços (.12 = braço baixo; ≈ 2,6 = braço levantado, acenando)
//   o.walk (0 a 1) = quanto ele anda      o.ph = fase do passo (ex.: t*9)
// O corpo vem de personagem-site.js (cópia do código do site, em three.js). Aqui, na primeira vez, cada peça dele é
// convertida para uma malha do motor 3D do episódio; depois, a cada quadro, só se põe a pose (a mesma de js/animacao.js
// do site: braços, mão que acena, pernas e pés) e se desenha cada peça. Para mudar roupa, cabelo ou cor: ch.setOutfit(...),
// ch.setHair(...), PersonagemSite.setPartColor(ch,'shirt','#...') — aqui em PERS, antes do traverse.
const TAM=1.3;   // tamanho do personagem em relação ao menino antigo (1 = mesma altura; maior = mais alto)
const PERS=(()=>{
 if(!window.PersonagemSite){console.warn('personagem-site.js / three.js não carregou: o episódio abre sem o personagem');return null}
 const ch=PersonagemSite.createCharacter(0);
 ch.character.position.set(0,0,0);ch.character.updateMatrixWorld(true);
 const visivel=o=>{for(;o;o=o.parent)if(!o.visible)return false;return true};
 const pecas=[];let ymin=1e9,ymax=-1e9;
 ch.character.traverse(o=>{
  if(!o.isMesh||!visivel(o))return;                       // peças escondidas (outras roupas e cabelos) ficam de fora
  let g=o.geometry;if(g.index)g=g.toNonIndexed();
  const P=g.attributes.position.array,N=g.attributes.normal&&g.attributes.normal.array,K=g.attributes.color&&g.attributes.color.array;
  const liso=o.material.flatShading===false&&!!N;         // cabeça, orelhas e mãos são lisas; o resto é facetado
  const v=[],c=K?[]:null,e=o.matrixWorld.elements;
  for(let i=0;i<P.length/9;i++){const q=i*9;
   const ux=P[q+3]-P[q],uy=P[q+4]-P[q+1],uz=P[q+5]-P[q+2],wx=P[q+6]-P[q],wy=P[q+7]-P[q+1],wz=P[q+8]-P[q+2];
   let nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
   for(let j=0;j<3;j++){const a=q+j*3;
    v.push(P[a],P[a+1],P[a+2],...(liso?[N[a],N[a+1],N[a+2]]:[nx,ny,nz]));
    if(K)c.push(K[a],K[a+1],K[a+2]);
    const y2=e[1]*P[a]+e[5]*P[a+1]+e[9]*P[a+2]+e[13];ymin=Math.min(ymin,y2);ymax=Math.max(ymax,y2)}}
  const nome='pers'+pecas.length;MESH[nome]=upload({v,c});
  const cor=o.material.color,aceso=o.material.emissive&&o.material.emissive.getHex()>0;   // brilho do olho = sem sombreamento
  pecas.push({nome,obj:o,cor:aceso?[1,1,1]:[cor.r,cor.g,cor.b],op:aceso?{u:1}:{s:.12}});
 });
 return{ch,pecas,k:TAM*2.02/(ymax-ymin),y0:-ymin};
})();
// Altura que o corpo sobe para o ponto mais baixo da sola ficar no chão (é a footLift() de js/animacao.js, sem a inclinação de correr).
const FOOT_PITCH=.5;
function pesNoChao(ch){let minY=0;
 for(const l of ch.legs){const th=l.g.rotation.x,ph=l.shoe?l.shoe.rotation.x:0,ct=Math.cos(th),st=Math.sin(th),cp=Math.cos(ph),sp=Math.sin(ph);
  for(const z of[-.38,1.3]){const Y=.7-.7*cp-z*sp-4,Z=-.7*sp+z*cp;const y2=4+Y*ct-Z*st;if(y2<minY)minY=y2}}
 return-minY}
function personagem(x,y,z,s,t,o){o=o||{};if(!PERS)return;
 const{ch,pecas,k}=PERS,walk=o.walk||0,sw=Math.sin(o.ph||0)*walk;
 // ---- pose (igual à do site) ----
 const aR=(o.armR===undefined?.12+Math.sin(t*3)*.03:o.armR)-.12,aL=(o.armL===undefined?.12-Math.sin(t*3)*.03:o.armL)-.12;
 const up=clamp(aR/2.4);                                    // 0 = braço baixo, 1 = braço direito acenando
 ch.armRG.rotation.z=aR;ch.armLG.rotation.z=-aL;
 ch.hand1.quaternion.setFromAxisAngle(ch.handUp,up*Math.PI/2).multiply(ch.handBaseQ);
 ch.hand1.position.x=ch.handX+.03*(1-up);                   // na hora de acenar a mão fica centrada no antebraço
 for(const l of ch.legs){l.g.rotation.x=l.s*sw*.35;l.shoe.rotation.x=-FOOT_PITCH*l.g.rotation.x}
 ch.armLG.rotation.x=sw*.4;ch.armRG.rotation.x=up>.05?0:-sw*.4;
 ch.character.position.y=PERS.y0+pesNoChao(ch);
 ch.character.updateMatrixWorld(true);
 // ---- desenho ----
 const base=tf(T(x,y,z),RY(o.ry||0),S(s*k,s*k,s*k));
 D('cyl',tf(T(x,y,z),RY(o.ry||0),S(s*TAM,s*TAM,s*TAM),T(0,.004,.08),S(.5,.002,.35)),[0,0,0],{a:.18,u:1,dw:false});   // sombra no chão
 for(const p of pecas)D(p.nome,M4.mul(base,p.obj.matrixWorld.elements),p.cor,p.op);
}
function ramen(t,spin,o){o=o||{};const a=o.a===undefined?1:o.a;const base=tf(T(o.x,o.y,o.z),S(o.s,o.s,o.s));
 D('bowlO',base,[1,1,.98],{s:.5,e:.25});D('bowlI',base,[1,.98,.94],{s:.4,e:.2});
 const inner=tf(base,RY(spin));
 D('cyl',tf(inner,T(0,.56,0),S(.8,.03,.8)),C.broth,{s:.6});
 for(const n of NOOD)D(n,tf(inner,T(0,.56,0)),C.noodle,{s:.5});
 // eggs
 for(const[ex,ez,r]of[[-.3,.18,.4],[.12,.42,-.3]]){D('sph',tf(inner,T(ex,.6,ez),RY(r),S(.27,.15,.21)),C.white,{s:.7});D('sph',tf(inner,T(ex,.69,ez),S(.1,.085,.1)),C.yolk,{e:.18,s:.6})}
 // chashu
 for(const[cx,cz,r]of[[.35,-.28,.3],[.18,-.5,-.2],[.5,-.05,.8]]){D('cyl',tf(inner,T(cx,.66,cz),RZ(.25),RY(r),S(.3,.05,.3)),[.62,.36,.26],{s:.4});D('cyl',tf(inner,T(cx,.69,cz),RZ(.25),RY(r),S(.2,.03,.2)),[.78,.52,.4])}
 // mushrooms
 for(const[mx,mz]of[[-.45,-.25],[-.12,-.5]]){D('sph',tf(inner,T(mx,.6,mz),S(.2,.1,.2)),C.brown,{s:.5})}
 const rr=rng(3);for(let i=0;i<14;i++){const an=rr()*6.28,rad=rr()*.6;D('cyl8',tf(inner,T(Math.cos(an)*rad,.6,Math.sin(an)*rad),S(.05,.04,.05)),C.green,{s:.2})}
 // nori
 D('box',tf(inner,T(-.55,.7,.1),RZ(.25),S(.02,.4,.3)),[.1,.18,.12]);
 return inner}
function droplet(x,y,z,s,col,a,t){const w=1+.06*Math.sin(t*6+x*5);D('drop',tf(T(x,y,z),S(s*w,s,s*w)),col||C.drop,{a:a,e:.35,s:.8,dw:false})}

// ================= [6] MICRO-ONDAS: lcd() = visor, microwave() = corpo, porta, painel e peças internas =================
let CT=0;
const SEG=[[1,1,1,1,1,1,0],[0,1,1,0,0,0,0],[1,1,0,1,1,0,1],[1,1,1,1,0,0,1],[0,1,1,0,0,1,1],[1,0,1,1,0,1,1],[1,0,1,1,1,1,1],[1,1,1,0,0,0,0],[1,1,1,1,1,1,1],[1,1,1,1,0,1,1]];
function lcd(m,cy){
 const rem=CT<T_WAVES?0:Math.max(0,60-(CT-T_WAVES)),mm=Math.floor(rem/60),ss=Math.floor(rem%60);
 const dg=[mm%10,Math.floor(ss/10),ss%10],xs=[-.2,-.04,.12],col=[.03,.2,.09],w=.07,h=.028,th=.017;
 // a,b,c,d,e,f,g: horizontais (largura w) e verticais (altura 2h)
 const sg=[[0,2*h,w,th],[w/2+th/2,h,th,2*h],[w/2+th/2,-h,th,2*h],[0,-2*h,w,th],[-w/2-th/2,-h,th,2*h],[-w/2-th/2,h,th,2*h],[0,0,w,th]];
 const on=Math.floor(CT*2)%2===0||CT<T_WAVES;
 for(const dy of[.04,-.04])D('box',tf(m,T(-.12,cy+dy,.1),S(.022,.022,.01)),col,{u:1,a:on?1:.2});
 for(let i=0;i<3;i++)for(let k=0;k<7;k++){if(!SEG[dg[i]][k])continue;const q=sg[k];
  D('box',tf(m,T(xs[i]+q[0],cy+q[1],.1),S(q[2],q[3],.01)),col,{u:1})}
}
function microwave(P){const topA=P.topA;
 // floor/back/left shells
 B(C.cream,0,.04,.06,4.4,.08,3.32); // corpo vai de z=-1.6 até 1.72 (frente da porta)
 B(C.cream,0,1.25,-1.56,4.4,2.5,.08);
 B(C.cream,-2.16,1.25,.06,.08,2.5,3.32);
 B(C.cream,2.16,1.25,.06,.08,2.5,3.32);
 // metal lining
 B(C.metal,-.6,.14,.03,2.9,.04,3.0,{s:.5}); B(C.metal,-.6,1.25,-1.5,2.9,2.2,.04,{s:.5}); B(C.metal,-2.08,1.25,.03,.04,2.2,3.0,{s:.5});
 B(C.metal,.9,1.25,.03,.05,2.2,3.0,{s:.4});
 if(topA>0){B(C.cream,0,2.45,.06,4.4,.1,3.32,{a:topA});B(C.metal,-.6,2.36,.03,2.9,.04,3.0,{a:topA})}
 // turntable
 const tt=P.spin; CY([.9,.93,.97],-.6,.17,.1,.25,.04,{s:.5}); D('cyl',tf(T(-.6,.2,.1),S(1.15,.045,1.15)),[.93,.96,1],{a:.9,s:.7,dw:true});
 for(let k=0;k<3;k++)B([.3,.3,.33],-.6+Math.cos(k*2.09+tt)*.5,.21,.1+Math.sin(k*2.09+tt)*.5,.12,.03,.12);
 // electronics
 const e=P.elec; if(e){
  B(C.brown,1.5,.55,.1,.8,.75,.6);B(C.metalD,1.5,.55,.1,.86,.5,.66,{s:.5});B([.55,.35,.18],1.5,.95,.1,.7,.08,.5);
  B(C.silver,1.5,1.55,-.25,.95,.95,.9,{s:.6});
  for(let k=0;k<6;k++)B([.72,.74,.78],1.5,1.2+k*.12,.2,.82,.045,.28,{s:.6});
  CY(C.silver,.95,1.62,-.25,.13,.8,{s:.8},RZ(Math.PI/2));CY(C.gold,.62,1.62,-.25,.17,.26,{s:.9},RZ(Math.PI/2));
  B(C.white,1.5,1.0,-.25,.18,.14,.3);
  D('wire1',M4.id(),[.9,.2,.15]);D('wire2',M4.id(),[.9,.2,.15]);
  CY(C.silver,1.95,.55,-.4,.2,.55,{s:.7}); B(C.dark,1.96,.75,-.4,.1,.1,.1);
  if(P.glowMag>0){const g=P.glowMag;D('box',tf(T(1.5,1.55,-.25),S(1.12,1.12,1.06)),[1,.9,.2],{a:.28*g,e:.8,u:1})}
 }
 // front-right panel
 if(P.panelA>0){const o=P.panelOff;const m=tf(T(1.52+o*5,1.25+o*1.5,1.66+o*1.5),RY(o*1.4),RZ(o*.5));
  D('box',tf(m,S(1.4,2.3,.12)),C.cream);
  D('box',tf(m,T(0,.7,.07),S(.9,.3,.03)),[.1,.14,.12],{s:.6});D('box',tf(m,T(0,.7,.085),S(.6,.14,.02)),[.3,1,.5],{u:1,e:.4});
  lcd(m,.7);
  for(let r=0;r<4;r++)for(let c=0;c<2;c++)D('box',tf(m,T(-.22+c*.44,.15-r*.22,.08),S(.32,.14,.04)),[.82,.82,.8]);}
 // door (frame + glass), pivot at left
 if(P.doorA>0){const ang=P.door;const piv=tf(T(-2.18,1.25,1.64),RY(-ang));
  const dm=(...mm)=>tf(piv,...mm);
  // porta de 3.0 de largura: vai de x=-2.18 até x=.82, encostando no painel (que começa em x=.9)
  D('box',dm(T(1.5,0,0),S(3.0,2.3,.14)),C.cream,{a:P.doorA<1?P.doorA:1});
  const fr=[.34,.32,.32];const zf=.085;
  D('box',dm(T(1.3,.83,zf),S(2.2,.09,.03)),fr,{s:.3});D('box',dm(T(1.3,-.83,zf),S(2.2,.09,.03)),fr,{s:.3});
  D('box',dm(T(.255,0,zf),S(.09,1.75,.03)),fr,{s:.3});D('box',dm(T(2.345,0,zf),S(.09,1.75,.03)),fr,{s:.3});
  D('box',dm(T(1.3,0,.09),S(2.0,1.57,.02)),[.18,.24,.3],{a:.8,s:.9,dw:false});
  D('box',dm(T(2.72,0,.12),S(.1,1.2,.06)),C.white)}
 // cutaway glass plane (door screen)
 if(P.pane>0){D('box',tf(T(-.6,1.25,1.5),S(2.9,2.2,.02)),[.6,.8,1],{a:.1*P.pane,e:.4,u:1,s:.9})}
}
// ================= [7] ONDAS (partículas ciano) e VAPOR =================
const WR=rng(11);const WP=[];for(let i=0;i<44;i++){let d=[-(.25+WR()*.9),(WR()-.5)*1.2,(WR()-.5)*1.4];const l=Math.hypot(...d);WP.push({d:d.map(x=>x/l),tb:T_WAVES+i*.115,ph:WR()*6.28})}
const AN=[.5,1.62,-.25];   // posição da antena do magnetron (de onde saem as ondas)
const RAMEN_POS={x:-.6,y:.23,z:.1,s:.93};   // tigela de lámen, no centro do prato giratório
const fold=(x,lo,hi)=>{const L=hi-lo;let y=((x-lo)%(2*L)+2*L)%(2*L);return lo+(y<L?y:2*L-y)};
function waves(t,amp){const sp=2.0;for(const p of WP){if(t<p.tb)continue;const age=((t-p.tb)%7);
  for(let k=0;k<6;k++){const a=age-k*.055;if(a<0)continue;const pos=[fold(AN[0]+p.d[0]*sp*a,-2.0,.8),fold(AN[1]+p.d[1]*sp*a,.25,2.3),fold(AN[2]+p.d[2]*sp*a,-1.4,1.4)];
   const wob=Math.sin(a*14+p.ph)*.05;const al=amp*(1-k/6)*clamp(age/.3)*.95;const r=.075*(1-k*.1);
   D('sph0',tf(T(pos[0],pos[1]+wob,pos[2]),S(r,r,r)),C.cyan,{a:al,u:1,e:.4,dw:false})}}
 for(let k=0;k<3;k++){const ph=(((t-T_WAVES)*.55+k/3)%1+1)%1;if(t<T_WAVES)continue;const r=.15+ph*1.5;D('sph',tf(T(AN[0],AN[1],AN[2]),S(r,r,r)),C.cyan,{a:.17*(1-ph)*amp,u:1,dw:false})}}
function steam(t,x,y,z,a){for(let i=0;i<9;i++){const ph=((t*.35+i/9)%1);const sx=x+Math.sin(i*2.3+t)*.18,sz=z+Math.cos(i*1.7)*.18;const r=.06+ph*.12;D('sph',tf(T(sx,y+ph*1.1,sz),S(r,r,r)),[1,1,1],{a:.16*(1-ph)*a,u:1,dw:false})}}

// ================= [8] CÂMERA =================
// SHOTS = um grupo por plano. Cada chave é [tempo_s, posição_da_câmera[x,y,z], alvo[x,y,z], campo_de_visão].
// A câmera interpola suavemente entre chaves do mesmo plano. camAt(t) escolhe o plano pelo tempo.
const SHOTS=[
 [[at(1),[1.44,1.9,14.88],[.9,-.6,0],42],[at(2),[1.55,2.29,13.13],[1.0,.3,.3],42],[at(2,1.15),[-.4,3.0,9.4],[-.3,1.25,.5],42],[at(2,2.55),[3.0,2.9,8.6],[1.0,1.4,.1],42],[at(3),[3.8,3.0,7.4],[1.2,1.4,-.1],42]],
 [[at(3),[-.9,4.2,8.8],[-.5,1.1,.2],44],[at(3,6.05),[-.4,3.5,7.8],[-.6,.9,.2],44],[at(4,0.29),[-.6,2.5,5.4],[-.6,.55,.2],44],[at(5),[-.6,2.1,3.9],[-.6,.5,.1],44]],
 [[at(5),[-2.6,.9,7.6],[0,.15,0],42],[at(6),[2.6,.9,7.4],[0,.15,0],42],[at(7),[1.4,.6,6.8],[0,-.2,0],42]],
 [[at(7),[0,.1,7.4],[0,-.1,0],42],[at(8),[0,-.2,7.5],[0,-.2,0],42],[at(10),[0,-.2,7.0],[0,-.2,0],42]],
 [[at(10),[-.4,2.9,4.1],[-.6,.3,.1],44],[at(11),[-.5,2.7,3.7],[-.6,.35,.1],44]],
 [[at(11),[-.6,4.4,3.0],[-.6,.5,.1],44],[at(12),[-.6,4.1,2.8],[-.6,.5,.1],44]],
 [[at(12),[-.6,2.6,5.4],[-.6,.7,.1],44],[at(13),[-.6,2.4,4.6],[-.6,.7,.1],44]],
 [[at(13),[2.4,2.9,19.5],[1.2,.2,.4],42],[SCENES_END,[2.2,2.7,18.0],[1.2,.2,.4],42]]];
// Afastamento da câmera de cada plano (o plano 0 anima sozinho em camAt).
const SHOT_K=[0,1.2,1.0,1.0,1.2,1.2,1.2,1.0];
function camAt(t){if(window.CAMOV)return window.CAMOV;const SC=sceneAt(t),sh=SHOTS[SC.shot];let i=0;while(i<sh.length-2&&t>=sh[i+1][0])i++;const a=sh[i],b=sh[i+1];const u=sm((t-a[0])/(b[0]-a[0]));
 const tg=lerp3(a[2],b[2],u),e0=lerp3(a[1],b[1],u);const k=SC.shot===0?1.4+.28*(1-sm((t-at(1))/3.5)):SHOT_K[SC.shot];return{e:[tg[0]+(e0[0]-tg[0])*k,tg[1]+(e0[1]-tg[1])*k,tg[2]+(e0[2]-tg[2])*k],t:tg,fov:lerp(a[3],b[3],u)}}

// ================= [9] LEGENDAS, CHIPS, ETIQUETAS E ELEMENTOS DE TELA (HTML sobre o 3D) =================
// KEY = palavras destacadas em ciano na legenda do vídeo.
const KEY=/magnetron|micro-ondas|ondas|água|metal|comida|alimentos|pão|biscoito|molécula|moléculas|garfo|faíscas|prato|radioativa|eletromagnetismo|calor|energia/i;
const WORDS=[];for(const[c0,c1,tx]of CUES){const ws=tx.split(/\s+/);const tot=ws.reduce((s,w)=>s+w.length+1,0);let tc=c0;for(const w of ws){const d=(c1-c0)*(w.length+1)/tot;WORDS.push({w,t0:tc,t1:tc+d});tc+=d}}
const GROUPS=[];{let g=[],ch=0;for(const w of WORDS){if(g.length&&(g.length>=3||ch+w.w.length+1>17)){GROUPS.push(g);g=[];ch=0}g.push(w);ch+=w.w.length+1;if(/[.?!]$/.test(w.w)){GROUPS.push(g);g=[];ch=0}}if(g.length)GROUPS.push(g)}
const ov=document.getElementById('ov');
const capEl=document.createElement('div');capEl.id='cap';ov.appendChild(capEl);
let SHOWCAP=true;function setCap(h){if(capEl._h!==h){capEl._h=h;capEl.innerHTML=h}}
function caption(t){if(!SHOWCAP){setCap('');return}let g=null;for(const gr of GROUPS){if(t>=gr[0].t0)g=gr;else break}
 if(!g||t<WORDS[0].t0||t>g[g.length-1].t1+.35&&g===GROUPS[GROUPS.length-1]){setCap('');return}
 setCap(g.map(x=>{const act=t>=x.t0&&t<x.t1,past=t>=x.t1;const key=KEY.test(x.w);
  const col=key?'#5fe1ff':'#fff';const op=(act||past)?1:.4;const sc=act?1.08:1;return `<span style="color:${col};opacity:${op};transform:scale(${sc})">${x.w}</span>`}).join(' '))}
// CHIPS: cartões coloridos. t0/t1 = entra/sai (s); cls = green|blue|red|orange; ic = ícone; h = título; s = subtítulo; y = altura (px, padrão 150).
// ATENÇÃO: o CSS ".chip{display:none!important}" os esconde. Remova essa regra para exibi-los.
const CHIPS=[
 {t0:at(2,3.2),t1:at(2,5.55),cls:'green',ic:'✓',h:'MAGNETRON',s:'Fonte das micro-ondas'},
 {t0:at(3,0.5),t1:at(3,7.65),cls:'blue',ic:'i',h:'MICRO-ONDAS',s:'Ondas de rádio invisíveis'},
 {t0:at(3,4.05),t1:at(3,7.65),cls:'green',ic:'✓',h:'PAREDES DE METAL',s:'Refletem as ondas',y:262},
 {t0:at(4,0.49),t1:at(4,5.14),cls:'blue',ic:'i',h:'ÁGUA (H₂O)',s:'Está em quase todo alimento'},
 {t0:at(5,0.49),t1:at(5,5.09),cls:'blue',ic:'i',h:'PÃO E BISCOITO',s:'Também guardam água'},
 {t0:at(6,0.29),t1:at(7),cls:'orange',ic:'🔥',h:'ÁGUA → CALOR',s:'É ela que esquenta a comida'},
 {t0:at(7,0.35),t1:at(7,5.05),cls:'blue',ic:'i',h:'MOLÉCULA DE ÁGUA',s:'Um lado + e outro −'},
 {t0:at(8,0.13),t1:at(8,1.83),cls:'blue',ic:'↻',h:'MOLÉCULAS GIRAM',s:'Seguem a onda o tempo todo'},
 {t0:at(8,1.93),t1:at(8,6.83),cls:'orange',ic:'⚡',h:'BILHÕES DE VEZES/s',s:'≈ 2,45 bilhões por segundo'},
 {t0:at(9,0.21),t1:at(9,6.41),cls:'orange',ic:'🔥',h:'VIRA CALOR',s:'As vizinhas esquentam também'},
 {t0:at(10,0.12),t1:at(10,2.67),cls:'red',ic:'✗',h:'GARFO NÃO!',s:'Metal reflete as ondas'},
 {t0:at(10,2.77),t1:at(10,5.17),cls:'red',ic:'⚡',h:'FAÍSCAS',s:'Perigo: pode causar fogo'},
 {t0:at(11,0.29),t1:at(11,3.09),cls:'orange',ic:'🔥',h:'PONTOS QUENTES E FRIOS',s:'As ondas se somam e se cancelam'},
 {t0:at(11,3.29),t1:at(11,8.09),cls:'green',ic:'↻',h:'PRATO GIRATÓRIO',s:'Todo pedaço passa pelos pontos quentes'},
 {t0:at(12,0.17),t1:at(12,2.57),cls:'red',ic:'☢',h:'NÃO FICA RADIOATIVA',s:'Nada fica na comida'},
 {t0:at(12,2.77),t1:at(12,5.57),cls:'blue',ic:'i',h:'SÓ MEXE A ÁGUA',s:'As moléculas de água vibram'},
 {t0:at(13,0.17),t1:at(13,1.77),cls:'green',ic:'🍜',h:'HORA DO ALMOÇO',s:'Agora você já sabe!'},
 {t0:at(13,1.87),t1:at(13,4.27),cls:'red',ic:'✗',h:'NÃO É MAGIA',s:'Tem ciência por trás'},
 {t0:at(13,4.37),t1:SCENES_END,cls:'green',ic:'⚡',h:'ELETROMAGNETISMO',s:'Ondas + água = calor'}];
CHIPS.forEach(c=>{const e=document.createElement('div');e.className='chip '+c.cls;e.innerHTML=`<div class="ic">${c.ic}</div><div><b>${c.h}</b><small>${c.s}</small></div>`;e.style.top=(c.y||150)+'px';ov.appendChild(e);c.el=e});
// TAGS: etiqueta presa a um ponto 3D. a = ponto fixo [x,y,z]; fn = ponto que se move com o tempo;
// off = deslocamento da caixa na tela [px_x, px_y]; t0/t1 = entra/sai (s).
const TAGS=[
 {t0:at(2,3.95),t1:at(2,5.55),txt:'MAGNETRON',a:[1.5,1.95,-.25],off:[-150,-120]},
 {t0:at(3,4.65),t1:at(3,7.05),txt:'PAREDE DE METAL',a:[-2.05,1.5,-.4],off:[110,-170]},
 {t0:at(4,0.89),t1:at(4,5.09),txt:'ÁGUA',a:[-.6,.9,.1],off:[-190,-210],dyn:1},
 {t0:at(5,2.09),t1:at(5,4.99),txt:'GOTAS DE ÁGUA',a:[.55,1.2,0],off:[150,-150]},
 {t0:at(10,0.37),t1:at(10,2.57),txt:'GARFO (METAL)',fn:t=>xf(forkM(t),[0,.9,0]),off:[120,-150]},
 {t0:at(10,2.87),t1:at(10,5.07),txt:'FAÍSCAS',fn:t=>xf(forkM(t),[0,1.75,0]),off:[90,-150]},
 {t0:at(11,0.79),t1:at(11,3.09),txt:'PONTO QUENTE',a:[-.6,.98,.1],off:[-200,-190]},
 {t0:at(11,1.39),t1:at(11,3.09),txt:'PONTO FRIO',a:[.11,.98,.1],off:[-20,-210]}];
TAGS.forEach(c=>{c.box=document.createElement('div');c.box.className='tag';c.box.textContent=c.txt;c.dot=document.createElement('div');c.dot.className='dot';c.ln=document.createElement('div');c.ln.className='line';ov.append(c.ln,c.dot,c.box)});
const bubble=document.createElement('div');bubble.id='bubble';bubble.textContent='?';ov.appendChild(bubble);
// CHG: sinais + e − na molécula de água (cena 7). a = posição 3D relativa à molécula.
const CHG=[{t0:at(7,2.15),t1:at(7,5.05),cls:'p',tx:'+',a:[.95,.95,.55]},{t0:at(7,2.15),t1:at(7,5.05),cls:'p',tx:'+',a:[-.95,.95,.55]},{t0:at(7,3.25),t1:at(7,5.05),cls:'n',tx:'−',a:[0,-.95,.55]}];
CHG.forEach(c=>{c.el=document.createElement('div');c.el.className='chg '+c.cls;c.el.textContent=c.tx;ov.appendChild(c.el)});
const thermo=document.createElement('div');thermo.id='thermo';thermo.innerHTML='<div class="tube"><div class="fill"></div></div><div class="deg">20°C</div>';ov.appendChild(thermo);
const thFill=thermo.querySelector('.fill'),thDeg=thermo.querySelector('.deg');
const TREF=(()=>{const pt=(r,a)=>{a*=Math.PI/180;return(100+r*Math.sin(a)).toFixed(2)+' '+(100-r*Math.cos(a)).toFixed(2)};let bl='';for(const c of[60,180,300]){const a1=c-30,a2=c+30,ri=30,ro=74;bl+=`<path d="M${pt(ri,a1)} L${pt(ro,a1)} A${ro} ${ro} 0 0 1 ${pt(ro,a2)} L${pt(ri,a2)} A${ri} ${ri} 0 0 0 ${pt(ri,a1)} Z" fill="#111"/>`}return`<svg viewBox="0 0 200 200" width="165" height="165"><circle cx="100" cy="100" r="95" fill="#ffd500" stroke="#111" stroke-width="8"/>${bl}<circle cx="100" cy="100" r="17" fill="#111"/></svg>`})();
const ban=document.createElement('div');ban.id='ban';ban.innerHTML=TREF;ov.appendChild(ban);
function toScreen(p){const x=VP[0]*p[0]+VP[4]*p[1]+VP[8]*p[2]+VP[12],y=VP[1]*p[0]+VP[5]*p[1]+VP[9]*p[2]+VP[13],w=VP[3]*p[0]+VP[7]*p[1]+VP[11]*p[2]+VP[15];return[(x/w*.5+.5)*720,(1-(y/w*.5+.5))*1280]}
// pop(t,t0,t1): animação de entrada/saída de um elemento de tela.
// Devolve {o: opacidade 0..1, s: escala}. Entra em .3s (com leve "quique") e sai em .2s.
const pop=(t,t0,t1)=>{const entrada=clamp((t-t0)/.3),saida=clamp((t1-t)/.2);const quique=entrada<1?1-Math.pow(1-entrada,3)*Math.cos(entrada*8):1;return{o:Math.min(entrada,saida),s:.6+.4*quique}}

// ================= [10] CENAS 7-13 (28s → 1:11) =================
// water() = molécula; molScene() = cenas 7, 8 e 9; fork()/sparks() = garfo; kitchen() = cenas 10 a 13.
// Dentro de kitchen(): sc 10 = garfo, 11 = prato giratório, 12 = radioatividade, 13 = final com o personagem.
const xf=(M,p)=>[M[0]*p[0]+M[4]*p[1]+M[8]*p[2]+M[12],M[1]*p[0]+M[5]*p[1]+M[9]*p[2]+M[13],M[2]*p[0]+M[6]*p[1]+M[10]*p[2]+M[14]];
const HOTC=[1,.5,.12],HOTH=[1,.78,.25];
const hotDrop=f=>[lerp(C.drop[0],1,f),lerp(C.drop[1],.38,f),lerp(C.drop[2],.1,f)];
function water(M,heat){
 const cO=[lerp(.3,HOTC[0],heat),lerp(.55,HOTC[1],heat),lerp(1,HOTC[2],heat)];
 const cH=[lerp(1,HOTH[0],heat),lerp(.45,HOTH[1],heat),lerp(.4,HOTH[2],heat)];
 for(const[hx,hy]of[[.75,.58],[-.75,.58]]){const L=Math.hypot(hx,hy);
  D('cyl',tf(M,T(hx/2,hy/2,0),RZ(Math.atan2(-hx,hy)),S(.13,L,.13)),[.92,.92,.95],{s:.3});
  D('sphS',tf(M,T(hx,hy,0),S(.34,.34,.34)),cH,{s:.5})}
 D('sphS',tf(M,S(.58,.58,.58)),cO,{s:.5})}
function wband(t,by,al,z){for(let i=0;i<26;i++){const x=3.0-((t*2.0+i*.26)%6.0);const y=by+.18*Math.sin(x*5-t*14);D('sph0',tf(T(x,y,z),S(.045,.045,.045)),C.cyan,{a:al,u:1,e:.5,dw:false})}}
function molScene(t,sc){
 if(sc===7){
  const a=.18*Math.sin(t*1.4),s=1.15*(1+.02*Math.sin(t*3));
  const M=tf(RZ(a),S(s,s,s));
  water(M,0);
  for(const c of CHG){const p=pop(t,c.t0,c.t1);c.el.style.opacity=Math.max(0,p.o);if(p.o>.01){const q=toScreen(xf(M,c.a));c.el.style.left=q[0]+'px';c.el.style.top=q[1]+'px';c.el.style.transform=`translate(-50%,-50%) scale(${p.s})`}}
  if(t>=at(7,3.55))wband(t,0,.9*clamp((t-at(7,3.55))/.4)*clamp((at(7,5.1)-t)/.3),.8);
 } else {
  // fase = quantas voltas a molécula já deu. Três momentos:
  //  1) até at(8,1.8): gira devagar, 1.2 voltas/s (2.16 voltas acumuladas = 1.2*1.8s);
  //  2) por 2.6s: acelera de 1.2 até 5 voltas/s (aceleração = 2*.7308 voltas/s²);
  //  3) depois de at(8,4.4): segue em velocidade constante, 5 voltas/s.
  const dtAcel=clamp(t-at(8,1.8),0,2.6);
  const fase=t<at(8,1.8)?1.2*(t-at(8)):2.16+1.2*dtAcel+.7308*dtAcel*dtAcel+(t>at(8,4.4)?5*(t-at(8,4.4)):0);
  const cols=[-.8,0,.8],rows=[1.05,0,-1.05],s2=.38;
  // calor (0..1): a molécula do centro esquenta primeiro (1s); as vizinhas depois e mais devagar (4.6s)
  const calorCentro=t<at(9)?0:sm((t-at(9,0.06))/1.0),calorVizinhas=t<at(9)?0:sm((t-at(9,1.21))/4.6);
  const wa=t<at(9)?.85:.35;
  wband(t,1.57,wa,-.6);wband(t,.52,wa,-.6);wband(t,-.52,wa,-.6);wband(t,-1.57,wa,-.6);
  if(t>=at(9,0.51)){const ea=sm((t-at(9,0.51))/.6)*(1-sm((t-at(9,5.21))/1.0));let k2=0;
   for(const ry of rows)for(const cx of cols){const kk=k2++;if(kk===4)continue;const L=Math.hypot(cx,ry);
    D('cyl',tf(T(cx/2,ry/2,0),RZ(Math.atan2(-cx,ry)),S(.03,L,.03)),[1,.6,.2],{a:.5*ea*(.6+.4*Math.sin(t*6-kk)),u:1,e:.5,dw:false});
    const pp=(t*1.3+kk*.13)%1;D('sph0',tf(T(cx*pp,ry*pp,.05),S(.06,.06,.06)),[1,.85,.4],{a:.95*ea,u:1,e:.7,dw:false})}}
  let k=0;
  for(const ry of rows)for(const cx of cols){
   const h=k===4?calorCentro:calorVizinhas,j=h*.03;   // k===4 é a molécula do meio da grade 3x3; j = tremor
   const x=cx+Math.sin(t*47+k*2)*j,y=ry+Math.cos(t*53+k)*j;
   const th=1.35*Math.sin(fase*6.2832+(cx+ry)*.6);
   water(tf(T(x,y,0),RZ(th),S(s2,s2,s2)),h);k++}
 }
}
function forkM(t){return tf(T(-.6,.25,.1),RY(Math.PI/2+.12*Math.sin(t*.8)),T(0,0,0),RX(-Math.PI/2),S(.85,.85,.85),T(0,-.9,0))}
function fork(M){const m=[.5,.54,.62];
 D('box',tf(M,T(0,.45,0),S(.1,.9,.035)),m,{s:.9});
 D('box',tf(M,T(0,1.03,0),S(.07,.32,.03)),m,{s:.9});
 D('box',tf(M,T(0,1.27,0),S(.36,.14,.03)),m,{s:.9});
 for(const dx of[-.14,-.047,.047,.14])D('box',tf(M,T(dx,1.58,0),S(.05,.5,.03)),m,{s:.9})}
function sparks(t,M,amp){if(amp<=.01)return;const f=Math.floor(t*18);
 const c=xf(M,[0,1.75,0]);
 D('sph',tf(T(c[0],c[1],c[2]),S(.3,.3,.3)),[1,.85,.3],{a:.3*amp*(.6+.4*Math.sin(t*55)),u:1,e:.6,dw:false});
 for(let i=0;i<22;i++){const r=rng(f*37+i*101+7);if(r()>amp*.85)continue;
  const p=xf(M,[(r()-.5)*.4,1.55+r()*.35,0]);const d=[(r()-.5)*.55,(r()-.1)*.55,(r()-.5)*.55],rr=.035+r()*.045;
  D('sph0',tf(T(p[0]+d[0],p[1]+d[1],p[2]+d[2]),S(rr,rr,rr)),[1,.95,.55],{a:.95,u:1,e:.8,dw:false});
  if(i%4===0)D('box',tf(T(p[0]+d[0]*.5,p[1]+d[1]*.5,p[2]+d[2]*.5),RZ(r()*6.28),S(.02,.18+r()*.2,.02)),[1,1,.85],{a:.9,u:1,e:.9,dw:false})}}
function kitchen(t,sc){
 if(sc===13){
  microwave({topA:1,door:0,doorA:1,panelOff:0,panelA:1,elec:false,glowMag:0,spin:0,pane:0});
  const FX=1.5,inx=FX+(BX+3.5-FX)*(1-sm((t-at(13,0.07))/1.1));
  const up=sm((t-at(13,1.37))/.5);const bo={ry:lerp(-1.75,.06,sm((t-at(13,0.77))/.6)),armR:.12+2.48*up+Math.sin(t*7)*.28*up,armL:.12,walk:clamp((at(13,1.17)-t)/.3),ph:t*9};
  personagem(inx,FLR,BZ,BSC,t,bo);
  return}
 const glow=.6+.4*Math.sin(t*7);
 microwave({topA:0,door:0,doorA:0,panelOff:1,panelA:0,elec:true,glowMag:glow*(sc===12?.4:1),spin:t*.9,pane:1});
 if(sc===10){
  const M=forkM(t);fork(M);sparks(t,M,sm((t-at(10,1.87))/.7));
  waves(t,1);
 } else if(sc===11){
  const cx=-.6,cz=.1,k=4.4;const I=(x,z)=>.5+.5*Math.cos(k*(x-cx))*Math.cos(k*(z-cz));
  const fa=sm((t-at(11,0.29))/.9);
  ramen(t,(t-at(10,5.27))*.9,RAMEN_POS);
  for(let m=-1;m<=1;m++)for(let n=-1;n<=1;n++){const hot=((m+n)%2===0),px=cx+m*.714,pz=cz+n*.714;
   const pul=hot?.75+.25*Math.sin(t*7+m+n*2):1,col=hot?[1,.45,.1]:[.3,.55,1];
   for(let L=0;L<5;L++){const r=.5-L*.085;D('cyl',tf(T(px,.98+L*.002,pz),S(r,.01,r)),col,{a:.11*fa*pul,u:1,e:.3,dw:false})}}
  for(let i=0;i<9;i++){const m=i%3-1,n=Math.floor(i/3)-1;const q=I(cx+m*.714,cz+n*.714);if(q>.55)steam(t+i*.4,cx+m*.714,.85,cz+n*.714,(q-.4)*.9)}
  waves(t,.35);
 } else {
  ramen(t,t*.6,RAMEN_POS);
  waves(t,.7);
  steam(t,-.6,.9,.1,.5);
  if(t>=at(12,2.67)){const f=sm((t-at(12,2.67))/.8);const dr=rng(21);
   for(let i=0;i<14;i++){const an=dr()*6.28,rad=Math.sqrt(dr())*.6;const jx=Math.sin(t*41+i*3)*.04*f,jy=Math.cos(t*37+i*2)*.04*f;
    droplet(-.6+Math.cos(an)*rad+jx,1.15+dr()*.5+jy,.1+Math.sin(an)*rad,.07+dr()*.03,hotDrop(f),f*.9,t)}}
 }
}

// ================= [11] COZINHA (cenário de fundo): kitchenRoom() =================
// BX, FLR, BSC, BZ = posição inicial, altura do piso, escala e profundidade do personagem.
const BX=3.3,FLR=-3.0,BSC=2.2,BZ=5.4;
function plate(x,y,z,r){D('cyl8',tf(T(x,y,z),S(r,.07,r)),[.97,.97,.95],{s:.4});D('cyl8',tf(T(x,y+.04,z),S(r*.68,.05,r*.68)),[.88,.92,.97],{s:.3})}
function kitchenRoom(t){
 const WL=[.97,.94,.88],GR=[.6,.78,.46],GR2=[.7,.87,.56],TOP=[1,.8,.48],DK=[.25,.27,.3],WH=[.95,.95,.96],SV=[.84,.86,.9];
 // piso (xadrez) e parede
 B([.96,.68,.38],0,FLR-.03,8,70,.04,70,{s:.1});
 for(let i=-7;i<=7;i++)for(let j=-3;j<=10;j++){if((i+j)&1)continue;B([1,.77,.47],i*2.4,FLR-.01,j*2.4,2.4,.02,2.4,{s:.1})}
 B(WL,0,5,-3.95,70,16,.2,{s:.05});
 B([.9,.84,.74],0,FLR+.25,-3.8,70,.5,.1,{s:.1});
 // armário verde + tampo
 B(GR,.15,-1.62,-.2,6.9,2.76,7.2,{s:.1});
 B(TOP,.15,-.12,-.15,7.0,.24,7.3,{s:.2});
 for(let k=0;k<4;k++){const xc=-2.45+k*1.7;B(GR2,xc,-1.62,3.43,1.6,2.5,.06,{s:.15});B(DK,xc+(k%2?-.55:.55),-.75,3.48,.07,.55,.05,{s:.3})}
 B([.38,.45,.34],.15,-2.9,3.3,6.9,.2,.06,{s:.1});
 // geladeira
 B(WH,-4.4,.3,-2.5,2.2,6.6,2.6,{s:.5});
 B([.62,.64,.68],-4.4,1.3,-1.18,2.2,.07,.04);
 B(DK,-3.6,2.3,-1.14,.12,1.0,.07,{s:.4});B(DK,-3.6,.2,-1.14,.12,1.3,.07,{s:.4});
  // bancada esquerda: garrafa
 CY([.15,.4,.18],-2.8,.65,-2.7,.2,1.3,{s:.6});CY([.15,.4,.18],-2.8,1.5,-2.7,.08,.4,{s:.6});CY([.95,.85,.4],-2.8,.7,-2.7,.205,.4,{s:.3});
 // prateleira, vasinhos e planta
 B([.85,.62,.4],-.6,4.4,-3.55,5.0,.14,.6,{s:.2});
 CY([.95,.78,.4],-2.3,4.85,-3.55,.3,.8,{s:.4});CY([.7,.3,.25],-2.3,5.3,-3.55,.32,.1,{s:.4});
 CY([.6,.82,.5],-1.4,4.8,-3.55,.28,.7,{s:.4});CY([.7,.3,.25],-1.4,5.2,-3.55,.3,.1,{s:.4});
 CY([.8,.4,.3],.4,4.7,-3.55,.3,.55,{s:.3});SP('sphS',[.3,.7,.3],.4,5.2,-3.55,.4,.35,.4,{s:.3});
 // relógio
 CY(DK,2.85,4.9,-3.78,.7,.1,{s:.3},RX(Math.PI/2));CY(WH,2.85,4.9,-3.72,.6,.1,{s:.3},RX(Math.PI/2));
 D('box',tf(T(2.85,4.9,-3.64),RZ(-t*1.2),T(0,.2,0),S(.05,.4,.03)),DK,{s:.2});
 D('box',tf(T(2.85,4.9,-3.63),RZ(-t*.1),T(0,.14,0),S(.07,.28,.03)),DK,{s:.2});
 // janela
 B(WH,6.0,3.6,-3.78,3.4,3.2,.12,{s:.3});B([.62,.84,1],6.0,3.6,-3.7,3.0,2.8,.05,{s:.1,e:.25});
 B(WH,6.0,3.6,-3.66,.1,2.8,.05);B(WH,6.0,3.6,-3.66,3.0,.1,.05);
 // sombra suave do micro-ondas (camadas retangulares)
 for(let k=0;k<7;k++){const g=k*.1;B([.35,.2,.05],-.1,.008+k*.0004,-.05,4.4+g*1.6,.004,3.2+g*1.6,{a:.045,u:1,dw:false})}
}

// ----- CENAS 1-4: micro-ondas por dentro, personagem e ondas -----
function drawMicrowave(t,sc){
  const topA=t<at(2,0.2)?1:t<at(2,0.7)?1-(t-at(2,0.2))/.5:0;
  const door=t<at(2)?0:t<at(2,1.15)?Math.PI*.58*sm((t-at(2))/1.1):Math.PI*.58;
  const doorA=t<at(3)?1:0; const panelOff=t<at(2,0.5)?0:sm((t-at(2,0.5))/.8);const panelA=t<at(3)?(panelOff<1?1:0):0;
  const glow=t>at(2,3.05)&&t<at(3)?.6+.4*Math.sin(t*7):0;
  const showElec=t>=at(2,0.4);
  // door closed in scene 1 drawn at angle 0
  const doorAng=t<at(3)?door:0;
  microwave({topA,door:doorAng,doorA:t<at(3)?1:0,panelOff,panelA:t<at(3)?(panelOff<.999?1:0):0,elec:showElec,glowMag:glow,spin:t*.6,pane:t>=at(3)?1:0});
  ramen(t,t*.6,RAMEN_POS);
  if(t>=T_WAVES&&sc<=4){waves(t,sc===4?.35:1)}
  if(sc>=3)steam(t,-.6,.9,.1,sc===4?.7:.3);
  // personagem: aparece só na cena 1 e sai andando pela direita antes de a cena 2 começar
  if(t<at(2)){const out=sm((t-at(2,-1.0))/1.0);   // último segundo da cena 1
   const o={ry:lerp(-1.75,1.57,sm(out*4)),armR:.12,armL:.12};   // vira para a direita e sai
   const bx=BX+out*6;
   o.walk=out>0?1:0;o.ph=t*9;   // anda (pernas e braços) enquanto se desloca
   personagem(bx,FLR,BZ,BSC,t,o);
   const hp=toScreen([bx,FLR+2.02*BSC*TAM+.46,BZ]);bubble.style.left=hp[0]+'px';bubble.style.top=hp[1]+'px';const bo=clamp((t-at(1,0.3))/.3)*clamp((at(2,-0.7)-t)/.3);bubble.style.opacity=bo;bubble.style.transform=`translate(-50%,-50%) scale(${.6+.4*bo})`;}
  else bubble.style.opacity=0;
  if(sc===4||t>=at(4,0.29)){ // water droplets rising from the bowl
   const dr=rng(5);for(let i=0;i<16;i++){const an=dr()*6.28,rad=Math.sqrt(dr())*.55,ph=dr();const age=((t*.32+ph)%1);const a=Math.sin(Math.PI*age)*clamp((t-at(4,0.39))/.6);
    droplet(-.6+Math.cos(an)*rad,.66+age*1.05,.1+Math.sin(an)*rad,.065+dr()*.04,C.drop,a*.95,t)}}
}

// ----- CENAS 5-6: pão e biscoito (fundo azul-marinho) -----
function drawBread(t,sc){
  // ---- navy scenes: bread & biscuit with hidden water ----
  const heat=clamp((t-at(6,0.29))/1.0);const xray=sm((t-at(5,0.89))/.9);const sp=t*.6;
  const hot=[lerp(C.drop[0],1,heat),lerp(C.drop[1],.38,heat),lerp(C.drop[2],.1,heat)];
  const items=[{x:0,y:.8,z:0,kind:'bread'},{x:0,y:-1.25,z:0,kind:'cookie'}];
  const dr=rng(9);
  for(const it of items){const n=it.kind==='bread'?5:6;
   for(let i=0;i<n;i++){const appear=sm((t-(at(5,1.39)+i*.18+(it.kind==='cookie'?.5:0)))/.5);
    const jx=heat*Math.sin(t*38+i*3)*.025,jy=heat*Math.cos(t*41+i*2)*.025;
    const px=it.x+(dr()-.5)*(it.kind==='bread'?1.5:1.0),pz=(dr()-.5)*(it.kind==='bread'?.5:.8),py=it.y+(dr()-.5)*(it.kind==='bread'?.28:.08)+.02;
    droplet(px+jx,py+jy,pz,.12*appear*(1+heat*.35),heat>0?hot:C.drop,.95*appear,t)}
   if(heat>0)D('sph',tf(T(it.x,it.y,0),S(1.25+heat*.12,.9,1.0)),[1,.45,.1],{a:.07*heat*(.7+.3*Math.sin(t*9)),u:1,dw:false});
   const sa=1-.65*xray;
   const wob=Math.sin(sp)*.25;
   if(it.kind==='bread'){const m=(...mm)=>tf(T(it.x,it.y,it.z),RX(.95),RY(Math.sin(sp)*.3),...mm);
    const rx=1.25,ry=.46,rz=.58;
    D('sphS',m(S(rx,ry,rz)),[.97,.62,.2],{a:sa,s:.3,dw:false});
    for(const gx of[-.78,-.39,0,.39,.78]){const q=Math.sqrt(Math.max(.01,1-(gx/rx)**2));const gy=ry*q*.985;const tilt=Math.atan(ry*gx/(rx*rx*q));
     D('sphS',m(T(gx,gy,0),RZ(tilt),RY(.6),S(.08,.05,.3)),[.78,.4,.1],{a:sa,s:.1,dw:false})}}
   else{const m=(...mm)=>tf(T(it.x,it.y,it.z),RX(1.0),RY(sp*.8),...mm);
    const rx=.95,ry=.3,rz=.78;
    D('sphS',m(S(rx,ry,rz)),[.94,.63,.28],{a:sa,s:.25,dw:false});
    for(const[cx,cz,cs]of[[-.4,.25,1],[.35,.3,.85],[.05,-.02,.7],[-.5,-.35,.9],[.12,-.42,1.1],[.62,-.08,.7]]){const q=Math.sqrt(Math.max(.01,1-(cx/rx)**2-(cz/rz)**2));
     D('sphS',m(T(cx,ry*q*.99,cz),S(.15*cs,.05,.105*cs)),[.3,.12,.16],{a:sa,s:.2,dw:false})}}
  }
  if(t>=at(6,0.09))for(const it of items)steam(t,it.x,it.y+.25,0,heat*.8);
  bubble.style.opacity=0;
}

// ----- CENAS 7-9: moléculas de água -----
function drawMolecules(t,sc){bubble.style.opacity=0;molScene(t,sc)}

// ----- CENAS 10-13: garfo, prato giratório, radioativa, final -----
function drawKitchen(t,sc){bubble.style.opacity=0;kitchen(t,sc)}

// ----- partes do quadro (chamadas por R) -----
function atualizarTermometro(t){
 {const hh=t<at(9)?0:sm((t-at(9,0.06))/5.8),tp=pop(t,at(9,0.11),at(9,6.41));thermo.style.opacity=Math.max(0,tp.o);thFill.style.height=(8+92*hh)+'%';thDeg.textContent=Math.round(20+60*hh)+'°C'}
}
function atualizarBanner(t){
 {const bp=pop(t,at(12,0.17),at(12,2.57));ban.style.opacity=Math.max(0,bp.o);ban.style.transform=`scale(${bp.s})`}
}
function atualizarChips(t){
 for(const c of CHIPS){const p=pop(t,c.t0,c.t1);c.el.style.opacity=Math.max(0,p.o);c.el.style.transform=`translateX(-50%) scale(${p.s})`}
}
function atualizarEtiquetas(t){
 for(const c of TAGS){const p=pop(t,c.t0,c.t1);const on=p.o>0.01;[c.box,c.dot,c.ln].forEach(e=>e.style.display=on?'block':'none');if(!on)continue;
  const ap=c.fixed?c.fixed:toScreen(c.fn?c.fn(t):c.a);const bx=ap[0]+c.off[0],by=ap[1]+c.off[1];c.dot.style.left=ap[0]+'px';c.dot.style.top=ap[1]+'px';c.box.style.left=bx+'px';c.box.style.top=by+'px';
  const dx=ap[0]-bx,dy=ap[1]-by;c.ln.style.left=bx+'px';c.ln.style.top=by+'px';c.ln.style.width=Math.hypot(dx,dy)+'px';c.ln.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
  [c.box,c.dot,c.ln].forEach(e=>e.style.opacity=p.o)}
}
function atualizarCorte(t){
 const dip=document.getElementById('dip');const cuts=SCENES.filter(q=>q.cut).map(q=>q.t0);let dd=0;for(const k of cuts)dd=Math.max(dd,1-Math.abs(t-k)/.12);dip.style.opacity=clamp(dd)*.95;
}

// ================= [12] RENDER PRINCIPAL: R(t) desenha o quadro do instante t =================
// Escolhe a cena por ST, troca o fundo (creme nas cenas de cozinha, azul-marinho nas cenas 5 a 9),
// desenha o 3D e atualiza chips, etiquetas, legenda e o escurecimento entre cenas (array "cuts").
function R(t){
 CT=t;const cam=camAt(t);EYE=cam.e;
 let P=M4.persp(cam.fov*Math.PI/180,720/1280,.1,100);P=M4.mul(T(0,.16,0),P);
 VP=M4.mul(P,M4.look(cam.e,cam.t,[0,1,0]));
 const SC=sceneAt(t),sc=SC.n;
 const navy=!!SC.navy;
 const bg=document.getElementById('bg');bg.style.background=navy?'radial-gradient(circle at 50% 38%,#24408a 0%,#12234f 55%,#0a1330 100%)':'linear-gradient(#f6ead6 0%,#efdcc0 55%,#e2c39c 100%)';
 SKY=navy?[.62,.7,.95]:[.9,.86,.8];GND=navy?[.3,.32,.5]:[.58,.52,.46];
 gl.viewport(0,0,cv.width,cv.height);gl.depthMask(true);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
 if(!navy)kitchenRoom(t);
 SC.draw(t,sc);
 if(sc!==7)for(const c of CHG)c.el.style.opacity=0;
 atualizarTermometro(t);
 atualizarBanner(t);
 atualizarChips(t);
 atualizarEtiquetas(t);
 caption(t);
 atualizarCorte(t);
}


const FRAME=R;   // FRAME(t) desenha o quadro do instante t (segundos)

/* ===== [13] PLAYER (botões, linha do tempo, áudio, tela cheia) =====
   ST  = início de cada cena (s)     SCN = nome de cada cena     TOT = duração total (s)
   Para a narração em áudio: botão "Narração" → escolha o arquivo; "começa em (s)" ajusta o atraso. */
const $=s=>document.querySelector(s);
const ST=SCENES.map(q=>q.t0),TOT=SCENES_END;
const SCN=SCENES.map(q=>q.name);
let PT=0,playing=false,si=-1,lastN=0,speed=1;
const slider=$('#sc'),au=$('#au'),stageEl=$('#stage'),wrapEl=$('#wrap');slider.max=TOT;
function fit(){const w=wrapEl.clientWidth,h=wrapEl.clientHeight;if(!w||!h)return;const k=Math.min(w/720,h/1280);stageEl.style.transform='translate('+((w-720*k)/2)+'px,'+((h-1280*k)/2)+'px) scale('+k+')'}
new ResizeObserver(fit).observe(wrapEl);addEventListener('resize',fit);document.addEventListener('fullscreenchange',()=>setTimeout(fit,50));fit();
SCN.forEach((n,i)=>{const b=document.createElement('button');b.textContent=''+(i+1);b.title=n;b.onclick=()=>seek(ST[i]);$('#scenes').appendChild(b)});
const fmt=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const CU=window.CUES;let subI=-2;
function frame(){
 let i=0;while(i<ST.length-1&&PT>=ST[i+1])i++;
 if(i!==si){si=i;[...$('#scenes').children].forEach((b,j)=>b.classList.toggle('on',j===i))}
 FRAME(Math.round(PT*30)/30);
 slider.value=PT;$('#tc').textContent=fmt(PT)+' / '+fmt(TOT);
 let j=-1;for(let k=0;k<CU.length;k++){if(PT>=CU[k][0])j=k;else break}
 if(j>=0&&PT>CU[j][1]+.4)j=-1;
 if(j!==subI){subI=j;$('#sub').textContent=j>=0?(j+1)+' - '+CU[j][2]:''}
}
function seek(t){PT=clamp(t,0,TOT-.001);frame();if(au.src)au.currentTime=Math.max(0,PT-(+$('#off').value))}
function play(on){playing=on;$('#bPlay').textContent=on?'⏸ Pausar':'▶ Reproduzir';$('#nPlay').textContent=on?'⏸ Pausar':'▶ Reproduzir';
 if(on){if(PT>=TOT-.05)seek(0);lastN=performance.now();if(au.src){au.currentTime=Math.max(0,PT-(+$('#off').value));au.play().catch(()=>{})}}else au.pause()}
// um som por pisada enquanto o personagem anda: saindo (fim da cena 1) e entrando (início da cena 13). O pé toca o chão quando a fase da passada (t*9) é π/2 + k·π.
const passada=t=>Math.floor((t*9-Math.PI/2)/Math.PI);
function somDosPassos(antes,agora){
 if(agora<=antes||agora-antes>.5)return;                      // voltar ou pular no vídeo não faz som
 const andando=(agora>=at(2,-1)&&agora<at(2))||(agora>=at(13,.07)&&agora<at(13,1.1));
 if(andando&&passada(agora)!==passada(antes)&&window.tocarPasso)window.tocarPasso()}
// um som cada vez que uma etiqueta (tabela TAGS) aparece com o vídeo rodando
function somDasEtiquetas(antes,agora){
 if(agora<=antes||agora-antes>.5)return;                      // voltar ou pular no vídeo não faz som
 for(const c of TAGS)if(antes<c.t0&&agora>=c.t0&&window.tocarEtiqueta)window.tocarEtiqueta()}
function loop(n){if(playing){const antes=PT;PT+=Math.min(.1,(n-lastN)/1000)*speed;lastN=n;
  if(au.src&&!au.paused&&Number.isFinite(au.currentTime))PT=clamp(au.currentTime+(+$('#off').value),0,TOT);
  somDosPassos(antes,PT);somDasEtiquetas(antes,PT);
  if(PT>=TOT){PT=TOT-.001;play(false)}frame()}requestAnimationFrame(loop)}
$('#bPlay').onclick=()=>play(!playing);$('#bRe').onclick=()=>{seek(0);play(true)};
$('#bPrev').onclick=()=>seek(PT-ST[si]>1?ST[si]:(ST[si-1]??0));$('#bNext').onclick=()=>seek(ST[si+1]??TOT);
slider.oninput=()=>seek(+slider.value);
$('#speed').onchange=e=>{speed=Number(e.target.value)||1;if(au.src)au.playbackRate=speed;lastN=performance.now()};
$('#af').onchange=e=>{const f=e.target.files[0];if(f){au.src=URL.createObjectURL(f);au.playbackRate=speed;au.currentTime=Math.max(0,PT-(+$('#off').value))}};
$('#capOn').onchange=e=>{SHOWCAP=e.target.checked;frame()};
$('#bFs').onclick=()=>wrapEl.requestFullscreen&&wrapEl.requestFullscreen();
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;if(e.code==='Space'){e.preventDefault();play(!playing)}if(e.code==='ArrowRight')$('#bNext').click();if(e.code==='ArrowLeft')$('#bPrev').click()});

/* ===== [14] ABA NARRAÇÃO: lista de CUES clicável, com busca e botão de copiar ===== */
(()=>{
 const list=$('#narList');let lastMin=-1;
 const els=CU.map((n,i)=>{const m=Math.floor(n[0]/60);
  if(m!==lastMin){lastMin=m;const h=document.createElement('span');h.className='nt';h.textContent='⏱ '+m+':00';list.appendChild(h)}
  const s=document.createElement('span');s.className='nl'+(n[0]>=TOT?' todo':'');s.textContent=n[2]+' ';s.title=fmt(n[0])+(n[0]>=TOT?' · ainda não animado':'');
  s.onclick=()=>seek(n[0]);list.appendChild(s);return s});
 let cur=-1;
 function tick(){
  if($('#narPanel').classList.contains('show')){
   let i=-1;for(let k=0;k<CU.length;k++){if(PT>=CU[k][0])i=k;else break}
   if(i!==cur){if(cur>=0)els[cur].classList.remove('cur');cur=i;if(i>=0){els[i].classList.add('cur');
     if($('#nFollow').checked){const r=els[i].getBoundingClientRect(),lr=list.getBoundingClientRect();
      if(r.top<lr.top+40||r.bottom>lr.bottom-40)list.scrollTop+=r.top-lr.top-lr.height/3}}}
   $('#nTc').textContent=fmt(PT)}
  requestAnimationFrame(tick)}
 tick();
 const tA=$('#tAnim'),tN=$('#tNar'),ep=$('#ep'),np=$('#narPanel');
 tA.onclick=()=>{ep.style.display='';np.classList.remove('show');tA.classList.add('on');tN.classList.remove('on');setTimeout(fit,0)};
 tN.onclick=()=>{ep.style.display='none';np.classList.add('show');tN.classList.add('on');tA.classList.remove('on');cur=-1};
 $('#nPlay').onclick=()=>play(!playing);
 $('#nQ').oninput=e=>{const q=e.target.value.trim().toLowerCase();let first=null;
  els.forEach(el=>{const h=q.length>1&&el.textContent.toLowerCase().includes(q);el.classList.toggle('hit',h);if(h&&!first)first=el});
  if(first)first.scrollIntoView({block:'center'})};
 $('#nCopy').onclick=async()=>{const txt=CU.map(n=>n[2]).join(' ');
  try{await navigator.clipboard.writeText(txt);$('#nCopy').textContent='✅ Copiado'}catch(_){$('#nCopy').textContent='⚠️ Não foi possível'}
  setTimeout(()=>$('#nCopy').textContent='📋 Copiar texto',1800)};
})();

seek(0);requestAnimationFrame(loop);
