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
    bootBtn: document.getElementById('bootBtn'),
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

// 音声エンジン初期化
function loadVoices() {
    voices = window.speechSynthesis.getVoices();
}
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}

// 起動シーケンス
UI.bootBtn.onclick = () => {
    UI.boot.style.opacity = '0';
    UI.boot.style.transition = 'opacity 0.8s ease';
    setTimeout(() => {
        UI.boot.style.display = 'none';
        speak("システムオンライン。本日も安全運転をお願いいたします。");
    }, 800);
};

// 音声合成（日本語 -> 英語）
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

// 表示更新ロジック
function update() {
    const route = UI.dirSel.value === 'up' ? [...stations].reverse() : [...stations];
    const type = UI.typeSel.value;
    const curIdx = parseInt(UI.curStSel.value);

    // 種別バッジ
    UI.typeBadge.textContent = meta[type].n;
    UI.typeBadge.style.backgroundColor = meta[type].c;
    UI.typeBadge.style.color = meta[type].tc || "#fff";
    
    // 行先
    UI.destDisp.textContent = route[route.length - 1].name;

    // 次駅・停車駅判定
    const next = route.slice(curIdx + 1).find(s => (['school', 'trial', 'extra'].includes(type) ? true : s[type]));
    
    if(next) {
        UI.lcdName.textContent = next.name;
        UI.lcdEn.textContent = next.en;
        // 修学旅行時の自動テロップ
        if(type === 'school') {
            setTelop(`【修学旅行】次は ${next.name} です。思い出に残る楽しい旅を！`);
        }
    } else {
        UI.lcdName.textContent = "終点"; 
        UI.lcdEn.textContent = "TERMINAL";
    }

    // 路線図ドット更新
    UI.routeMap.innerHTML = '';
    route.forEach((st, i) => {
        const d = document.createElement('div');
        const isStop = (['school', 'trial', 'extra'].includes(type) ? true : st[type]);
        d.className = 'dot' + (isStop ? ' stop' : '') + (i === curIdx ? ' active' : '');
        UI.routeMap.appendChild(d);
    });
}

// 放送コントロール（全ボタン対応）
function playAnn(mode) {
    const route = UI.dirSel.value === 'up' ? [...stations].reverse() : [...stations];
    const type = UI.typeSel.value;
    const curIdx = parseInt(UI.curStSel.value);
    const next = route.slice(curIdx + 1).find(s => (['school', 'trial', 'extra'].includes(type) ? true : s[type]));

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
        case 'wait': speak("この駅で、電車の待ち合わせをいたします。発車までしばらくお待ちください。"); break;
        case 'manner': speak("車内では、携帯電話をマナーモードに設定のうえ、通話はご遠慮ください。ご協力をお願いします。"); break;
        case 'delay': speak("列車が遅れまして、ご迷惑をおかけしております。"); break;
        case 'school_greet':
            speak("本日は修学旅行でのご利用、誠にありがとうございます。思い出に残る楽しい旅となりますよう、乗務員一同お手伝いさせていただきます。");
            setTelop("✨ WELCOME ✨ 楽しい修学旅行の思い出を！");
            break;
        case 'accident':
            speak("現在、前を走る電車に急病人が発生したため、一時停車しております。運転再開までしばらくお待ちください。");
            setTelop("【運行情報】急病人対応のため、一時停車中。");
            break;
    }
}

// ユーティリティ
function toggleSide() {
    doorSide = (doorSide === "左") ? "右" : "左";
    UI.sideBtn.textContent = `出口：${doorSide}`;
}

function toggleMelody() {
    if(UI.mel.paused) { UI.mel.play(); document.getElementById('melBtn').classList.add('active'); }
    else { UI.mel.pause(); UI.mel.currentTime = 0; document.getElementById('melBtn').classList.remove('active'); }
}

function toggleNight() { document.body.classList.toggle('night-mode'); }

function setTelop(t) { UI.telop.textContent = t; }

function emergency() {
    UI.emer.style.display = 'flex';
    UI.alertTxt.textContent = "防護無線を受信しました。急停車します。";
    speak("急停車します！ご注意ください！");
}

// 指令コマンド受信
window.addEventListener('storage', (e) => {
    if(e.key === 'dispatch_cmd') {
        const d = JSON.parse(e.newValue);
        UI.emer.style.display = 'flex';
        UI.alertTxt.textContent = d.msg;
        speak("業務連絡。指令より入電。" + d.msg);
        setTimeout(() => { if(!d.msg.includes("停止")) UI.emer.style.display = 'none'; }, 7000);
    }
});

// セレクター連携
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

// 1秒ごとに時計更新
setInterval(() => { UI.clock.textContent = new Date().toLocaleTimeString(); }, 1000);

// 初期化実行
UI.dirSel.onchange();
