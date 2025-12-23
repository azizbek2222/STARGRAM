// Firebase kutubxonalarini CDN orqali yuklash
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC4kOm81jDJj7hP22B8oeRKajZhd2DFu7c",
  authDomain: "start-market-1.firebaseapp.com",
  projectId: "start-market-1",
  storageBucket: "start-market-1.firebasestorage.app",
  messagingSenderId: "665152006936",
  appId: "1:665152006936:web:f89e2d76ebd88598668c6d"
};

// Firebase-ni ishga tushirish
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Sahifalar orasida almashish funksiyasi
window.toggleAuth = () => {
    document.getElementById('login-card').classList.toggle('hidden');
    document.getElementById('register-card').classList.toggle('hidden');
};

// Ro'yxatdan o'tish (Register)
const regBtn = document.getElementById('register-btn');
if (regBtn) {
    regBtn.addEventListener('click', () => {
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-password').value;

        if (!email || !pass) {
            alert("Iltimos, barcha maydonlarni to'ldiring!");
            return;
        }

        createUserWithEmailAndPassword(auth, email, pass)
            .then((userCredential) => {
                alert("Muvaffaqiyatli ro'yxatdan o'tdingiz!");
                window.location.href = "home.html"; 
            })
            .catch((error) => {
                console.error(error);
                alert("Xatolik: " + error.message);
            });
    });
}

// Tizimga kirish (Login)
const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;

        if (!email || !pass) {
            alert("Email va parolni kiriting!");
            return;
        }

        signInWithEmailAndPassword(auth, email, pass)
            .then((userCredential) => {
                alert("Xush kelibsiz!");
                window.location.href = "home.html";
            })
            .catch((error) => {
                console.error(error);
                alert("Xatolik: Kirishda muammo yuz berdi. Parol yoki email noto'g'ri bo'lishi mumkin.");
            });
    });
}
