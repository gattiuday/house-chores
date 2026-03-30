import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBRKBsSuuNe8YSBzg4Q6pKZQCh-enW-t5w",
  authDomain: "house-responsibilties.firebaseapp.com",
  projectId: "house-responsibilties",
  storageBucket: "house-responsibilties.firebasestorage.app",
  messagingSenderId: "710916819182",
  appId: "1:710916819182:web:7495582f4e75a4403ecbff",
  measurementId: "G-TK5M3NKF0D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let isAdmin = false;
const ADMIN_PASSWORD = 'admin';

function getNextWeekDateString() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const defaultData = {
    trash: { currentIndex: 0, dueDate: getNextWeekDateString(), sequence: ["Kanchan", "Uday", "Ankit", "Shubham", "Ravalika", "Shivani"] },
    mopping: { currentIndex: 0, dueDate: getNextWeekDateString(), sequence: ["Ravalika", "Ankit", "Uday", "Kanchan", "Shivani", "Shubham"] },
    bathroom: { currentIndex: 0, dueDate: getNextWeekDateString(), sequence: ["Uday", "Kanchan", "Shivani", "Shubham", "Ravalika", "Ankit"] },
    kitchen: { currentIndex: 0, dueDate: getNextWeekDateString(), sequence: ["Kanchan", "Shivani", "Uday", "Ankit", "Shubham", "Ravalika"] }
};

// Get Current Date Info
function setDateInfo() {
    const today = new Date();
    
    const start = new Date(today.getFullYear(), 0, 1);
    const diff = (today - start) + ((start.getTimezoneOffset() - today.getTimezoneOffset()) * 60000);
    const oneDay = 1000 * 60 * 60 * 24;
    const day = Math.floor(diff / oneDay);
    const week = Math.ceil((day + start.getDay() + 1) / 7);
    
    const weekEl = document.getElementById('weekNumber');
    if (weekEl) weekEl.innerText = `Week ${week}`;
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.innerText = today.toLocaleDateString(undefined, options);
}

// Fetch & Display Chores using Real-time Listener
function fetchChores() {
    const docRef = doc(db, "chores", "tracker");
    
    onSnapshot(docRef, (docSnap) => {
        if (!docSnap.exists()) {
            console.log("No data found! Initializing default data...");
            setDoc(docRef, defaultData).catch(err => {
                console.error("Firestore Write Error (Check your security rules!):", err);
                showToast("Database permission denied. Check your Firebase Firestore rules.", "error");
            });
            return;
        }

        const data = docSnap.data();
        for (const [key, value] of Object.entries(data)) {
            const currentAssignee = value.sequence[value.currentIndex];
            const nextAssignee = value.sequence[(value.currentIndex + 1) % value.sequence.length];
            
            const nameEl = document.getElementById(`assignee-${key}`);
            const dateEl = document.getElementById(`date-${key}`);
            const avatarEl = document.getElementById(`avatar-${key}`);
            const nextEl = document.getElementById(`next-${key}`);
            
            if (dateEl) dateEl.innerText = value.dueDate ? `Due: ${value.dueDate}` : 'Due: Assigning...';
            if (nextEl) nextEl.innerText = nextAssignee;

            if (nameEl && nameEl.innerText !== currentAssignee) {
                // Fade out/in effect for dynamic feel
                nameEl.style.opacity = '0';
                if(avatarEl) avatarEl.style.transform = 'scale(0.8)';
                
                setTimeout(() => { 
                    nameEl.innerText = currentAssignee;
                    if(avatarEl) {
                        avatarEl.innerText = currentAssignee.charAt(0).toUpperCase();
                        avatarEl.style.transform = 'scale(1)';
                    }
                    nameEl.style.opacity = '1'; 
                }, 150);
            } else if (nameEl) {
                nameEl.innerText = currentAssignee;
                if(avatarEl) avatarEl.innerText = currentAssignee.charAt(0).toUpperCase();
            }
        }
    }, (error) => {
        console.error("Firestore Read Error:", error);
        showToast("Cannot read database. Did you enable Firestore in Test Mode?", "error");
    });
}

// Complete Chore updates Firestore
async function completeChore(choreName) {
    if (!isAdmin) return;
    
    try {
        const docRef = doc(db, "chores", "tracker");
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) return;
        
        let data = docSnap.data();
        if (!data[choreName]) return;
        
        // Button Feedback
        const btn = document.getElementById(`btn-${choreName}`);
        const originalText = btn.innerText;
        btn.innerText = "Completed ✅";
        btn.classList.add('btn-success');
        
        // Advance rotation
        data[choreName].currentIndex = (data[choreName].currentIndex + 1) % data[choreName].sequence.length;
        data[choreName].dueDate = getNextWeekDateString();
        
        // Save back to Firestore
        await setDoc(docRef, data);
        
        setTimeout(() => {
            btn.innerText = originalText;
            btn.classList.remove('btn-success');
        }, 1500);
        
        const newAssignment = data[choreName].sequence[data[choreName].currentIndex];
        showToast(`${choreName} completed! Over to you, ${newAssignment}`, 'success');
        
    } catch (err) {
        console.error("Error completing task:", err);
        showToast('Error saving to database. Check Firebase permissions.', 'error');
    }
}

// Admin toggle
const adminBtn = document.getElementById('adminBtn');
if (adminBtn) {
    adminBtn.addEventListener('click', () => {
        if (!isAdmin) {
            const pass = prompt('Enter admin password to unlock task controls (Password is currently: admin):');
            if (pass && pass.trim() === ADMIN_PASSWORD) {
                isAdmin = true;
                adminBtn.innerText = 'Lock Controls';
                adminBtn.classList.replace('outline', 'primary');
                
                // Show complete buttons
                document.querySelectorAll('.complete-btn').forEach(btn => btn.classList.remove('hidden'));
                showToast('Admin mode unlocked ✨', 'success');
            } else if (pass) {
                showToast('Incorrect password', 'error');
            }
        } else {
            isAdmin = false;
            adminBtn.innerText = 'Admin Access';
            adminBtn.classList.replace('primary', 'outline');
            
            // Hide complete buttons
            document.querySelectorAll('.complete-btn').forEach(btn => btn.classList.add('hidden'));
            showToast('Admin controls locked 🔒', 'success');
        }
    });
}

// Toast system
let toastTimeout;
function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.innerText = message;
    toast.className = `toast show ${type}`;
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Bind to window to allow inline onclick handlers from HTML
window.completeChore = completeChore;

// Init
document.addEventListener('DOMContentLoaded', () => {
    setDateInfo();
    fetchChores();
});
