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
let currentReelId = null;
let currentVideoUrl = ""; // Ulashish uchun video URL saqlanadi

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

onAuthStateChanged(auth, (user) => {
    if (user) loadReelsOnce();
    else window.location.href = "login.html";
});

async function loadReelsOnce() {
    const snapshot = await get(ref(db, 'reels'));
    const data = snapshot.val();
    container.innerHTML = "";

    if (data) {
        let reelsList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        reelsList = shuffleArray(reelsList);
        reelsList.forEach(reel => createReelElement(reel));
        setupVideoObserver();
    }
}

function createReelElement(reel) {
    const wrapper = document.createElement('div');
    wrapper.className = 'reel-video-wrapper';
    wrapper.dataset.id = reel.id;
    wrapper.dataset.url = reel.fileUrl; // URLni saqlab qo'yamiz

    const likesCount = reel.likes ? Object.keys(reel.likes).length : 0;
    const isLiked = (reel.likes && auth.currentUser && reel.likes[auth.currentUser.uid]);
    const heartIcon = isLiked ? '❤️' : '🤍';

    get(ref(db, `users/${reel.userId}`)).then(userSnap => {
        const userData = userSnap.val() || {};
        wrapper.innerHTML = `
            <video src="${reel.fileUrl}" loop playsinline onclick="togglePlay(this)"></video>
            <div class="reel-actions">
                <div class="action-btn" onclick="toggleLike('${reel.id}', this)">
                    <span class="heart-icon">${heartIcon}</span>
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
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                    <img src="${userData.profileImg || 'https://via.placeholder.com/150'}" style="width:35px; height:35px; border-radius:50%; object-fit:cover;">
                    <b>${userData.username || 'user'}</b>
                </div>
                <p>${reel.caption || ''}</p>
            </div>
        `;
    });
    container.appendChild(wrapper);
}

// Ulashish menyusini ochish
window.openShare = (url) => {
    currentVideoUrl = url;
    document.getElementById('share-modal').classList.remove('hidden');
};

// Linkni nusxalash
document.getElementById('copy-link-btn').onclick = () => {
    navigator.clipboard.writeText(currentVideoUrl).then(() => {
        alert("Video linki nusxalandi!");
        document.getElementById('share-modal').classList.add('hidden');
    });
};

// Videoni yuklab olish
document.getElementById('download-btn').onclick = async () => {
    try {
        const response = await fetch(currentVideoUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `stargram_video_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.getElementById('share-modal').classList.add('hidden');
    } catch (e) {
        alert("Yuklab olishda xatolik yuz berdi.");
    }
};

document.getElementById('close-share').onclick = () => {
    document.getElementById('share-modal').classList.add('hidden');
};

// Qolgan funksiyalar (Like, Comment, Video Player) avvalgidek qoldi
window.togglePlay = (video) => { video.paused ? video.play() : video.pause(); };

function setupVideoObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (entry.isIntersecting) video.play();
            else video.pause();
        });
    }, { threshold: 0.7 });
    document.querySelectorAll('.reel-video-wrapper').forEach(el => observer.observe(el));
}

window.toggleLike = async (id, btn) => {
    const likeRef = ref(db, `reels/${id}/likes/${auth.currentUser.uid}`);
    const countEl = btn.querySelector('.count');
    const heartEl = btn.querySelector('.heart-icon');
    const snap = await get(likeRef);
    let currentCount = parseInt(countEl.innerText);
    if (snap.exists()) {
        await set(likeRef, null);
        heartEl.innerText = "🤍";
        countEl.innerText = currentCount - 1;
    } else {
        await set(likeRef, true);
        heartEl.innerText = "❤️";
        countEl.innerText = currentCount + 1;
    }
};

window.openComments = (id) => {
    currentReelId = id;
    document.getElementById('comment-modal').classList.remove('hidden');
    loadComments(id);
};

function loadComments(id) {
    const list = document.getElementById('comments-list');
    onValue(ref(db, `reels/${id}/comments`), (snapshot) => {
        const data = snapshot.val();
        list.innerHTML = data ? "" : "<p style='text-align:center;'>Izohlar yo'q.</p>";
        if (data) {
            Object.values(data).forEach(async (c) => {
                const uSnap = await get(ref(db, `users/${c.uid}`));
                const uData = uSnap.val() || {};
                list.innerHTML += `<div style="margin-bottom:12px; display:flex; gap:10px;">
                    <img src="${uData.profileImg || 'https://via.placeholder.com/150'}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">
                    <div><b>${uData.username}</b><p style="margin:2px 0;">${c.text}</p></div>
                </div>`;
            });
        }
    });
}

document.getElementById('close-comments').onclick = () => document.getElementById('comment-modal').classList.add('hidden');
document.getElementById('send-comment').onclick = async () => {
    const textInput = document.getElementById('comment-text');
    if (!textInput.value.trim()) return;
    await push(ref(db, `reels/${currentReelId}/comments`), { uid: auth.currentUser.uid, text: textInput.value.trim(), timestamp: Date.now() });
    textInput.value = "";
};
