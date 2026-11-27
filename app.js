const app = document.querySelector("#app");
const photoInput = document.querySelector("#photo-input");
const logoInput = document.querySelector("#logo-input");
const voiceInput = document.querySelector("#voice-input");
const listingInput = document.querySelector("#listing-text");
const cfg = window.BOBAECAR_CONFIG || {};
const ttsEndpoint = cfg.ttsEndpoint || "";
const importEndpoint = cfg.listingImportEndpoint || "";
const $ = (s, root=document) => root.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const saved = (()=>{try{return JSON.parse(localStorage.getItem("bobae-car-draft")||"{}")}catch{return {}}})();
const defaults = {
 step: 1, photos: [], listingUrl: "", entryMode: "link", language: "한국어", template: "쇼룸", ratio: "9:16", duration: 15, resolution: 720,
 music: "시네마틱", musicVolume: 24, captions: true, showPrice: true, voice: false, ttsReady: false, narrationFile: null,
 logoUrl: "", logoImage: null, resultUrl: "", resultType: "", busy: false, selectedPreset: "", captionStyle:"기본",
 vehicle: { listingType:"중고차", make:"", model:"", trim:"", year:"", price:"", currency:"KRW", mileage:"", power:"", engine:"", transmission:"", fuel:"", drive:"", body:"", color:"", sellerType:"딜러", dealer:"", phone:"", address:"", condition:"중고차", saleMethod:"현금", description:"", highlights:[], cta:"차량 문의하기", inquiryUrl:"", brandColor:"#ef6d32" },
 history: { accident:"미확인", flood:"미확인", totalLoss:"미확인", owners:"미확인", repaint:"미확인", replacement:"미확인", usage:"미확인", warranty:"미확인" }
};
const state = Object.assign({}, defaults, saved, { photos:[], narrationFile:null, logoImage:null, resultUrl:"", busy:false });
state.vehicle = Object.assign({}, defaults.vehicle, saved.vehicle || {});
state.history = Object.assign({}, defaults.history, saved.history || {});
state.step = Math.min(Number(state.step)||1, 3);
const templates = [
 {name:"쇼룸", icon:"◉", desc:"차량을 차분하게 소개하는 깔끔한 전시장 구성"},
 {name:"다이내믹", icon:"✳", desc:"빠른 장면 전환과 움직임으로 시선을 끄는 구성"},
 {name:"프리미엄", icon:"◇", desc:"어두운 톤과 넓은 여백으로 고급감을 강조"},
 {name:"가격 강조", icon:"₩", desc:"판매 가격과 핵심 제원을 또렷하게 보여주는 구성"},
 {name:"클래식", icon:"▤", desc:"사진과 설명을 균형 있게 배치하는 기본 구성"}
];
const palettes = [
 {name:"보배 오렌지", a:"#ef6d32", b:"#15212d", c:"#ffffff"},
 {name:"프리미엄 네이비", a:"#d6b36a", b:"#101a2b", c:"#f5f0e6"},
 {name:"스포티 레드", a:"#e84646", b:"#17191d", c:"#f8f5f2"},
 {name:"클린 그레이", a:"#637488", b:"#202832", c:"#ffffff"},
 {name:"포레스트", a:"#55a77c", b:"#10241d", c:"#eaf4ee"}
];
const musicStyles = ["시네마틱","에너지","프레젠테이션","어쿠스틱","음악 없음"];
const formats = {"9:16":[720,1280],"1:1":[960,960],"16:9":[1280,720]};
let ttsReady = false;
let dragIndex = -1;
let toastTimer = null;
function saveDraft(){
 const {photos, narrationFile, logoImage, resultUrl, busy, ...data}=state;
 try{localStorage.setItem("bobae-car-draft",JSON.stringify(data))}catch{}
}
function priceText(){
 const v=state.vehicle;
 if(!v.price)return "가격 문의";
 try{return new Intl.NumberFormat("ko-KR").format(Number(String(v.price).replace(/[^0-9]/g,"")))+" "+(v.currency==="KRW"?"원":v.currency)}catch{return v.price}
}
function carTitle(){
 const v=state.vehicle;
 return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
}
function header(){
 return '<header class="topbar"><a class="brand" href="#" aria-label="보배카 홈"><i class="brand-mark"></i><span>bobae car</span></a><nav class="nav"><a href="#how">제작 순서</a><a href="#editor">영상 제작</a></nav><div class="top-actions"><span class="local-chip">기기 내 제작</span><button class="profile" type="button" aria-label="프로필">BC</button></div></header>';
}
function steps(){
 const labels=["매물·사진","차량 정보","영상 설정"];
 return '<div class="wizard" id="how" aria-label="제작 단계">'+labels.map((x,i)=>'<button class="wizard-step '+(state.step===i+1?"active ":"")+(state.step>i+1?"done":"")+'" data-action="step" data-step="'+(i+1)+'"><span>'+(state.step>i+1?"✓":(i+1))+'</span><b>'+x+'</b></button>').join("")+'</div>';
}
function shell(content){
 return header()+'<main class="wrap" id="editor">'+steps()+content+'</main><footer class="footer"><div><b>BOBAE CAR</b><p>차량 매물 정보와 사진으로 숏폼 영상을 만듭니다.</p></div><p>사진·영상은 기본적으로 이 브라우저에서 처리됩니다.</p><small>© 2026 Bobae Car · 차량 숏폼 제작 도구</small></footer><div class="toasts" id="toasts" aria-live="polite"></div>';
}
function photoThumbs(){
 return state.photos.map((p,i)=>'<article class="thumb '+(i===0?"cover":"")+'" draggable="true" data-drag="'+i+'"><img src="'+p.url+'" alt="차량 사진 '+(i+1)+'"><span class="num">'+(i===0?"표지":(i+1))+'</span><button class="remove" data-action="remove" data-index="'+i+'" aria-label="사진 '+(i+1)+' 삭제">×</button><div class="sort"><button data-action="move-left" data-index="'+i+'" aria-label="왼쪽으로 이동">←</button><button data-action="move-right" data-index="'+i+'" aria-label="오른쪽으로 이동">→</button></div></article>').join("");
}
function renderStep1(){
 const count=state.photos.length;
 const vehicleTypes=["중고차","트럭","특장","버스","오토바이","캠핑카","카라반","건설기계","물류·운반 장비","트레일러"];
 const typeChoices=vehicleTypes.map((type,i)=>'<button type="button" class="vehicle-type '+(state.vehicle.listingType===type?"selected":"")+'" data-action="vehicle-type" data-value="'+esc(type)+'" aria-pressed="'+(state.vehicle.listingType===type)+'"><span class="vehicle-type-icon" aria-hidden="true">'+["🚗","🚚","🛠️","🚌","🏍️","🚐","🚎","🚜","📦","🚛"][i]+'</span><span>'+esc(type)+'</span></button>').join("");
 const modeTabs=[
  ["link","↗","매물 링크 붙여넣기"],
  ["photos","▧","사진 직접 올리기"]
 ].map(([key,icon,title])=>'<button class="entry-mode '+(state.entryMode===key?"selected":"")+'" role="tab" aria-selected="'+(state.entryMode===key)+'" data-action="entry-mode" data-value="'+key+'"><span class="entry-icon">'+icon+'</span><b>'+title+'</b></button>').join("");
 const modePanel=state.entryMode==="link"
  ? '<div class="entry-panel" role="tabpanel"><p class="mode-description">매물 주소를 입력해 열고, 매물 설명을 붙여 차량 정보를 가져올 수 있습니다.</p><div class="listing-row"><input id="listing-url" type="url" value="'+esc(state.listingUrl)+'" placeholder="보배드림 등 매물 URL 붙여넣기"><button class="secondary" data-action="import-listing">주소 확인</button></div><p class="hint">외부 사이트의 사진 자동 가져오기는 사이트 접근 정책과 연동 서버에 따라 제한될 수 있습니다.</p><button class="text-button" data-action="paste-listing">매물 설명 붙여넣기</button></div>'
  : '<div class="entry-panel" role="tabpanel"><p class="mode-description">매물 링크 없이 사진을 올리고, 다음 단계에서 차량 정보를 직접 입력합니다.</p></div>';
 const photoBlock='<div class="photo-upload"><div class="card-head"><div><h2 class="upload-title">사진 업로드</h2><p class="upload-description">여러 각도에서 촬영한 선명한 사진을 10~30장 올려주세요.</p></div><span class="status-badge">'+count+' / 30</span></div><div class="drop" id="drop-area" role="button" tabindex="0"><span class="upload-icon">＋</span><strong>사진을 여기에 끌어다 놓으세요</strong><small>클릭해서 선택 · JPG, PNG, WEBP · 장당 최대 20MB</small></div>'+(count?'<div class="photo-count"><span>드래그 또는 화살표로 장면 순서 변경</span><span>첫 번째 사진이 표지입니다</span></div><div class="thumb-grid">'+photoThumbs()+'</div>':'<div class="upload-note" style="display:flex;align-items:center;gap:8px;white-space:nowrap"><b>촬영 순서 추천</b><span>전면 3/4 · 측면 · 후면 · 실내 · 계기판 · 주요 옵션</span></div>')+'</div>';
 app.innerHTML=shell('<section class="page-grid"><div class="main-column"><div class="intro"><h1>영상 만들기</h1><p class="lead">사진을 올리고, 정보를 입력하면 바로 게시할 수 있는 릴스가 완성됩니다</p></div><section class="card vehicle-type-card"><div class="card-head"><div><p class="eyebrow">매물 유형</p><h2>어떤 매물을 등록하시나요?</h2><p class="type-description">유형을 선택하면 다음 단계의 차량 정보와 영상에 반영됩니다.</p></div><span class="type-selection" aria-live="polite">선택됨 · <b>'+esc(state.vehicle.listingType)+'</b></span></div><div class="vehicle-type-grid" role="group" aria-label="매물 유형">'+typeChoices+'</div></section><section class="card entry-card"><div class="card-head"><div><p class="eyebrow">매물 등록 방식</p><h2>어떤 방법으로 시작할까요?</h2></div></div><div class="entry-mode-grid" role="tablist" aria-label="매물 등록 방식">'+modeTabs+'</div>'+modePanel+photoBlock+'</section><button class="primary wide" data-action="next" '+(count<10?"disabled":"")+'>다음 · 차량 정보 ›</button></div><aside class="side-card"><p class="eyebrow">제작 단계</p><div class="mini-step active"><b>01</b><span>매물과 사진</span><small>10~30장 등록</small></div><div class="mini-step"><b>02</b><span>차량 정보</span><small>사실 정보와 판매자</small></div><div class="mini-step"><b>03</b><span>영상 설정</span><small>스타일·오디오·저장</small></div><div class="side-tip"><span>팁</span><p>첫 사진은 차량 전체가 잘 보이는 전면 또는 측면 사진으로 선택하세요.</p></div><p class="side-foot">현재 브라우저에서 작업 중</p></aside></section>');
}
function field(label,key,placeholder,required,opts,type){
 const v=state.vehicle[key]||"";
 const req=required?'<em>*</em>':"";
 if(opts)return '<label class="field">'+label+' '+req+'<select data-field="'+key+'">'+opts.map(o=>'<option value="'+esc(o[0])+'" '+(String(v)===String(o[0])?"selected":"")+'>'+esc(o[1])+'</option>').join("")+'</select></label>';
 return '<label class="field">'+label+' '+req+'<input data-field="'+key+'" type="'+(type||"text")+'" value="'+esc(v)+'" placeholder="'+esc(placeholder||"")+'" '+(required?"required":"")+'></label>';
}
function options(items){return [["","선택"],...items.map(x=>[x,x])]}
function historyField(label,key,items){
 const opts=items.map(x=>'<button class="choice-pill '+(state.history[key]===x?"selected":"")+'" data-action="history" data-key="'+key+'" data-value="'+esc(x)+'">'+esc(x)+'</button>').join("");
 return '<div class="history-field"><span>'+label+'</span><div class="choice-row">'+opts+'</div></div>';
}
function highlightButtons(){
 const choices=["무사고","1인 소유","정비 기록","후방 카메라","애플 카플레이","열선 시트","선루프","4륜 구동","통풍 시트","저주행"];
 return choices.map(x=>'<button class="choice-pill '+(state.vehicle.highlights.indexOf(x)>=0?"selected":"")+'" data-action="highlight" data-value="'+x+'">'+x+'</button>').join("");
}
function photoStrip(){
 return '<div class="photo-strip">'+state.photos.map((p,i)=>'<img src="'+p.url+'" alt="차량 사진 '+(i+1)+'">').join("")+'</div>';
}
function renderStep2(){
 const v=state.vehicle;
 const history='<section class="card"><p class="eyebrow">차량 상태·이력</p><h2>확인된 사실만 선택하세요</h2><p class="hint">미확인 항목은 미확인으로 둘 수 있습니다. 영상에는 직접 입력한 정보만 표시됩니다.</p>'+historyField("사고 이력","accident",["미확인","없음","있음"])+historyField("침수 이력","flood",["미확인","없음","있음"])+historyField("전손 이력","totalLoss",["미확인","없음","있음"])+historyField("소유자 수","owners",["미확인","1명","2명","3명 이상"])+historyField("도색 부위","repaint",["미확인","없음","있음"])+historyField("교체·판금 부위","replacement",["미확인","없음","있음"])+historyField("용도 이력","usage",["미확인","없음","렌트","영업용"])+historyField("보증","warranty",["미확인","유효","만료"])+'</section>';
 app.innerHTML=shell('<section class="page-grid"><div class="main-column"><div class="section-top"><button class="text-button" data-action="back">← 이전</button><div><p class="kicker">02 · 차량 정보 · '+esc(v.listingType)+'</p><h1>매물 정보를 입력하세요.</h1><p class="lead">영상에 표시될 제조사·모델·가격과 판매자 정보를 입력합니다.</p></div></div>'+photoStrip()+'<section class="card"><p class="eyebrow">기본 정보</p><div class="form-grid">'+field("제조사","make","예: BMW",true)+field("모델","model","예: X4",true)+field("세부 트림","trim","예: 20i M Sport",false)+field("연식","year","예: 2022",true,null,"number")+field("판매 가격","price","예: 38,900,000",true,null,"number")+field("통화","currency","",true,options(["KRW","USD","EUR","GBP"]),null)+'</div></section><section class="card"><p class="eyebrow">제원·사양</p><div class="form-grid">'+field("주행거리","mileage","예: 42,000 km")+field("출력","power","예: 184 ps")+field("배기량","engine","예: 1,998 cc")+field("연료","fuel","",false,options(["가솔린","디젤","하이브리드","전기","LPG","기타"]))+field("변속기","transmission","",false,options(["자동","수동","CVT","DCT"]))+field("구동 방식","drive","",false,options(["전륜","후륜","AWD","4WD"]))+field("차체 유형","body","",false,options(["세단","SUV","해치백","쿠페","왜건","픽업","기타"]))+field("외장 색상","color","예: 미네랄 화이트")+'</div>'+history+'</section><section class="card"><p class="eyebrow">설명·문의 유도</p><label class="field">매물 설명<textarea data-field="description" rows="3" placeholder="차량의 특징과 확인된 상태를 입력하세요.">'+esc(v.description)+'</textarea></label><div class="field"><span>주요 장점 <small>(최대 5개)</small></span><div class="choice-row">'+highlightButtons()+'</div><div class="listing-row"><input id="new-highlight" type="text" placeholder="직접 추가"><button class="secondary" data-action="add-highlight">추가</button></div></div>'+field("마지막 안내 문구","cta","예: 시승 예약하기") +field("문의 링크","inquiryUrl","https://")+'</section><section class="card"><p class="eyebrow">딜러 카드·브랜드</p><div class="form-grid">'+field("판매자 유형","sellerType","",false,options(["딜러","개인"]))+field("상호 또는 판매자명","dealer","영상에 표시할 이름")+field("전화번호","phone","010-0000-0000",false,null,"tel")+field("주소","address","매장 위치")+'</div><div class="brand-row"><label class="field">브랜드 강조 색상<input data-field="brandColor" type="color" value="'+esc(v.brandColor)+'"></label><label class="field">로고 파일<input id="logo-file" type="file" accept="image/png,image/jpeg,image/webp"></label></div><p class="hint">로고는 영상 엔드 카드에 합성됩니다. 로고가 없어도 제작할 수 있습니다.</p></section><div class="button-row"><button class="secondary" data-action="back">이전</button><button class="primary" data-action="next">영상 설정</button></div></div><aside class="side-card"><p class="eyebrow">매물 요약</p><span class="type-tag">'+esc(v.listingType)+'</span><h3>'+esc(carTitle()||"차량 정보를 입력하세요")+'</h3><p>'+state.photos.length+'장 사진 · '+esc(priceText())+'</p><div class="side-tip"><span>정확한 정보</span><p>사고·침수·소유 이력은 확인된 자료 기준으로 입력하고, 확인되지 않은 항목은 그대로 표시하지 마세요.</p></div></aside></section>');
}
function renderStep3(){
 const v=state.vehicle;
 const choices=templates.map(t=>'<button class="template-card '+(state.template===t.name?"selected":"")+'" data-action="template" data-value="'+t.name+'"><span class="template-icon">'+t.icon+'</span><b>'+t.name+'</b><small>'+t.desc+'</small></button>').join("");
 const paletteButtons=palettes.map(p=>'<button class="palette '+((state.selectedPreset||palettes[0].name)===p.name?"selected":"")+'" data-action="palette" data-value="'+p.name+'"><span class="swatches"><i style="background:'+p.a+'"></i><i style="background:'+p.b+'"></i><i style="background:'+p.c+'"></i></span>'+p.name+'</button>').join("");
 const ratios=["9:16","1:1","16:9"].map(x=>'<button class="format '+(state.ratio===x?"selected":"")+'" data-action="ratio" data-value="'+x+'"><b>'+x+'</b><small>'+(x==="9:16"?"릴스 · 쇼츠":x==="1:1"?"피드":"유튜브 · 웹")+'</small></button>').join("");
 const resolution=["720","1080"].map(x=>'<button class="choice-pill '+(state.resolution===Number(x)?"selected":"")+'" data-action="resolution" data-value="'+x+'">'+x+'p</button>').join("");
 const durations=[15,25,40].map(x=>'<button class="choice-pill '+(state.duration===x?"selected":"")+'" data-action="duration" data-value="'+x+'">'+x+'초</button>').join("");
 const music=musicStyles.map(x=>'<button class="choice-pill '+(state.music===x?"selected":"")+'" data-action="music" data-value="'+x+'">'+x+'</button>').join("");
 const voiceLabel=ttsReady?"한국어 AI 음성 연결됨":"AI 음성 서버 미연결";
 const captionStyles=["기본","강조","미니멀"].map(x=>'<button class="choice-pill '+(state.captionStyle===x?"selected":"")+'" data-action="caption-style" data-value="'+x+'">'+x+'</button>').join("");
 app.innerHTML=shell('<section class="editor-layout"><div class="editor-main"><div class="section-top"><button class="text-button" data-action="back">← 이전</button><div><p class="kicker">03 · 영상 설정</p><h1>영상 분위기를 정하세요.</h1><p class="lead">스타일과 비율을 선택하고, 음성·음악·자막을 확인하세요.</p></div></div><section class="card"><p class="eyebrow">영상 스타일</p><div class="template-grid">'+choices+'</div></section><section class="card"><p class="eyebrow">브랜드 색상 조합</p><div class="palette-grid">'+paletteButtons+'</div></section><section class="card"><p class="eyebrow">화면 비율</p><div class="format-grid">'+ratios+'</div><div class="form-grid compact"><div class="setting-group"><span>출력 해상도</span><div class="choice-row">'+resolution+'</div></div><div class="setting-group"><span>영상 길이</span><div class="choice-row">'+durations+'</div><small class="hint">사진 '+state.photos.length+'장 기준 추천 '+recommendedDuration(state.photos.length)+'초 · 직접 변경 가능</small></div></div></section><section class="card"><p class="eyebrow">배경 음악</p><div class="choice-row">'+music+'</div><label class="range-row"><span>음악 음량</span><input id="music-volume" type="range" min="0" max="60" value="'+state.musicVolume+'"><b>'+state.musicVolume+'%</b></label><p class="hint">선택한 분위기에 맞춘 브라우저 생성 음악을 영상 오디오 트랙에 포함합니다.</p></section><section class="card"><p class="eyebrow">한국어 내레이션·자막</p><div class="voice-box"><label class="check-row"><input type="checkbox" data-action="voice" '+(state.voice?"checked":"")+'><span><b>나레이션 포함</b><small>'+esc(voiceLabel)+' · 음성 파일을 올리거나 API를 연결해 사용할 수 있습니다.</small></span></label><div class="form-grid"><label class="field">음성 파일<input id="voice-file" type="file" accept="audio/*"></label><div class="voice-actions"><button class="secondary" data-action="voice-preview">음성 미리 듣기</button><button class="text-button" data-action="script-preview">한국어 원고 보기</button></div></div><label class="check-row"><input type="checkbox" data-action="captions" '+(state.captions?"checked":"")+'><span><b>장면 자막 표시</b><small>차량 정보, 장점, 문의 문구를 장면에 맞춰 넣습니다.</small></span></label><div class="setting-group"><span>자막 스타일</span><div class="choice-row">'+captionStyles+'</div></div></div></section><section class="card"><p class="eyebrow">미리보기</p><div class="live-preview"><div class="preview-phone" id="preview-phone"></div><div><h3>'+esc(carTitle()||"내 차량 영상")+'</h3><p>'+state.photos.length+'장 · '+state.duration+'초 · '+state.ratio+' · '+state.resolution+'p</p><p>'+esc(templates.find(t=>t.name===state.template).desc)+'</p><p class="hint">최종 영상을 만들기 전에 차량 정보와 가격을 확인하세요.</p></div></div></section><div class="button-row"><button class="secondary" data-action="back">이전</button><button class="primary" data-action="create">영상 제작</button></div></div><aside class="summary"><p class="eyebrow">제작 설정</p><h3>'+esc(carTitle()||"차량 정보")+'</h3><div class="summary-line"><span>사진</span><b>'+state.photos.length+'장</b></div><div class="summary-line"><span>스타일</span><b>'+esc(state.template)+'</b></div><div class="summary-line"><span>길이·비율</span><b>'+state.duration+'초 · '+state.ratio+'</b></div><div class="summary-line"><span>해상도</span><b>'+state.resolution+'p</b></div><div class="summary-line"><span>음악</span><b>'+esc(state.music)+'</b></div><div class="summary-line"><span>나레이션</span><b>'+(state.voice?"사용":"없음")+'</b></div><div class="summary-line"><span>자막</span><b>'+(state.captions?"사용":"사용 안 함")+'</b></div><div class="side-tip"><span>저장</span><p>렌더링은 현재 브라우저에서 진행됩니다. 브라우저가 지원하는 MP4 또는 WebM으로 다운로드합니다.</p></div><button class="primary wide" data-action="create" '+(state.busy?"disabled":"")+'>영상 제작</button></aside></section>');
 drawPreview();
}
function renderResult(){
 const ext=state.resultType.indexOf("mp4")>=0?"mp4":"webm";
 const share=makeShareCopy();
 app.innerHTML=shell('<section class="result-page"><p class="kicker">제작 완료</p><h1>차량 영상이 준비됐습니다.</h1><p class="lead">미리보기로 자막·가격·연락처를 확인한 뒤 파일을 저장하세요.</p><video class="result-video" controls playsinline src="'+state.resultUrl+'"></video><div class="result-meta"><span>'+state.duration+'초</span><span>'+state.ratio+'</span><span>'+state.resolution+'p</span><span>'+state.photos.length+'장</span><span>'+ext.toUpperCase()+'</span></div><div class="result-actions"><a class="primary" href="'+state.resultUrl+'" download="bobae-car-shortform.'+ext+'">영상 다운로드</a><button class="secondary" data-action="copy-caption">게시 문구 복사</button><button class="secondary" data-action="restart">새 영상 만들기</button></div><section class="card share-card"><p class="eyebrow">게시 문구 초안</p><textarea readonly>'+esc(share)+'</textarea><p class="hint">게시 문구는 복사해 직접 수정·게시할 수 있습니다. SNS 자동 게시 기능은 연결되어 있지 않습니다.</p></section></section>');
}
function render(){
 document.documentElement.style.setProperty("--orange",state.vehicle.brandColor||"#ef6d32");
 if(state.step===1)renderStep1(); else if(state.step===2)renderStep2(); else if(state.step===3)renderStep3(); else renderResult();
}
function recommendedDuration(n){return n<=12?15:n<=20?25:40}
function toast(message){
 let box=$("#toasts"); if(!box)return;
 const node=document.createElement("div");node.className="toast";node.textContent=message;box.append(node);
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.remove(),4200);
}
function addFiles(files){
 const allowed=[...files].filter(f=>/^image\/(jpeg|png|webp)$/.test(f.type));
 if(allowed.length<files.length)toast("JPG, PNG, WEBP 파일만 추가할 수 있습니다.");
 const room=Math.max(0,30-state.photos.length);
 allowed.slice(0,room).forEach(file=>{
  if(file.size>20*1024*1024){toast(file.name+" 파일이 20MB를 초과합니다.");return}
  state.photos.push({file:file,url:URL.createObjectURL(file),name:file.name});
 });
 if(allowed.length>room)toast("사진은 최대 30장까지 올릴 수 있습니다.");
 if(state.duration===15 && state.photos.length>12)state.duration=recommendedDuration(state.photos.length);
 saveDraft();render();
}
function setVehicle(data){
 if(!data||typeof data!=="object")return;
 const v=data.vehicle||data;
 ["make","model","trim","year","price","currency","mileage","power","engine","transmission","fuel","drive","body","color","dealer","phone","address","description","cta","inquiryUrl"].forEach(k=>{if(data[k]!=null)state.vehicle[k]=String(data[k]);else if(data.vehicle&&data.vehicle[k]!=null)state.vehicle[k]=String(data.vehicle[k])});
 if(Array.isArray(data.highlights))state.vehicle.highlights=data.highlights.slice(0,5);
 if(Array.isArray(data.vehicle?.highlights))state.vehicle.highlights=data.vehicle.highlights.slice(0,5);
 if(data.history)state.history=Object.assign({},state.history,data.history);
 saveDraft();
}
function parseListingText(text){
 const result={};
 const lines=String(text||"").split(/\r?\n/);
 const rules=[
  ["make",/^(?:제조사|브랜드|maker|make)\s*[:：-]\s*(.+)$/i],
  ["model",/^(?:모델명?|차명|model)\s*[:：-]\s*(.+)$/i],
  ["trim",/^(?:세부 ?트림|트림|등급)\s*[:：-]\s*(.+)$/i],
  ["year",/^(?:연식|연도|year)\s*[:：-]\s*(\d{4})/i],
  ["price",/^(?:판매 ?가격|가격|price)\s*[:：-]\s*([\d,]+)/i],
  ["mileage",/^(?:주행거리|주행)\s*[:：-]\s*([\d,]+\s*(?:km|마일|mi)?)/i],
  ["color",/^(?:외장 ?색상|색상|color)\s*[:：-]\s*(.+)$/i],
  ["fuel",/^(?:연료|fuel)\s*[:：-]\s*(.+)$/i],
  ["transmission",/^(?:변속기|미션|transmission)\s*[:：-]\s*(.+)$/i],
  ["dealer",/^(?:판매자명|판매자|상호|딜러명)\s*[:：-]\s*(.+)$/i],
  ["phone",/^(?:전화번호|연락처|전화)\s*[:：-]\s*(.+)$/i]
 ];
 lines.forEach(line=>{const clean=line.trim();for(const [key,re] of rules){const m=clean.match(re);if(m){result[key]=m[1].trim();break}}});
 if(result.price)result.price=result.price.replace(/,/g,"");
 if(result.year)result.year=result.year.slice(0,4);
 return result;
}
function openImportModal(){
 const text='<p class="hint">외부 매물 페이지는 브라우저 보안 정책 때문에 자동으로 읽지 못할 수 있습니다. 링크에서 확인한 정보를 아래 형식으로 붙여넣으면 표시된 항목을 채웁니다.</p><textarea id="listing-text" rows="9" placeholder="제조사: BMW\n모델: X4\n세부 트림: 20i M Sport\n연식: 2022\n판매 가격: 38900000\n주행거리: 42000 km\n색상: 블랙\n판매자명: 보배모터"></textarea><p class="hint">형식이 분명한 항목만 자동 입력하며, 나머지는 직접 확인해 주세요.</p><button class="primary wide" data-action="parse-listing">붙여넣은 정보 적용</button>';
 showModal("매물 정보 붙여넣기",text);
}
function showModal(title,body){
 const old=$(".modal-backdrop");if(old)old.remove();
 document.body.insertAdjacentHTML("beforeend",'<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h2>'+esc(title)+'</h2><button class="close" data-action="close-modal" aria-label="닫기">×</button></div>'+body+'</section></div>');
}
async function importListing(){
 const input=$("#listing-url");state.listingUrl=(input?.value||"").trim();saveDraft();
 if(!/^https?:\/\//i.test(state.listingUrl)){toast("먼저 http 또는 https 매물 링크를 입력하세요.");return}
 if(importEndpoint){
  try{
   toast("매물 정보를 불러오는 중입니다.");
   const res=await fetch(importEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:state.listingUrl})});
   if(!res.ok)throw new Error("서버 응답 "+res.status);
   const data=await res.json();setVehicle(data);toast("매물 정보를 가져왔습니다. 값을 확인해 주세요.");render();return;
  }catch(err){console.error(err);toast("자동 가져오기에 실패했습니다. 링크를 열어 정보를 붙여넣어 주세요.");}
 }
 window.open(state.listingUrl,"_blank","noopener,noreferrer");
 openImportModal();
}
function makeNarration(){
 const v=state.vehicle,parts=[];
 parts.push("지금 소개해 드릴 차량은 "+[v.year+"년식",v.make,v.model,v.trim].filter(Boolean).join(" ")+"입니다.");
 if(v.mileage)parts.push("주행거리는 "+v.mileage+"입니다.");
 if(v.fuel||v.transmission)parts.push([v.fuel,v.transmission].filter(Boolean).join(" ")+" 차량입니다.");
 if(v.color)parts.push("외장 색상은 "+v.color+"입니다.");
 if(v.highlights.length)parts.push("주요 장점은 "+v.highlights.join(", ")+"입니다.");
 if(v.description)parts.push(v.description);
 if(state.history.accident!=="미확인")parts.push("사고 이력은 "+state.history.accident+"으로 입력되어 있습니다.");
 if(v.price)parts.push("판매 가격은 "+priceText()+"입니다.");
 if(v.dealer)parts.push("문의는 "+v.dealer+"로 연락해 주세요.");
 if(v.phone)parts.push("전화번호는 "+v.phone+"입니다.");
 parts.push(v.cta||"자세한 내용은 판매자에게 문의해 주세요.");
 return parts.join(" ");
}
function makeShareCopy(){
 const v=state.vehicle;
 return [carTitle(),priceText(),v.mileage?"주행거리 "+v.mileage:"",v.color?"색상 "+v.color:"",v.highlights.join(" · "),v.description,v.cta,"#중고차 #차량소개 #숏폼영상"].filter(Boolean).join("\n");
}
function drawPreview(){
 const box=$("#preview-phone");if(!box)return;
 const photo=state.photos[0];
 box.innerHTML=(photo?'<img src="'+photo.url+'" alt="영상 미리보기 사진">':'<div class="empty-preview">차량 사진이 여기에 표시됩니다</div>')+'<div class="preview-gradient"></div><div class="preview-copy"><small>'+esc(state.vehicle.dealer||"BOBAE CAR")+'</small><b>'+esc(carTitle()||"차량 소개")+'</b><span>'+esc(priceText())+'</span></div>';
}
function insertWrapped(ctx,text,x,y,maxWidth,lineHeight,maxLines){
 const words=String(text||"").split(/\s+/);let line="",lines=0;
 for(const word of words){const test=line?line+" "+word:word;if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y+lines*lineHeight,maxWidth);line=word;lines++;if(lines>=maxLines)return} else line=test}
 if(line&&lines<maxLines)ctx.fillText(line,x,y+lines*lineHeight,maxWidth);
}
function drawFrame(ctx,img,w,h,scene,progress){
 const v=state.vehicle,palette=palettes.find(x=>x.name===state.selectedPreset)||palettes[0],accent=state.selectedPreset?palette.a:(v.brandColor||"#ef6d32"),dark=state.template==="프리미엄"?"#101722":state.template==="클래식"?"#282521":"#17202c";
 const zoom=(state.template==="다이내믹"?1.08:1.025)+progress*(state.template==="다이내믹"?.12:.055),iw=img.naturalWidth,ih=img.naturalHeight,scale=Math.max(w/iw,h/ih)*zoom,sw=w/scale,sh=h/scale;
 const shift=(progress-.5)*Math.min(sw*(state.template==="다이내믹"?.12:.05),iw*.06);
 ctx.fillStyle=dark;ctx.fillRect(0,0,w,h);
 ctx.drawImage(img,Math.max(0,(iw-sw)/2+shift),Math.max(0,(ih-sh)/2),Math.min(sw,iw),Math.min(sh,ih),0,0,w,h);
 const fade=ctx.createLinearGradient(0,h*.48,0,h);fade.addColorStop(0,"rgba(5,10,16,0)");fade.addColorStop(1,"rgba(5,10,16,.92)");ctx.fillStyle=fade;ctx.fillRect(0,0,w,h);
 ctx.fillStyle=accent;ctx.fillRect(w*.07,h*.065,w*.13,Math.max(5,h*.006));
 ctx.textAlign="left";ctx.fillStyle="#ffffff";ctx.font="700 "+Math.round(w*.028)+"px sans-serif";ctx.fillText((v.dealer||"BOBAE CAR").slice(0,36),w*.07,h*.11,w*.72);
 const isFirst=scene===0,isLast=scene===state.photos.length-1;
 let headline="",sub="";
 if(isFirst){headline=carTitle()||"차량 소개";sub=[v.color,v.body].filter(Boolean).join(" · ")||"매물 정보를 확인하세요"}
 else if(isLast){headline=v.cta||"차량 문의하기";sub=[v.dealer,v.phone].filter(Boolean).join(" · ")||priceText()}
 else{
  const facts=[v.highlights[scene-1],v.mileage?"주행거리 "+v.mileage:"",v.fuel,v.transmission,v.drive,v.power].filter(Boolean);
  headline=facts[(scene-1)%facts.length]||"차량 상세 정보";
  sub=scene%3===1?priceText():[v.year&&v.year+"년식",v.color,v.body].filter(Boolean).join(" · ");
 }
 if(state.captions){
  const top=h*(isFirst ? .68 : isLast ? .72 : .76);
  ctx.fillStyle=accent;ctx.font="700 "+Math.round(w*.031)+"px sans-serif";ctx.fillText(isFirst?(v.listingType||"매물"):isLast?"문의 안내":"차량 포인트",w*.07,top-h*.11,w*.83);
  const headlineFont=Math.round(w*(state.captionStyle==="미니멀"?.045:isFirst ? .061 : .052));
  if(state.captionStyle==="강조"){
   ctx.fillStyle=accent;ctx.globalAlpha=.94;ctx.fillRect(w*.055,top-h*.065,w*.89,h*.17);ctx.globalAlpha=1;ctx.fillStyle="#fff";
  }else ctx.fillStyle=state.template==="프리미엄"?"#f7f1e7":"#fff";
  ctx.font=(state.captionStyle==="강조"?"900 ":"800 ")+headlineFont+"px sans-serif";insertWrapped(ctx,headline,w*.07,top,w*.84,Math.round(w*.075),2);
  ctx.fillStyle="rgba(255,255,255,.88)";ctx.font="500 "+Math.round(w*.029)+"px sans-serif";ctx.fillText(sub,w*.07,top+h*.11,w*.84);
  if(isFirst&&v.price&&state.showPrice){ctx.font="700 "+Math.round(w*.043)+"px sans-serif";ctx.fillText(priceText(),w*.07,top+h*.18,w*.84)}
 }
 ctx.fillStyle=accent;ctx.fillRect(w*.07,h*.93,w*.86,Math.max(3,h*.004));
 ctx.fillStyle="rgba(255,255,255,.84)";ctx.font="500 "+Math.round(w*.02)+"px sans-serif";ctx.fillText(String(scene+1).padStart(2,"0")+" / "+String(state.photos.length).padStart(2,"0"),w*.07,h*.97);
 if(state.logoImage&&state.logoImage.complete){try{ctx.drawImage(state.logoImage,w*.76,h*.055,w*.16,h*.065)}catch{}}
}
function scheduleMusic(ctx,dest,kind,duration){
 if(kind==="음악 없음")return;
 const presets={
  "시네마틱":{beat:.72,notes:[110,164.81,220,261.63,220,164.81],wave:"sine"},
  "에너지":{beat:.32,notes:[110,164.81,220,329.63,261.63,329.63,392,329.63],wave:"triangle"},
  "프레젠테이션":{beat:.56,notes:[196,246.94,293.66,392,293.66,246.94],wave:"triangle"},
  "어쿠스틱":{beat:.9,notes:[174.61,220,261.63,329.63,261.63,220],wave:"sine"}
 };
 const s=presets[kind]||presets["시네마틱"],start=ctx.currentTime+.04,vol=Number(state.musicVolume)/100*.075;
 for(let t=0,n=0;t<duration;t+=s.beat,n++){
  const hz=s.notes[n%s.notes.length],len=Math.min(s.beat*.78,duration-t);
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=s.wave;osc.frequency.setValueAtTime(hz,start+t);
  gain.gain.setValueAtTime(.0001,start+t);gain.gain.linearRampToValueAtTime(vol,start+t+.035);gain.gain.exponentialRampToValueAtTime(.0001,start+t+Math.max(.09,len));
  osc.connect(gain);gain.connect(dest);osc.start(start+t);osc.stop(start+t+len+.02);
 }
}
async function getVoiceBuffer(audioContext){
 if(state.narrationFile)return await audioContext.decodeAudioData(await state.narrationFile.arrayBuffer());
 if(ttsReady&&ttsEndpoint){
  const res=await fetch(ttsEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:makeNarration(),language:"ko-KR"})});
  if(!res.ok)throw new Error("AI 음성 생성 요청 실패");
  return await audioContext.decodeAudioData(await res.arrayBuffer());
 }
 return null;
}
async function makeVideo(){
 if(state.photos.length<10){toast("사진을 10장 이상 추가하세요.");return}
 const v=state.vehicle;
 if(!v.make||!v.model||!v.year||!v.price){toast("제조사, 모델, 연식, 판매 가격을 입력하세요.");state.step=2;render();return}
 if(state.voice&&!state.narrationFile&&!ttsReady){toast("나레이션 파일을 올리거나 음성 API를 연결해 주세요.");return}
 const mime=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(x=>window.MediaRecorder&&MediaRecorder.isTypeSupported(x));
 if(!mime||!HTMLCanvasElement.prototype.captureStream){toast("이 브라우저의 영상 인코더를 사용할 수 없습니다. 최신 Chrome, Edge 또는 Safari로 열어 주세요.");return}
 state.busy=true;render();
 const [rw,rh]=formats[state.ratio]||formats["9:16"],scale=state.resolution/720,w=Math.round(rw*scale),h=Math.round(rh*scale),canvas=document.createElement("canvas");
 canvas.width=w;canvas.height=h;const ctx=canvas.getContext("2d",{alpha:false});
 let audioContext=null,stream=null,recorder=null;
 try{
  const images=await Promise.all(state.photos.map(p=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error("사진을 읽을 수 없습니다: "+p.name));im.src=p.url})));
  stream=canvas.captureStream(30);
  if(state.music!=="음악 없음"||state.voice){
   const AudioCtx=window.AudioContext||window.webkitAudioContext;
   if(!AudioCtx)throw new Error("Web Audio를 지원하지 않는 브라우저입니다.");
   audioContext=new AudioCtx();await audioContext.resume();
   const dest=audioContext.createMediaStreamDestination(),master=audioContext.createGain();master.gain.value=.82;master.connect(dest);
   if(state.music!=="음악 없음"){const musicGain=audioContext.createGain();musicGain.gain.value=1;musicGain.connect(master);scheduleMusic(audioContext,musicGain,state.music,state.duration)}
   if(state.voice){
    const buffer=await getVoiceBuffer(audioContext);if(!buffer)throw new Error("나레이션 음성을 불러올 수 없습니다.");
    const voiceSource=audioContext.createBufferSource(),voiceGain=audioContext.createGain();voiceSource.buffer=buffer;voiceGain.gain.value=.9;voiceSource.connect(voiceGain);voiceGain.connect(master);voiceSource.start(audioContext.currentTime+.08);
   }
   dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
  }
  const chunks=[],opts={mimeType:mime,videoBitsPerSecond:state.resolution>=1080?7500000:4500000};
  recorder=new MediaRecorder(stream,opts);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  const stopped=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||new Error("영상 저장 오류"))});
  recorder.start(250);
  const length=state.duration*1000,sceneLength=length/images.length,start=performance.now();
  while(performance.now()-start<length){
   const elapsed=performance.now()-start,scene=Math.min(images.length-1,Math.floor(elapsed/sceneLength)),progress=(elapsed%sceneLength)/sceneLength;
   drawFrame(ctx,images[scene],w,h,scene,progress);
   await new Promise(resolve=>setTimeout(resolve,33));
  }
  recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());if(audioContext)await audioContext.close();
  if(state.resultUrl)URL.revokeObjectURL(state.resultUrl);
  state.resultUrl=URL.createObjectURL(new Blob(chunks,{type:mime}));state.resultType=mime;state.busy=false;state.step=4;saveDraft();render();window.scrollTo({top:0,behavior:"smooth"});
 }catch(err){
  console.error(err);try{if(recorder&&recorder.state==="recording")recorder.stop()}catch{}
  if(stream)stream.getTracks().forEach(t=>t.stop());if(audioContext)await audioContext.close().catch(()=>{});
  state.busy=false;render();toast(err.message||"영상 생성에 실패했습니다. 사진과 브라우저 지원을 확인해 주세요.");
 }
}
function showModal(title,body){
 const old=$(".modal-backdrop");if(old)old.remove();
 document.body.insertAdjacentHTML("beforeend",'<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h2>'+esc(title)+'</h2><button class="close" data-action="close-modal" aria-label="닫기">×</button></div>'+body+'</section></div>');
}
function pasteModal(){
 showModal("매물 정보 붙여넣기",'<p class="hint">아래처럼 항목 이름과 값을 붙여넣으면 라벨이 확인되는 정보만 채웁니다.</p><textarea id="listing-text" rows="9" placeholder="제조사: BMW\n모델: X4\n세부 트림: 20i M Sport\n연식: 2022\n판매 가격: 38900000\n주행거리: 42000 km\n색상: 블랙\n판매자명: 보배모터"></textarea><p class="hint">가져온 값은 제출 전에 직접 확인해 주세요.</p><button class="primary wide" data-action="parse-listing">붙여넣은 정보 적용</button>');
}
function parseListing(){
 const text=$("#listing-text")?.value||"",out={};
 const rules=[["make",/^(?:제조사|브랜드|maker|make)\s*[:：-]\s*(.+)$/i],["model",/^(?:모델명?|차명|model)\s*[:：-]\s*(.+)$/i],["trim",/^(?:세부 ?트림|트림|등급)\s*[:：-]\s*(.+)$/i],["year",/^(?:연식|연도|year)\s*[:：-]\s*(\d{4})/i],["price",/^(?:판매 ?가격|가격|price)\s*[:：-]\s*([\d,]+)/i],["mileage",/^(?:주행거리|주행)\s*[:：-]\s*([\d,]+\s*(?:km|마일|mi)?)/i],["color",/^(?:외장 ?색상|색상|color)\s*[:：-]\s*(.+)$/i],["fuel",/^(?:연료|fuel)\s*[:：-]\s*(.+)$/i],["transmission",/^(?:변속기|미션|transmission)\s*[:：-]\s*(.+)$/i],["dealer",/^(?:판매자명|판매자|상호|딜러명)\s*[:：-]\s*(.+)$/i],["phone",/^(?:전화번호|연락처|전화)\s*[:：-]\s*(.+)$/i]];
 String(text).split(/\r?\n/).forEach(line=>{for(const [key,re] of rules){const m=line.trim().match(re);if(m){out[key]=m[1].trim().replace(/,/g,"");break}}});
 Object.keys(out).forEach(k=>state.vehicle[k]=out[k]);saveDraft();
 $(".modal-backdrop")?.remove();state.step=2;render();toast(Object.keys(out).length?"라벨이 있는 항목 "+Object.keys(out).length+"개를 입력했습니다. 확인해 주세요.":"인식한 라벨이 없습니다. 직접 입력해 주세요.");
}
function shareText(){
 const v=state.vehicle;
 return [carTitle(),priceText(),v.mileage?"주행거리 "+v.mileage:"",v.color?"색상 "+v.color:"",v.highlights.join(" · "),v.description,v.cta,"#중고차 #차량소개 #숏폼"].filter(Boolean).join("\n");
}
async function previewVoice(){
 if(state.narrationFile){const a=new Audio(URL.createObjectURL(state.narrationFile));a.play();return}
 if(ttsReady&&ttsEndpoint){try{const r=await fetch(ttsEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:makeNarration(),language:"ko-KR"})});if(!r.ok)throw new Error("TTS");const a=new Audio(URL.createObjectURL(new Blob([await r.arrayBuffer()],{type:"audio/mpeg"})));a.play();return}catch{toast("AI 음성 서버에 연결하지 못했습니다.");return}}
 if("speechSynthesis" in window){const u=new SpeechSynthesisUtterance(makeNarration());u.lang="ko-KR";u.rate=.94;speechSynthesis.cancel();speechSynthesis.speak(u);toast("기기 내 음성 미리듣기입니다. 영상에 넣으려면 음성 파일 또는 AI 음성 서버가 필요합니다.");return}
 toast("미리듣기 음성을 사용할 수 없습니다.");
}
function act(action,el){
 const index=Number(el.dataset.index),value=el.dataset.value;
 if(action==="step"){const target=Number(el.dataset.step);if(target<state.step||target===state.step+1){if(target===2&&state.photos.length<10){toast("사진을 10장 이상 등록하세요.");return}if(target===3&&!validVehicle()){toast("제조사·모델·연식·판매 가격을 먼저 입력하세요.");state.step=2;render();return}state.step=target;render()}return}
 if(action==="next"){
  if(state.step===1){if(state.photos.length<10){toast("계속하려면 사진을 10장 이상 등록하세요.");return}state.step=2}
  else if(state.step===2){if(!validVehicle()){toast("제조사, 모델, 연식, 판매 가격을 입력해 주세요.");return}state.step=3}
  saveDraft();render();window.scrollTo({top:0,behavior:"smooth"});return
 }
 if(action==="back"){state.step=Math.max(1,state.step-1);render();window.scrollTo({top:0,behavior:"smooth"});return}
 if(action==="import-listing"){importListing();return}
 if(action==="entry-mode"){state.entryMode=value;saveDraft();render();return}
 if(action==="vehicle-type"){state.vehicle.listingType=value;saveDraft();render();return}
 if(action==="paste-listing"){pasteModal();return}
 if(action==="parse-listing"){parseListing();return}
 if(action==="remove"){URL.revokeObjectURL(state.photos[index].url);state.photos.splice(index,1);render();return}
 if(action==="move-left"&&index>0){[state.photos[index-1],state.photos[index]]=[state.photos[index],state.photos[index-1]];render();return}
 if(action==="move-right"&&index<state.photos.length-1){[state.photos[index+1],state.photos[index]]=[state.photos[index],state.photos[index+1]];render();return}
 if(action==="highlight"){const at=state.vehicle.highlights.indexOf(value);if(at>=0)state.vehicle.highlights.splice(at,1);else if(state.vehicle.highlights.length<5)state.vehicle.highlights.push(value);else toast("주요 장점은 최대 5개까지 선택할 수 있습니다.");saveDraft();render();return}
 if(action==="add-highlight"){const input=$("#new-highlight"),x=(input?.value||"").trim();if(x&&!state.vehicle.highlights.includes(x)&&state.vehicle.highlights.length<5)state.vehicle.highlights.push(x);saveDraft();render();return}
 if(action==="history"){state.history[el.dataset.key]=value;saveDraft();render();return}
 if(action==="template"){state.template=value;saveDraft();render();return}
 if(action==="palette"){state.selectedPreset=value;saveDraft();render();return}
 if(action==="ratio"){state.ratio=value;saveDraft();render();return}
 if(action==="duration"){state.duration=Number(value);saveDraft();render();return}
 if(action==="resolution"){state.resolution=Number(value);saveDraft();render();return}
 if(action==="music"){state.music=value;saveDraft();render();return}
 if(action==="caption-style"){state.captionStyle=value;saveDraft();drawPreview();render();return}
 if(action==="voice-preview"){previewVoice();return}
 if(action==="script-preview"){showModal("한국어 내레이션 원고",'<p class="hint">입력된 차량 정보만 반영한 원고입니다. 확인되지 않은 상태 정보는 단정하지 않습니다.</p><div class="script-preview">'+esc(makeNarration())+'</div><button class="secondary wide" data-action="copy-script">원고 복사</button>');return}
 if(action==="copy-script"){navigator.clipboard?.writeText(makeNarration());toast("원고를 복사했습니다.");return}
 if(action==="create"){makeVideo();return}
 if(action==="close-modal"){const m=$(".modal-backdrop");if(m)m.remove();return}
 if(action==="restart"){if(state.resultUrl)URL.revokeObjectURL(state.resultUrl);state.resultUrl="";state.step=1;state.photos.forEach(p=>URL.revokeObjectURL(p.url));state.photos=[];state.vehicle=Object.assign({},defaults.vehicle,{highlights:[]});state.history=Object.assign({},defaults.history);state.voice=false;state.narrationFile=null;saveDraft();render();return}
 if(action==="copy-caption"){navigator.clipboard?.writeText(shareText());toast("게시 문구를 복사했습니다.");return}
}
function validVehicle(){const v=state.vehicle;return Boolean(v.make.trim()&&v.model.trim()&&v.year&&v.price)}
function onInput(e){
 const t=e.target;
 if(t.id==="listing-url"){state.listingUrl=t.value;saveDraft();return}
 if(t.dataset.field){state.vehicle[t.dataset.field]=t.value;saveDraft();if(state.step===3)drawPreview();return}
 if(t.id==="music-volume"){state.musicVolume=Number(t.value);const b=t.parentElement.querySelector("b");if(b)b.textContent=t.value+"%";saveDraft();return}
}
app.addEventListener("input",onInput);
app.addEventListener("change",e=>{
 const t=e.target;
 if(t.dataset.field){state.vehicle[t.dataset.field]=t.value;saveDraft();if(state.step===3)drawPreview()}
 if(t.id==="photo-input"){addFiles(t.files);t.value=""}
 if(t.id==="logo-file"){const file=t.files[0];if(file){state.logoUrl=URL.createObjectURL(file);state.logoImage=new Image();state.logoImage.src=state.logoUrl;render()}t.value=""}
 if(t.id==="voice-file"){state.narrationFile=t.files[0]||null;if(state.narrationFile){state.voice=true;toast("나레이션 파일을 선택했습니다.")}saveDraft();render()}
 if(t.dataset.action==="voice"){state.voice=t.checked;saveDraft()}
 if(t.dataset.action==="captions"){state.captions=t.checked;saveDraft();drawPreview()}
});
app.addEventListener("click",e=>{
 const drop=e.target.closest("#drop-area");if(drop){photoInput.click();return}
 const button=e.target.closest("[data-action]");if(button)act(button.dataset.action,button);
});
document.addEventListener("dragover",e=>{if(e.target.closest("#drop-area")){e.preventDefault();$("#drop-area")?.classList.add("drag")}});
document.addEventListener("dragleave",e=>{if(e.target.closest("#drop-area"))$("#drop-area")?.classList.remove("drag")});
document.addEventListener("drop",e=>{if(e.target.closest("#drop-area")){e.preventDefault();$("#drop-area")?.classList.remove("drag");addFiles(e.dataTransfer.files)}});
app.addEventListener("keydown",e=>{if(e.target.id==="drop-area"&&(e.key==="Enter"||e.key===" ")){e.preventDefault();photoInput.click()}});
app.addEventListener("dragstart",e=>{const n=e.target.closest("[data-drag]");if(n)dragIndex=Number(n.dataset.drag)});
app.addEventListener("dragover",e=>{if(e.target.closest("[data-drag]"))e.preventDefault()});
app.addEventListener("drop",e=>{const target=e.target.closest("[data-drag]");if(target&&dragIndex>=0){e.preventDefault();const to=Number(target.dataset.drag),[moved]=state.photos.splice(dragIndex,1);state.photos.splice(to,0,moved);dragIndex=-1;render()}});
photoInput.addEventListener("change",e=>{addFiles(e.target.files);e.target.value=""});
function init(){
 if(ttsEndpoint){fetch(ttsEndpoint.replace(/\/$/,"")+"/status").then(r=>r.json()).then(x=>{ttsReady=Boolean(x.ready);render()}).catch(()=>{ttsReady=false})}
 saveDraft();render();
}
init();
