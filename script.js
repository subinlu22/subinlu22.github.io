const calendar = document.querySelector('#contributionGrid');
const yearSelect = document.querySelector('#contributionYear');
const contributionTotal = document.querySelector('#contributionTotal');

function drawCalendar(year) {
  if (!calendar) return;
  calendar.replaceChildren();
  contributionTotal.textContent = 'PREVIEW';
  for (let week = 0; week < 52; week += 1) {
    for (let day = 0; day < 7; day += 1) {
      const value = Math.abs(Math.sin((week + 3) * 12.9898 + (day + 1) * 78.233 + Number(year) * 0.917) * 43758.5453) % 1;
      const level = value < .31 ? 0 : value < .49 ? 1 : value < .69 ? 2 : value < .88 ? 3 : 4;
      const cell = document.createElement('span');
      cell.className = 'day level-' + level;
      cell.title = '미리보기 · ' + year + '년 ' + (week + 1) + '주차';
      calendar.append(cell);
    }
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
      workMedia.append(makeImage(render, title));
    }
    // 추가 이미지는 아래에 차례로
    (extra || '').split(',').filter(Boolean).forEach(src => workMedia.append(makeImage(src.trim(), title)));
    workCaption.textContent = title;
    workViewer.showModal();
  });
});

// 닫기 버튼 / 바깥 클릭으로 닫기
workViewer?.querySelector('.work-close').addEventListener('click', () => workViewer.close());
workViewer?.addEventListener('click', event => { if (event.target === workViewer) workViewer.close(); });
workViewer?.addEventListener('close', () => workMedia.replaceChildren());
