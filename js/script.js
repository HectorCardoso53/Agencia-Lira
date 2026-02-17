import { auth, db, storage } from "./firebase.js";
import {
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

let passagens = [];
let encomendas = [];

let usuarioLogadoEmail = "";

let graficoReceita;
let graficoEvolucao;

let graficoResumo;
let graficoEvolucaoDashboard;

function gerarGraficosDashboard(receitaPass, receitaEnc) {
  const ctxResumo = document.getElementById("graficoResumo");
  const ctxEvolucao = document.getElementById("graficoEvolucaoDashboard");

  if (graficoResumo) graficoResumo.destroy();
  if (graficoEvolucaoDashboard) graficoEvolucaoDashboard.destroy();

  // 📊 Comparativo
  graficoResumo = new Chart(ctxResumo, {
    type: "doughnut",
    data: {
      labels: ["Passagens", "Encomendas"],
      datasets: [
        {
          data: [receitaPass, receitaEnc],
          backgroundColor: ["#1f4e79", "#2ecc71"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });

  // 📈 Evolução diária
  const receitasPorData = {};

  [...passagens, ...encomendas].forEach((item) => {
    const data = item.dataViagem;
    receitasPorData[data] = (receitasPorData[data] || 0) + item.valor;
  });

  const labels = Object.keys(receitasPorData).sort();
  const valores = labels.map((d) => receitasPorData[d]);

  graficoEvolucaoDashboard = new Chart(ctxEvolucao, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Receita diária",
          data: valores,
          borderColor: "#1f4e79",
          backgroundColor: "rgba(31,78,121,0.1)",
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

window.logout = async function () {
  await signOut(auth);
  window.location.href = "index.html";
};

async function carregarDados() {
  passagens = [];
  encomendas = [];

  const queryPassagens = await getDocs(collection(db, "passagens"));
  queryPassagens.forEach((docSnap) => {
    passagens.push({ ...docSnap.data(), id: docSnap.id });
  });

  const queryEncomendas = await getDocs(collection(db, "encomendas"));
  queryEncomendas.forEach((docSnap) => {
    encomendas.push({ id: docSnap.id, ...docSnap.data() });
  });

  renderizarPassagens();
  renderizarEncomendas();
  atualizarDashboard();
}

// Navegação entre abas
window.showTab = function (tabName, element) {
  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.remove("active");
  });
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  document.getElementById(tabName).classList.add("active");
  if (element) {
    element.classList.add("active");
  }

  if (tabName === "dashboard") {
    atualizarDashboard();
  }
};

// PASSAGENS
document.getElementById("formPassagem")
.addEventListener("submit", async function (e) {
  e.preventDefault();

  const nome = nomePassageiro.value.trim();
  const cpf = cpfPassageiro.value.trim();
  const nascimento = dataNascimento.value;
  const telefoneVal = telefone.value.trim();
  const emailVal = emailPassageiro.value.trim();
  const embarqueVal = embarque.value;
  const destinoVal = destino.value;
  const bilheteVal = bilhete.value.trim();
  const dataVal = dataViagem.value;

  let valor = valorPassagem.value
    .replace("R$ ", "")
    .replace(/\./g, "")
    .replace(",", ".");

  valor = parseFloat(valor);

  // 🔴 VALIDAÇÃO COMPLETA
  if (
    !nome ||
    !cpf ||
    !nascimento ||
    !telefoneVal ||
    !emailVal ||
    !embarqueVal ||
    !destinoVal ||
    !bilheteVal ||
    !dataVal ||
    isNaN(valor) ||
    valor <= 0
  ) {
    alert("❌ TODOS os campos são obrigatórios e valor deve ser maior que zero!");
    return;
  }

  if (cpf.replace(/\D/g, "").length !== 11) {
    alert("❌ CPF inválido!");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
    alert("❌ Email inválido!");
    return;
  }

  const passagem = {
    bilhete: bilheteVal,
    nome,
    cpf,
    dataNascimento: nascimento,
    telefone: telefoneVal,
    email: emailVal,
    embarque: embarqueVal,
    destino: destinoVal,
    valor,
    dataViagem: dataVal,
    status: "ATIVO",
    dataCadastro: new Date().toISOString(),
  };

  await addDoc(collection(db, "passagens"), passagem);

  alert("✅ Passagem cadastrada com sucesso!");
  limparFormPassagem();
  await carregarDados();
});


window.limparFormPassagem = function () {
  document.getElementById("formPassagem").reset();
  const hoje = new Date().toISOString().split("T")[0];
  document.getElementById("dataViagem").value = hoje;
};

function renderizarPassagens() {
  const tbody = document.getElementById("passagensBody");

  if (!passagens || passagens.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10"
          style="text-align:center; color: var(--text-light);">
          Nenhuma passagem cadastrada
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = passagens.map(p => `
    <tr>
      <td>${p.bilhete}</td>
      <td>${p.nome}</td>
      <td>${p.cpf}</td>
      <td>${p.email}</td>
      <td>${p.embarque}</td>
      <td>${p.destino}</td>
      <td>${new Date(p.dataViagem).toLocaleDateString("pt-BR")}</td>
      <td>R$ ${p.valor.toFixed(2)}</td>
      <td>
        <span class="status-badge status-${p.status.toLowerCase()}">
          ${p.status}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-small"
            onclick="gerarComprovantePassagem('${p.id}')">
            📄
          </button>
          <button class="btn btn-small btn-warning"
            onclick="cancelarPassagem('${p.id}')">
            Cancelar
          </button>
          <button class="btn btn-small btn-danger"
            onclick="excluirPassagem('${p.id}')">
            Excluir
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}


window.cancelarPassagem = async function (id) {
  if (confirm("Deseja realmente cancelar esta passagem?")) {
    const passagem = passagens.find((p) => p.id === id);
    await updateDoc(doc(db, "passagens", id), {
      status: "CANCELADO",
    });
    await carregarDados();
    renderizarPassagens();
    atualizarDashboard();
  }
};

window.excluirPassagem = async function (id) {
  if (confirm("Deseja realmente excluir esta passagem?")) {
    await deleteDoc(doc(db, "passagens", id));
    await carregarDados();
    renderizarPassagens();
    atualizarDashboard();
  }
};

window.filtrarPassagens = function () {
  const dataFiltro = document.getElementById("filtroDataPassagem").value;
  const statusFiltro = document.getElementById("filtroStatusPassagem").value;

  let passagensFiltradas = passagens;

  if (dataFiltro) {
    passagensFiltradas = passagensFiltradas.filter(
      (p) => p.dataViagem === dataFiltro,
    );
  }

  if (statusFiltro) {
    passagensFiltradas = passagensFiltradas.filter(
      (p) => p.status === statusFiltro,
    );
  }

  const tbody = document.getElementById("passagensBody");

  if (passagensFiltradas.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="9" style="text-align: center; color: var(--text-light);">Nenhuma passagem encontrada com os filtros aplicados</td></tr>';
    return;
  }

  tbody.innerHTML = passagensFiltradas
    .map(
      (p) => `
                <tr>
                    <td>${p.bilhete}</td>
                    <td>${p.nome}</td>
                    <td>${p.cpf || "-"}</td>
                    <td>${p.embarque}</td>
                    <td>${p.destino}</td>
                    <td>${new Date(p.dataViagem).toLocaleDateString("pt-BR")}</td>
                    <td>R$ ${p.valor.toFixed(2)}</td>
                    <td><span class="status-badge status-${p.status.toLowerCase()}">${p.status}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-small" onclick="gerarComprovantePassagem(${p.id})">📄 Comprovante</button>
                            <button class="btn btn-small btn-danger" onclick="cancelarPassagem(${p.id})">Cancelar</button>
                            <button class="btn btn-small btn-secondary" onclick="excluirPassagem(${p.id})">Excluir</button>
                        </div>
                    </td>
                </tr>
            `,
    )
    .join("");
};

function renderizarEncomendas() {
  const tbody = document.getElementById("encomendasBody");

  if (!encomendas || encomendas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12"
          style="text-align:center; color: var(--text-light);">
          Nenhuma encomenda cadastrada
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = encomendas.map(e => `
    <tr>
      <td>${e.ordem}</td>
      <td>${e.destinatario}</td>
      <td>${e.email}</td>
      <td>${e.remetente}</td>
      <td>${e.bilhete}</td>
      <td>${e.local}</td>
      <td>${e.especie}</td>
      <td>${e.volumes}</td>
      <td>R$ ${e.valor.toFixed(2)}</td>
      <td>${new Date(e.dataViagem).toLocaleDateString("pt-BR")}</td>
      <td>
        <span class="status-pagamento ${
          e.statusPagamento === "PAGO" ? "pago" : "pendente"
        }">
          ${e.statusPagamento}
        </span>
      </td>
      <td>
        <button class="btn btn-small"
          onclick="gerarComprovanteEncomenda('${e.id}')">
          📄
        </button>
      </td>
    </tr>
  `).join("");
}


window.excluirEncomenda = async function (id) {
  if (confirm("Deseja realmente excluir esta encomenda?")) {
    await deleteDoc(doc(db, "encomendas", id));
    await carregarDados();
  }
};

window.filtrarEncomendas = function () {
  const dataFiltro = document.getElementById("filtroDataEncomenda").value;
  const localFiltro = document.getElementById("filtroLocalEncomenda").value;

  let encomendasFiltradas = encomendas;

  if (dataFiltro) {
    encomendasFiltradas = encomendasFiltradas.filter(
      (e) => e.dataViagem === dataFiltro,
    );
  }

  if (localFiltro) {
    encomendasFiltradas = encomendasFiltradas.filter(
      (e) => e.local === localFiltro,
    );
  }

  const tbody = document.getElementById("encomendasBody");

  if (encomendasFiltradas.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="11" style="text-align:center; color: var(--text-light);">Nenhuma encomenda encontrada com os filtros aplicados</td></tr>';
    return;
  }

  tbody.innerHTML = encomendasFiltradas
    .map((e) => {
      const status = e.statusPagamento || "PENDENTE";

      return `
        <tr>
            <td>${e.ordem}</td>
            <td>${e.destinatario}</td>
            <td>${e.remetente || "-"}</td>
            <td>${e.bilhete || "-"}</td>
            <td>${e.local}</td>
            <td>${e.especie}</td>
            <td>${e.volumes}</td>
            <td>R$ ${e.valor.toFixed(2)}</td>
            <td>${new Date(e.dataViagem).toLocaleDateString("pt-BR")}</td>

            <td>
              <span class="status-pagamento ${
                status === "PAGO" ? "pago" : "pendente"
              }">
                ${status}
              </span>
            </td>

            <td>
                <div class="action-buttons">

                  ${
                    status !== "PAGO"
                      ? `
                      <button class="btn btn-small btn-success"
                        onclick="marcarComoPago('${e.id}')">
                        💰 Marcar como Pago
                      </button>
                      `
                      : ""
                  }

                  <button class="btn btn-small"
                    onclick="gerarComprovanteEncomenda('${e.id}')">
                    📄 Comprovante
                  </button>

                  <button class="btn btn-small btn-secondary"
                    onclick="excluirEncomenda('${e.id}')">
                    Excluir
                  </button>

                </div>
            </td>
        </tr>
      `;
    })
    .join("");
};

window.marcarComoPago = async function (id) {
  if (!confirm("Confirmar pagamento desta encomenda?")) return;

  await updateDoc(doc(db, "encomendas", id), {
    statusPagamento: "PAGO",
    dataPagamento: new Date().toISOString(),
  });

  alert("✅ Pagamento confirmado com sucesso!");

  await carregarDados();
};

// DASHBOARD
function atualizarDashboard() {
  const passagensAtivas = passagens.filter((p) => p.status === "ATIVO");
  const passagensCanceladas = passagens.filter((p) => p.status === "CANCELADO");

  const receitaPassagens = passagensAtivas.reduce((s, p) => s + p.valor, 0);
  const receitaEncomendas = encomendas.reduce((s, e) => s + e.valor, 0);

  const totalReceita = receitaPassagens + receitaEncomendas;

  const comissaoPass = receitaPassagens * 0.1;
  const comissaoEnc = receitaEncomendas * 0.3;
  const totalComissao = comissaoPass + comissaoEnc;

  const lucroLiquido = totalReceita - totalComissao;

  const totalTransacoes = passagensAtivas.length + encomendas.length;
  const ticketMedio = totalTransacoes > 0 ? totalReceita / totalTransacoes : 0;

  // Receita do mês atual
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const receitaMes = [...passagensAtivas, ...encomendas]
    .filter((item) => {
      const data = new Date(item.dataViagem);
      return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    })
    .reduce((s, item) => s + item.valor, 0);

  // Atualiza métricas
  document.getElementById("totalGeral").textContent =
    `R$ ${totalReceita.toFixed(2)}`;
  document.getElementById("totalComissao").textContent =
    `R$ ${totalComissao.toFixed(2)}`;
  document.getElementById("lucroLiquido").textContent =
    `R$ ${lucroLiquido.toFixed(2)}`;
  document.getElementById("ticketMedio").textContent =
    `R$ ${ticketMedio.toFixed(2)}`;
  document.getElementById("totalPassagens").textContent =
    passagensAtivas.length;
  document.getElementById("totalCanceladas").textContent =
    passagensCanceladas.length;
  document.getElementById("totalEncomendas").textContent = encomendas.length;
  document.getElementById("receitaMes").textContent =
    `R$ ${receitaMes.toFixed(2)}`;

  gerarGraficosDashboard(receitaPassagens, receitaEncomendas);
}

// RELATÓRIOS
window.gerarRelatorio = function () {
  const dataInicial = document.getElementById("dataInicial").value;
  const dataFinal = document.getElementById("dataFinal").value;

  if (!dataInicial || !dataFinal) {
    alert("Por favor, selecione as datas inicial e final.");
    return;
  }

  const passagensFiltradas = passagens.filter((p) => {
    return (
      p.status === "ATIVO" &&
      p.dataViagem >= dataInicial &&
      p.dataViagem <= dataFinal
    );
  });

  const encomendasFiltradas = encomendas.filter((e) => {
    return e.dataViagem >= dataInicial && e.dataViagem <= dataFinal;
  });

  const receitaPass = passagensFiltradas.reduce((sum, p) => sum + p.valor, 0);
  const receitaEnc = encomendasFiltradas.reduce((sum, e) => sum + e.valor, 0);

  const comissaoPass = receitaPass * 0.1;
  const comissaoEnc = receitaEnc * 0.3;
  const comissaoTotal = comissaoPass + comissaoEnc;

  const lucro = receitaPass + receitaEnc - comissaoTotal;

  const totalVolumes = encomendasFiltradas.reduce(
    (sum, e) => sum + e.volumes,
    0,
  );

  // 🔹 Atualiza tela
  document.getElementById("receitaPassagens").textContent =
    `R$ ${receitaPass.toFixed(2)}`;

  document.getElementById("receitaEncomendas").textContent =
    `R$ ${receitaEnc.toFixed(2)}`;

  document.getElementById("comissaoAgencia").textContent =
    `R$ ${comissaoTotal.toFixed(2)}`;

  document.getElementById("lucroRelatorio").textContent =
    `R$ ${lucro.toFixed(2)}`;

  document.getElementById("relatorioResultado").style.display = "block";

  // 🔹 Salva dados
  window.dadosRelatorio = {
    dataInicial,
    dataFinal,
    passagens: passagensFiltradas,
    encomendas: encomendasFiltradas,
    receitaPass,
    receitaEnc,
    comissaoPass,
    comissaoEnc,
    comissaoTotal,
    lucro,
    totalVolumes,
  };

  // 🔥 JÁ GERA O PDF AUTOMATICAMENTE
  gerarPrestacaoContas();
};

function enviarWhatsapp(numeroOriginal, mensagemTexto) {
  if (!numeroOriginal) {
    alert("❌ Nenhum telefone cadastrado.");
    return;
  }

  let numero = numeroOriginal.replace(/\D/g, "");

  // adiciona código Brasil se necessário
  if (numero.length === 11) {
    numero = "55" + numero;
  }

  const mensagem = encodeURIComponent(mensagemTexto);

  const url = `https://wa.me/${numero}?text=${mensagem}`;
  window.open(url, "_blank");
}

// GERAÇÃO DE COMPROVANTES E RELATÓRIOS

// GERAÇÃO DE COMPROVANTES E RELATÓRIOS

window.gerarComprovantePassagem = function (id) {
  const passagem = passagens.find((p) => p.id === id);

  if (!passagem) {
    alert("❌ Passagem não encontrada!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  // ===== CABEÇALHO =====
  doc.setFillColor(10, 37, 64);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, "bold");
  doc.text("AGÊNCIA LIRA", 105, 15, { align: "center" });

  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.text("Comprovante de Passagem", 105, 25, { align: "center" });

  // ===== CORPO =====
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);

  let y = 55;

  doc.setFont(undefined, "bold");
  doc.text("DADOS DO PASSAGEIRO", 15, y);
  y += 8;

  doc.setFont(undefined, "normal");
  doc.text(`Nome: ${passagem.nome}`, 15, y); y += 7;
  doc.text(`CPF: ${passagem.cpf}`, 15, y); y += 7;

  doc.text(
    `Nascimento: ${new Date(passagem.dataNascimento).toLocaleDateString("pt-BR")}`,
    15,
    y
  ); y += 7;

  doc.text(`Telefone: ${passagem.telefone}`, 15, y); y += 7;
  doc.text(`Email: ${passagem.email}`, 15, y); y += 10;

  doc.setFont(undefined, "bold");
  doc.text("DETALHES DA VIAGEM", 15, y);
  y += 8;

  doc.setFont(undefined, "normal");
  doc.text(`Bilhete: ${passagem.bilhete}`, 15, y); y += 7;
  doc.text(`Embarque: ${passagem.embarque}`, 15, y); y += 7;
  doc.text(`Destino: ${passagem.destino}`, 15, y); y += 7;

  doc.text(
    `Data da viagem: ${new Date(passagem.dataViagem).toLocaleDateString("pt-BR")}`,
    15,
    y
  ); y += 7;

  doc.text(`Status: ${passagem.status}`, 15, y); y += 12;

  // ===== VALOR =====
  doc.setFillColor(232, 244, 248);
  doc.rect(10, y, 190, 20, "F");

  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text(`Valor: R$ ${passagem.valor.toFixed(2)}`, 15, y + 12);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Responsável: ${usuarioLogadoEmail}`, 15, 275);

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 105, 285, {
    align: "center",
  });

  const pdfUrl = doc.output("bloburl");
  document.getElementById("pdfPreview").src = pdfUrl;
  document.getElementById("pdfModal").style.display = "flex";

  document.getElementById("btnBaixarPdf").onclick = function () {
    doc.save(`Comprovante_Passagem_${passagem.bilhete}.pdf`);
  };
};


window.gerarComprovanteEncomenda = function (id) {
  const encomenda = encomendas.find((e) => e.id === id);

  if (!encomenda) {
    alert("❌ Encomenda não encontrada!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  // ===== CABEÇALHO =====
  doc.setFillColor(10, 37, 64);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, "bold");
  doc.text("AGÊNCIA LIRA", 105, 15, { align: "center" });

  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.text("Comprovante de Encomenda", 105, 25, { align: "center" });

  // ===== CORPO =====
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);

  let y = 55;

  doc.setFont(undefined, "bold");
  doc.text("DADOS DA ENCOMENDA", 15, y);
  y += 8;

  doc.setFont(undefined, "normal");
  doc.text(`Ordem: ${encomenda.ordem}`, 15, y); y += 7;
  doc.text(`Destinatário: ${encomenda.destinatario}`, 15, y); y += 7;
  doc.text(`Email: ${encomenda.email}`, 15, y); y += 7;
  doc.text(`Remetente: ${encomenda.remetente}`, 15, y); y += 7;
  doc.text(`Telefone: ${encomenda.telefone}`, 15, y); y += 10;

  doc.setFont(undefined, "bold");
  doc.text("DETALHES DO TRANSPORTE", 15, y);
  y += 8;

  doc.setFont(undefined, "normal");
  doc.text(`Local: ${encomenda.local}`, 15, y); y += 7;
  doc.text(`Espécie: ${encomenda.especie}`, 15, y); y += 7;
  doc.text(`Volumes: ${encomenda.volumes}`, 15, y); y += 7;

  doc.text(
    `Data: ${new Date(encomenda.dataViagem).toLocaleDateString("pt-BR")}`,
    15,
    y
  ); y += 12;

  doc.setFillColor(232, 244, 248);
  doc.rect(10, y, 190, 25, "F");

  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text(`Valor: R$ ${encomenda.valor.toFixed(2)}`, 15, y + 10);

  doc.setFontSize(12);

  if (encomenda.statusPagamento === "PAGO") {
    doc.setTextColor(39, 174, 96);
    doc.text("Pagamento: PAGO", 15, y + 20);
  } else {
    doc.setTextColor(231, 76, 60);
    doc.text("Pagamento: PENDENTE", 15, y + 20);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Responsável: ${usuarioLogadoEmail}`, 15, 275);

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 105, 285, {
    align: "center",
  });

  const pdfUrl = doc.output("bloburl");
  document.getElementById("pdfPreview").src = pdfUrl;
  document.getElementById("pdfModal").style.display = "flex";

  document.getElementById("btnBaixarPdf").onclick = function () {
    doc.save(`Comprovante_Encomenda_${encomenda.ordem}.pdf`);
  };
};



window.gerarPrestacaoContas = function () {
  if (!window.dadosRelatorio) {
    alert("⚠️ Por favor, gere um relatório primeiro antes de exportar!");
    return;
  }

  const dados = window.dadosRelatorio;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  // ================================
  // CABEÇALHO
  // ================================

  doc.setFillColor(10, 37, 64);
  doc.rect(0, 0, 210, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, "bold");
  doc.text("AGÊNCIA LIRA", 105, 15, { align: "center" });

  doc.setFontSize(14);
  doc.setFont(undefined, "normal");
  doc.text("RELATÓRIO DE PRESTAÇÃO DE CONTAS", 105, 25, { align: "center" });
  doc.text("Com a Embarcação", 105, 32, { align: "center" });

  doc.setFontSize(11);
  doc.text(
    `Período: ${new Date(dados.dataInicial).toLocaleDateString("pt-BR")} a ${new Date(dados.dataFinal).toLocaleDateString("pt-BR")}`,
    105,
    39,
    { align: "center" },
  );

  // ================================
  // RESUMO FINANCEIRO
  // ================================

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text("RESUMO FINANCEIRO", 15, 60);

  doc.autoTable({
    startY: 65,
    head: [["Descrição", "Quantidade", "Valor (R$)"]],
    body: [
      [
        "Passagens Vendidas",
        dados.passagens.length,
        `R$ ${dados.receitaPass.toFixed(2)}`,
      ],
      [
        "Encomendas Transportadas",
        dados.encomendas.length,
        `R$ ${dados.receitaEnc.toFixed(2)}`,
      ],
      [
        "RECEITA TOTAL",
        "",
        `R$ ${(dados.receitaPass + dados.receitaEnc).toFixed(2)}`,
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [26, 77, 126], fontSize: 11 },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 40, halign: "center" },
      2: { cellWidth: 45, halign: "right" },
    },
  });

  let finalY = doc.lastAutoTable.finalY + 10;

  // ================================
  // COMISSÕES
  // ================================

  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text("COMISSÕES DA AGÊNCIA", 15, finalY);

  doc.autoTable({
    startY: finalY + 5,
    head: [["Tipo", "Base", "Taxa", "Comissão (R$)"]],
    body: [
      [
        "Passagens",
        `R$ ${dados.receitaPass.toFixed(2)}`,
        "10%",
        `R$ ${dados.comissaoPass.toFixed(2)}`,
      ],
      [
        "Encomendas",
        `R$ ${dados.receitaEnc.toFixed(2)}`,
        "30%",
        `R$ ${dados.comissaoEnc.toFixed(2)}`,
      ],
      ["TOTAL COMISSÃO", "", "", `R$ ${dados.comissaoTotal.toFixed(2)}`],
    ],
    theme: "grid",
    headStyles: { fillColor: [26, 77, 126], fontSize: 11 },
    styles: { fontSize: 10 },
  });

  finalY = doc.lastAutoTable.finalY + 10;

  // ================================
  // VALOR FINAL
  // ================================

  doc.setFillColor(232, 244, 248);
  doc.rect(10, finalY, 190, 30, "F");

  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("VALOR A REPASSAR PARA EMBARCAÇÃO:", 15, finalY + 10);

  doc.setFontSize(18);
  doc.setTextColor(39, 174, 96);
  doc.text(`R$ ${dados.lucro.toFixed(2)}`, 15, finalY + 22);

  doc.setTextColor(0, 0, 0);

  // ================================
  // RODAPÉ
  // ================================

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Página ${i} de ${pageCount}`, 105, 287, { align: "center" });
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 105, 292, {
      align: "center",
    });
  }

  // ================================
  // PREVIEW
  // ================================

  const pdfUrl = doc.output("bloburl");
  document.getElementById("pdfPreview").src = pdfUrl;
  document.getElementById("pdfModal").style.display = "flex";

  document.getElementById("btnBaixarPdf").onclick = function () {
    doc.save(`Relatorio_${dados.dataInicial}_a_${dados.dataFinal}.pdf`);
  };

  // ================================
  // 🔥 SALVAR NO STORAGE ORGANIZADO
  // ================================

  (async () => {
    try {
      const pdfBlob = doc.output("blob");

      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = String(hoje.getMonth() + 1).padStart(2, "0");

      const nomeArquivo = `comprovantes/${usuarioLogadoEmail}/${ano}/${mes}/relatorios/relatorio_${dados.dataInicial}_a_${dados.dataFinal}.pdf`;

      const storageRef = ref(storage, nomeArquivo);

      await uploadBytes(storageRef, pdfBlob);

      console.log("✅ Relatório salvo no Storage organizado!");
    } catch (error) {
      console.error("❌ Erro ao salvar relatório:", error);
    }
  })();
};

window.gerarGraficos = function (dados) {
  const ctxReceita = document.getElementById("graficoReceita");
  const ctxEvolucao = document.getElementById("graficoEvolucao");

  if (graficoReceita) graficoReceita.destroy();
  if (graficoEvolucao) graficoEvolucao.destroy();

  // 📊 Receita Passagens vs Encomendas
  graficoReceita = new Chart(ctxReceita, {
    type: "bar",
    data: {
      labels: ["Passagens", "Encomendas"],
      datasets: [
        {
          label: "Receita (R$)",
          data: [dados.receitaPass, dados.receitaEnc],
          backgroundColor: ["#1f4e79", "#2ecc71"],
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
    },
  });

  // 📈 Evolução diária
  const receitasPorData = {};

  [...dados.passagens, ...dados.encomendas].forEach((item) => {
    const data = item.dataViagem;
    receitasPorData[data] = (receitasPorData[data] || 0) + item.valor;
  });

  const labels = Object.keys(receitasPorData).sort();
  const valores = labels.map((data) => receitasPorData[data]);

  graficoEvolucao = new Chart(ctxEvolucao, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Receita por Dia",
          data: valores,
          borderColor: "#1f4e79",
          backgroundColor: "rgba(31,78,121,0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
};

window.limparFormEncomenda = function () {
  document.getElementById("formEncomenda").reset();

  const hoje = new Date().toISOString().split("T")[0];
  document.getElementById("dataViagemEncomenda").value = hoje;
};

// Inicialização
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  usuarioLogadoEmail = user.email;

  console.log("Usuário logado:", usuarioLogadoEmail);

  carregarDados();

  const hoje = new Date().toISOString().split("T")[0];
  document.getElementById("dataViagem").value = hoje;
  document.getElementById("dataViagemEncomenda").value = hoje;
});

window.fecharModalPdf = function () {
  document.getElementById("pdfModal").style.display = "none";
  document.getElementById("pdfPreview").src = "";
};

// ================================
// MÁSCARA CPF
// ================================
document
  .getElementById("cpfPassageiro")
  .addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");

    value = value.substring(0, 11);

    if (value.length > 9) {
      value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, "$1.$2.$3-$4");
    } else if (value.length > 6) {
      value = value.replace(/^(\d{3})(\d{3})(\d{1,3})$/, "$1.$2.$3");
    } else if (value.length > 3) {
      value = value.replace(/^(\d{3})(\d{1,3})$/, "$1.$2");
    }

    e.target.value = value;
  });

// ================================
// MÁSCARA TELEFONE
// ================================
document.getElementById("telefone").addEventListener("input", function (e) {
  let value = e.target.value.replace(/\D/g, "");

  value = value.substring(0, 11);

  if (value.length > 10) {
    value = value.replace(/^(\d{2})(\d{5})(\d{1,4})$/, "($1) $2-$3");
  } else if (value.length > 6) {
    value = value.replace(/^(\d{2})(\d{4})(\d{1,4})$/, "($1) $2-$3");
  } else if (value.length > 2) {
    value = value.replace(/^(\d{2})(\d{1,5})$/, "($1) $2");
  } else if (value.length > 0) {
    value = value.replace(/^(\d*)$/, "($1");
  }

  e.target.value = value;
});

// ================================
// MÁSCARA TELEFONE ENCOMENDA
// ================================
document
  .getElementById("telefoneEncomenda")
  .addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");

    value = value.substring(0, 11);

    if (value.length > 10) {
      value = value.replace(/^(\d{2})(\d{5})(\d{1,4})$/, "($1) $2-$3");
    } else if (value.length > 6) {
      value = value.replace(/^(\d{2})(\d{4})(\d{1,4})$/, "($1) $2-$3");
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{1,5})$/, "($1) $2");
    } else if (value.length > 0) {
      value = value.replace(/^(\d*)$/, "($1");
    }

    e.target.value = value;
  });

document
  .getElementById("valorEncomenda")
  .addEventListener("input", function () {
    formatarMoeda(this);
  });

document
  .getElementById("formEncomenda")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const destinatario = document.getElementById("destinatario").value.trim();
    const remetente = document.getElementById("remetente").value.trim();
    const bilhete = document.getElementById("bilheteEncomenda").value.trim();
    const local = document.getElementById("localViagem").value;
    const especie = document.getElementById("especie").value.trim();
    const telefone = document.getElementById("telefoneEncomenda").value.trim();
    const email = document.getElementById("emailEncomenda").value.trim();
    const volumes = document.getElementById("quantVolumes").value;
    const dataViagem = document.getElementById("dataViagemEncomenda").value;
    const statusPagamento = document.getElementById("statusPagamento").value;

    let valor = document
      .getElementById("valorEncomenda")
      .value.replace("R$ ", "")
      .replace(/\./g, "")
      .replace(",", ".");

    valor = parseFloat(valor);

    if (
      !destinatario ||
      !remetente ||
      !bilhete ||
      !local ||
      !especie ||
      !telefone ||
      !email ||
      !volumes ||
      !valor ||
      !dataViagem ||
      !statusPagamento
    ) {
      alert("❌ Todos os campos são obrigatórios!");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("❌ Email inválido!");
      return;
    }

    const encomenda = {
      ordem: encomendas.length + 1,
      destinatario,
      remetente,
      bilhete,
      local,
      telefone,
      email,
      especie,
      volumes: parseInt(volumes),
      valor,
      statusPagamento,
      dataViagem,
      dataCadastro: new Date().toISOString(),
    };

    await addDoc(collection(db, "encomendas"), encomenda);

    alert("✅ Encomenda cadastrada com sucesso!");
    limparFormEncomenda();
    await carregarDados();
  });

// ================================
// MÁSCARA DE MOEDA (BRL)
// ================================
function formatarMoeda(input) {
  let valor = input.value.replace(/\D/g, "");

  if (valor === "") {
    input.value = "";
    return;
  }

  valor = (parseInt(valor) / 100).toFixed(2);

  valor = valor.replace(".", ",");
  valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  input.value = "R$ " + valor;
}

document.getElementById("valorPassagem").addEventListener("input", function () {
  formatarMoeda(this);
});
