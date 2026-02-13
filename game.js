import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
// --- CONNECT AD ENGINE ---
import { runUniversalEngine } from "./adEngine.js";

const firebaseConfig = {
    apiKey: "AIzaSyC2n_sZjqOOr73o201vvJ0PaNDUFmwoesM",
    authDomain: "zick-11c5c.firebaseapp.com",
    projectId: "zick-11c5c",
    storageBucket: "zick-11c5c.firebasestorage.app",
    messagingSenderId: "777090785216",
    appId: "1:777090785216:web:a32686beda44caae0bb225"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;

onAuthStateChanged(auth, (user) => { if (user) currentUser = user; });

// Start Ad Engine for Game Page
runUniversalEngine(db, "gamepage");

// --- AD COUNTERS ---
let gameOverCount = 0;

// --- AD BANNER HELPER ---
function togglePauseAds(show) {
    const ads = document.querySelectorAll('.fixed-ad-container');
    ads.forEach(ad => {
        ad.style.display = show ? 'flex' : 'none';
    });
}

// --- ENHANCED HOURLY/30-MIN REWARD BUBBLE ---
window.triggerDailyBonus = async function() {
    const now = Date.now();
    const lastClaim = localStorage.getItem('lastBubbleClaim');
    const cooldown = 30 * 60 * 1000; // 30 Minutes

    if (lastClaim && (now - lastClaim < cooldown)) {
        const remaining = Math.ceil((cooldown - (now - lastClaim)) / 60000);
        alert(`Bubble is recharging! Try again in ${remaining} minutes. 🕒`);
        return;
    }

    if(confirm("💎 Bonus Bubble! Watch a video to claim 2,500 - 3,000 coins?")) {
        // --- TRIGGER REWARDED AD FROM ENGINE ---
        window.triggerRewarded('rewarded-ad-container', async () => {
            const bonusReward = Math.floor(Math.random() * (3000 - 2500 + 1)) + 2500;
            
            if (currentUser) {
                try {
                    const userRef = doc(db, "users", currentUser.uid);
                    await updateDoc(userRef, { balance: increment(bonusReward) });
                    localStorage.setItem('lastBubbleClaim', Date.now());
                    const bubble = document.getElementById('daily-bonus-bubble');
                    if(bubble) bubble.style.display = 'none';
                    alert(`💰 Awesome! You earned ${bonusReward.toLocaleString()} coins!`);
                } catch (err) { 
                    console.error("Firebase Error:", err);
                    alert("Database error. Check your connection.");
                }
            }
        });
    }
};

// --- CLOUD SYNC LOGIC ---
async function syncScoreToFirebase() {
    if (currentUser && score > 0) {
        const currentSessionScore = score;
        score = 0; // Prevent double syncing
        try {
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, { balance: increment(currentSessionScore) });
            console.log("Coins Synced!");
        } catch (err) { console.error("Sync Error:", err); }
    }
}

// Function to handle the Random Reward (1000 - 3000)
async function giveRandomSurpriseReward() {
    if (currentUser) {
        const randomReward = Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000;
        try {
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, { balance: increment(randomReward) });
            alert(`🎁 Amazing! You earned ${randomReward.toLocaleString()} bonus coins!`);
        } catch (err) { console.error("Reward Error:", err); }
    }
}

window.exitToHome = async function() {
    togglePauseAds(false);
    await syncScoreToFirebase();
    location.href = 'home.html';
};

