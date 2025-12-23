import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const usernameEl = document.getElementById('settings-username');
const profileImgEl = document.getElementById('settings-profile-img');
const hashtagInput = document.getElementById('hashtag-input');
const saveHashtagBtn = document.getElementById('save-hashtag-btn');

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadUserData(user.uid);
    } else {
        window.location.href = "index.html";
    }
});

function loadUserData(uid) {
    const userRef = ref(db, 'users/' + uid);
    onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            usernameEl.innerText = data.username || "foydalanuvchi";
            if (data.profileImg) profileImgEl.src = data.profileImg;
            // Agar foydalanuvchida saqlangan heshteg bo'lsa, inputga yozamiz
            if (data.favHashtag) {
                hashtagInput.value = data.favHashtag;
            }
        }
    });
}

// Heshtegni saqlash
saveHashtagBtn.onclick = async () => {
    const user = auth.currentUser;
    const tag = hashtagInput.value.trim();
    if (user && tag) {
        await update(ref(db, 'users/' + user.uid), {
            favHashtag: tag
        });
        alert("Qiziqish saqlandi: " + tag);
    }
};

document.getElementById('verify-client-btn').onclick = () => {
    window.location.href = "verify.html";
};