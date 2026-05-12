let player;
let loopEnabled = false;
let startTime = 0;
let endTime = 0;
let loopInterval;
// Unlimited breakpoints storage
let breakpoints = [];
let bpIdCounter = 1;

function getNextBreakpointNumber() {
    const usedNumbers = new Set(breakpoints.map(bp => bp.number));
    let number = 1;
    while (usedNumbers.has(number)) {
        number++;
    }
    return number;
}

// Initialize YouTube Player
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        playerVars: {
            'playsinline': 1,
            'modestbranding': 1,
            'rel': 0
        },
        events: {
            'onReady': onPlayerReady
        }
    });
}

function onPlayerReady(event) {
    console.log("Player Ready");
    renderBreakpoints();
    const url = document.getElementById('videoUrl').value.trim();
    if (url) {
        hidePlayerPlaceholder();
    } else {
        showPlayerPlaceholder();
    }
}

function showPlayerPlaceholder() {
    const placeholder = document.getElementById('playerPlaceholder');
    if (placeholder) {
        placeholder.style.display = 'flex';
    }
}

function hidePlayerPlaceholder() {
    const placeholder = document.getElementById('playerPlaceholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
}

function loadVideo() {
    const url = document.getElementById('videoUrl').value;
    const videoId = extractVideoId(url);
    if (videoId) {
        player.loadVideoById(videoId);
        hidePlayerPlaceholder();
        resetMarkers();
    } else {
        alert('Please enter a valid YouTube link.');
        showPlayerPlaceholder();
    }
}

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function base64EncodeUnicode(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
}

function base64DecodeUnicode(str) {
    const binary = atob(str);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

function generateEncoding() {
    const videoUrlInput = document.getElementById('videoUrl');
    const videoUrl = videoUrlInput ? videoUrlInput.value.trim() || (player && player.getVideoUrl ? player.getVideoUrl() : '') : '';
    const state = {
        version: 1,
        videoUrl,
        startTime,
        endTime,
        breakpoints: breakpoints.map(bp => ({ number: bp.number, name: bp.name, time: bp.time }))
    };

    const payload = JSON.stringify(state);
    const encoded = base64EncodeUnicode(payload);
    return `ytt:${encoded}`;
}

function decode(encodedString) {
    if (typeof encodedString !== 'string') {
        alert('Invalid state string');
        return;
    }

    if (encodedString.startsWith('ytt:')) {
        encodedString = encodedString.slice(4);
    }

    let decoded;
    try {
        decoded = base64DecodeUnicode(encodedString);
    } catch (error) {
        alert('Failed to decode state string.');
        return;
    }

    let state;
    try {
        state = JSON.parse(decoded);
    } catch (error) {
        alert('Invalid state file format.');
        return;
    }

    if (state.videoUrl) {
        const videoUrlInput = document.getElementById('videoUrl');
        if (videoUrlInput) {
            videoUrlInput.value = state.videoUrl;
        }
        loadVideo();
    }

    breakpoints = [];
    bpIdCounter = 1;
    if (Array.isArray(state.breakpoints)) {
        state.breakpoints.forEach(bp => {
            const id = 'bp_' + bpIdCounter++;
            const number = typeof bp.number === 'number' ? bp.number : getNextBreakpointNumber();
            breakpoints.push({
                id,
                number,
                name: bp.name || `BP ${number}`,
                time: typeof bp.time === 'number' ? bp.time : 0
            });
        });
    }

    if (breakpoints.length > 0) {
        const maxNumber = Math.max(...breakpoints.map(bp => bp.number));
        bpIdCounter = Math.max(bpIdCounter, maxNumber + 1);
    }

    startTime = typeof state.startTime === 'number' ? state.startTime : 0;
    endTime = typeof state.endTime === 'number' ? state.endTime : 0;
    document.getElementById('startDisplay').innerText = formatTime(startTime);
    document.getElementById('endDisplay').innerText = formatTime(endTime);
    renderBreakpoints();
}

function promptLoadState() {
    const input = document.getElementById('stateFileInput');
    if (!input) return;
    input.value = '';
    input.click();
}

function handleStateFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        decode(reader.result);
    };
    reader.readAsText(file);
}

