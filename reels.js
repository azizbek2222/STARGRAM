import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, set, push, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

    let reelsList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    reelsList.sort(() => Math.random() - 0.5);

    for (const reel of reelsList) {
        const userSnap = await get(ref(db, `users/${reel.userId}`));
        const userData = userSnap.val() || {};
        const badge = userData.isVerified ? `<img src="nishon.png" class="badge-img" style="width:14px; margin-left:4px;">` : "";

        const wrapper = document.createElement('div');
        wrapper.className = 'reel-video-wrapper';
        
        const likesCount = reel.likes ? Object.keys(reel.likes).length : 0;
        const isLiked = (reel.likes && auth.currentUser && reel.likes[auth.currentUser.uid]);
        const heartIcon = isLiked ? '❤️' : '🤍';

        wrapper.innerHTML = `
            <video src="${reel.fileUrl}" loop playsinline class="reel-video"></video>
            
            <div class="reel-actions">
                <div class="action-btn like-btn" data-id="${reel.id}">
                    <span class="heart-icon">${heartIcon}</span>
                    <span class="count">${likesCount}</span>
                </div>
                <div class="action-btn comment-btn" data-id="${reel.id}">
                    <span>💬</span>
                    <span class="count">${reel.comments ? Object.keys(reel.comments).length : 0}</span>
                </div>
                <div class="action-btn share-btn" data-url="${reel.fileUrl}">
                    <span>✈️</span>
                </div>
            </div>

            <div class="reel-info">
                <div class="user-row" style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                    <img src="${userData.profileImg || 'https://via.placeholder.com/150'}" style="width:32px; height:32px; border-radius:50%; object-fit:cover; border:1px solid #fff;">
                    <b style="color:white; font-size:14px; display:flex; align-items:center;">${userData.username || 'user'}${badge}</b>
                </div>
                <p class="caption" style="color:white; font-size:14px; margin:0;">${reel.caption || ''}</p>
            </div>
        `;

        // Event listenerlarni qo'shish (window. ishlatmasdan xavfsizroq)
        const video = wrapper.querySelector('.reel-video');
        video.onclick = () => video.paused ? video.play() : video.pause();

        wrapper.querySelector('.like-btn').onclick = function() { toggleLike(reel.id, this); };
        wrapper.querySelector('.comment-btn').onclick = function() { openComments(reel.id); };
        wrapper.querySelector('.share-btn').onclick = function() { openShare(reel.fileUrl); };

        container.appendChild(wrapper);
    }
    setupObserver();
}

function setupObserver() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            const v = e.target.querySelector('video');
            if (e.isIntersecting) v.play(); else v.pause();
        });
    }, { threshold: 0.8 });
    document.querySelectorAll('.reel-video-wrapper').forEach(el => obs.observe(el));
}

async function toggleLike(id, btn) {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const likeRef = ref(db, `reels/${id}/likes/${uid}`);
    const snap = await get(likeRef);
    const countEl = btn.querySelector('.count');
    const heartEl = btn.querySelector('.heart-icon');
    let count = parseInt(countEl.innerText);

    if (snap.exists()) {
        await set(likeRef, null);
        heartEl.innerText = "🤍";
        countEl.innerText = count - 1;
    } else {
        await set(likeRef, true);
        heartEl.innerText = "❤️";
        countEl.innerText = count + 1;

        // Monetizatsiya qismi
        const reelSnap = await get(ref(db, `reels/${id}`));
        if (reelSnap.exists()) {
            const ownerUid = reelSnap.val().userId;
            const ownerRef = ref(db, `users/${ownerUid}`);
            const ownerSnap = await get(ownerRef);
            if (ownerSnap.exists() && ownerSnap.val().isMonetized) {
                const newBalance = (ownerSnap.val().balance || 0) + 0.000005;
                await update(ownerRef, { balance: newBalance });
            }
        }
    }
}

function openComments(id) {
    currentReelId = id;
    document.getElementById('comment-modal').classList.remove('hidden');
    loadComments(id);
}

function loadComments(id) {
    const list = document.getElementById('comments-list');
    onValue(ref(db, `reels/${id}/comments`), async (snap) => {
        list.innerHTML = "";
        const data = snap.val();
        if (data) {
            for (const key in data) {
                const c = data[key];
                const uSnap = await get(ref(db, `users/${c.uid}`));
                const u = uSnap.val() || {};
                list.innerHTML += `
                    <div class="comment-item" style="display:flex; gap:10px; margin-bottom:15px; align-items:flex-start;">
                        <img src="${u.profileImg || 'https://via.placeholder.com/150'}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                        <div>
                            <b style="font-size:13px; color:#333;">${u.username}</b>
                            <p style="margin:2px 0; font-size:14px; color:#111;">${c.text}</p>
                        </div>
                    </div>`;
            }
        } else {
            list.innerHTML = "<p style='text-align:center; color:#888;'>Hozircha izohlar yo'q.</p>";
        }
    });
}

document.getElementById('send-comment').onclick = async () => {
    const input = document.getElementById('comment-text');
    if (!input.value.trim() || !currentReelId) return;
    await push(ref(db, `reels/${currentReelId}/comments`), {
        uid: auth.currentUser.uid,
        text: input.value.trim(),
        timestamp: Date.now()
    });
    input.value = "";
};

function openShare(url) {
    currentVideoUrl = url;
    document.getElementById('share-modal').classList.remove('hidden');
}

document.getElementById('copy-link-btn').onclick = () => {
    navigator.clipboard.writeText(currentVideoUrl);
    alert("Nusxalandi!");
    document.getElementById('share-modal').classList.add('hidden');
};

// YUKLAB OLISH QISMI (TUZATILDI)
document.getElementById('download-btn').onclick = async () => {
    if (!currentVideoUrl) return;
    try {
        const btn = document.getElementById('download-btn');
        btn.innerText = "Yuklanmoqda...";
        
        const response = await fetch(currentVideoUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `stargram_${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        
        btn.innerText = "📥 Yuklab olish";
        document.getElementById('share-modal').classList.add('hidden');
    } catch (e) { 
        console.error(e);
        // Agar xatolik bo'lsa (CORS), videoni yangi oynada ochib beramiz
        window.open(currentVideoUrl, '_blank');
        document.getElementById('share-modal').classList.add('hidden');
    }
};

document.getElementById('close-share').onclick = () => document.getElementById('share-modal').classList.add('hidden');
document.getElementById('close-comments').onclick = () => document.getElementById('comment-modal').classList.add('hidden');
