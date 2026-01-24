import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyC4kOm81jDJj7hP22B8oeRKajZhd2DFu7c",
    authDomain: "start-market-1.firebaseapp.com",
    projectId: "start-market-1",
    databaseURL: "https://start-market-1-default-rtdb.firebaseio.com/",
    appId: "1:665152006936:web:f89e2d76ebd88598668c6d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const balanceEl = document.getElementById('user-balance');
const monStatusEl = document.getElementById('mon-status');
const videoProgEl = document.getElementById('video-progress');
const likesProgEl = document.getElementById('likes-progress');
const activateBtn = document.getElementById('activate-mon-btn');

onAuthStateChanged(auth, (user) => {
    if (user) {
        checkMonetization(user.uid);
    } else {
        window.location.href = "login.html";
    }
});

async function checkMonetization(uid) {
    // 1. Foydalanuvchi ma'lumotlarini olish
    onValue(ref(db, `users/${uid}`), async (snapshot) => {
        const userData = snapshot.val();
        const balance = userData.balance || 0;
        const isMonetized = userData.isMonetized || false;

        balanceEl.innerText = `${balance.toFixed(6)} USDT`;
        monStatusEl.innerText = isMonetized ? "Holat: Yoqilgan ✅" : "Holat: O'chirilgan ❌";

        if (!isMonetized) {
            // 2. Videolar va layklar sonini hisoblash
            const reelsSnap = await get(ref(db, 'reels'));
            const reels = reelsSnap.val();
            let videoCount = 0;
            let totalLikes = 0;

            if (reels) {
                Object.values(reels).forEach(reel => {
                    if (reel.userId === uid) {
                        videoCount++;
                        if (reel.likes) totalLikes += Object.keys(reel.likes).length;
                    }
                });
            }

            videoProgEl.innerText = `${videoCount}/10`;
            likesProgEl.innerText = `${totalLikes}/100`;

            if (videoCount >= 10 && totalLikes >= 100) {
                activateBtn.disabled = false;
                activateBtn.classList.add('active');
                activateBtn.innerText = "Monetizatsiyani yoqish";
            } else {
                activateBtn.innerText = "Shartlar bajarilmagan";
            }
        } else {
            activateBtn.style.display = 'none';
        }
    });
}

activateBtn.onclick = async () => {
    const user = auth.currentUser;
    if (user) {
        await update(ref(db, `users/${user.uid}`), {
            isMonetized: true,
            balance: 0
        });
        alert("Tabriklaymiz! Monetizatsiya yoqildi.");
    }
};
