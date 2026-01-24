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
const editModal = document.getElementById('edit-modal');
const usernameError = document.getElementById('username-error');
const videoModal = document.getElementById('video-modal');
const modalVideoContainer = document.getElementById('modal-video-container');

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

document.getElementById('go-to-settings').onclick = () => { window.location.href = 'settings.html'; };

function loadUserData() {
    onValue(ref(db, 'users/' + currentUser.uid), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('display-username').innerText = data.username || "user";
            if (data.profileImg) document.getElementById('profile-img').src = data.profileImg;
        }
    });
}

// Usernameni saqlash va bandligini tekshirish
document.getElementById('save-profile').onclick = async () => {
    const newName = document.getElementById('new-username').value.trim();
    if (!newName) return;

    usernameError.style.display = 'none'; // Avval xabarni yashiramiz

    try {
        const usersSnap = await get(ref(db, 'users'));
        const users = usersSnap.val();
        let taken = false;

        if (users) {
            Object.keys(users).forEach(uid => {
                // O'zimizdan boshqa foydalanuvchilarda shu ism bormi tekshiramiz
                if (uid !== currentUser.uid && users[uid].username && users[uid].username.toLowerCase() === newName.toLowerCase()) {
                    taken = true;
                }
            });
        }

        if (taken) {
            usernameError.style.display = 'block'; // Agar band bo'lsa xabar chiqadi
        } else {
            await update(ref(db, 'users/' + currentUser.uid), { username: newName });
            editModal.classList.add('hidden');
            document.getElementById('new-username').value = "";
        }
    } catch (error) {
        console.error("Xatolik:", error);
    }
};

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
                            <span>❤️ ${likes}</span>
                            <span>👁️ ${views}</span>
                        </div>
                    `;
                    div.onclick = () => openFullVideo(key, post);
                    postsContainer.appendChild(div);
                }
            });
        }
        document.getElementById('post-count').innerText = count;
    });
}

async function openFullVideo(id, post) {
    currentReelId = id;
    videoModal.classList.remove('hidden');
    set(ref(db, `reels/${id}/views/${currentUser.uid}`), true);

    const likesCount = post.likes ? Object.keys(post.likes).length : 0;
    const isLiked = post.likes && post.likes[currentUser.uid];
    const heartIcon = isLiked ? '❤️' : '🤍';
    
    const userSnap = await get(ref(db, `users/${post.userId}`));
    const userData = userSnap.val() || {};

    modalVideoContainer.innerHTML = `
        <div class="reel-wrapper-modal">
            <video src="${post.fileUrl}" autoplay loop playsinline onclick="this.paused ? this.play() : this.pause()"></video>
            <div class="reel-actions-modal">
                <div class="action-btn" id="modal-like-btn">
                    <span class="icon">${heartIcon}</span>
                    <span class="count">${likesCount}</span>
                </div>
                <div class="action-btn" id="modal-comment-btn">
                    <span class="icon">💬</span>
                    <span class="count">${post.comments ? Object.keys(post.comments).length : 0}</span>
                </div>
                <div class="action-btn">
                    <span class="icon">✈️</span>
                </div>
            </div>
            <div class="reel-info-modal">
                <div class="user-info">
                    <img src="${userData.profileImg || 'https://via.placeholder.com/150'}" class="mini-avatar">
                    <b>${userData.username || 'user'}</b>
                </div>
                <p class="caption">${post.caption || ''}</p>
            </div>
        </div>
    `;

    document.getElementById('modal-like-btn').onclick = () => toggleLike(id);
    document.getElementById('modal-comment-btn').onclick = () => openComments(id);
}

async function toggleLike(id) {
    const likeRef = ref(db, `reels/${id}/likes/${currentUser.uid}`);
    const snap = await get(likeRef);
    if (snap.exists()) {
        await set(likeRef, null);
    } else {
        await set(likeRef, true);
    }
}

function openComments(id) {
    document.getElementById('comment-modal').classList.remove('hidden');
    const list = document.getElementById('comments-list');
    onValue(ref(db, `reels/${id}/comments`), (snapshot) => {
        const data = snapshot.val();
        list.innerHTML = "";
        if (data) {
            Object.values(data).forEach(async c => {
                const uSnap = await get(ref(db, `users/${c.uid}`));
                const u = uSnap.val() || {};
                list.innerHTML += `<div class="comment-item"><b>${u.username}:</b> ${c.text}</div>`;
            });
        }
    });
}

document.getElementById('edit-btn').onclick = () => {
    editModal.classList.remove('hidden');
    usernameError.style.display = 'none'; // Modal ochilganda xabarni tozalaymiz
};
document.getElementById('close-modal').onclick = () => editModal.classList.add('hidden');
document.getElementById('close-video-modal').onclick = () => { videoModal.classList.add('hidden'); modalVideoContainer.innerHTML = ""; };
document.getElementById('close-comments').onclick = () => document.getElementById('comment-modal').classList.add('hidden');

document.getElementById('send-comment').onclick = async () => {
    const input = document.getElementById('comment-text');
    if (!input.value.trim()) return;
    await push(ref(db, `reels/${currentReelId}/comments`), {
        uid: currentUser.uid,
        text: input.value.trim(),
        timestamp: Date.now()
    });
    input.value = "";
};

function loadStats() {
    onValue(ref(db, 'follows'), (snapshot) => {
        const data = snapshot.val() || {};
        let f1 = 0; let f2 = 0;
        Object.values(data).forEach(r => {
            if (r.to === currentUser.uid) f1++;
            if (r.from === currentUser.uid) f2++;
        });
        document.getElementById('follower-count').innerText = f1;
        document.getElementById('following-count').innerText = f2;
    });
}
