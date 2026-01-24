import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const CLOUD_NAME = "ddpost4ql"; 
const UPLOAD_PRESET = "stargram_unsigned"; 

const fileInp = document.getElementById('story-file');
const previewVid = document.getElementById('preview-video');
const fileLabel = document.getElementById('file-label');
const uploadBtn = document.getElementById('story-upload-btn');

let currentUser = null;

// Foydalanuvchini tekshirish
onAuthStateChanged(auth, (user) => {
    if (user) currentUser = user;
    else window.location.href = "login.html";
});

// Video tanlanganda preview qilish
fileInp.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        previewVid.src = URL.createObjectURL(file);
        previewVid.classList.remove('hidden');
        fileLabel.classList.add('hidden');
    }
});

// Yuklash funksiyasi
uploadBtn.addEventListener('click', async () => {
    const file = fileInp.files[0];
    const caption = document.getElementById('story-caption').value;

    if (!file) return alert("Avval video tanlang!");
    
    // Tugmani vaqtincha o'chiramiz (ko'p marta bosmaslik uchun)
    uploadBtn.innerText = "Yuklanmoqda...";
    uploadBtn.disabled = true;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
        // 1. Cloudinary-ga yuborish
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
            method: 'POST',
            body: formData
        });
        const cloudData = await res.json();

        if (cloudData.secure_url) {
            // 2. Profil ma'lumotlarini olish (home.js da ko'rinishi uchun)
            const userSnap = await get(ref(db, `users/${currentUser.uid}`));
            const profile = userSnap.val() || {};

            // 3. Firebase-ga yozish
            const storyRef = push(ref(db, 'stories'));
            await set(storyRef, {
                mediaUrl: cloudData.secure_url,
                caption: caption,
                userId: currentUser.uid,
                userName: profile.username || currentUser.email.split('@')[0],
                userImg: profile.profileImg || 'https://via.placeholder.com/150',
                timestamp: Date.now(),
                expiresAt: Date.now() + (24 * 60 * 60 * 1000)
            });

            window.location.href = "home.html";
        }
    } catch (error) {
        console.error(error);
        alert("Xatolik! Internetni tekshiring.");
        uploadBtn.innerText = "Ulashish";
        uploadBtn.disabled = false;
    }
});