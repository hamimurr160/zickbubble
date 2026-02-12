import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
// Import Ad Engine
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

const container = document.getElementById('historyContainer');

onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchUserHistory(user.uid);
        // Start Ads for the history page
        runUniversalEngine(db, 'history');
    } else {
        window.location.href = "index.html";
    }
});

function fetchUserHistory(uid) {
    // Querying withdrawals for the logged-in user, sorted by newest
    const q = query(
        collection(db, "withdrawals"),
        where("userId", "==", uid),
        orderBy("timestamp", "desc")
    );

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 50px; margin-bottom: 10px;">📭</div>
                    <p>No withdrawal history found.</p>
                </div>`;
            return;
        }

        container.innerHTML = snapshot.docs.map(doc => {
            const item = doc.data();
            
            // Format Date and Time from Firebase Timestamp
            const ts = item.timestamp ? item.timestamp.toDate() : new Date();
            const dateStr = ts.toLocaleDateString();
            const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Determine status class
            let statusClass = "status-pending";
            if (item.status === "Approved") statusClass = "status-approved";
            if (item.status === "Rejected") statusClass = "status-rejected";

            return `
                <div class="history-card">
                    <div class="card-top">
                        <div class="method-label">${item.method}</div>
                        <div class="status-tag ${statusClass}">${item.status || 'PENDING'}</div>
                    </div>
                    <div class="card-body">
                        <div class="data-field">
                            <span class="field-label">Amount</span>
                            <span class="field-value">💰 ${item.amount.toLocaleString()}</span>
                        </div>
                        <div class="data-field">
                            <span class="field-label">Account</span>
                            <span class="field-value">${item.account}</span>
                        </div>
                        <div class="data-field">
                            <span class="field-label">Date</span>
                            <span class="field-value">${dateStr}</span>
                        </div>
                        <div class="data-field">
                            <span class="field-label">Time</span>
                            <span class="field-value">${timeStr}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }, (error) => {
        console.error("History Error:", error);
        container.innerHTML = `<p style="text-align:center; padding:20px;">Error loading history. Make sure to create the Firebase Index (check console for link).</p>`;
    });
}
