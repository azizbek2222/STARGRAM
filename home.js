import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC4kOm81jDJj7hP22B8oeRKajZhd2DFu7c",
  authDomain: "start-market-1.firebaseapp.com",
  projectId: "start-market-1",
  databaseURL: "https://start-market-1-default-rtdb.firebaseio.com/", 
  storageBucket: "start-market-1.firebasestorage.app",
  appId: "1:665152006936:web:f89e2d76ebd88598668c6d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const feedContainer = document.getElementById('feed-container');

const reelsRef = ref(db, 'reels');

onValue(reelsRef, (snapshot) => {
    const data = snapshot.val();
    feedContainer.innerHTML = ""; 

    if (data) {
        const reelsArray = Object.values(data).reverse();

        reelsArray.forEach(item => {
            // Profilga o'tish linki
            const profileLink = item.userId ? `window.location.href='user-profile.html?uid=${item.userId}'` : "";

            const postHTML = `
                <div class="post">
                    <div class="post-header" onclick="${profileLink}" style="cursor:pointer;">
                        <div class="user-avatar"></div>
                        <span>${item.username || "user_name"}</span>
                    </div>
                    <video class="post-video" src="${item.videoUrl}" loop muted autoplay onclick="this.paused ? this.play() : this.pause()"></video>
                    <div class="post-footer">
                        <div class="post-actions">
                            <span>❤️</span> <span>💬</span> <span>✈️</span>
                        </div>
                        <p style="margin: 5px 0;"><strong>${item.caption || "Ajoyib Reels!"}</strong></p>
                    </div>
                </div>
            `;
            feedContainer.innerHTML += postHTML;
        });
    } else {
        feedContainer.innerHTML = "<p style='text-align:center; padding:20px;'>Hozircha hech narsa yo'q. Birinchi bo'lib video yuklang!</p>";
    }
});
