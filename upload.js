import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyC4kOm81jDJj7hP22B8oeRKajZhd2DFu7c",
    authDomain: "start-market-1.firebaseapp.com",
    projectId: "start-market-1",
    databaseURL: "https://start-market-1-default-rtdb.firebaseio.com/",
    appId: "1:665152006936:web:f89e2d76ebd88598668c6d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Auth ni ishga tushiramiz
const db = getDatabase(app);

// Cloudinary ma'lumotlari
const CLOUD_NAME = "ddpost4ql"; 
const UPLOAD_PRESET = "stargram_unsigned"; 

const fileInput = document.getElementById('video-file');
const uploadBtn = document.getElementById('upload-btn');
const statusContainer = document.getElementById('status-container');
const statusText = document.getElementById('status-text');

let currentUser = null;

// Foydalanuvchi tizimga kirganini tekshirish
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
    } else {
        // Agar tizimga kirmagan bo'lsa, login sahifasiga yo'naltirish
        window.location.href = "index.html";
    }
});

fileInput.addEventListener('change', (e) => {
    if(e.target.files[0]) {
        document.getElementById('file-name').innerText = e.target.files[0].name;
    }
});

uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    const caption = document.getElementById('video-caption').value;

    if (!file) return alert("Iltimos, fayl tanlang!");
    if (!currentUser) return alert("Yuklash uchun tizimga kiring!");

    uploadBtn.disabled = true;
    statusContainer.classList.remove('hidden');
    statusText.innerText = "Fayl serverga yuklanmoqda...";

    // Fayl turini aniqlash (image yoki video)
    const fileType = file.type.split('/')[0]; 
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${fileType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
        // 1. Cloudinary-ga yuklash
        const response = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: formData
        });
        const cloudData = await response.json();

        if (cloudData.secure_url) {
            statusText.innerText = "Ma'lumotlar bazaga saqlanmoqda...";

            // 2. Firebase Realtime Database-ga saqlash
            const reelsRef = ref(db, 'reels');
            const newReel = push(reelsRef);
            
            await set(newReel, {
                fileUrl: cloudData.secure_url,
                type: fileType, 
                caption: caption,
                userId: currentUser.uid, // Muhim: yuklovchining ID sini saqlaymiz
                userEmail: currentUser.email, // Qo'shimcha ma'lumot uchun
                timestamp: Date.now()
            });

            statusText.innerText = "Muvaffaqiyatli ulashildi!";
            setTimeout(() => window.location.href = "home.html", 1500);
        } else {
            throw new Error("Yuklashda xatolik yuz berdi");
        }
    } catch (error) {
        console.error(error);
        alert("Xatolik: " + error.message);
        uploadBtn.disabled = false;
        statusContainer.classList.add('hidden');
    }
});
