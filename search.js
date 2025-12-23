import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyC4kOm81jDJj7hP22B8oeRKajZhd2DFu7c",
    authDomain: "start-market-1.firebaseapp.com",
    projectId: "start-market-1",
    databaseURL: "https://start-market-1-default-rtdb.firebaseio.com/",
    appId: "1:665152006936:web:f89e2d76ebd88598668c6d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const searchInput = document.getElementById('search-input');
const resultsContainer = document.getElementById('search-results');

let allUsers = [];

// 1. Barcha foydalanuvchilarni bir marta yuklab olish
onValue(ref(db, 'users'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
        allUsers = Object.keys(data).map(key => ({
            uid: key,
            ...data[key]
        }));
    }
});

// 2. Qidiruv funksiyasi
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    resultsContainer.innerHTML = "";

    if (term === "") {
        resultsContainer.innerHTML = '<p class="placeholder-text">Foydalanuvchilarni izlang...</p>';
        return;
    }

    const filtered = allUsers.filter(user => 
        (user.username && user.username.toLowerCase().includes(term))
    );

    if (filtered.length > 0) {
        filtered.forEach(user => {
            const userEl = document.createElement('div');
            userEl.className = 'user-item';
            userEl.style.cursor = 'pointer';
            userEl.onclick = () => {
                // Foydalanuvchi profiliga o'tish
                window.location.href = `user-profile.html?uid=${user.uid}`;
            };
            
            userEl.innerHTML = `
                <img src="${user.profileImg || 'https://via.placeholder.com/150'}" alt="avatar">
                <div class="user-info">
                    <span class="username">${user.username || 'foydalanuvchi'}</span>
                    <span class="full-name">STARGRAM foydalanuvchisi</span>
                </div>
            `;
            resultsContainer.appendChild(userEl);
        });
    } else {
        resultsContainer.innerHTML = '<p class="placeholder-text">Hech kim topilmadi.</p>';
    }
});
