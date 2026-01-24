import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, update, get, set, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const postsContainer = document.getElementById('profile-posts');
const postCountEl = document.getElementById('post-count');
const followerCountEl = document.getElementById('follower-count');
const followingCountEl = document.getElementById('following-count');
const usernameEl = document.getElementById('display-username');
const profileImgEl = document.getElementById('profile-img');
const editModal = document.getElementById('edit-modal');
const videoModal = document.getElementById('video-modal');

let currentUser = null;
let currentReelId = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadUserData();
        loadUserPosts();
        loadStats();
    } else {
        window.location.href = "login.html";
    }
});

function loadUserData() {
    onValue(ref(db, 'users/' + currentUser.uid), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const badge = data.isVerified ? `<img src="nishon.png" class="badge-img">` : "";
            usernameEl.innerHTML = (data.username || "foydalanuvchi") + badge;
            if (data.profileImg) profileImgEl.src = data.profileImg;
        }
    });
}

function loadUserPosts() {
    onValue(ref(db, 'reels'), (snapshot) => {
        postsContainer.innerHTML = "";
        let count = 0;
        const data = snapshot.val();
        if (data) {
            Object.keys(data).reverse().forEach(key => {
                const post = data[key];
                if (post.userId === currentUser.uid) {
                    count++;
                    const likes = post.likes ? Object.keys(post.likes).length : 0;
                    const views = post.views ? Object.keys(post.views).length : 0;
                    const div = document.createElement('div');
                    div.className = 'grid-item';
                    div.innerHTML = `
                        <video src="${post.fileUrl}" muted playsinline></video>
                        <div class="grid-item-overlay">
                            <span>❤️ ${likes}</span> <span>👁️ ${views}</span>
                        </div>
                    `;
                    div.onclick = () => openFullVideo(key, post);
                    postsContainer.appendChild(div);
                }
            });
        }
        postCountEl.innerText = count;
    });
}

// MODAL BOSHQARUVI
document.getElementById('edit-btn').onclick = () => editModal.classList.remove('hidden');
document.getElementById('close-modal').onclick = () => {
    editModal.classList.add('hidden');
    document.getElementById('username-error').style.display = 'none';
};

document.getElementById('save-profile').onclick = async () => {
    const newName = document.getElementById('new-username').value.trim();
    if (!newName) return;
    
    const usersSnap = await get(ref(db, 'users'));
    const users = usersSnap.val();
    let isTaken = false;
    
    if (users) {
        Object.keys(users).forEach(uid => {
            if (uid !== currentUser.uid && users[uid].username === newName) isTaken = true;
        });
    }

    if (isTaken) {
        document.getElementById('username-error').style.display = 'block';
    } else {
        await update(ref(db, 'users/' + currentUser.uid), { username: newName });
        editModal.classList.add('hidden');
    }
};

// ... Qolgan loadStats, openFullVideo, toggleLike funksiyalari o'zgarishsiz qoladi ...
// (Sizda bor bo'lgan reels mantiqi bilan bir xil)
