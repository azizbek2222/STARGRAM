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

function loadUserData() {
    onValue(ref(db, 'users/' + currentUser.uid), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const badge = data.isVerified ? `<img src="nishon.png" class="badge-img" title="Tasdiqlangan">` : "";
            usernameEl.innerHTML = (data.username || "foydalanuvchi") + badge;
            if (data.profileImg) profileImgEl.src = data.profileImg;
        }
    });
}

function loadStats() {
    onValue(ref(db, 'follows'), (snapshot) => {
        const data = snapshot.val() || {};
        let followers = 0; let following = 0;
        Object.values(data).forEach(rel => {
            if (rel.to === currentUser.uid) followers++;
            if (rel.from === currentUser.uid) following++;
        });
        followerCountEl.innerText = followers;
        followingCountEl.innerText = following;
    });
}

function loadUserPosts() {
    onValue(ref(db, 'reels'), (snapshot) => {
        postsContainer.innerHTML = "";
        let count = 0;
        const data = snapshot.val();
        if (data) {
            const postsArray = Object.keys(data).reverse();
            postsArray.forEach(key => {
                const post = data[key];
                if (post.userId === currentUser.uid) {
                    count++;
                    const likesCount = post.likes ? Object.keys(post.likes).length : 0;
                    const viewsCount = post.views ? Object.keys(post.views).length : 0; // Ko'rishlar soni

                    const div = document.createElement('div');
                    div.className = 'grid-item';
                    div.innerHTML = `
                        <video src="${post.fileUrl}" muted playsinline></video>
                        <div class="grid-item-overlay">
                            <span>❤️ ${likesCount}</span>
                            <span>👁️ ${viewsCount}</span>
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

async function openFullVideo(id, post) {
    videoModal.classList.remove('hidden');
    currentReelId = id;
    
    // Ko'rishlar sonini oshirish (Agar foydalanuvchi birinchi marta ko'rayotgan bo'lsa)
    if (currentUser) {
        set(ref(db, `reels/${id}/views/${currentUser.uid}`), true);
    }

    const likesCount = post.likes ? Object.keys(post.likes).length : 0;
    const isLiked = (post.likes && post.likes[currentUser.uid]);
    const heartIcon = isLiked ? '❤️' : '🤍';
    
    const userSnap = await get(ref(db, `users/${post.userId}`));
    const userData = userSnap.val() || {};

    modalVideoContainer.innerHTML = `
        <div class="reel-video-wrapper">
            <video src="${post.fileUrl}" loop autoplay playsinline onclick="this.paused ? this.play() : this.pause()"></video>
            <div class="reel-actions">
                <div class="action-btn" id="like-btn-modal">
                    <span class="heart-icon">${heartIcon}</span>
                    <span class="count">${likesCount}</span>
                </div>
                <div class="action-btn" id="comment-btn-modal">
                    <span>💬</span>
                    <span class="count">${post.comments ? Object.keys(post.comments).length : 0}</span>
                </div>
                <div class="action-btn"><span>✈️</span></div>
            </div>
            <div class="reel-info">
                <b>${userData.username || 'user'}</b>
                <p>${post.caption || ''}</p>
            </div>
        </div>
    `;

    document.getElementById('like-btn-modal').onclick = () => toggleLike(id);
    document.getElementById('comment-btn-modal').onclick = () => openComments(id);
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
    currentReelId = id;
    document.getElementById('comment-modal').classList.remove('hidden');
    const list = document.getElementById('comments-list');
    onValue(ref(db, `reels/${id}/comments`), (snapshot) => {
        const data = snapshot.val();
        list.innerHTML = data ? "" : "<p>Izohlar yo'q</p>";
        if (data) {
            Object.values(data).forEach(async c => {
                const uSnap = await get(ref(db, `users/${c.uid}`));
                const u = uSnap.val() || {};
                list.innerHTML += `<div class="comment-item" style="margin-bottom:8px;"><b>${u.username}:</b> ${c.text}</div>`;
            });
        }
    });
}

document.getElementById('close-video-modal').onclick = () => {
    videoModal.classList.add('hidden');
    modalVideoContainer.innerHTML = "";
};

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

document.getElementById('go-to-settings').onclick = () => { window.location.href = 'settings.html'; };
