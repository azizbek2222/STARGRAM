import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyC4kOm81jDJj7hP22B8oeRKajZhd2DFu7c",
    authDomain: "start-market-1.firebaseapp.com",
    projectId: "start-market-1",
    databaseURL: "https://start-market-1-default-rtdb.firebaseio.com/",
    appId: "1:665152006936:web:f89e2d76ebd88598668c6d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// URL dan foydalanuvchi UID sini olish (masalan: user-profile.html?uid=123)
const urlParams = new URLSearchParams(window.location.search);
const targetUid = urlParams.get('uid');

const postsContainer = document.getElementById('user-posts');
const postCountEl = document.getElementById('post-count');
const usernameEl = document.getElementById('display-username');
const navUsernameEl = document.getElementById('nav-username');
const profileImgEl = document.getElementById('profile-img');

if (targetUid) {
    loadUserProfile();
    loadUserPosts();
} else {
    alert("Foydalanuvchi topilmadi!");
    window.location.href = "home.html";
}

// 1. Foydalanuvchi shaxsiy ma'lumotlarini yuklash
async function loadUserProfile() {
    const userRef = ref(db, `users/${targetUid}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        usernameEl.innerText = data.username || "foydalanuvchi";
        navUsernameEl.innerText = data.username || "Profil";
        if (data.profileImg) profileImgEl.src = data.profileImg;
    }
}

// 2. Foydalanuvchi yuklagan barcha postlarni yuklash
function loadUserPosts() {
    const reelsRef = ref(db, 'reels');
    onValue(reelsRef, (snapshot) => {
        const data = snapshot.val();
        postsContainer.innerHTML = "";
        let count = 0;

        if (data) {
            Object.values(data).reverse().forEach(item => {
                // Faqat ushbu foydalanuvchiga tegishli postlarni saralash
                if (item.userId === targetUid) {
                    count++;
                    const div = document.createElement('div');
                    div.className = 'grid-item';
                    
                    if (item.type === 'video') {
                        div.innerHTML = `<video src="${item.fileUrl}"></video><div class="play-icon">▶</div>`;
                    } else {
                        div.innerHTML = `<img src="${item.fileUrl}">`;
                    }
                    postsContainer.appendChild(div);
                }
            });
        }
        postCountEl.innerText = count;
        if (count === 0) {
            postsContainer.innerHTML = `<p style="grid-column: 1/4; text-align:center; padding: 20px; color: #8e8e8e;">Hozircha postlar yo'q.</p>`;
        }
    });
}
