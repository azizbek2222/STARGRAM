import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

onAuthStateChanged(auth, (user) => {
    if (user) {
        onValue(ref(db, `users/${user.uid}`), (snap) => {
            if (snap.val()?.profileImg) myStoryImg.src = snap.val().profileImg;
        });

        onValue(ref(db, 'stories'), (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const myStories = Object.values(data)
                    .filter(s => s.userId === user.uid && s.timestamp > (Date.now() - 86400000))
                    .sort((a, b) => b.timestamp - a.timestamp);
                myLastStory = myStories[0] || null;
            }
        });
    }
});

window.handleMyStoryClick = () => {
    myLastStory ? showStory(myLastStory.mediaUrl) : window.location.href = 'stories.html';
};

function showStory(url) {
    const viewer = document.getElementById('story-viewer');
    const video = document.getElementById('story-video');
    const fill = document.getElementById('progress-fill');
    
    viewer.classList.remove('hidden');
    video.src = url;
    fill.style.width = '0%';

    video.onloadedmetadata = () => {
        const duration = video.duration * 1000; // millisekundlarda
        video.play();

        let startTime = Date.now();
        
        const updateProgress = () => {
            let elapsed = Date.now() - startTime;
            let progress = (elapsed / duration) * 100;
            
            if (progress <= 100) {
                fill.style.width = progress + '%';
                window.storyAnimation = requestAnimationFrame(updateProgress);
            } else {
                closeStory();
            }
        };
        window.storyAnimation = requestAnimationFrame(updateProgress);
    };

    video.onended = () => {
        closeStory();
    };
}

window.closeStory = () => {
    const viewer = document.getElementById('story-viewer');
    const video = document.getElementById('story-video');
    viewer.classList.add('hidden');
    video.pause();
    video.src = "";
    cancelAnimationFrame(window.storyAnimation);
};

// Boshqalarning hikoyalari
onValue(ref(db, 'stories'), (snapshot) => {
    otherStoriesContainer.innerHTML = "";
    const data = snapshot.val();
    if (data) {
        Object.values(data).forEach(s => {
            if (auth.currentUser && s.userId === auth.currentUser.uid) return;
            if (s.timestamp < Date.now() - 86400000) return;
            
            get(ref(db, `users/${s.userId}`)).then(userSnap => {
                const userData = userSnap.val();
                const storyDiv = document.createElement('div');
                storyDiv.className = 'story-item';
                storyDiv.onclick = () => showStory(s.mediaUrl);
                storyDiv.innerHTML = `
                    <div class="story-ring"><img src="${userData?.profileImg || 'https://via.placeholder.com/150'}"></div>
                    <span>${userData?.username || 'User'}</span>
                `;
                otherStoriesContainer.appendChild(storyDiv);
            });
        });
    }
});

// Postlar
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