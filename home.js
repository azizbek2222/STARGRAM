import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, get, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const feedContainer = document.getElementById('feed-container');
const otherStoriesContainer = document.getElementById('other-stories-container');
const myStoryImg = document.getElementById('my-story-img');

let myLastStory = null;
let currentStoryId = null;
let storyDuration = 5000;

onAuthStateChanged(auth, (user) => {
    if (user) {
        onValue(ref(db, `users/${user.uid}`), (snap) => {
            if (snap.val()?.profileImg) myStoryImg.src = snap.val().profileImg;
        });

        onValue(ref(db, 'stories'), (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const mine = Object.entries(data)
                    .filter(([id, s]) => s.userId === user.uid && s.timestamp > Date.now() - 86400000)
                    .sort((a, b) => b[1].timestamp - a[1].timestamp);
                if (mine.length > 0) {
                    myLastStory = { id: mine[0][0], ...mine[0][1] };
                }
            }
        });
        loadOtherStories();
    }
});

function loadOtherStories() {
    onValue(ref(db, 'stories'), (snapshot) => {
        otherStoriesContainer.innerHTML = "";
        const data = snapshot.val();
        if (data) {
            Object.entries(data).forEach(([id, s]) => {
                if (auth.currentUser && s.userId === auth.currentUser.uid) return;
                if (s.timestamp < Date.now() - 86400000) return;
                
                get(ref(db, `users/${s.userId}`)).then(uSnap => {
                    const userData = uSnap.val();
                    const storyDiv = document.createElement('div');
                    storyDiv.className = 'story-item';
                    storyDiv.onclick = () => showStory(id, s.mediaUrl, s.userId);
                    storyDiv.innerHTML = `
                        <div class="story-ring"><img src="${userData?.profileImg || 'https://via.placeholder.com/150'}"></div>
                        <span>${userData?.username || 'User'}</span>
                    `;
                    otherStoriesContainer.appendChild(storyDiv);
                });
            });
        }
    });
}

window.handleMyStoryClick = () => {
    if (myLastStory) showStory(myLastStory.id, myLastStory.mediaUrl, myLastStory.userId);
    else window.location.href = 'stories.html';
};

window.showStory = async (storyId, url, ownerId) => {
    currentStoryId = storyId;
    const viewer = document.getElementById('story-viewer');
    const video = document.getElementById('story-video');
    const fill = document.getElementById('progress-fill');
    const user = auth.currentUser;

    viewer.classList.remove('hidden');
    video.src = url;
    video.load();

    if (user && user.uid !== ownerId) {
        set(ref(db, `stories/${storyId}/views/${user.uid}`), true);
    }

    onValue(ref(db, `stories/${storyId}`), (snap) => {
        const data = snap.val();
        if (!data) return;
        document.getElementById('story-like-count').innerText = data.likes ? Object.keys(data.likes).length : 0;
        document.getElementById('story-like-btn').innerText = (data.likes && data.likes[user.uid]) ? "❤️" : "🤍";
        document.getElementById('story-view-info').innerText = `👁️ ${data.views ? Object.keys(data.views).length : 0}`;
    });

    video.onloadedmetadata = () => {
        storyDuration = video.duration * 1000;
        video.play();
        let start = Date.now();
        const anim = () => {
            let progress = ((Date.now() - start) / storyDuration) * 100;
            fill.style.width = Math.min(progress, 100) + '%';
            if (progress < 100) window.storyAnim = requestAnimationFrame(anim);
            else closeStory();
        };
        window.storyAnim = requestAnimationFrame(anim);
    };
};

window.toggleStoryLike = () => {
    const user = auth.currentUser;
    if (!user || !currentStoryId) return;
    const likeRef = ref(db, `stories/${currentStoryId}/likes/${user.uid}`);
    get(likeRef).then(snap => {
        if (snap.exists()) set(likeRef, null);
        else set(likeRef, true);
    });
};

window.openStats = async () => {
    if (!currentStoryId) return;
    const panel = document.getElementById('story-stats-panel');
    const likesList = document.getElementById('likes-list');
    const viewsList = document.getElementById('views-list');
    
    panel.classList.remove('hidden');
    likesList.innerHTML = "Yuklanmoqda...";
    viewsList.innerHTML = "Yuklanmoqda...";

    const snap = await get(ref(db, `stories/${currentStoryId}`));
    const data = snap.val();

    const fetchUsers = async (obj, container) => {
        container.innerHTML = "";
        if (!obj) { container.innerHTML = "Hech kim yo'q"; return; }
        for (let uid of Object.keys(obj)) {
            const uSnap = await get(ref(db, `users/${uid}`));
            const u = uSnap.val();
            container.innerHTML += `<div class="stat-user"><img src="${u?.profileImg || 'https://via.placeholder.com/150'}"> <span>${u?.username || 'User'}</span></div>`;
        }
    };

    fetchUsers(data?.likes, likesList);
    fetchUsers(data?.views, viewsList);
};

window.closeStats = () => document.getElementById('story-stats-panel').classList.add('hidden');

window.closeStory = () => {
    document.getElementById('story-viewer').classList.add('hidden');
    closeStats();
    document.getElementById('story-video').pause();
    cancelAnimationFrame(window.storyAnim);
};

// Postlar qismi o'zgarishsiz qoldi
onValue(ref(db, 'reels'), (snapshot) => {
    feedContainer.innerHTML = "";
    const data = snapshot.val();
    if (data) {
        Object.values(data).reverse().forEach(post => {
            const postDiv = document.createElement('div');
            postDiv.className = 'post';
            postDiv.innerHTML = `
                <div class="post-header">
                    <img class="user-avatar" id="avatar-${post.timestamp}" src="https://via.placeholder.com/150">
                    <span id="user-${post.timestamp}">Yuklanmoqda...</span>
                </div>
                <video class="post-video" src="${post.fileUrl}" loop muted autoplay onclick="this.paused?this.play():this.pause()"></video>
                <div class="post-footer">
                    <p><strong>${post.caption || ''}</strong></p>
                </div>`;
            feedContainer.appendChild(postDiv);
            get(ref(db, `users/${post.userId}`)).then(userSnap => {
                const userData = userSnap.val();
                if (userData) {
                    document.getElementById(`user-${post.timestamp}`).innerText = userData.username || "user";
                    if (userData.profileImg) document.getElementById(`avatar-${post.timestamp}`).src = userData.profileImg;
                }
            });
        });
    }
});