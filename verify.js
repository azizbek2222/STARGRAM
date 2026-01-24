import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const verifyBtn = document.getElementById('get-badge-btn');
const successModal = document.getElementById('success-modal');

let userId = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid;
    } else {
        window.location.href = "login.html";
    }
});

verifyBtn.onclick = async () => {
    if (!userId) return;

    try {
        // Ma'lumotlar bazasida foydalanuvchini tasdiqlangan deb belgilaymiz
        await update(ref(db, 'users/' + userId), {
            isVerified: true
        });

        // Muvaffaqiyatli xabarni ko'rsatish
        successModal.classList.remove('hidden');
    } catch (error) {
        alert("Xatolik yuz berdi: " + error.message);
    }
};