let player;
let loopEnabled = false;
let startTime = 0;
let endTime = 0;
let loopInterval;
// Unlimited breakpoints storage
let breakpoints = [];
let bpIdCounter = 1;
// Current video ID and metadata
let currentVideoId = '';
let savedVideos = {}; // { videoId: { title, breakpoints } }

// Initialize YouTube Player
function onYouTubeIframeAPIReady() {
    loadSavedVideosFromCookies();
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: '3vK19vG9u00', // Default jazz track (Miles Davis)
        playerVars: {
            'playsinline': 1,
            'modestbranding': 1,
            'rel': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    console.log("Player Ready");
    renderBreakpoints();
}

function onPlayerStateChange(event) {
    // When video starts playing (state 1), fetch and cache its title
    if (event.data === YT.PlayerState.PLAYING) {
        const videoData = player.getVideoData();
        if (videoData && videoData.video_id) {
            const videoId = videoData.video_id;
            if (!savedVideos[videoId]) {
                // Fetch video title from the API
                const title = player.getVideoTitle ? player.getVideoTitle() : 'Untitled';
                savedVideos[videoId] = { title: title || 'Untitled', breakpoints: [] };
                saveSavedVideosToCookies();
                updateVideoDropdown();
            }
        }
    }
}

function loadVideo() {
    const url = document.getElementById('videoUrl').value;
    const videoId = extractVideoId(url);
    if (videoId) {
        currentVideoId = videoId;
        player.loadVideoById(videoId);
        resetMarkers();
        // Fetch title and cache this video
        setTimeout(() => {
            const title = player.getVideoTitle ? player.getVideoTitle() : 'Untitled';
            if (!savedVideos[videoId]) {
                savedVideos[videoId] = { title: title || 'Untitled', breakpoints: [] };
            } else {
                savedVideos[videoId].title = title || savedVideos[videoId].title;
            }
            saveSavedVideosToCookies();
            updateVideoDropdown();
        }, 500);
    }
}

function loadSavedVideo() {
    const select = document.getElementById('videoSelect');
    const videoId = select.value;
    if (videoId && savedVideos[videoId]) {
        currentVideoId = videoId;
        player.loadVideoById(videoId);
        document.getElementById('videoUrl').value = 'https://www.youtube.com/watch?v=' + videoId;
        resetMarkers();
        // Load saved breakpoints
        const saved = savedVideos[videoId];
        breakpoints = saved.breakpoints.map(bp => ({ ...bp })); // Deep copy
        bpIdCounter = Math.max(...breakpoints.map(bp => parseInt(bp.id.split('_')[1]) || 0)) + 1;
        renderBreakpoints();
    }
}

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// --- Breakpoints functions ---
function addBreakpoint() {
    const time = (player && player.getCurrentTime) ? player.getCurrentTime() : 0;
    const id = 'bp_' + bpIdCounter++;
    breakpoints.push({ id, name: `BP ${bpIdCounter-1}`, time });
    saveCurrentVideoData();
    renderBreakpoints();
}

function saveCurrentVideoData() {
    if (currentVideoId && savedVideos[currentVideoId]) {
        savedVideos[currentVideoId].breakpoints = breakpoints;
        saveSavedVideosToCookies();
    }
}

function loadSavedVideosFromCookies() {
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('savedVideos='));
    if (cookie) {
        try {
            const encoded = cookie.split('=')[1];
            savedVideos = JSON.parse(decodeURIComponent(encoded));
        } catch (e) {
            console.error('Error parsing saved videos cookie:', e);
            savedVideos = {};
        }
    }
    updateVideoDropdown();
}

function saveSavedVideosToCookies() {
    const encoded = encodeURIComponent(JSON.stringify(savedVideos));
    const expiresDate = new Date();
    expiresDate.setFullYear(expiresDate.getFullYear() + 1);
    document.cookie = `savedVideos=${encoded}; expires=${expiresDate.toUTCString()}; path=/`;
}

function updateVideoDropdown() {
    const list = document.getElementById('recentlyPlayedList');
    const empty = document.getElementById('recentlyPlayedEmpty');
    const ids = Object.keys(savedVideos);
    
    if (ids.length === 0) {
        list.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    
    list.style.display = 'grid';
    empty.style.display = 'none';
    list.innerHTML = '';
    
    ids.forEach(videoId => {
        const btn = document.createElement('button');
        btn.className = 'bg-slate-700 hover:bg-slate-600 p-3 rounded-lg text-left';
        btn.innerHTML = `<div class="font-mono text-sm text-emerald-400">${videoId}</div><div class="text-slate-300 truncate">${savedVideos[videoId].title || 'Untitled'}</div>`;\n        btn.onclick = () => {\n            currentVideoId = videoId;\n            player.loadVideoById(videoId);\n            document.getElementById('videoUrl').value = 'https://www.youtube.com/watch?v=' + videoId;\n            resetMarkers();\n            const saved = savedVideos[videoId];\n            breakpoints = saved.breakpoints.map(bp => ({ ...bp }));\n            bpIdCounter = Math.max(...breakpoints.map(bp => parseInt(bp.id.split('_')[1]) || 0)) + 1;\n            renderBreakpoints();\n        };\n        list.appendChild(btn);\n    });\n}

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
}

function setBreakpointTime(id) {
    const bp = breakpoints.find(b => b.id === id);
    if (!bp) return;
    bp.time = (player && player.getCurrentTime) ? player.getCurrentTime() : 0;
    saveCurrentVideoData();
    renderBreakpoints();
}

function jumpToBreakpoint(id) {
    const bp = breakpoints.find(b => b.id === id);
    if (!bp || !player) return;
    player.seekTo(bp.time);
}

function deleteBreakpoint(id) {
    breakpoints = breakpoints.filter(b => b.id !== id);
    saveCurrentVideoData();
    renderBreakpoints();
}

function renameBreakpoint(id) {
    const bp = breakpoints.find(b => b.id === id);
    if (!bp) return;
    const newName = prompt('Rename breakpoint', bp.name);
    if (newName === null) return;
    bp.name = newName.trim() || bp.name;
    saveCurrentVideoData();
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
