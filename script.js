let player;
let loopEnabled = false;
let startTime = 0;
let endTime = 0;
let loopInterval;

// Initialize YouTube Player
function onYouTubeIframeAPIReady() {
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
            'onReady': onPlayerReady
        }
    });
}

function onPlayerReady(event) {
    console.log("Player Ready");
}

function loadVideo() {
    const url = document.getElementById('videoUrl').value;
    const videoId = extractVideoId(url);
    if (videoId) {
        player.loadVideoById(videoId);
        resetMarkers();
    }
}

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function setStart() {
    startTime = player.getCurrentTime();
    document.getElementById('startDisplay').innerText = formatTime(startTime);
}

function setEnd() {
    endTime = player.getCurrentTime();
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
