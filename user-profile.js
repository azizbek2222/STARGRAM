import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, get, set, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const urlParams = new URLSearchParams(window.location.search);
const targetUid = urlParams.get('uid');
const followBtn = document.getElementById('follow-btn');
const followerCountEl = document.querySelectorAll('.stat-item b')[1]; 
const followingCountEl = document.querySelectorAll('.stat-item b')[2];

let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // Agar qidiruvdan o'z profilini tanlasa, profile.html ga o'tadi
        if (targetUid === user.uid) {
            window.location.href = "profile.html";
        }
        checkFollowStatus();
    }
});

if (targetUid) {
    loadUserProfile();
    loadUserPosts();
    loadStats();
}

function loadUserProfile() {
    get(ref(db, `users/${targetUid}`)).then(snap => {
        const data = snap.val();
        if (data) {
            document.getElementById('display-username').innerText = data.username || "user";
            document.getElementById('nav-username').innerText = data.username || "Profil";
            if (data.profileImg) document.getElementById('profile-img').src = data.profileImg;
        }
    });
}

function loadStats() {
    onValue(ref(db, 'follows'), (snapshot) => {
        const data = snapshot.val() || {};
        let followers = 0;
        let following = 0;
        Object.values(data).forEach(rel => {
            if (rel.to === targetUid) followers++;
            if (rel.from === targetUid) following++;
        });
        followerCountEl.innerText = followers;
        followingCountEl.innerText = following;
    });
}

function checkFollowStatus() {
    if (!currentUser) return;
    const followId = currentUser.uid + "_" + targetUid;
    onValue(ref(db, `follows/${followId}`), (snap) => {
        if (snap.exists()) {
            followBtn.innerText = "Obunani bekor qilish";
            followBtn.style.background = "#efefef";
            followBtn.style.color = "black";
        } else {
            followBtn.innerText = "Obuna bo'lish";
            followBtn.style.background = "#0095f6";
            followBtn.style.color = "white";
        }
    });
}

followBtn.onclick = async () => {
    if (!currentUser) return;
    const followId = currentUser.uid + "_" + targetUid;
    const followRef = ref(db, `follows/${followId}`);
    
    const snap = await get(followRef);
    if (snap.exists()) {
        await remove(followRef);
    } else {
        await set(followRef, {
            from: currentUser.uid,
            to: targetUid,
            timestamp: Date.now()
        });
    }
};

function loadUserPosts() {
    const reelsRef = ref(db, 'reels');
    onValue(reelsRef, (snapshot) => {
        const data = snapshot.val();
        const container = document.getElementById('user-posts');
        container.innerHTML = "";
        let count = 0;
        if (data) {
            Object.values(data).reverse().forEach(item => {
                if (item.userId === targetUid) {
                    count++;
                    const div = document.createElement('div');
                    div.className = 'grid-item';
                    div.innerHTML = `<video src="${item.fileUrl}"></video>`;
                    container.appendChild(div);
                }
            });
        }
        document.getElementById('post-count').innerText = count;
    });
}
