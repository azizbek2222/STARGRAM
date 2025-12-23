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
const usernameEl = document.getElementById('display-username');
const profileImgEl = document.getElementById('profile-img');
const editModal = document.getElementById('edit-modal');
const usernameError = document.getElementById('username-error');

let currentUser = null;

const CLOUD_NAME = "ddpost4ql"; 
const UPLOAD_PRESET = "stargram_unsigned"; 

// 1. Foydalanuvchi holatini tekshirish
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadUserProfile(user.uid);
        loadUserPosts(user.uid);
    } else {
        window.location.href = "index.html";
    }
});

// 2. Profil ma'lumotlarini yuklash (Nishonni ko'rsatish bilan)
function loadUserProfile(uid) {
    const userRef = ref(db, 'users/' + uid);
    onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // isVerified true bo'lsa, nishon.png ni qo'shadi
            const badgeHtml = data.isVerified ? `<img src="nishon.png" class="badge-img" alt="verified">` : "";
            usernameEl.innerHTML = (data.username || "foydalanuvchi") + badgeHtml;
            profileImgEl.src = data.profileImg || "https://via.placeholder.com/150";
        }
    });
}

// 3. Postlarni yuklash
function loadUserPosts(uid) {
    const reelsRef = ref(db, 'reels');
    onValue(reelsRef, (snapshot) => {
        const data = snapshot.val();
        postsContainer.innerHTML = ""; 
        let count = 0;

        if (data) {
            Object.values(data).reverse().forEach(item => {
                if (item.userId === uid) {
                    count++;
                    const div = document.createElement('div');
                    div.className = 'grid-item';
                    
                    if (item.type === 'video') {
                        div.innerHTML = `<video src="${item.fileUrl || item.videoUrl}" muted loop></video>`;
                    } else {
                        div.innerHTML = `<img src="${item.fileUrl || item.videoUrl}" alt="Post">`;
                    }
                    postsContainer.appendChild(div);
                }
            });
        }
        postCountEl.innerText = count; 
        
        if (count === 0) {
            postsContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 20px; color: gray;">Hozircha postlaringiz yo'q</p>`;
        }
    });
}

// 4. Tahrirlash
document.getElementById('edit-btn').onclick = () => {
    editModal.classList.remove('hidden');
    usernameError.style.display = 'none';
};

document.getElementById('close-modal').onclick = () => editModal.classList.add('hidden');

document.getElementById('save-profile').onclick = async () => {
    const newName = document.getElementById('new-username').value.trim();
    if (!newName || !currentUser) return;

    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    const users = snapshot.val();
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

// 5. Rasm yuklash
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

// Sozlamalarga o'tish
const settingsBtn = document.getElementById('go-to-settings');
if(settingsBtn) {
    settingsBtn.onclick = () => {
        window.location.href = "sozlamalar.html";
    };
}