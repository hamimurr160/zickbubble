import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc, increment } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// --- FIREBASE INITIALIZATION ---
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

// Global Variables
let usersData = [];
let activeUid = null;

// --- SIDEBAR NAVIGATION CONTROLS ---
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('openSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');

if (openSidebarBtn) {
    openSidebarBtn.onclick = function() {
        sidebar.classList.add('open');
    };
}

if (closeSidebarBtn) {
    closeSidebarBtn.onclick = function() {
        sidebar.classList.remove('open');
    };
}

// --- REAL-TIME DATABASE LISTENER ---
// We listen to the "users" collection directly.
onSnapshot(collection(db, "users"), (snapshot) => {
    console.log("DEBUG: Connection successful. Documents found:", snapshot.size);
    
    usersData = [];
    
    if (snapshot.empty) {
        console.log("DEBUG: The 'users' collection exists but has no documents.");
        const listBody = document.getElementById('userList');
        listBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:100px; color:#64748b;">No users found in your Firebase "users" collection.</td></tr>';
        return;
    }

    snapshot.forEach((doc) => {
        const data = doc.data();
        // Injecting the document ID into the data object
        usersData.push({
            id: doc.id,
            email: data.email,
            vaultScore: data.vaultScore,
            createdAt: data.createdAt,
            status: data.status
        });
    });

    // Manually sorting by vaultScore (Descending)
    usersData.sort((a, b) => {
        return (b.vaultScore || 0) - (a.vaultScore || 0);
    });

    // Update the UI User Counter
    const countDisplay = document.getElementById('count');
    if (countDisplay) {
        countDisplay.innerText = usersData.length;
    }

    // Trigger the table refresh
    renderUserTable(usersData);

}, (error) => {
    console.error("FIREBASE ERROR:", error.code, error.message);
    if (error.code === 'permission-denied') {
        alert("ACCESS DENIED: Please check your Firebase Firestore Rules. They must be set to 'allow read, write: if true;' for testing.");
    }
});

// --- TABLE RENDERING ENGINE ---
function renderUserTable(dataArray) {
    const tableBody = document.getElementById('userList');
    if (!tableBody) return;

    let tableHTML = "";

    dataArray.forEach((user) => {
        const email = user.email || "unknown@user.com";
        const score = user.vaultScore !== undefined ? user.vaultScore : 0;
        const status = user.status || "active";
        
        // Date Logic
        let displayDate = "Not Set";
        if (user.createdAt) {
            if (user.createdAt.seconds) {
                displayDate = new Date(user.createdAt.seconds * 1000).toLocaleDateString();
            } else {
                displayDate = user.createdAt; // Assuming it's a string
            }
        }

        // Status Styling
        let statusColor = "#10b981"; // Active Green
        if (status === "suspended") statusColor = "#fbbf24"; // Warning Yellow
        if (status === "banned") statusColor = "#ef4444"; // Danger Red

        tableHTML += `
            <tr class="pro-row">
                <td>
                    <div style="font-weight:700; color:#fff; font-size:14px;">${email}</div>
                    <div style="display:inline-block; margin-top:5px; padding:2px 8px; border-radius:4px; background: ${statusColor}1a; color: ${statusColor}; border: 1px solid ${statusColor}33; font-size:10px; font-weight:800; text-transform:uppercase;">
                        ● ${status}
                    </div>
                </td>
                <td>
                    <div style="color:#fbbf24; font-weight:800; font-family:'JetBrains Mono'; font-size:15px;">
                        <i class="fas fa-coins" style="font-size:11px; margin-right:5px; opacity:0.6;"></i>${score.toLocaleString()}
                    </div>
                </td>
                <td style="color:#64748b; font-size:12px; font-weight:500;">
                    ${displayDate}
                </td>
                <td style="text-align: right;">
                    <button class="inspect-btn" onclick="openInspector('${user.id}')">
                        MANAGE USER
                    </button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = tableHTML;
}

// --- SEARCH FUNCTIONALITY ---
const searchInput = document.getElementById('userSearch');
if (searchInput) {
    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase();
        const filteredUsers = usersData.filter((u) => {
            return u.email && u.email.toLowerCase().includes(searchTerm);
        });
        renderUserTable(filteredUsers);
    });
}

// --- MODAL & MANAGEMENT ACTIONS ---
window.openInspector = function(uid) {
    activeUid = uid;
    const user = usersData.find(u => u.id === uid);
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');

    if (!user || !content) return;

    content.innerHTML = `
        <div style="text-align:center; margin-bottom:25px;">
            <h2 style="margin:0; color:#fff; font-size:20px;">User Management</h2>
            <p style="color:#64748b; font-size:12px; margin-top:8px;">${user.email}</p>
        </div>

        <div style="background:rgba(255,255,255,0.02); padding:20px; border-radius:18px; border:1px solid rgba(255,255,255,0.05); margin-bottom:20px;">
            <label style="display:block; font-size:10px; color:#64748b; font-weight:800; margin-bottom:12px; text-transform:uppercase; letter-spacing:1px;">Adjust Vault Score</label>
            <div style="display:flex; gap:12px;">
                <button onclick="updateUserScore(500)" style="flex:1; padding:15px; background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2); border-radius:12px; font-weight:800; cursor:pointer;">+ 500</button>
                <button onclick="updateUserScore(-500)" style="flex:1; padding:15px; background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.2); border-radius:12px; font-weight:800; cursor:pointer;">- 500</button>
            </div>
        </div>

        <div style="margin-bottom:20px;">
            <label style="display:block; font-size:10px; color:#64748b; font-weight:800; margin-bottom:12px; text-transform:uppercase;">Account Restrictions</label>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <button onclick="updateUserStatus('suspended')" style="padding:12px; background:rgba(251,191,36,0.1); color:#fbbf24; border:1px solid rgba(251,191,36,0.2); border-radius:10px; font-weight:800; cursor:pointer;">SUSPEND</button>
                <button onclick="updateUserStatus('banned')" style="padding:12px; background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.2); border-radius:10px; font-weight:800; cursor:pointer;">BAN USER</button>
            </div>
            <button onclick="updateUserStatus('active')" style="width:100%; margin-top:10px; padding:12px; background:rgba(59,130,246,0.1); color:#3b82f6; border:1px solid rgba(59,130,246,0.2); border-radius:10px; font-weight:800; cursor:pointer;">RESTORE ACTIVE STATUS</button>
        </div>

        <button onclick="deleteAccountPermanently('${uid}')" style="width:100%; padding:10px; background:transparent; border:none; color:#64748b; text-decoration:underline; font-size:11px; cursor:pointer; font-weight:600;">Remove Account Data</button>
    `;

    modal.style.display = 'flex';
};

window.updateUserScore = async function(amount) {
    try {
        const userRef = doc(db, "users", activeUid);
        await updateDoc(userRef, {
            vaultScore: increment(amount)
        });
    } catch (e) {
        console.error("Score Update Error:", e);
    }
};

window.updateUserStatus = async function(newStatus) {
    try {
        const userRef = doc(db, "users", activeUid);
        await updateDoc(userRef, {
            status: newStatus
        });
        window.closeModal();
    } catch (e) {
        console.error("Status Update Error:", e);
    }
};

window.deleteAccountPermanently = async function(uid) {
    if (confirm("DANGER: This will delete the user forever. Continue?")) {
        try {
            await deleteDoc(doc(db, "users", uid));
            window.closeModal();
        } catch (e) {
            console.error("Deletion Error:", e);
        }
    }
};

window.closeModal = function() {
    document.getElementById('modal').style.display = 'none';
};
