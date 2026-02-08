let player;
let loopEnabled = false;
let loopInterval;
let currentVideoId = null;

let breakpoints = {
    A: null,
    B: null,
    custom: []
};

// =====================
// YouTube
// =====================
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        videoId: '3vK19vG9u00',
        playerVars: { playsinline: 1, rel: 0 },
        events: { onReady: () => {} }
    });
}

function loadVideo() {
    const url = document.getElementById('videoUrl').value;
    const id = extractVideoId(url);
    if (!id) return;

    currentVideoId = id;
    player.loadVideoById(id);
    loadState();
    renderBreakpoints();
}

// =====================
// A / B
// =====================
function setAB(label) {
    breakpoints[label] = player.getCurrentTime();
    updateABDisplays();
    saveState();
}

function jumpToAB(label) {
    if (breakpoints[label] != null) {
        player.seekTo(breakpoints[label]);
    }
}

function clearAB(label) {
    breakpoints[label] = null;
    updateABDisplays();
    saveState();
}

function updateABDisplays() {
    document.getElementById('startDisplay').innerText =
        breakpoints.A != null ? formatTime(breakpoints.A) : '0:00';
    document.getElementById('endDisplay').innerText =
        breakpoints.B != null ? formatTime(breakpoints.B) : '0:00';
}

// =====================
// Loop
// =====================
function toggleLoop() {
    loopEnabled = !loopEnabled;
    const btn = document.getElementById('loopToggle');

    if (loopEnabled) {
        btn.innerText = 'LOOP ACTIVE';
        btn.classList.add('bg-emerald-500', 'text-white');
        startLoop();
    } else {
        btn.innerText = 'ENABLE LOOP';
        btn.classList.remove('bg-emerald-500', 'text-white');
        clearInterval(loopInterval);
    }
}

function startLoop() {
    clearInterval(loopInterval);
    loopInterval = setInterval(() => {
        if (!loopEnabled || breakpoints.A == null || breakpoints.B == null) return;

        const t = player.getCurrentTime();
        if (t >= breakpoints.B || t < breakpoints.A) {
            player.seekTo(breakpoints.A);
        }
    }, 100);
}

// =====================
// Custom Breakpoints
// =====================
function addBreakpoint() {
    const bp = {
        id: crypto.randomUUID(),
        time: player.getCurrentTime(),
        name: 'New Breakpoint'
    };
    breakpoints.custom.push(bp);
    saveState();
    renderBreakpoints();
}

function jumpToCustom(id) {
    const bp = breakpoints.custom.find(b => b.id === id);
    if (bp) player.seekTo(bp.time);
}

function renameBreakpoint(id, input) {
    const bp = breakpoints.custom.find(b => b.id === id);
    if (bp) {
        bp.name = input.value;
        saveState();
    }
}

function renderBreakpoints() {
    const list = document.getElementById('breakpointList');
    list.innerHTML = '';

    breakpoints.custom.forEach(bp => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 bg-slate-700 p-2 rounded-lg';

        row.innerHTML = `
            <input class="flex-1 bg-slate-800 px-2 py-1 rounded"
                   value="${bp.name}"
                   onchange="renameBreakpoint('${bp.id}', this)">
            <div class="font-mono text-sm">${formatTime(bp.time)}</div>
            <button class="bg-slate-600 px-3 py-1 rounded"
                    onclick="jumpToCustom('${bp.id}')">Jump</button>
        `;
        list.appendChild(row);
    });
}

// =====================
// Persistence (cookies)
// =====================
function saveState() {
    if (!currentVideoId) return;
    document.cookie = `jazzTranscriber::${currentVideoId}=${encodeURIComponent(JSON.stringify(breakpoints))};path=/;max-age=31536000`;
}

function loadState() {
    const key = `jazzTranscriber::${currentVideoId}=`;
    const cookie = document.cookie.split('; ').find(c => c.startsWith(key));
    if (cookie) {
        breakpoints = JSON.parse(decodeURIComponent(cookie.split('=')[1]));
    } else {
        breakpoints = { A: null, B: null, custom: [] };
    }
    updateABDisplays();
}

// =====================
// Utils
// =====================
function extractVideoId(url) {
    const m = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : null;
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}
