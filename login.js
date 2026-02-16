import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Se já estiver logado, vai direto pro sistema
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "sistema-navegacao-completo.html";
    }
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const erro = document.getElementById("erro");
    const overlay = document.getElementById("loadingOverlay");
    const progress = document.getElementById("progressFill");
    const botao = e.target.querySelector("button");

    erro.textContent = "";
    overlay.style.display = "flex";
    botao.disabled = true;

    // Simulação de progresso suave
    let largura = 0;
    const intervalo = setInterval(() => {
        if (largura < 90) {
            largura += 10;
            progress.style.width = largura + "%";
        }
    }, 150);

    try {
        await signInWithEmailAndPassword(auth, email, senha);

        progress.style.width = "100%";

        setTimeout(() => {
            window.location.href = "sistema-navegacao-completo.html";
        }, 300);

    } catch (error) {
        clearInterval(intervalo);
        overlay.style.display = "none";
        botao.disabled = false;
        progress.style.width = "0%";
        erro.textContent = "Email ou senha inválidos.";
    }
});

