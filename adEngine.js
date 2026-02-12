import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

/**
 * UNIVERSAL AD ENGINE
 * Handles Banners, Splash, Interstitial and Rewards for any page.
 */
export function runUniversalEngine(db, pageKey) {
    const adsRef = doc(db, "app_settings", "ads_inventory");
    const topSlot = document.getElementById('top-ad-slot');
    const bottomSlot = document.getElementById('bottom-ad-slot');
    const splashSlot = document.getElementById('splash-ad-slot');
    const splashOverlay = document.getElementById('splash-ad-container');

    // 1. Hide splash immediately in case it's in the HTML
    if (splashOverlay) {
        splashOverlay.style.display = 'none';
        splashOverlay.style.opacity = '1'; 
    }

    onSnapshot(adsRef, (snap) => {
        if (!snap.exists()) return;
        
        const data = snap.data();
        const allAds = Object.values(data);
        
        // Filter ads for THIS specific page that are ACTIVE
        const activePageAds = allAds.filter(ad => ad.status === 'active' && ad.targetPage === pageKey);

        // 2. Handle Banners (Header & Footer)
        if (topSlot) topSlot.innerHTML = "";
        if (bottomSlot) bottomSlot.innerHTML = "";

        activePageAds.forEach(ad => {
            if (ad.type === "Header Banner" && topSlot) {
                injectCode(topSlot, ad.code);
            } else if (ad.type === "Footer Banner" && bottomSlot) {
                injectCode(bottomSlot, ad.code);
            }
        });

        // 3. Handle Splash Ads
        const splashAd = activePageAds.find(ad => ad.type === "Splash Ad"); 
        if (splashAd && splashSlot && splashOverlay && splashOverlay.getAttribute('data-run') !== 'true') {
            splashOverlay.style.display = 'flex';
            splashOverlay.setAttribute('data-run', 'true');
            splashSlot.innerHTML = ""; 
            injectCode(splashSlot, splashAd.code);
            startSplashTimer(splashOverlay);
        }

        // 4. Expose Interstitial and Rewarded for Game Logic
        const interstitialAd = activePageAds.find(ad => ad.type === "Interstitial Ad");
        const rewardedAd = activePageAds.find(ad => ad.type === "Rewarded Ad");

        // Save to window so game.js can call them
        window.currentInterstitialCode = interstitialAd ? interstitialAd.code : null;
        window.currentRewardedCode = rewardedAd ? rewardedAd.code : null;
    });
}

/**
 * THE INJECTOR
 * This part takes that text ID and turns it into a visual Ad.
 */
function injectCode(container, code) {
    // Stop the text from appearing by clearing the box first
    container.innerHTML = ""; 

    if (!code) return;
    const cleanId = code.trim();

    // If it's your AdMob ID, create the proper Google tag
    if (cleanId.toLowerCase().startsWith('ca-app-pub')) {
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.style.width = '320px';
        ins.style.height = '50px';
        ins.style.margin = 'auto';
        
        // Use the Global Test Client
        ins.setAttribute('data-ad-client', 'ca-app-pub-3940256099942544'); 
        ins.setAttribute('data-ad-slot', cleanId);

        container.appendChild(ins);
        
        try {
            // Tell Google to fill the box with the ad
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error("Google AdMob library not ready.");
        }
    } else {
        // Fallback for other HTML code
        const range = document.createRange();
        const fragment = range.createContextualFragment(cleanId);
        container.appendChild(fragment);
    }
}

function startSplashTimer(overlay) {
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

/**
 * Global triggers
 */
window.triggerInterstitial = function(containerId) {
    const container = document.getElementById(containerId);
    if (container && window.currentInterstitialCode) {
        container.style.display = 'flex';
        injectCode(container, window.currentInterstitialCode);
    }
};

window.triggerRewarded = function(containerId, successCallback) {
    if (!window.currentRewardedCode) {
        alert("Ads are not ready.");
        return;
    }
    const container = document.getElementById(containerId);
    if (container) {
        container.style.display = 'flex';
        injectCode(container, window.currentRewardedCode);
        setTimeout(() => { successCallback(); }, 2000); 
    }
}
