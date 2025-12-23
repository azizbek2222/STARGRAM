import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, update, push, set, get, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
let currentUserData = null;

// 1. Foydalanuvchi holatini tekshirish
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userSnap = await get(ref(db, `users/${user.uid}`));
        currentUserData = userSnap.val() || {};
        loadReelsOnce(); 
    } else {
        window.location.href = "index.html";
    }
});

// 2. Reelslarni yuklash va saralash
async function loadReelsOnce() {
    const reelsRef = ref(db, 'reels');
    const snapshot = await get(reelsRef);
    const data = snapshot.val();
    
    if (!data) {
        container.innerHTML = "<p style='color:white; text-align:center; padding-top:50px;'>Videolar yo'q.</p>";
        return;
    }

    let reelsList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    
    // Heshteg bo'yicha saralash (AI mantiq)
    const favTag = currentUserData.favHashtag ? currentUserData.favHashtag.toLowerCase() : null;
    reelsList.sort((a, b) => {
        const aHasTag = favTag && a.caption && a.caption.toLowerCase().includes(favTag);
        const bHasTag = favTag && b.caption && b.caption.toLowerCase().includes(favTag);
        if (aHasTag && !bHasTag) return -1;
        if (!aHasTag && bHasTag) return 1;
        return 0; 
    });

    container.innerHTML = "";
    
    for (const reel of reelsList) {
        const likes = reel.likesCount || 0;
        let creatorHtml = `@user`;
        const creatorSnap = await get(ref(db, `users/${reel.userId}`));
        if (creatorSnap.exists()) {
            const cData = creatorSnap.val();
            const badge = cData.isVerified ? `<img src="nishon.png" class="badge-img">` : "";
            creatorHtml = `@${cData.username || "user"}${badge}`;
        }

        const reelHTML = `
            <div class="reel-video-wrapper" id="reel-${reel.id}">
                <video class="reel-video" src="${reel.fileUrl || reel.videoUrl}" loop playsinline onclick="window.togglePlay(this)"></video>
                <div class="reel-actions">
                    <div class="action-btn" onclick="window.toggleLike('${reel.id}')">
                        <span class="heart" id="heart-${reel.id}">🤍</span>
                        <span class="count" id="count-${reel.id}">${likes}</span>
                    </div>
                    <div class="action-btn" onclick="window.openComments('${reel.id}')">
                        <span>💬</span>
                        <span>Izohlar</span>
                    </div>
                </div>
                <div class="reel-info">
                    <h3>${creatorHtml}</h3>
                    <p>${reel.caption || ''}</p>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', reelHTML);
        window.checkIfLiked(reel.id);
    }
    setupAutoPlay();
}

// 3. Avtomatik ijro (IntersectionObserver)
function setupAutoPlay() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (entry.isIntersecting) {
                video.play().catch(() => {});
            } else {
                video.pause();
                video.currentTime = 0;
            }
        });
    }, { threshold: 0.8 });

    document.querySelectorAll('.reel-video-wrapper').forEach(wrapper => {
        observer.observe(wrapper);
    });
}

// --- GLOBAL FUNKSIYALAR (HTML'dan chaqirish uchun window'ga ulaymiz) ---

window.togglePlay = (video) => {
    if (video.paused) video.play();
    else video.pause();
};

window.toggleLike = async (reelId) => {
    const user = auth.currentUser;
    if (!user) return;

    const heart = document.getElementById(`heart-${reelId}`);
    const countEl = document.getElementById(`count-${reelId}`);
    const likeRef = ref(db, `reels/${reelId}/likes/${user.uid}`);
    const countRef = ref(db, `reels/${reelId}/likesCount`);

    const snap = await get(likeRef);
    if (snap.exists()) {
        // Laykni olib tashlash
        await set(likeRef, null);
        await runTransaction(countRef, (current) => (current || 1) - 1);
        heart.innerText = "🤍";
        heart.classList.remove('liked');
        countEl.innerText = parseInt(countEl.innerText) - 1;
    } else {
        // Layk bosish
        await set(likeRef, true);
        await runTransaction(countRef, (current) => (current || 0) + 1);
        heart.innerText = "❤️";
        heart.classList.add('liked');
        countEl.innerText = parseInt(countEl.innerText) + 1;
    }
};

window.checkIfLiked = async (reelId) => {
    const user = auth.currentUser;
    if (!user) return;
    const snap = await get(ref(db, `reels/${reelId}/likes/${user.uid}`));
    if (snap.exists()) {
        const heart = document.getElementById(`heart-${reelId}`);
        if(heart) {
            heart.innerText = "❤️";
            heart.classList.add('liked');
        }
    }
};

window.openComments = (reelId) => {
    currentReelId = reelId;
    document.getElementById('comment-modal').classList.remove('hidden');
    const list = document.getElementById('comments-list');
    
    onValue(ref(db, `reels/${reelId}/comments`), (snap) => {
        list.innerHTML = "";
        const data = snap.val();
        if (data) {
            Object.values(data).forEach(async (c) => {
                const uSnap = await get(ref(db, `users/${c.uid}`));
                const uData = uSnap.val() || {};
                const badge = uData.isVerified ? `<img src="nishon.png" style="width:12px; margin-left:3px;">` : "";
                
                list.innerHTML += `
                    <div class="comment-item" style="margin-bottom:10px; display:flex; gap:10px;">
                        <img src="${uData.profileImg || 'https://via.placeholder.com/150'}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">
                        <div>
                            <b>${uData.username || 'user'}${badge}</b>
                            <p style="margin:2px 0;">${c.text}</p>
                        </div>
                    </div>`;
            });
        } else {
            list.innerHTML = "Hozircha izohlar yo'q.";
        }
    });
};

document.getElementById('close-comments').onclick = () => {
    document.getElementById('comment-modal').classList.add('hidden');
};

document.getElementById('send-comment').onclick = async () => {
    const textInput = document.getElementById('comment-text');
    const text = textInput.value.trim();
    if (!text || !currentReelId || !auth.currentUser) return;

    const commentRef = ref(db, `reels/${currentReelId}/comments`);
    await push(commentRef, {
        text: text,
        uid: auth.currentUser.uid,
        timestamp: Date.now()
    });
    textInput.value = "";
};