window.restartGame = async function() {
    togglePauseAds(false);
    await syncScoreToFirebase();
    location.reload();
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const B_RADIUS = canvas.width / 16;
const COLORS = { red:'#FF4136', blue:'#0074D9', green:'#2ECC40', yellow:'#FFDC00', purple:'#B10DC9' };
const COLOR_KEYS = Object.keys(COLORS);
const ROWS = 24, COLS = 8, DANGER_Y = canvas.height - 120;

let grid = Array.from({length: ROWS}, () => Array(COLS).fill(null));
let shooter = { x: canvas.width/2, y: canvas.height-55, color: '', next: '' };
let activeBubble = { x: 0, y: 0, vx: 0, vy: 0, color: '', moving: false };
let particles = [], fallingBubbles = [], mouse = { x: canvas.width/2, y: 0 }; 
let isTouching = false, isPaused = false, score = 0, shotCount = 0;
let highScore = localStorage.getItem('zikeHighScore') || 0;

document.getElementById('highScoreVal').innerText = highScore;

function init() {
    grid = Array.from({length: ROWS}, () => Array(COLS).fill(null));
    for (let r = 0; r < 5; r++) for (let c = 0; c < COLS; c++) grid[r][c] = randomColor();
    shooter.color = randomColor(); shooter.next = randomColor();

    const lastClaim = localStorage.getItem('lastBubbleClaim');
    const cooldown = 30 * 60 * 1000;
    if (lastClaim && (Date.now() - lastClaim < cooldown)) {
        const bubble = document.getElementById('daily-bonus-bubble');
        if(bubble) bubble.style.display = 'none';
    }
}

function getBubblePos(r, c) {
    let offset = (r % 2 !== 0) ? B_RADIUS : 0;
    return { x: c * (B_RADIUS * 2) + B_RADIUS + offset, y: r * (B_RADIUS * 1.8) + B_RADIUS + 115 };
}

function drawCrystal(x, y, colorKey, r) {
    if(!colorKey) return;
    const color = COLORS[colorKey];
    let grad = ctx.createRadialGradient(x-r/3, y-r/3, r/10, x, y, r);
    grad.addColorStop(0, '#fff'); grad.addColorStop(0.5, color); grad.addColorStop(1, '#000');
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath(); ctx.strokeStyle = "rgba(255, 0, 0, 0.5)"; ctx.setLineDash([10, 5]);
    ctx.moveTo(0, DANGER_Y); ctx.lineTo(canvas.width, DANGER_Y); ctx.stroke(); ctx.setLineDash([]);

    if (isTouching && !activeBubble.moving && !isPaused) {
        let angle = Math.atan2(mouse.y - shooter.y, mouse.x - shooter.x);
        ctx.save(); ctx.beginPath(); ctx.setLineDash([8, 8]); ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.moveTo(shooter.x, shooter.y); ctx.lineTo(shooter.x + Math.cos(angle) * 1000, shooter.y + Math.sin(angle) * 1000);
        ctx.stroke(); ctx.restore();
    }

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c]) {
                let p = getBubblePos(r, c);
                drawCrystal(p.x, p.y, grid[r][c], B_RADIUS-2);
                if (p.y + B_RADIUS >= DANGER_Y) endGame();
            }
        }
    }

    particles.forEach((p, i) => { 
        p.x += p.vx; p.y += p.vy; p.alpha -= 0.03;
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill(); ctx.restore();
        if(p.alpha <= 0) particles.splice(i, 1);
    });

    fallingBubbles.forEach((f, i) => {
        f.y += f.vy; f.vy += 0.5;
        drawCrystal(f.x, f.y, f.color, B_RADIUS-2);
        if(f.y > canvas.height) fallingBubbles.splice(i, 1);
    });

    if (!isPaused) {
        if (activeBubble.moving) {
            activeBubble.x += activeBubble.vx; activeBubble.y += activeBubble.vy;
            if (activeBubble.x < B_RADIUS || activeBubble.x > canvas.width - B_RADIUS) activeBubble.vx *= -1;
            let hit = (activeBubble.y < 115);
            for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c]) {
                let p = getBubblePos(r, c); if (Math.hypot(p.x - activeBubble.x, p.y - activeBubble.y) < B_RADIUS * 1.4) hit = true;
            }
            if (hit) snapToGrid();
            drawCrystal(activeBubble.x, activeBubble.y, activeBubble.color, B_RADIUS-2);
        }
        drawCrystal(shooter.x, shooter.y, shooter.color, B_RADIUS-2);
        drawCrystal(shooter.x + 80, shooter.y, shooter.next, B_RADIUS-12);
    }
    requestAnimationFrame(update);
}

function snapToGrid() {
    let bestDist = Infinity, target = {r: 0, c: 0};
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!grid[r][c]) {
        let p = getBubblePos(r, c); let d = Math.hypot(p.x - activeBubble.x, p.y - activeBubble.y);
        if (d < bestDist) { bestDist = d; target = {r, c}; }
    }
    grid[target.r][target.c] = activeBubble.color;
    let cluster = findCluster(target.r, target.c, activeBubble.color);
    if (cluster.length >= 3) {
        cluster.forEach(b => {
            let p = getBubblePos(b.r, b.c);
            for(let i=0; i<8; i++) particles.push({x:p.x, y:p.y, color:COLORS[grid[b.r][b.c]], vx:(Math.random()-0.5)*10, vy:(Math.random()-0.5)*10, alpha:1});
            grid[b.r][b.c] = null;
            score += 10;
        });
        dropFloating();
    }
    shotCount++;
    if (shotCount % 3 === 0) {
        grid.unshift(new Array(COLS).fill(null).map(() => randomColor()));
        grid.pop();
        dropFloating();
    }
    activeBubble.moving = false; shooter.color = shooter.next; shooter.next = randomColor();
    updateScoreUI();
}

