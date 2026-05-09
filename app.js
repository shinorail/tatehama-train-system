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
    emer: document.getElementById('emergencyMsg'),
    alertTxt: document.getElementById('alertTxt')
};

const meta = {
    local: {n: "普通", c: "#666"}, semi: {n: "準急", c: "#009944"},
    s_exp: {n: "区急", c: "#ffcc00"}, exp: {n: "急行", c: "#f39800"},
    r_exp: {n: "快急", c: "#ff5500"}, ltd: {n: "特急", c: "#e60012"}
};

let doorSide = "左";
let voices = [];

// 音声初期化（Chrome対応）
function loadVoices() {
    voices = window.speechSynthesis.getVoices();
}
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}
loadVoices();

// 起動処理
UI.boot.onclick = () => {
    UI.boot.style.display = 'none';
    speak("システムを起動しました。本日も安全運転をお願いいたします。");
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
    UI.destDisp.textContent = route[route.length - 1].name;

    const next = route.slice(curIdx + 1).find(s => s[type]);
    if(next) {
        UI.lcdName.textContent = next.name;
        UI.lcdEn.textContent = next.en;
        if(next.transfer) setTelop(`次は、${next.name}、${next.name}です。${next.transfer}はお乗り換えです。`);
    } else {
        UI.lcdName.textContent = "終点"; UI.lcdEn.textContent = "TERMINAL";
    }

    UI.routeMap.innerHTML = '';
    route.forEach((st, i) => {
        const d = document.createElement('div');
        d.className = 'dot' + (st[type] ? ' stop' : '') + (i === curIdx ? ' active' : '');
        UI.routeMap.appendChild(d);
    });
}

function playAnn(mode) {
    const route = UI.dirSel.value === 'up' ? [...stations].reverse() : [...stations];
    const type = UI.typeSel.value;
    const curIdx = parseInt(UI.curStSel.value);
    const next = route.slice(curIdx + 1).find(s => s[type]);
    if(!next && ['pre','next','soon','wait'].includes(mode)) return;

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
        case 'door': speak("ドアが閉まります。ご注意ください。"); break;
        case 'chime': UI.chime.play(); break;
        case 'wait': speak("この駅で、後の特急電車の待ち合わせをいたします。発車までしばらくお待ちください。"); break;
        case 'manner': speak("車内では、携帯電話をマナーモードに設定のうえ、通話はご遠慮ください。ご協力をお願いします。"); break;
        case 'delay': speak("列車が遅れまして、ご迷惑をおかけしております。"); break;
    }
}

function toggleMelody() {
    if(UI.mel.paused) { UI.mel.play(); document.getElementById('melBtn').style.background = "#505"; }
    else { UI.mel.pause(); UI.mel.currentTime = 0; document.getElementById('melBtn').style.background = ""; }
}

function toggleSide() {
    doorSide = (doorSide === "左") ? "右" : "左";
    UI.sideBtn.textContent = `出口：${doorSide}`;
}

function toggleNight() { document.body.classList.toggle('night-mode'); }
function setTelop(t) { UI.telop.textContent = t; }

function emergency() {
    UI.emer.style.display = 'flex';
    UI.alertTxt.textContent = "防護無線を受信しました。";
    speak("急停車します！ご注意ください！");
}

window.addEventListener('storage', (e) => {
    if(e.key === 'dispatch_cmd') {
        const d = JSON.parse(e.newValue);
        UI.emer.style.display = 'flex';
        UI.alertTxt.textContent = d.msg;
        speak("業務連絡。指令より入電。" + d.msg);
        setTimeout(() => { if(!d.msg.includes("停止")) UI.emer.style.display = 'none'; }, 7000);
    }
});

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