import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, set, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
const container = document.getElementById('reels-container');

let currentVideoUrl = "";
let currentReelId = null;

onAuthStateChanged(auth, (user) => {
    if (user) loadReels();
    else window.location.href = "login.html";
});

async function loadReels() {
    const snapshot = await get(ref(db, 'reels'));
    const data = snapshot.val();
    container.innerHTML = "";
    if (!data) return;

    const reelsList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    // Videolarni aralashtirish
    reelsList.sort(() => Math.random() - 0.5);

    for (const reel of reelsList) {
        const userSnap = await get(ref(db, `users/${reel.userId}`));
        const userData = userSnap.val() || {};
        const badge = userData.isVerified ? `<img src="nishon.png" class="badge-img">` : "";

        const wrapper = document.createElement('div');
        wrapper.className = 'reel-video-wrapper';
        
        const likesCount = reel.likes ? Object.keys(reel.likes).length : 0;
        const isLiked = (reel.likes && auth.currentUser && reel.likes[auth.currentUser.uid]);
        const heartIcon = isLiked ? '❤️' : '🤍';

        wrapper.innerHTML = `
            <video src="${reel.fileUrl}" loop playsinline onclick="this.paused ? this.play() : this.pause()"></video>
            
            <div class="reel-actions">
                <div class="action-btn" onclick="toggleLike('${reel.id}', this)">
                    <span>${heartIcon}</span>
                    <span class="count">${likesCount}</span>
                </div>
                <div class="action-btn" onclick="openComments('${reel.id}')">
                    <span>💬</span>
                    <span class="count">${reel.comments ? Object.keys(reel.comments).length : 0}</span>
                </div>
                <div class="action-btn" onclick="openShare('${reel.fileUrl}')">
                    <span>✈️</span>
                </div>
            </div>

            <div class="reel-info">
                <div class="user-row">
                    <img src="${userData.profileImg || 'https://via.placeholder.com/150'}">
                    <b>${userData.username || 'user'}${badge}</b>
                </div>
                <p class="caption">${reel.caption || ''}</p>
            </div>
        `;
        container.appendChild(wrapper);
    }
    setupObserver();
}

// Video avtomatik pley bo'lishi uchun
function setupObserver() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            const v = e.target.querySelector('video');
            if (e.isIntersecting) v.play(); else v.pause();
        });
    }, { threshold: 0.8 });
    document.querySelectorAll('.reel-video-wrapper').forEach(el => obs.observe(el));
}

// Tugmalar funksiyalari (Like, Share, Comment)
window.toggleLike = async (id, btn) => {
    const likeRef = ref(db, `reels/${id}/likes/${auth.currentUser.uid}`);
    const snap = await get(likeRef);
    const countEl = btn.querySelector('.count');
    let count = parseInt(countEl.innerText);

    if (snap.exists()) {
        await set(likeRef, null);
        btn.querySelector('span:first-child').innerText = "🤍";
        countEl.innerText = count - 1;
    } else {
        await set(likeRef, true);
        btn.querySelector('span:first-child').innerText = "❤️";
        countEl.innerText = count + 1;
    }
};

window.openShare = (url) => {
    currentVideoUrl = url;
    document.getElementById('share-modal').classList.remove('hidden');
};

document.getElementById('copy-link-btn').onclick = () => {
    navigator.clipboard.writeText(currentVideoUrl);
    alert("Nusxalandi!");
    document.getElementById('share-modal').classList.add('hidden');
};

document.getElementById('download-btn').onclick = async () => {
    const res = await fetch(currentVideoUrl);
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "stargram_reel.mp4";
    link.click();
    document.getElementById('share-modal').classList.add('hidden');
};

document.getElementById('close-share').onclick = () => document.getElementById('share-modal').classList.add('hidden');

// Izohlar funksiyasi o'zgarishsiz qoldi (lekin hamma ma'lumot yuklanishi ta'minlangan)
window.openComments = (id) => {
    currentReelId = id;
    document.getElementById('comment-modal').classList.remove('hidden');
    const list = document.getElementById('comments-list');
    onValue(ref(db, `reels/${id}/comments`), snap => {
        list.innerHTML = "";
        const data = snap.val();
        if (data) {
            Object.values(data).forEach(async c => {
                const u = (await get(ref(db, `users/${c.uid}`))).val();
                list.innerHTML += `<div style="display:flex;gap:10px;margin-bottom:10px;">
                    <img src="${u.profileImg}" style="width:30px;height:30px;border-radius:50%;">
                    <b>${u.username}:</b> ${c.text}</div>`;
            });
        }
    });
};
document.getElementById('close-comments').onclick = () => document.getElementById('comment-modal').classList.add('hidden');
