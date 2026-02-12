import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

/**
 * Main Ad Engine for Zick Bubble
 * Listens to Firebase app_settings/ads_inventory and renders ads dynamically.
 */
export function initializeAdEngine(db) {
    const adsRef = doc(db, "app_settings", "ads_inventory");
    
    // Targeted containers in your home.html/game.html
    const topSlot = document.getElementById('top-ad-slot');
    const bottomSlot = document.getElementById('bottom-ad-slot');
    const splashSlot = document.getElementById('splash-ad-slot');
    const splashOverlay = document.getElementById('splash-ad-container');

    onSnapshot(adsRef, (snap) => {
        if (!snap.exists()) {
            console.warn("Ad configuration not found in Firestore.");
            return;
        }

        const adData = snap.data();
        const adsArray = Object.values(adData);

        // Clear existing banners to prevent stacking
        if (topSlot) topSlot.innerHTML = "";
        if (bottomSlot) bottomSlot.innerHTML = "";

        adsArray.forEach(ad => {
            if (ad.status === 'active') {
                // Route to correct slot based on type
                let targetContainer = null;
                if (ad.type === 'Header Banner') targetContainer = topSlot;
                else if (ad.type === 'Footer Banner') targetContainer = bottomSlot;
                else if (ad.type === 'Splash Ad') targetContainer = splashSlot;

                if (targetContainer) {
                    renderAdLogic(targetContainer, ad.code, ad.provider);
                }
            }
        });

        // Handle Splash Ad Overlay visibility
        const splashAdActive = adsArray.find(ad => ad.type === "Splash Ad" && ad.status === 'active');
        if (splashAdActive && splashOverlay && splashOverlay.getAttribute('data-run') !== 'true') {
            splashOverlay.style.display = 'flex';
            splashOverlay.setAttribute('data-run', 'true');
            // Timer logic for splash auto-close
            startSplashTimer(splashOverlay);
        }
    });
}

/**
 * Renders the specific ad logic based on the provider
 */
function renderAdLogic(container, code, provider) {
    const cleanCode = code.trim();

    // 1. ADMOB LOGIC (If it's an ID or provider is set to admob)
    if (provider === 'admob' || cleanCode.includes('ca-app-pub')) {
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.style.width = '320px';
        ins.style.height = '50px';
        // Your Publisher ID
        ins.setAttribute('data-ad-client', 'ca-app-pub-3940256099942544'); 
        ins.setAttribute('data-ad-slot', cleanCode);
        ins.setAttribute('data-ad-format', 'auto');
        ins.setAttribute('data-full-width-responsive', 'true');
        
        container.appendChild(ins);

        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdMob Push Error:", e);
        }
    } 
    // 2. UNITY / ADSTERRA / CUSTOM HTML LOGIC
    else {
        // This method executes scripts inside the HTML strings safely
        const range = document.createRange();
        const fragment = range.createContextualFragment(cleanCode);
        container.appendChild(fragment);
    }
}

/**
 * Handles the 5-second countdown for Splash ads
 */
function startSplashTimer(overlay) {
    const timerText = document.getElementById('timer-seconds');
    let timeLeft = 5;

    const interval = setInterval(() => {
        timeLeft--;
        if (timerText) timerText.innerText = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(interval);
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
        }
    }, 1000);
}
