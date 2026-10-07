const calendar = document.querySelector('#contributionGrid');
const yearSelect = document.querySelector('#contributionYear');
const contributionTotal = document.querySelector('#contributionTotal');

// [커밋 달력] GitHub 공개 기여 기록을 받아와서 칸마다 색으로 표시
const GITHUB_USER = 'subinlu22';
const contributionLabel = document.querySelector('#contributionLabel');
const contributionNote = document.querySelector('#contributionNote');

async function drawCalendar(year) {
  if (!calendar) return;
  calendar.replaceChildren();
  contributionTotal.textContent = '…';
  try {
    // 공개 기여 기록을 JSON으로 돌려주는 무료 API (GitHub 프로필 잔디와 같은 데이터)
    const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${GITHUB_USER}?y=${year}`);
    if (!res.ok) throw new Error('응답 실패');
    const data = await res.json();
    const days = data.contributions || [];
    // 1월 1일이 무슨 요일인지에 맞춰 앞을 빈칸으로 채움 (일요일이 맨 위 줄)
    const firstDay = days.length ? new Date(days[0].date + 'T00:00:00').getDay() : 0;
    for (let i = 0; i < firstDay; i += 1) {
      const blank = document.createElement('span');
      blank.className = 'day empty';
      calendar.append(blank);
    }
    days.forEach(d => {
      const cell = document.createElement('span');
      cell.className = 'day level-' + d.level;
      cell.title = `${d.date} · ${d.count} contributions`;
      calendar.append(cell);
    });
    const total = (data.total && data.total[year]) ?? days.reduce((sum, d) => sum + d.count, 0);
    contributionTotal.textContent = total;
    contributionLabel.textContent = `contributions in ${year}`;
  } catch (error) {
    // 불러오기 실패해도 페이지는 그대로, 안내만 바꿈
    contributionTotal.textContent = '—';
    calendar.replaceChildren();
    for (let i = 0; i < 53 * 7; i += 1) {           // 빈 칸이라도 모양은 유지
      const cell = document.createElement('span');
      cell.className = 'day level-0';
      calendar.append(cell);
    }
    contributionLabel.textContent = '기록을 불러오지 못했어요';
    contributionNote.innerHTML = '<a href="https://github.com/subinlu22" target="_blank" rel="noopener">GitHub 프로필</a>에서 직접 볼 수 있어요.';
  }
}
yearSelect?.addEventListener('change', event => drawCalendar(event.target.value));
drawCalendar(yearSelect?.value || new Date().getFullYear());

const canvas = document.querySelector('#polygonModel');
const context = canvas?.getContext('2d');
if (canvas && context) {
  const golden = (1 + Math.sqrt(5)) / 2;
  const normalize = point => {
    const length = Math.hypot(point[0], point[1], point[2]);
    return [point[0]/length, point[1]/length, point[2]/length];
  };
  let vertices = [
    [-1,golden,0],[1,golden,0],[-1,-golden,0],[1,-golden,0],
    [0,-1,golden],[0,1,golden],[0,-1,-golden],[0,1,-golden],
    [golden,0,-1],[golden,0,1],[-golden,0,-1],[-golden,0,1]
  ].map(normalize);
  let faces = [
    [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
    [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
    [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
    [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
  ];
  const midpointCache = new Map();
  const midpoint = (a,b) => {
    const key = a < b ? String(a) + '-' + String(b) : String(b) + '-' + String(a);
    if (midpointCache.has(key)) return midpointCache.get(key);
    const point = normalize(vertices[a].map((value,index) => value + vertices[b][index]));
    const index = vertices.push(point) - 1;
    midpointCache.set(key,index);
    return index;
  };
  const refined = [];
  faces.forEach(([a,b,c]) => {
    const ab=midpoint(a,b), bc=midpoint(b,c), ca=midpoint(c,a);
    refined.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);
  });
  faces=refined;
  vertices=vertices.map(([x,y,z]) => {
    const bump=1+0.055*Math.sin(x*7+y*4-z*5);
    return [x*bump,y*bump,z*bump];
  });

  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover=matchMedia('(hover: hover) and (pointer: fine)').matches;
  let targetX=0,targetY=0,pointerX=0,pointerY=0;
  const stage=canvas.closest('.hero-stage');
  if(canHover&&!reducedMotion&&stage){
    stage.addEventListener('pointermove',event=>{
      const bounds=stage.getBoundingClientRect();
      targetX=Math.max(-1,Math.min(1,((event.clientX-bounds.left)/bounds.width-.5)*2));
      targetY=Math.max(-1,Math.min(1,((event.clientY-bounds.top)/bounds.height-.5)*2));
    });
    stage.addEventListener('pointerleave',()=>{targetX=0;targetY=0;});
  }
  let width=0,height=0,frame=0;
  function resizeCanvas(){
    const bounds=canvas.getBoundingClientRect();
    const ratio=Math.min(devicePixelRatio||1,2);
    width=bounds.width;height=bounds.height;
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    context.setTransform(ratio,0,0,ratio,0,0);
  }
  function render(now){
    context.clearRect(0,0,width,height);
    pointerX+=(targetX-pointerX)*0.055;
    pointerY+=(targetY-pointerY)*0.055;
    const time=reducedMotion?0.8:now*0.00022;
    const ay=time+pointerX*0.68,ax=0.28+Math.sin(time*0.67)*0.14+pointerY*0.36,az=Math.sin(time*0.37)*0.1+pointerX*0.1;
    const points=vertices.map(([x,y,z])=>{
      const x1=x*Math.cos(ay)-z*Math.sin(ay);
      const z1=x*Math.sin(ay)+z*Math.cos(ay);
      const y2=y*Math.cos(ax)-z1*Math.sin(ax);
      const z2=y*Math.sin(ax)+z1*Math.cos(ax);
      const x3=x1*Math.cos(az)-y2*Math.sin(az);
      const y3=x1*Math.sin(az)+y2*Math.cos(az);
      const depth=z2+3.3;
      const scale=Math.min(width,height)*0.42/depth;
      return {x:width/2+x3*scale,y:height/2-y3*scale,z:z2,p:[x3,y3,z2]};
    });
    const light=normalize([-0.45+pointerX*0.55,0.65-pointerY*0.32,1]);
    const visibleFaces=faces.map(face=>{
      const a=points[face[0]].p,b=points[face[1]].p,c=points[face[2]].p;
      const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
      const normal=normalize([u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]);
      const center=[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3,(a[2]+b[2]+c[2])/3];
      const facing=normal[0]*center[0]+normal[1]*center[1]+normal[2]*center[2];
      const shade=Math.max(0,normal[0]*light[0]+normal[1]*light[1]+normal[2]*light[2]);
      return {face,centerZ:center[2],facing,shade};
    }).filter(item=>item.facing>0).sort((a,b)=>a.centerZ-b.centerZ);
    visibleFaces.forEach(({face,shade})=>{
      context.beginPath();
      face.forEach((index,pointIndex)=>{
        const point=points[index];
        if(pointIndex===0)context.moveTo(point.x,point.y);else context.lineTo(point.x,point.y);
      });
      context.closePath();
      context.fillStyle='rgba(91,169,226,'+(0.16+shade*0.43)+')';
      context.strokeStyle='rgba(198,229,255,'+(0.2+shade*0.45)+')';
      context.lineWidth=.7;
      context.fill();context.stroke();
    });
    points.filter(point=>point.z>-.05).forEach(point=>{
      context.beginPath();context.arc(point.x,point.y,1.25,0,Math.PI*2);
      context.fillStyle='rgba(223,243,255,.8)';context.fill();
    });
    if(!reducedMotion)frame=requestAnimationFrame(render);
  }
  resizeCanvas();render(0);
  addEventListener('resize',()=>{cancelAnimationFrame(frame);resizeCanvas();render(0);});
}

const finePointer=matchMedia('(hover: hover) and (pointer: fine)').matches;
const motionAllowed=!matchMedia('(prefers-reduced-motion: reduce)').matches;
if(finePointer&&motionAllowed){
  document.querySelectorAll('.glass-project').forEach(card=>{
    card.addEventListener('pointermove',event=>{
      const bounds=card.getBoundingClientRect();
      const x=(event.clientX-bounds.left)/bounds.width;
      const y=(event.clientY-bounds.top)/bounds.height;
      const tiltX=(x-.5)*3.2;
      const tiltY=(.5-y)*3.2;
      card.style.setProperty('--pointer-x',(x*100)+'%');
      card.style.setProperty('--pointer-y',(y*100)+'%');
      card.style.transform='perspective(950px) rotateX('+tiltY+'deg) rotateY('+tiltX+'deg) translateY(-2px)';
    });
    card.addEventListener('pointerleave',()=>{
      card.style.removeProperty('transform');
      card.style.setProperty('--pointer-x','50%');
      card.style.setProperty('--pointer-y','50%');
    });
  });
}


// ── [3D Works] 타일을 누르면 작업을 크게 보여주는 창 ──
// 타일 속성: data-render(렌더 이미지), data-wire(와이어프레임, 있으면 비교 슬라이더),
//           data-extra(추가 이미지, 쉼표로 구분), data-thumb(타일에 보일 작은 이미지)
const workViewer = document.querySelector('#workViewer');
const workMedia = document.querySelector('#workMedia');
const workCaption = document.querySelector('#workCaption');

// 이미지 태그 하나 만드는 도우미
function makeImage(src, alt) {
  const img = document.createElement('img');
  img.src = src; img.alt = alt; img.decoding = 'async';
  return img;
}

// 영상 파일이면 video, 아니면 img
function makeMedia(src, alt) {
  if (/\.(mp4|webm)$/i.test(src)) {
    const video = document.createElement('video');
    video.src = src; video.controls = true; video.autoplay = true; video.muted = true; video.loop = true; video.playsInline = true;
    return video;
  }
  return makeImage(src, alt);
}

// [비교 슬라이더] 렌더 위에 와이어를 겹치고, 막대 위치만큼 와이어를 잘라서 보여줌
function makeCompare(renderSrc, wireSrc, title) {
  const box = document.createElement('div');
  box.className = 'compare';
  const base = makeImage(renderSrc, title + ' 렌더링');
  const top = makeImage(wireSrc, title + ' 와이어프레임');
  top.className = 'compare-top';
  const line = document.createElement('span');
  line.className = 'compare-line';
  const range = document.createElement('input');   // 손가락/마우스로 끄는 투명한 막대
  range.type = 'range'; range.min = 0; range.max = 100; range.value = 50;
  range.className = 'compare-range';
  range.setAttribute('aria-label', '렌더링과 와이어프레임 비교');
  const labels = document.createElement('div');
  labels.className = 'compare-labels';
  labels.innerHTML = '<span>Render</span><span>Wireframe</span>';
  // 막대 값(0~100)에 맞춰 와이어 이미지의 왼쪽을 잘라냄 → 왼쪽은 렌더, 오른쪽은 와이어
  const update = () => {
    top.style.clipPath = `inset(0 0 0 ${range.value}%)`;
    line.style.left = range.value + '%';
  };
  range.addEventListener('input', update);
  update();
  box.append(base, top, line, labels, range);
  return box;
}

document.querySelectorAll('.work-tile').forEach(tile => {
  const { title, render, wire, extra, thumb } = tile.dataset;
  // 썸네일이 있으면 기본 큐브 아이콘 대신 표시
  if (thumb) tile.querySelector('.work-thumb svg')?.replaceWith(makeImage(thumb, title));

  tile.addEventListener('click', () => {
    workMedia.replaceChildren();
    if (!render) {
      // 아직 이미지를 안 넣은 타일
      const empty = document.createElement('p');
      empty.className = 'work-empty'; empty.textContent = '이미지를 준비 중입니다.';
      workMedia.append(empty);
    } else if (wire) {
      workMedia.append(makeCompare(render, wire, title));
    } else {
      workMedia.append(makeMedia(render, title));
    }
    // 추가 이미지는 아래에 차례로
    (extra || '').split(',').filter(Boolean).forEach(item => {
      const [r, w] = item.trim().split('|');   // "렌더|와이어"로 적으면 비교 슬라이더
      workMedia.append(w ? makeCompare(r, w, title) : makeMedia(r, title));
    });
    workCaption.textContent = title;
    workViewer.showModal();
  });
});

// 닫기 버튼 / 바깥 클릭으로 닫기
workViewer?.querySelector('.work-close').addEventListener('click', () => workViewer.close());
workViewer?.addEventListener('click', event => { if (event.target === workViewer) workViewer.close(); });
workViewer?.addEventListener('close', () => workMedia.replaceChildren());

// ── [히어로 와이어프레임] 마우스 위치에 따라 살짝 기울이기 ──
const wireStage = document.querySelector('.wire-stage');
const wireHero = document.querySelector('.wire-hero');
const wireCanTilt = matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;
if (wireStage && wireHero && wireCanTilt) {
  wireStage.addEventListener('pointermove', event => {
    const box = wireStage.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;   // -0.5 ~ 0.5
    const y = (event.clientY - box.top) / box.height - 0.5;
    wireHero.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
  });
  wireStage.addEventListener('pointerleave', () => { wireHero.style.transform = ''; });
}


// ── [히어로 빛 입자] 도화선 불꽃처럼 작은 빛이 와이어 선을 따라 기어감 ──
// WIRE_MAP: 와이어 선이 있는 칸은 1, 없는 칸은 0인 지도 (car_wire_map.js)
(() => {
  const map = window.WIRE_MAP;
  const cvs = document.querySelector('.wire-sparks');
  if (!map || !cvs || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = cvs.getContext('2d');
  const W = map.w, H = map.h;

  // base64 글자 → 칸마다 0/1
  const raw = atob(map.bits);
  const grid = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i += 1) grid[i] = (raw.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
  const onLine = (x, y) => x >= 0 && y >= 0 && x < W && y < H && grid[y * W + x] === 1;
  const starts = [];                       // 불꽃이 새로 태어날 수 있는 선 위 칸들
  for (let i = 0; i < W * H; i += 4) if (grid[i]) starts.push(i);

  const DIRS = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];   // 8방향
  const SPARK_COUNT = 55;
  const sparks = [];
  const respawn = s => {
    const i = starts[(Math.random() * starts.length) | 0];
    s.x = i % W; s.y = (i / W) | 0;
    s.dir = (Math.random() * 8) | 0;
    s.speed = 1 + Math.random() * 1.6;     // 한 프레임에 움직이는 칸 수
    s.life = 50 + Math.random() * 110;     // 몇 프레임 동안 타는지
    s.age = 0; s.carry = 0;
    return s;
  };
  for (let i = 0; i < SPARK_COUNT; i += 1) sparks.push(respawn({}));

  // 한 칸 전진: 지금 방향 기준 정면/좌우 45도 중 선이 이어지는 칸으로
  const advance = s => {
    const choices = [0, 1, -1].map(k => (s.dir + k + 8) % 8).filter(d => onLine(s.x + DIRS[d][0], s.y + DIRS[d][1]));
    if (!choices.length) return false;     // 선이 끊기면 그 불꽃은 끝
    s.dir = choices.includes(s.dir) && Math.random() < 0.8 ? s.dir : choices[(Math.random() * choices.length) | 0];
    s.x += DIRS[s.dir][0]; s.y += DIRS[s.dir][1];
    return true;
  };

  let scale = 1;
  const resize = () => {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const box = cvs.getBoundingClientRect();
    cvs.width = Math.round(box.width * ratio); cvs.height = Math.round(box.height * ratio);
    scale = cvs.width / W;                 // 지도 1칸 = 캔버스 몇 픽셀
  };
  resize();
  addEventListener('resize', resize);

  let visible = true;                       // 화면 밖이면 멈춰서 배터리 아끼기
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(cvs);

  const frame = () => {
    requestAnimationFrame(frame);
    if (!visible) return;
    // 이전 그림을 조금씩 지워서 꼬리가 남았다 사라지게
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.globalCompositeOperation = 'lighter';
    for (const s of sparks) {
      const px = s.x, py = s.y;
      s.carry += s.speed;
      let alive = true;
      while (s.carry >= 1 && alive) { alive = advance(s); s.carry -= 1; }
      s.age += 1;
      const fade = Math.sin(Math.min(s.age / s.life, 1) * Math.PI);   // 서서히 밝아졌다 꺼짐
      // 꼬리 선
      ctx.strokeStyle = `rgba(150,215,255,${0.55 * fade})`;
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath(); ctx.moveTo((px + 0.5) * scale, (py + 0.5) * scale); ctx.lineTo((s.x + 0.5) * scale, (s.y + 0.5) * scale); ctx.stroke();
      // 불꽃 머리 (반짝임)
      const r = (1.6 + Math.random() * 1.4) * scale;
      const g = ctx.createRadialGradient((s.x + 0.5) * scale, (s.y + 0.5) * scale, 0, (s.x + 0.5) * scale, (s.y + 0.5) * scale, r * 2.4);
      g.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`);
      g.addColorStop(0.35, `rgba(160,225,255,${0.6 * fade})`);
      g.addColorStop(1, 'rgba(90,170,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc((s.x + 0.5) * scale, (s.y + 0.5) * scale, r * 2.4, 0, Math.PI * 2); ctx.fill();
      if (!alive || s.age > s.life) respawn(s);
    }
  };
  frame();
})();