function findCluster(r, c, targetColor) {
    let cluster = [], queue = [{r, c}], visited = new Set([`${r},${c}`]);
    while (queue.length > 0) {
        let curr = queue.shift();
        if (grid[curr.r][curr.c] === targetColor) {
            cluster.push(curr);
            const dirs = (curr.r % 2 === 0) ? [[-1,-1], [-1,0], [0,-1], [0,1], [1,-1], [1,0]] : [[-1,0], [-1,1], [0,-1], [0,1], [1,0], [1,1]];
            dirs.forEach(([dr, dc]) => {
                let nr = curr.r + dr, nc = curr.c + dc;
                if (nr>=0 && nr<ROWS && nc>=0 && nc<COLS && !visited.has(`${nr},${nc}`) && grid[nr][nc] === targetColor) {
                    visited.add(`${nr},${nc}`); queue.push({r:nr, c:nc});
                }
            });
        }
    }
    return cluster;
}

function dropFloating() {
    let connected = new Set();
    let queue = [];
    for (let c = 0; c < COLS; c++) if (grid[0][c]) { connected.add(`0,${c}`); queue.push({r: 0, c: c}); }
    while (queue.length > 0) {
        let curr = queue.shift();
        const dirs = (curr.r % 2 === 0) ? [[-1,-1], [-1,0], [0,-1], [0,1], [1,-1], [1,0]] : [[-1,0], [-1,1], [0,-1], [0,1], [1,0], [1,1]];
        dirs.forEach(([dr, dc]) => {
            let nr = curr.r + dr, nc = curr.c + dc;
            if (nr>=0 && nr<ROWS && nc>=0 && nc<COLS && !connected.has(`${nr},${nc}`) && grid[nr][nc]) {
                connected.add(`${nr},${nc}`); queue.push({r:nr, c:nc});
            }
        });
    }
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] && !connected.has(`${r},${c}`)) {
                let p = getBubblePos(r, c);
                fallingBubbles.push({x:p.x, y:p.y, color:grid[r][c], vy:2});
                grid[r][c] = null;
                score += 10;
            }
        }
    }
}

function updateScoreUI() {
    if (score > highScore) { highScore = score; localStorage.setItem('zikeHighScore', highScore); }
    document.getElementById('scoreVal').innerText = score;
    document.getElementById('highScoreVal').innerText = highScore;
}

function endGame() {
    if (isPaused) return;
    isPaused = true;
    gameOverCount++;
    document.getElementById('finalScore').innerText = score;
    document.getElementById('gameOverMenu').style.display = 'flex';
    togglePauseAds(true); // Show banners on Game Over
    syncScoreToFirebase();

    // Trigger Interstitial from Ad Engine every 3 Game Overs
    if (gameOverCount % 3 === 0) {
        window.triggerInterstitial('interstitial-ad-container');
    }

    if (gameOverCount % 5 === 0) {
        setTimeout(() => {
            if(confirm("🎁 Special Surprise Gift! Watch a video to earn 1,000 - 3,000 bonus coins?")) {
                window.triggerRewarded('rewarded-ad-container', () => {
                    giveRandomSurpriseReward();
                });
            }
        }, 1000);
    }
}

function randomColor() { return COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)]; }

canvas.addEventListener('pointerdown', (e) => { 
    if (isPaused) return; 
    if (Math.hypot(e.clientX-(shooter.x+80), e.clientY-shooter.y) < B_RADIUS+20) {
        let t = shooter.color; shooter.color = shooter.next; shooter.next = t; 
        return;
    }
    isTouching = true; mouse.x = e.clientX; mouse.y = e.clientY; 
});
canvas.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('pointerup', (e) => {
    if (!isTouching || activeBubble.moving || isPaused) return; isTouching = false;
    let angle = Math.atan2(e.clientY - shooter.y, e.clientX - shooter.x);
    activeBubble = { x: shooter.x, y: shooter.y, vx: Math.cos(angle)*22, vy: Math.sin(angle)*22, color: shooter.color, moving: true };
});

document.getElementById('pauseBtn').onclick = () => { 
    isPaused = true; 
    document.getElementById('pauseMenu').style.display = 'flex'; 
    togglePauseAds(true); // SHOW BANNERS
};
document.getElementById('resumeBtn').onclick = () => { 
    isPaused = false; 
    document.getElementById('pauseMenu').style.display = 'none'; 
    togglePauseAds(false); // HIDE BANNERS
};

init(); 
update();
        
