const UI = {
    lcdName: document.getElementById('lcdName'),
    lcdEn: document.getElementById('lcdEn'),
    typeBadge: document.getElementById('typeBadge'),
    destDisp: document.getElementById('destDisp'),
    routeMap: document.getElementById('routeMap'),
    telop: document.getElementById('telopTxt'),
    curStSel: document.getElementById('curStSel'),
    typeSel: document.getElementById('typeSel'),　
    dirSel: document.getElementById('dirSel'),
    mel: document.getElementById('melAudio'),
    chime: document.getElementById('chimeAudio'),
    sideBtn: document.getElementById('sideBtn'),
    boot: document.getElementById('boot'),
    bootBtn: document.getElementById('bootBtn'), // 追加
    emer: document.getElementById('emergencyMsg'),
    alertTxt: document.getElementById('alertTxt'),
    clock: document.getElementById('clock')
};

const meta = {
    local: {n: "普通", c: "#666"},
    semi: {n: "準急", c: "#009944"},
    s_exp: {n: "区急", c: "#ffcc00"},
    exp: {n: "急行", c: "#f39800"},
    r_exp: {n: "快急", c: "#ff5500"},
    ltd: {n: "特急", c: "#e60012"},
    school: {n: "修学旅行", c: "#d63384"},
    extra: {n: "臨時", c: "#0055ff"},
    trial: {n: "試運転", c: "#ffffff", tc: "#000"}
};

let doorSide = "左";
let voices = [];

// 音声読み込み
function loadVoices() {
    voices = window.speechSynthesis.getVoices();
}
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}

// 起動ボタン：デザインに合わせたフェードアウト処理
UI.bootBtn.onclick = () => {
    UI.boot.style.opacity = '0';
    UI.boot.style.transition = 'opacity 0.8s ease';
    setTimeout(() => {
        UI.boot.style.display = 'none';
        speak("システムオンライン。運行管理を開始します。");
    }, 800);
};

function speak(ja, en = "") {
    window.speechSynthesis.cancel();
    const uJa = new SpeechSynthesisUtterance(ja);
    uJa.voice = voices.find(v => v.lang === 'ja-JP' && v.name.includes('Google')) || voices.find(v => v.lang === 'ja-JP');
    uJa.rate = 1.0;
    uJa.onend = () => {
        if(en) {
            const uEn = new SpeechSynthesisUtterance(en);
            uEn.voice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || voices.find(v => v.lang === 'en-US');
            uEn.lang = 'en-US'; uEn.rate = 0.9;
            window.speechSynthesis.speak(uEn);
        }
    };
    window.speechSynthesis.speak(uJa);
}

function update() {
    const route = UI.dirSel.value === 'up' ? [...stations].reverse() : [...stations];
    const type = UI.typeSel.value;
    const curIdx = parseInt(UI.curStSel.value);

    UI.typeBadge.textContent = meta[type].n;
    UI.typeBadge.style.backgroundColor = meta[type].c;
    UI.typeBadge.style.color = meta[type].tc || "#fff";
    UI.destDisp.textContent = route[route.length - 1].name;

    const next = route.slice(curIdx + 1).find(s => (type === 'school' || type === 'trial' || type === 'extra' ? true : s[type]));
    
    if(next) {
        UI.lcdName.textContent = next.name;
        UI.lcdEn.textContent = next.en;
        if(type === 'school') {
            setTelop(`【修学旅行】次は ${next.name} です。思い出に残る旅を！`);
        }
    } else {
        UI.lcdName.textContent = "終点"; UI.lcdEn.textContent = "TERMINAL";
    }

    UI.routeMap.innerHTML = '';
    route.forEach((st, i) => {
        const d = document.createElement('div');
        const isStop = (type === 'school' || type === 'trial' || type === 'extra' ? true : st[type]);
        d.className = 'dot' + (isStop ? ' stop' : '') + (i === curIdx ? ' active' : '');
        UI.routeMap.appendChild(d);
    });
}

function playAnn(mode) {
    const route = UI.dirSel.value === 'up' ? [...stations].reverse() : [...stations];
    const type = UI.typeSel.value;
    const curIdx = parseInt(UI.curStSel.value);
    const next = route.slice(curIdx + 1).find(s => (type === 'school' || type === 'trial' || type === 'extra' ? true : s[type]));

    switch(mode) {
        case 'pre':
            speak(`停車中の電車は、${meta[type].n}、${route[route.length-1].name}ゆきです。次は、${next.yomi}です。`, 
                  `This is the ${meta[type].n} train bound for ${route[route.length-1].en}. The next station is ${next.en}.`);
            break;
        case 'next':
            speak(`次は、${next.yomi}、${next.yomi}です。`, `The next station is ${next.en}.`);
            break;
        case 'soon':
            let tr = next.transfer ? `${next.transfer}はお乗り換えです。` : "";
            speak(`まもなく、${next.yomi}、${next.yomi}です。お出口は${doorSide}側です。${tr}`, 
                  `We will soon make a brief stop at ${next.en}. The doors on the ${doorSide === '左'?'left':'right'} side will open.`);
            break;
        case 'school_greet':
            speak("本日は修学旅行でのご利用、誠にありがとうございます。思い出に残る楽しい旅となりますよう、乗務員一同お手伝いさせていただきます。");
            setTelop("【修学旅行】本日は館浜電鉄をご利用いただきありがとうございます。");
            break;
        case 'accident':
            speak("現在、前を走る電車に急病人が発生したため、一時停車しております。");
            setTelop("【運行情報】急病人対応のため、一時停車中。");
            break;
        case 'earthquake':
            speak("ただいま強い地震が発生しました。急停車します！");
            emergency();
            break;
        case 'delay': speak("列車が遅れまして、ご迷惑をおかけしております。"); break;
        case 'door': speak("ドアが閉まります。ご注意ください。"); break;
        case 'chime': UI.chime.play(); break;
        case 'manner': speak("車内では携帯電話をマナーモードに設定のうえ、通話はご遠慮ください。"); break;
        case 'wait': speak("この駅で電車の待ち合わせをいたします。"); break;
    }
}

function toggleSide() {
    doorSide = (doorSide === "左") ? "右" : "左";
    UI.sideBtn.textContent = `出口：${doorSide}`;
}

function toggleMelody() {
    if(UI.mel.paused) { 
        UI.mel.play(); 
        document.getElementById('melBtn').classList.add('active'); 
    } else { 
        UI.mel.pause(); 
        UI.mel.currentTime = 0; 
        document.getElementById('melBtn').classList.remove('active'); 
    }
}

function toggleNight() { document.body.classList.toggle('night-mode'); }
function setTelop(t) { UI.telop.textContent = t; }

function emergency() {
    UI.emer.style.display = 'flex';
    UI.alertTxt.textContent = "緊急停止信号を受信。周囲を確認してください。";
    speak("急停車します！ご注意ください！");
}

UI.dirSel.onchange = () => {
    const route = UI.dirSel.value === 'up' ? [...stations].reverse() : [...stations];
    UI.curStSel.innerHTML = '';
    route.forEach((st, i) => {
        const o = document.createElement('option'); o.value = i; o.textContent = st.name;
        UI.curStSel.appendChild(o);
    });
    update();
};

UI.typeSel.onchange = update;
UI.curStSel.onchange = update;
setInterval(() => { UI.clock.textContent = new Date().toLocaleTimeString(); }, 1000);
UI.dirSel.onchange();
