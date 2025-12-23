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

// URL dan foydalanuvchi UID sini olish
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
}

// 1. Foydalanuvchi ma'lumotlarini yuklash
async function loadUserProfile() {
    const userRef = ref(db, 'users/' + targetUid);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Ko'k nishon tekshiruvi
        const badge = data.isVerified ? `<img src="nishon.png" style="width:20px; margin-left:5px; vertical-align:middle;">` : "";
        
        // Username va navigatsiyada ismni nishon bilan chiqarish
        usernameEl.innerHTML = (data.username || "foydalanuvchi") + badge;
        navUsernameEl.innerHTML = (data.username || "Profil") + badge;
        
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
                if (item.userId === targetUid) {
                    count++;
                    const div = document.createElement('div');
                    div.className = 'grid-item';
                    
                    if (item.type === 'video') {
                        div.innerHTML = `<video src="${item.fileUrl || item.videoUrl}"></video><div class="play-icon">▶</div>`;
                    } else {
                        div.innerHTML = `<img src="${item.fileUrl || item.videoUrl}">`;
                    }
                    postsContainer.appendChild(div);
                }
            });
        }
        postCountEl.innerText = count;
        if (count === 0) {
            postsContainer.innerHTML = `<p style="grid-column: 1/4; text-align:center; padding: 20px; color: #8e8e8e;">Hozircha postlar yo'q</p>`;
        }
    });
}