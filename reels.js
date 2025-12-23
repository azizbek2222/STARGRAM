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

// Videolarni aralashtirish funksiyasi (Random qilish uchun)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userSnap = await get(ref(db, `users/${user.uid}`));
        currentUserData = userSnap.val() || {};
        loadReels();
    } else {
        window.location.href = "index.html";
    }
});

function loadReels() {
    onValue(ref(db, 'reels'), (snapshot) => {
        const data = snapshot.val();
        container.innerHTML = "";
        if (data) {
            let reelsList = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));

            // Videolarni random qilish
            reelsList = shuffleArray(reelsList);

            reelsList.forEach(reel => {
                createReelElement(reel);
            });
            setupVideoObserver();
        } else {
            container.innerHTML = '<div style="color:white; text-align:center; margin-top:50vh;">Reelslar topilmadi.</div>';
        }
    });
}

function createReelElement(reel) {
    const wrapper = document.createElement('div');
    wrapper.className = 'reel-video-wrapper';
    wrapper.dataset.id = reel.id;

    const likedClass = (reel.likes && auth.currentUser && reel.likes[auth.currentUser.uid]) ? 'liked' : '';
    const likesCount = reel.likes ? Object.keys(reel.likes).length : 0;

    // Foydalanuvchi ma'lumotlarini olish
    get(ref(db, `users/${reel.userId}`)).then(userSnap => {
        const userData = userSnap.val() || {};
        const badge = userData.isVerified ? `<img src="nishon.png" class="badge-img">` : "";

        wrapper.innerHTML = `
            <video src="${reel.fileUrl}" loop playsinline></video>
            <div class="reel-actions">
                <div class="action-btn" onclick="toggleLike('${reel.id}', this)">
                    <span class="${likedClass}">❤️</span>
                    <span class="count">${likesCount}</span>
                </div>
                <div class="action-btn" onclick="openComments('${reel.id}')">
                    <span>💬</span>
                    <span class="count">${reel.comments ? Object.keys(reel.comments).length : 0}</span>
                </div>
                <div class="action-btn">
                    <span>✈️</span>
                </div>
            </div>
            <div class="reel-info">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                    <img src="${userData.profileImg || 'https://via.placeholder.com/150'}" style="width:35px; height:35px; border-radius:50%; border:1px solid white;">
                    <b>${userData.username || 'user'}${badge}</b>
                </div>
                <p>${reel.caption || ''}</p>
            </div>
        `;
    });

    container.appendChild(wrapper);
}

function setupVideoObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (entry.isIntersecting) {
                video.play();
                currentReelId = entry.target.dataset.id;
            } else {
                video.pause();
                video.currentTime = 0;
            }
        });
    }, { threshold: 0.8 });

    document.querySelectorAll('.reel-video-wrapper').forEach(el => observer.observe(el));
}

// Like va Comment funksiyalari window obyektiga biriktiriladi
window.toggleLike = async (id, btn) => {
    if (!auth.currentUser) return;
    const likeRef = ref(db, `reels/${id}/likes/${auth.currentUser.uid}`);
    const snap = await get(likeRef);
    
    if (snap.exists()) {
        await set(likeRef, null);
    } else {
        await set(likeRef, true);
    }
};

window.openComments = (id) => {
    currentReelId = id;
    const modal = document.getElementById('comment-modal');
    modal.classList.remove('hidden');
    loadComments(id);
};

function loadComments(id) {
    const list = document.getElementById('comments-list');
    onValue(ref(db, `reels/${id}/comments`), (snapshot) => {
        const data = snapshot.val();
        list.innerHTML = "";
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
                            <p style="margin:2px 0; color:#333;">${c.text}</p>
                        </div>
                    </div>`;
            });
        } else {
            list.innerHTML = "<p style='padding:10px;'>Hozircha izohlar yo'q.</p>";
        }
    });
}

document.getElementById('close-comments').onclick = () => {
    document.getElementById('comment-modal').classList.add('hidden');
};

document.getElementById('send-comment').onclick = async () => {
    const textInput = document.getElementById('comment-text');
    const text = textInput.value.trim();
    if (!text || !currentReelId || !auth.currentUser) return;

    const commentRef = push(ref(db, `reels/${currentReelId}/comments`));
    await set(commentRef, {
        uid: auth.currentUser.uid,
        text: text,
        timestamp: Date.now()
    });
    textInput.value = "";
};