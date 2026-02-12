import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const firebaseConfig = { 
    apiKey: "AIzaSyC2n_sZjqOOr73o201vvJ0PaNDUFmwoesM",
    authDomain: "zick-11c5c.firebaseapp.com",
    projectId: "zick-11c5c",
    storageBucket: "zick-11c5c.firebasestorage.app",
    messagingSenderId: "777090785216",
    appId: "1:777090785216:web:a32686beda44caae0bb225"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const adsRef = doc(db, "app_settings", "ads_inventory");

// --- SIDEBAR UI LOGIC ---
const sidebar = document.getElementById('sidebar');
const openBtn = document.getElementById('openSidebar');
const closeBtn = document.getElementById('closeSidebar');

if (openBtn) openBtn.onclick = () => sidebar.classList.add('open');
if (closeBtn) closeBtn.onclick = () => sidebar.classList.remove('open');

// Close sidebar when clicking outside
document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !openBtn.contains(e.target)) {
        sidebar.classList.remove('open');
    }
});

// --- LOGOUT HANDLER ---
document.getElementById('logoutBtn').onclick = () => {
    if (confirm("Are you sure you want to terminate the admin session?")) {
        signOut(auth).then(() => {
            location.href = 'admin.html';
        });
    }
};

// --- AUTH WATCHER ---
onAuthStateChanged(auth, (user) => {
    const ADMIN_EMAIL = "hamimurr160@gmail.com";
    
    if (user && user.email === ADMIN_EMAIL) {
        console.log("Admin access confirmed for: " + user.email);
        
        // Update User Profile UI in Sidebar
        document.getElementById('adminEmail').innerText = user.email;
        document.getElementById('adminName').innerText = user.displayName || "Admin";
        document.getElementById('adminPhoto').src = user.photoURL || "https://ui-avatars.com/api/?name=Admin";
        
        initInventoryListener(); 
    } else {
        console.warn("Unauthorized access or not logged in.");
        document.getElementById('adList').innerHTML = '<tr><td colspan="6" style="text-align:center; padding:50px; color:#ff4d4d;">Please log in as Admin to manage ads.</td></tr>';
        
        // Redirect unauthorized users back to login
        if(user) {
            alert("Unauthorized Access.");
            signOut(auth);
        }
    }
});

// --- ADD NEW AD UNIT ---
window.addNewAd = async () => {
    const user = auth.currentUser;
    if (!user || user.email !== "hamimurr160@gmail.com") {
        alert("CRITICAL: You must be logged in as hamimurr160@gmail.com to deploy ads.");
        return;
    }

    const page = document.getElementById('adPage').value;
    const type = document.getElementById('adType').value;
    const network = document.getElementById('adNetwork').value;
    const code = document.getElementById('adCode').value;
    const id = "unit_" + Date.now();

    if(!code || !network) {
        alert("CRITICAL: Ad code and Network provider are required.");
        return;
    }

    try {
        await setDoc(adsRef, {
            [id]: {
                id: id,
                targetPage: page,
                type: type,
                network: network,
                code: code,
                status: 'active',
                createdAt: new Date().toISOString()
            }
        }, { merge: true });

        document.getElementById('adCode').value = "";
        alert("Success: Ad unit deployed to " + page);
    } catch (e) {
        console.error("Firebase Error:", e);
        alert("Deployment Failed: " + e.message);
    }
};

// --- REAL-TIME INVENTORY LISTENER ---
function initInventoryListener() {
    onSnapshot(adsRef, (snap) => {
        const listBody = document.getElementById('adList');
        if (!snap.exists()) {
            listBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:50px;">No ads deployed.</td></tr>';
            return;
        }

        const data = snap.data();
        let html = "";

        const rawUnits = Object.values(data).filter(item => 
            item !== null && 
            typeof item === 'object' && 
            item.targetPage !== undefined
        );

        if (rawUnits.length === 0) {
            listBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:50px;">No active ad units found.</td></tr>';
            return;
        }

        const sortedAds = rawUnits.sort((a, b) => a.targetPage.localeCompare(b.targetPage));

        sortedAds.forEach(ad => {
            const statusClass = ad.status === 'active' ? 'active-status' : 'inactive-status';
            
            html += `
                <tr>
                    <td><span class="page-badge">${ad.targetPage}</span></td>
                    <td><b style="color:#fff">${ad.type}</b></td>
                    <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <i class="fas fa-globe" style="color:var(--primary); font-size:12px;"></i>
                            <span>${ad.network}</span>
                        </div>
                    </td>
                    <td>
                        <div class="code-preview-box">
                            ${ad.code.replace(/</g, "&lt;")}
                        </div>
                    </td>
                    <td>
                        <span class="status-pill ${statusClass}">${ad.status}</span>
                    </td>
                    <td>
                        <div style="display:flex; gap:10px;">
                            <button class="action-icon" onclick="toggleAdStatus('${ad.id}', '${ad.status}')">
                                <i class="fas fa-power-off"></i>
                            </button>
                            <button class="action-icon delete-icon" onclick="deleteAdUnit('${ad.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        listBody.innerHTML = html;
    });
}

// --- TOGGLE STATUS ---
window.toggleAdStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
        await updateDoc(adsRef, {
            [`${id}.status`]: newStatus
        });
    } catch (e) {
        alert("Error updating status: " + e.message);
    }
};

// --- DELETE AD UNIT ---
window.deleteAdUnit = async (id) => {
    if (confirm("Are you sure? This will remove the ad from all user devices immediately.")) {
        try {
            await updateDoc(adsRef, {
                [id]: deleteField()
            });
        } catch (e) {
            alert("Error deleting ad: " + e.message);
        }
    }
};
