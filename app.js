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
    clock: document.getElementById('clock'),
    // 💡 index.htmlの追加パーツ（QR用）を完全紐付け
    qrPopup: document.getElementById('qrPopup'),
    qrImg: document.getElementById('qrImg')
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

// 放送コントロール（全ボタン対応・QR一括自動生成強化）
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
        
        case 'delay': 
            // 💡 運行指令設定パネルから全項目をリアルタイム抽出し、スマホにそのまま投げる超拡張ロジック
            const infoStatus = document.getElementById('infoStatusSel')?.value || "delay";
            const delayMin = document.getElementById('delayMinInput')?.value || "15";
            const resumeTime = document.getElementById('resumeTimeSel')?.value || "未定";
            const delayReason = document.getElementById('delayReasonSel')?.value || "急病人救護活動";
            const delaySection = document.getElementById('delaySectionSel')?.value || "館浜〜赤山町";
            const customDetail = document.getElementById('customDetailInput')?.value || "";

            let speechTxt = "";
            let timeParam = delayMin;

            // コントロールパネルの選択状態に合わせて、タブレットが喋るお詫び放送の文章を分岐生成
            if (infoStatus === "delay") {
                speechTxt = `列車が遅れましてご迷惑をおかけしております。${delaySection}間は、${delayReason}の影響のため、現在約${delayMin}分遅れております。`;
                timeParam = delayMin;
                setTelop(`【運行情報】${delaySection}間は、${delayReason}のため遅れが出ています。`);
            } else if (infoStatus === "suspend") {
                speechTxt = `運転見合わせのご案内です。${delaySection}間は、${delayReason}のため、現在運転を見合わせております。運転再開は、${resumeTime}を見込んでおります。`;
                timeParam = resumeTime;
                setTelop(`【運行情報】見合わせ：${delaySection}間（${delayReason}）再開見込 ${resumeTime}`);
            } else if (infoStatus === "plan") {
                speechTxt = `運転休止のご案内です。${delaySection}間は、${delayReason}のため、運転を休止いたします。最新の情報にご注意ください。`;
                timeParam = "終日";
                setTelop(`【計画運休】終日休止：${delaySection}間（${delayReason}）`);
            }

            // 合成音声でお詫び案内を発生
            speak(speechTxt);

            // 💡 スマホのdelay.htmlへ全バリエーション状態を通知する暗号URL作成
            // 本番環境に合わせた絶対パス、またはGitHub Pages等のURL構造を動的に組み立て可能
            const baseUrl = window.location.href.replace('index.html', 'delay.html').split('?')[0];
            const targetUrl = `${baseUrl}?status=${infoStatus}&time=${encodeURIComponent(timeParam)}&reason=${encodeURIComponent(delayReason)}&sec=${encodeURIComponent(delaySection)}&detail=${encodeURIComponent(customDetail)}`;
            
            // 操作盤の画面中央にQRコードポップアップを表示
            if(UI.qrPopup && UI.qrImg) {
                UI.qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(targetUrl)}`;
                UI.qrPopup.style.display = 'block';
                
                // 25秒間表示し、スマホスキャンを終えた頃に自動的にフェードアウトして閉じる
                setTimeout(() => { UI.qrPopup.style.display = 'none'; }, 25000);
            }
            break;

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
