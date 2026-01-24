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
const editModal = document.getElementById('edit-modal');
let currentUser = null;

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

// 3 ta chiziq tugmasini ishlashi
document.getElementById('go-to-settings').onclick = () => {
    window.location.href = 'settings.html';
};

// Profil ma'lumotlarini yuklash
function loadUserData() {
    onValue(ref(db, 'users/' + currentUser.uid), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('display-username').innerText = data.username || "foydalanuvchi";
            if (data.profileImg) document.getElementById('profile-img').src = data.profileImg;
        }
    });
}

// Videolarni yuklash (Layk va Ko'rishlar bilan)
function loadUserPosts() {
    onValue(ref(db, 'reels'), (snapshot) => {
        postsContainer.innerHTML = "";
        let count = 0;
        const data = snapshot.val();
        if (data) {
            Object.keys(data).reverse().forEach(key => {
                const post = data[key];
                if (post.userId === currentUser.uid) {
                    count++;
                    const likes = post.likes ? Object.keys(post.likes).length : 0;
                    const views = post.views ? Object.keys(post.views).length : 0;
                    
                    const div = document.createElement('div');
                    div.className = 'grid-item';
                    div.innerHTML = `
                        <video src="${post.fileUrl}" muted playsinline></video>
                        <div class="grid-item-overlay">
                            <span>❤️ ${likes}</span>
                            <span>👁️ ${views}</span>
                        </div>
                    `;
                    div.onclick = () => openFullVideo(key, post);
                    postsContainer.appendChild(div);
                }
            });
        }
        document.getElementById('post-count').innerText = count;
    });
}

// Tahrirlash tugmasini ishlashi
document.getElementById('edit-btn').onclick = () => editModal.classList.remove('hidden');
document.getElementById('close-modal').onclick = () => {
    editModal.classList.add('hidden');
    document.getElementById('username-error').style.display = 'none';
};

document.getElementById('save-profile').onclick = async () => {
    const newName = document.getElementById('new-username').value.trim();
    if (!newName) return;

    const usersSnap = await get(ref(db, 'users'));
    const users = usersSnap.val();
    let taken = false;
    Object.keys(users).forEach(uid => {
        if (uid !== currentUser.uid && users[uid].username === newName) taken = true;
    });

    if (taken) {
        document.getElementById('username-error').style.display = 'block';
    } else {
        await update(ref(db, 'users/' + currentUser.uid), { username: newName });
        editModal.classList.add('hidden');
    }
};

// Video Full Modal funksiyalari
function openFullVideo(id, post) {
    const videoModal = document.getElementById('video-modal');
    const container = document.getElementById('modal-video-container');
    videoModal.classList.remove('hidden');
    
    // Ko'rishlar sonini oshirish
    set(ref(db, `reels/${id}/views/${currentUser.uid}`), true);

    container.innerHTML = `
        <div style="width:100%; position:relative;">
            <video src="${post.fileUrl}" autoplay loop controls style="width:100%; max-height:100vh;"></video>
        </div>
    `;
}

document.getElementById('close-video-modal').onclick = () => {
    document.getElementById('video-modal').classList.add('hidden');
    document.getElementById('modal-video-container').innerHTML = "";
};

function loadStats() {
    onValue(ref(db, 'follows'), (snapshot) => {
        const data = snapshot.val() || {};
        let f1 = 0; let f2 = 0;
        Object.values(data).forEach(r => {
            if (r.to === currentUser.uid) f1++;
            if (r.from === currentUser.uid) f2++;
        });
        document.getElementById('follower-count').innerText = f1;
        document.getElementById('following-count').innerText = f2;
    });
}
