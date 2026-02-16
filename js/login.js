import { auth } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ======================================
   CONFIGURAÇÃO DE SESSÃO
====================================== */

// Sessão só dura enquanto o navegador estiver aberto
await setPersistence(auth, browserSessionPersistence);

// Sempre que abrir a tela de login, força logout
await signOut(auth);

/* ======================================
   LOGIN
====================================== */

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

  // Animação da barra
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
      window.location.href = "sistema.html";
    }, 300);

  } catch (error) {
    clearInterval(intervalo);
    overlay.style.display = "none";
    botao.disabled = false;
    progress.style.width = "0%";
    erro.textContent = "Email ou senha inválidos.";
  }
});
