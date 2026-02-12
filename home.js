import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

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

onAuthStateChanged(auth, (user) => {
    if (user) {
        startBalanceListener(user);
        // Start Ads once user is authenticated
        initializeAds();
    } else {
        window.location.href = "login.html";
    }
});

function startBalanceListener(user) {
    const userRef = doc(db, "users", user.uid);
    onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            const cloudBalance = data.balance || 0;
            document.getElementById('homeBalance').innerText = cloudBalance.toLocaleString();
            localStorage.setItem('zikeBalance', cloudBalance);
        } else {
            setDoc(userRef, { email: user.email, balance: 0, history: [] });
        }
    });
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm("Do you want to logout?")) {
        signOut(auth).then(() => {
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
});

// --- UPDATED AD FEATURES: FIXING TEXT-TO-AD CONVERSION ---

function initializeAds() {
    const adsRef = doc(db, "app_settings", "ads_inventory");
    const topSlot = document.getElementById('top-ad-slot');
    const bottomSlot = document.getElementById('bottom-ad-slot');
    const splashSlot = document.getElementById('splash-ad-slot');
    const splashOverlay = document.getElementById('splash-ad-container');

    if (splashOverlay) splashOverlay.style.display = 'none';

    onSnapshot(adsRef, (snap) => {
        if (!snap.exists()) return;
        const allAds = Object.values(snap.data());
        const activeHomeAds = allAds.filter(ad => ad.status === 'active' && ad.targetPage === 'homepage');

        if (topSlot) topSlot.innerHTML = "";
        if (bottomSlot) bottomSlot.innerHTML = "";

        activeHomeAds.forEach(ad => {
            const target = ad.type === "Header Banner" ? topSlot : bottomSlot;
            if (target) {
                injectAdUnit(target, ad.code);
            }
        });

        const splashAd = activeHomeAds.find(ad => ad.type === "Splash Ad") || activeHomeAds[0];
        if (splashAd && splashSlot && splashOverlay && splashOverlay.getAttribute('data-run') !== 'true') {
            splashOverlay.style.display = 'flex';
            splashOverlay.setAttribute('data-run', 'true');
            injectAdUnit(splashSlot, splashAd.code);
            handleSplashTimer(splashOverlay);
        }
    });
}

/**
 * Helper to ensure Ad Unit ID is converted to a real Ad instead of text
 */
function injectAdUnit(container, code) {
    container.innerHTML = ""; // Clear text
    const cleanCode = code.trim();

    if (cleanCode.includes('ca-app-pub')) {
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'inline-block';
        ins.style.width = '320px';
        ins.style.height = '50px';
        ins.setAttribute('data-ad-client', 'ca-app-pub-3940256099942544');
        ins.setAttribute('data-ad-slot', cleanCode);
        
        container.appendChild(ins);
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) { console.error(e); }
    } else {
        const range = document.createRange();
        const fragment = range.createContextualFragment(cleanCode);
        container.appendChild(fragment);
    }
}

function handleSplashTimer(overlay) {
    const timerText = document.getElementById('timer-seconds');
    let timeLeft = 5;

    const countdown = setInterval(() => {
        timeLeft--;
        if (timerText) timerText.innerText = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(countdown);
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500); 
        }
    }, 1000);
}
