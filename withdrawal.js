import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, doc, updateDoc, increment, addDoc, collection, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
// New Import for Ads
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

let selectedMethod = "";
let currentMin = 0;
let userBalance = 0;

// Listen for Auth & Balance
onAuthStateChanged(auth, (user) => {
    if (user) {
        onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                userBalance = snap.data().balance || 0;
                document.getElementById('userBalance').innerText = userBalance.toLocaleString();
            }
        });

        // Trigger the Universal Ad Engine for the Withdrawal page
        runUniversalEngine(db, 'withdrawal');

    } else {
        window.location.href = "index.html";
    }
});

window.openForm = function(method, min) {
    selectedMethod = method;
    currentMin = min;
    
    document.getElementById('targetAccount').value = "";
    document.getElementById('coinAmount').value = "";
    document.getElementById('errorDisplay').innerText = "";
    
    document.getElementById('modalTitle').innerText = method;
    document.getElementById('inputLabel').innerText = (method === 'USDT') ? "USDT-TRC20 Address" : "Phone Number";
    document.getElementById('withdrawModal').style.display = 'flex';
};

window.closeForm = function() {
    document.getElementById('withdrawModal').style.display = 'none';
};

window.processWithdrawal = async function() {
    const account = document.getElementById('targetAccount').value.trim();
    const amount = parseInt(document.getElementById('coinAmount').value);
    const errorBox = document.getElementById('errorDisplay');
    const withdrawBtn = document.querySelector('.btn-primary');
    // Note: btnText was defined but unused in your provided snippet, kept logic intact
    const btnText = withdrawBtn.innerText;

    // Validations
    if(!account) { 
        errorBox.innerText = "Please fill in details!"; 
        return; 
    }
    if(isNaN(amount) || amount < currentMin) { 
        errorBox.innerText = `Minimum for ${selectedMethod} is ${currentMin.toLocaleString()} coins`; 
        return; 
    }
    if(amount > userBalance) { 
        errorBox.innerText = "Insufficient balance!"; 
        return; 
    }

    // Start Loading Effect
    withdrawBtn.disabled = true;
    withdrawBtn.innerHTML = '<div class="spinner"></div>';

    try {
        const user = auth.currentUser;
        const userRef = doc(db, "users", user.uid);

        // 1. DEDUCT FROM FIREBASE (Crucial!)
        await updateDoc(userRef, {
            balance: increment(-amount)
        });

        // 2. SAVE TO WITHDRAWALS COLLECTION
        await addDoc(collection(db, "withdrawals"), {
            userId: user.uid,
            userEmail: user.email,
            method: selectedMethod,
            amount: amount,
            account: account,
            status: "Pending",
            timestamp: serverTimestamp()
        });

        alert("Withdrawal Successful! Request is Pending.");
        closeForm();

    } catch (error) {
        console.error("Error:", error);
        errorBox.innerText = "Transaction failed. Try again.";
    } finally {
        // Reset Button
        withdrawBtn.disabled = false;
        withdrawBtn.innerText = "PROCEED";
    }
};
