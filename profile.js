import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
const editModal = document.getElementById('edit-modal');
const usernameError = document.getElementById('username-error');

let currentUser = null;

const CLOUD_NAME = "ddpost4ql"; 
const UPLOAD_PRESET = "stargram_uploads";

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

// Obunachilar va obunalarni real vaqtda hisoblash
function loadStats() {
    onValue(ref(db, 'follows'), (snapshot) => {
        const data = snapshot.val() || {};
        let followers = 0;
        let following = 0;
        
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
        const data = snapshot.val();
        postsContainer.innerHTML = "";
        let count = 0;
        if (data) {
            Object.values(data).reverse().forEach(post => {
                if (post.userId === currentUser.uid) {
                    count++;
                    const div = document.createElement('div');
                    div.className = 'grid-item';
                    div.innerHTML = `<video src="${post.fileUrl}"></video>`;
                    postsContainer.appendChild(div);
                }
            });
        }
        postCountEl.innerText = count;
    });
}

// Modal ochish/yopish
document.getElementById('edit-btn').onclick = () => editModal.classList.remove('hidden');
document.getElementById('close-modal').onclick = () => editModal.classList.add('hidden');

// Saqlash funksiyasi
document.getElementById('save-profile').onclick = async () => {
    const newName = document.getElementById('new-username').value.trim();
    if (!newName) return;

    const usersSnap = await get(ref(db, 'users'));
    const users = usersSnap.val();
    let isTaken = false;

    if (users) {
        Object.keys(users).forEach(uid => {
            if (uid !== currentUser.uid && users[uid].username && users[uid].username.toLowerCase() === newName.toLowerCase()) {
                isTaken = true;
            }
        });
    }

    if (isTaken) {
        usernameError.style.display = 'block';
    } else {
        await update(ref(db, 'users/' + currentUser.uid), { username: newName });
        editModal.classList.add('hidden');
        usernameError.style.display = 'none';
    }
};

// Rasm yuklash
document.getElementById('avatar-input').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });
        const cloudData = await response.json();
        
        if (cloudData.secure_url) {
            await update(ref(db, 'users/' + currentUser.uid), {
                profileImg: cloudData.secure_url
            });
        }
    } catch (error) {
        console.error("Xato:", error);
    }
};

document.getElementById('go-to-settings').onclick = () => {
    window.location.href = 'settings.html';
};
