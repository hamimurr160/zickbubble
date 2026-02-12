import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, increment, orderBy } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// --- FIREBASE CONFIGURATION ---
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
const provider = new GoogleAuthProvider();

// --- SETTINGS ---
const ADMIN_EMAIL = "hamimurr160@gmail.com";
let currentView = "Pending";
let allData = []; 

// --- SIDEBAR UI LOGIC ---
const sidebar = document.getElementById('sidebar');
const openBtn = document.getElementById('openSidebar');
const closeBtn = document.getElementById('closeSidebar');

if (openBtn) openBtn.onclick = () => sidebar.classList.add('open');
if (closeBtn) closeBtn.onclick = () => sidebar.classList.remove('open');

document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !openBtn.contains(e.target)) {
        sidebar.classList.remove('open');
    }
});

// --- AUTHENTICATION HANDLERS ---
document.getElementById('loginBtn').onclick = () => {
    signInWithPopup(auth, provider).catch(err => alert("Login Error: " + err.message));
};

document.getElementById('logoutBtn').onclick = () => {
    if (confirm("Are you sure you want to terminate the admin session?")) {
        signOut(auth);
    }
};

onAuthStateChanged(auth, (user) => {
    const loginOverlay = document.getElementById('loginOverlay');
    const adminContent = document.getElementById('adminContent');

    if (user && user.email === ADMIN_EMAIL) {
        loginOverlay.style.display = 'none';
        adminContent.style.display = 'block';
        
        document.getElementById('adminEmail').innerText = user.email;
        document.getElementById('adminName').innerText = user.displayName || "Admin";
        document.getElementById('adminPhoto').src = user.photoURL || "https://ui-avatars.com/api/?name=Admin";
        
        loadData();
    } else if (user) {
        alert("Unauthorized Access.");
        signOut(auth);
    } else {
        loginOverlay.style.display = 'flex';
        adminContent.style.display = 'none';
    }
});

// --- DATA LISTENER ---
function loadData() {
    const q = query(collection(db, "withdrawals"), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        allData = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.status && data.status.toLowerCase() === currentView.toLowerCase()) {
                allData.push({ id: docSnap.id, ...data });
            }
        });
        render(allData);
    });
}

// --- SEARCH LOGIC ---
document.getElementById('searchInput').oninput = (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allData.filter(d => 
        (d.userEmail && d.userEmail.toLowerCase().includes(term)) || 
        (d.account && d.account.toLowerCase().includes(term))
    );
    render(filtered);
};

// --- RENDER TABLE ---
function render(items) {
    const list = document.getElementById('adminList');
    const counter = document.getElementById('pendingCount');
    if (counter) counter.innerText = items.length;

    if (items.length === 0) {
        list.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:100px 20px; color:#64748b; font-size:14px;">No ${currentView} records found.</td></tr>`;
        return;
    }

    list.innerHTML = items.map((d, i) => {
        const dateStr = d.timestamp ? d.timestamp.toDate().toLocaleDateString() : 'Just Now';
        const statusColor = getStatusColor(d.status);
        
        return `
        <tr class="table-row-pro">
            <td style="opacity:0.3; font-weight:800;">${i + 1}</td>
            <td style="font-weight:700; color:#fff;">${d.userEmail}</td>
            
            <td style="min-width: 200px;">
                <div class="address-cell" style="font-family:'JetBrains Mono', monospace; background:rgba(255,255,255,0.03); padding:6px 12px; border-radius:8px; color:#3b82f6; border:1px solid rgba(59,130,246,0.1); display:inline-block; font-size:13px;">
                    ${d.account}
                </div>
            </td>

            <td><span class="method-tag" style="background:rgba(59,130,246,0.1); color:#3b82f6; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:800; text-transform:uppercase;">${d.method}</span></td>
            <td><b style="color:#fbbf24; font-size:15px;">${d.amount ? d.amount.toLocaleString() : 0}</b></td>
            <td style="font-size:12px; color:#64748b;">${dateStr}</td>
            <td>
                <div class="status-indicator" style="display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:800; text-transform:uppercase; color:${statusColor};">
                   <span style="width:8px; height:8px; border-radius:50%; background:${statusColor}; box-shadow: 0 0 10px ${statusColor}"></span>
                   ${d.status}
                </div>
            </td>
            <td>
                <div class="action-btns-group" style="display:flex; gap:10px;">
                    ${d.status === 'Pending' ? `
                        <button class="act-btn tick" onclick="updateStatus('${d.id}','${d.userId}',${d.amount},'Approved')" style="background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2); width:36px; height:36px; border-radius:10px; cursor:pointer;">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="act-btn cross" onclick="updateStatus('${d.id}','${d.userId}',${d.amount},'Rejected')" style="background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.2); width:36px; height:36px; border-radius:10px; cursor:pointer;">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : `
                        <span style="color:#64748b; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Decision Locked</span>
                    `}
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

function getStatusColor(status) {
    if (status === 'Approved') return '#10b981';
    if (status === 'Rejected') return '#ef4444';
    return '#fbbf24'; 
}

// --- STATUS ACTIONS (ONE-TIME ACTION LOGIC) ---
window.updateStatus = async (id, uid, amt, newStatus) => {
    // Safety check: Don't process if already approved/rejected
    const record = allData.find(item => item.id === id);
    if (record && record.status !== 'Pending') {
        alert("This record has already been finalized.");
        return;
    }

    const confirmMsg = newStatus === 'Approved' ? "Approve this payment?" : "Reject and refund points?";
    
    if (confirm(confirmMsg)) {
        try {
            const withdrawalRef = doc(db, "withdrawals", id);
            await updateDoc(withdrawalRef, { status: newStatus });

            if (newStatus === "Rejected") {
                const userRef = doc(db, "users", uid);
                await updateDoc(userRef, {
                    balance: increment(parseInt(amt))
                });
                alert("Request Rejected. Points refunded.");
            } else {
                alert("Request Approved.");
            }
        } catch (error) {
            alert("Error: " + error.message);
        }
    }
};

// --- TAB SWITCHING ---
window.switchTab = (status, btn) => {
    currentView = status;
    document.querySelectorAll('.pill-btn, .tab-p').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    if (sidebar) sidebar.classList.remove('open');
    loadData();
};