// ── [히어로 키워드 칩] 차 주위를 행성 궤도처럼 천천히 돌기 ──
(() => {
  const stage = document.querySelector('.wire-stage');
  if (!stage || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const chips = [...stage.querySelectorAll('.float-chip')];
  stage.classList.add('orbiting');
  const TILT = -10 * Math.PI / 180;        // 궤도를 살짝 기울임
  let angle = 0;
  const tick = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    const cx = w / 2, cy = h * 0.52, rx = w * 0.42, ry = h * 0.36;
    chips.forEach((chip, i) => {
      const a = angle + (i * Math.PI * 2) / chips.length;     // 칩끼리 같은 간격
      const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
      const x = cx + ex * Math.cos(TILT) - ey * Math.sin(TILT);
      const y = cy + ex * Math.sin(TILT) + ey * Math.cos(TILT);
      const front = (Math.sin(a) + 1) / 2;                     // 1이면 앞(아래쪽), 0이면 뒤(위쪽)
      chip.style.transform = `translate(${x - chip.offsetWidth / 2}px, ${y - chip.offsetHeight / 2}px) scale(${0.86 + front * 0.18})`;
      chip.style.opacity = (0.4 + front * 0.6).toFixed(2);
      chip.style.zIndex = front > 0.5 ? 3 : 0;                // 뒤로 가면 차 뒤로 숨음
    });
    angle += 0.0022;                                           // 속도 (클수록 빠름)
    requestAnimationFrame(tick);
  };
  tick();
})();