function saveStateToFile() {
    const encoded = generateEncoding();
    const defaultName = 'session.ytt';
    const fileName = prompt('Save state as', defaultName);
    if (!fileName) return;

    const blob = new Blob([encoded], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName.endsWith('.ytt') ? fileName : `${fileName}.ytt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

function skipTime(seconds) {
    if (!player) return;
    const currentTime = player.getCurrentTime();
    player.seekTo(currentTime + seconds);
}

function togglePlayPause() {
    if (!player) return;
    const btn = document.getElementById('playPauseBtn');
    if (player.getPlayerState() === 1) { // Playing
        player.pauseVideo();
        btn.innerText = '▶';
    } else {
        player.playVideo();
        btn.innerText = '⏸';
    }
}

// --- Breakpoints functions ---
function addBreakpoint() {
    const time = (player && player.getCurrentTime) ? player.getCurrentTime() : 0;
    const number = getNextBreakpointNumber();
    const id = 'bp_' + bpIdCounter++;
    breakpoints.push({ id, number, name: `BP ${number}`, time });
    renderBreakpoints();
}

function renderBreakpoints() {
    const container = document.getElementById('breakpointsList');
    if (!container) return;
    container.innerHTML = '';
    breakpoints.forEach(bp => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center justify-between bg-slate-700 p-2 rounded-lg';

        const left = document.createElement('div');
        left.className = 'font-mono text-sm';
        left.innerText = `${bp.name} — ${formatTime(bp.time)}`;

        const actions = document.createElement('div');
        actions.className = 'flex gap-2';

        const setBtn = document.createElement('button');
        setBtn.className = 'px-2 py-1 bg-slate-700 rounded hover:bg-slate-600';
        setBtn.innerText = 'Set';
        setBtn.onclick = () => { setBreakpointTime(bp.id); };

        const jumpBtn = document.createElement('button');
        jumpBtn.className = 'px-2 py-1 bg-slate-700 rounded hover:bg-slate-600';
        jumpBtn.innerText = 'Jump';
        jumpBtn.onclick = () => { jumpToBreakpoint(bp.id); };

        const renameBtn = document.createElement('button');
        renameBtn.className = 'px-2 py-1 bg-slate-700 rounded hover:bg-slate-600';
        renameBtn.innerText = 'Rename';
        renameBtn.onclick = () => { renameBreakpoint(bp.id); };

        const delBtn = document.createElement('button');
        delBtn.className = 'px-2 py-1 bg-rose-600 rounded text-white hover:bg-slate-600';
        delBtn.innerText = 'Delete';
        delBtn.onclick = () => { deleteBreakpoint(bp.id); };

        actions.appendChild(setBtn);
        actions.appendChild(jumpBtn);
        actions.appendChild(renameBtn);
        actions.appendChild(delBtn);

        wrapper.appendChild(left);
        wrapper.appendChild(actions);
        container.appendChild(wrapper);
    });

    if (container.lastElementChild) {
        container.lastElementChild.scrollIntoView({ behavior: 'auto', block: 'end' });
    } else {
        container.scrollTop = container.scrollHeight;
    }
}

function setBreakpointTime(id) {
    const bp = breakpoints.find(b => b.id === id);
    if (!bp) return;
    bp.time = (player && player.getCurrentTime) ? player.getCurrentTime() : 0;
    renderBreakpoints();
}

function jumpToBreakpoint(id) {
    const bp = breakpoints.find(b => b.id === id);
    if (!bp || !player) return;
    player.seekTo(bp.time);
}

function deleteBreakpoint(id) {
    breakpoints = breakpoints.filter(b => b.id !== id);
    renderBreakpoints();
}

function renameBreakpoint(id) {
    const bp = breakpoints.find(b => b.id === id);
    if (!bp) return;
    const newName = prompt('Rename breakpoint', bp.name);
    if (newName === null) return;
    bp.name = newName.trim() || bp.name;
    renderBreakpoints();
}

// --- A/B helpers (always present) ---
function setStart() {
    startTime = player.getCurrentTime();
    document.getElementById('startDisplay').innerText = formatTime(startTime);
}

function setEnd() {
    endTime = player.getCurrentTime();
    document.getElementById('endDisplay').innerText = formatTime(endTime);
}

function jumpA() {
    if (!player) return;
    player.seekTo(startTime || 0);
}

function jumpB() {
    if (!player) return;
    player.seekTo(endTime || 0);
}

function clearA() {
    startTime = 0;
    document.getElementById('startDisplay').innerText = formatTime(startTime);
}

function clearB() {
    endTime = 0;
    document.getElementById('endDisplay').innerText = formatTime(endTime);
}

function toggleLoop() {
    loopEnabled = !loopEnabled;
    const btn = document.getElementById('loopToggle');
    
    if (loopEnabled) {
        btn.innerText = "LOOP ACTIVE";
        btn.classList.add('bg-emerald-500', 'text-white');
        startLoopCheck();
    } else {
        btn.innerText = "ENABLE LOOP";
        btn.classList.remove('bg-emerald-500', 'text-white');
        clearInterval(loopInterval);
    }
}

function startLoopCheck() {
    clearInterval(loopInterval);
    loopInterval = setInterval(() => {
        if (loopEnabled && endTime > startTime) {
            let currentTime = player.getCurrentTime();
            if (currentTime >= endTime || currentTime < startTime) {
                player.seekTo(startTime);
            }
        }
    }, 100);
}

function setSpeed(rate) {
    if (!player || !player.setPlaybackRate) return;
    player.setPlaybackRate(rate);
    // Visual feedback for buttons
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.classList.remove('bg-emerald-600', 'font-bold');
        btn.classList.add('bg-slate-700');
        if(parseFloat(btn.innerText) === rate || (rate === 1 && btn.innerText === 'Normal')) {
            btn.classList.add('bg-emerald-600', 'font-bold');
            btn.classList.remove('bg-slate-700');
        }
    });
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function resetMarkers() {
    startTime = 0;
    endTime = 0;
    document.getElementById('startDisplay').innerText = "0:00";
    document.getElementById('endDisplay').innerText = "0:00";
}