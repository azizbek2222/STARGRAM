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

// 1. Foydalanuvchi ma'lumotlarini olish
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userSnap = await get(ref(db, `users/${user.uid}`));
        currentUserData = userSnap.val() || { username: "foydalanuvchi", profileImg: "https://via.placeholder.com/150" };
        loadReelsOnce(); 
    } else {
        window.location.href = "index.html";
    }
});

// Random qilish funksiyasi
function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

// 2. Reels yuklash (Random va Ovoz bilan)
async function loadReelsOnce() {
    const reelsRef = ref(db, 'reels');
    const snapshot = await get(reelsRef); 
    const data = snapshot.val();
    
    if (!data) {
        container.innerHTML = "Hozircha videolar yo'q.";
        return;
    }

    // Videolarni random (tasodifiy) tartibda saralash
    let reelsList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    reelsList = shuffle(reelsList);

    container.innerHTML = "";
    
    for (const reel of reelsList) {
        const likes = reel.likesCount || 0;
        
        let creatorUsername = "user";
        if (reel.userId) {
            const creatorSnap = await get(ref(db, `users/${reel.userId}`));
            if (creatorSnap.exists()) {
                creatorUsername = creatorSnap.val().username || "user";
            }
        }

        const reelHTML = `
            <div class="reel-video-wrapper" id="reel-${reel.id}">
                <video class="reel-video" src="${reel.fileUrl || reel.videoUrl}" loop playsinline onclick="togglePlay(this)"></video>
                
                <div class="reel-actions">
                    <div class="action-btn" onclick="toggleLike('${reel.id}', this)">
                        <span class="heart" id="heart-${reel.id}">🤍</span>
                        <span class="count" id="count-${reel.id}">${likes}</span>
                    </div>
                    <div class="action-btn" onclick="openComments('${reel.id}')">
                        <span>💬</span>
                        <span>Izohlar</span>
                    </div>
                </div>

                <div class="reel-info">
                    <h3>@${creatorUsername}</h3>
                    <p>${reel.caption || ''}</p>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', reelHTML);
        checkIfLiked(reel.id);
    }

    setupAutoPlay();
}

async function checkIfLiked(reelId) {
    if(!auth.currentUser) return;
    const likeRef = ref(db, `likes/${reelId}/${auth.currentUser.uid}`);
    const snap = await get(likeRef);
    if(snap.exists()){
        const heart = document.getElementById(`heart-${reelId}`);
        if(heart) {
            heart.innerText = "❤️";
            heart.classList.add('liked');
        }
    }
}

function setupAutoPlay() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (entry.isIntersecting) {
                // Brauzerlar ovozli videoni avtomatik qo'yishga ruxsat bermasligi mumkin, 
                // shuning uchun catch ishlatamiz.
                video.play().catch(() => {
                    console.log("Ovozli video uchun foydalanuvchi harakati kerak.");
                });
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.8 });

    document.querySelectorAll('.reel-video-wrapper').forEach(wrapper => observer.observe(wrapper));
}

window.togglePlay = (video) => {
    if (video.paused) {
        video.play();
        video.muted = false; // Bosilganda ovozni kafolatlangan holda yoqish
    } else {
        video.pause();
    }
};

window.toggleLike = async (reelId, btn) => {
    if (!auth.currentUser) return;
    
    const heart = document.getElementById(`heart-${reelId}`);
    const countEl = document.getElementById(`count-${reelId}`);
    const uid = auth.currentUser.uid;
    const likeRef = ref(db, `likes/${reelId}/${uid}`);
    const reelLikesRef = ref(db, `reels/${reelId}/likesCount`);

    const likeSnap = await get(likeRef);

    if (likeSnap.exists()) {
        await set(likeRef, null);
        heart.innerText = "🤍";
        heart.classList.remove('liked');
        await runTransaction(reelLikesRef, (currentCount) => (currentCount || 1) - 1);
    } else {
        await set(likeRef, true);
        heart.innerText = "❤️";
        heart.classList.add('liked');
        await runTransaction(reelLikesRef, (currentCount) => (currentCount || 0) + 1);
    }

    const updatedSnap = await get(reelLikesRef);
    countEl.innerText = updatedSnap.val() || 0;
};

window.openComments = function(reelId) {
    currentReelId = reelId;
    document.getElementById('comment-modal').classList.remove('hidden');
    const list = document.getElementById('comments-list');
    
    onValue(ref(db, `reels/${reelId}/comments`), (snap) => {
        list.innerHTML = "";
        const data = snap.val();
        if (data) {
            Object.values(data).forEach(c => {
                list.innerHTML += `
                    <div class="comment-item">
                        <img src="${c.userImg || 'https://via.placeholder.com/150'}" style="width:30px; height:30px; border-radius:50%; margin-right:10px; vertical-align:middle; object-fit:cover;">
                        <b>${c.username}:</b> ${c.text}
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
    if (!text || !currentReelId || !currentUserData) return;

    const commentRef = ref(db, `reels/${currentReelId}/comments`);
    const newComment = push(commentRef);
    
    await set(newComment, {
        text: text,
        username: currentUserData.username,
        userImg: currentUserData.profileImg,
        uid: auth.currentUser.uid,
        timestamp: Date.now()
    });

    textInput.value = "";
};
