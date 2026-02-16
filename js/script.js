import { auth, db } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let passagens = [];
let encomendas = [];

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
document
  .getElementById("formPassagem")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    console.log("Formulário de passagem submetido");

    // Validar campos obrigatórios
    const nome = document.getElementById("nomePassageiro").value.trim();
    const embarque = document.getElementById("embarque").value;
    const destino = document.getElementById("destino").value;
    const bilhete = document.getElementById("bilhete").value.trim();
    let valor = document
      .getElementById("valorPassagem")
      .value.replace("R$ ", "")
      .replace(/\./g, "")
      .replace(",", ".");

    valor = parseFloat(valor);

    const dataViagem = document.getElementById("dataViagem").value;

    if (!nome || !embarque || !destino || !bilhete || !valor || !dataViagem) {
      alert("❌ Por favor, preencha todos os campos obrigatórios (*)");
      return;
    }

    const passagem = {
      bilhete: bilhete,
      nome: nome,
      cpf: document.getElementById("cpfPassageiro").value.trim(),
      dataNascimento: document.getElementById("dataNascimento").value,
      telefone: document.getElementById("telefone").value.trim(),
      embarque: embarque,
      destino: destino,
      valor: valor,
      dataViagem: dataViagem,
      status: "ATIVO",
      dataCadastro: new Date().toISOString(),
    };

    console.log("Passagem criada:", passagem);

    await addDoc(collection(db, "passagens"), passagem);
    await carregarDados();

    console.log("Total de passagens:", passagens.length);

    alert("✅ Passagem cadastrada com sucesso!");
    limparFormPassagem();
    renderizarPassagens();
    atualizarDashboard();
  });

window.limparFormPassagem = function () {
  document.getElementById("formPassagem").reset();
  const hoje = new Date().toISOString().split("T")[0];
  document.getElementById("dataViagem").value = hoje;
};

function renderizarPassagens() {
  const tbody = document.getElementById("passagensBody");

  if (passagens.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="9" style="text-align: center; color: var(--text-light);">Nenhuma passagem cadastrada</td></tr>';
    return;
  }

  tbody.innerHTML = passagens
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
                            <button class="btn btn-small" onclick="gerarComprovantePassagem('${p.id}')">📄 Comprovante</button>
                            <button class="btn btn-small btn-warning" onclick="cancelarPassagem('${p.id}')">Cancelar</button>
                            <button class="btn btn-small btn-danger" onclick="excluirPassagem('${p.id}')">Excluir</button>
                        </div>
                    </td>
                </tr>
            `,
    )
    .join("");
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
    tbody.innerHTML =
      '<tr><td colspan="11" style="text-align:center; color: var(--text-light);">Nenhuma encomenda cadastrada</td></tr>';
    return;
  }

  tbody.innerHTML = encomendas
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
      (e) => e.dataViagem === dataFiltro
    );
  }

  if (localFiltro) {
    encomendasFiltradas = encomendasFiltradas.filter(
      (e) => e.local === localFiltro
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
    dataPagamento: new Date().toISOString()
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
  doc.text(`Nome: ${passagem.nome}`, 15, y);
  y += 7;

  if (passagem.cpf) {
    doc.text(`CPF: ${passagem.cpf}`, 15, y);
    y += 7;
  }

  if (passagem.telefone) {
    doc.text(`Telefone: ${passagem.telefone}`, 15, y);
    y += 7;
  }

  y += 5;
  doc.setFont(undefined, "bold");
  doc.text("DETALHES DA VIAGEM", 15, y);
  y += 8;

  doc.setFont(undefined, "normal");
  doc.text(`Bilhete: ${passagem.bilhete}`, 15, y);
  y += 7;

  doc.text(`Embarque: ${passagem.embarque}`, 15, y);
  y += 7;

  doc.text(`Destino: ${passagem.destino}`, 15, y);
  y += 7;

  doc.text(
    `Data: ${new Date(passagem.dataViagem).toLocaleDateString("pt-BR")}`,
    15,
    y,
  );
  y += 7;

  doc.text(`Status: ${passagem.status}`, 15, y);
  y += 12;

  // ===== VALOR =====
  doc.setFillColor(232, 244, 248);
  doc.rect(10, y, 190, 20, "F");

  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text(`Valor: R$ ${passagem.valor.toFixed(2)}`, 15, y + 12);

  // ===== RODAPÉ =====
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 105, 285, {
    align: "center",
  });

  // ===== PREVIEW =====
  const pdfUrl = doc.output("bloburl");

  document.getElementById("pdfPreview").src = pdfUrl;
  document.getElementById("pdfModal").style.display = "flex";

  // ===== BOTÃO BAIXAR =====
  document.getElementById("btnBaixarPdf").onclick = function () {
    doc.save(`Comprovante_Passagem_${passagem.bilhete}.pdf`);
  };

  // ===== BOTÃO WHATSAPP =====
  document.getElementById("btnWhatsapp").onclick = function () {
    const mensagem = `🛥️ *AGÊNCIA LIRA*
━━━━━━━━━━━━━━━━━━

📄 *COMPROVANTE DE PASSAGEM*

👤 *Passageiro:* ${passagem.nome}
🆔 *CPF:* ${passagem.cpf || "Não informado"}
🎫 *Bilhete:* ${passagem.bilhete}

📍 *Rota:*
${passagem.embarque} ➝ ${passagem.destino}

📅 *Data da Viagem:*
${new Date(passagem.dataViagem).toLocaleDateString("pt-BR")}

💰 *Valor Pago:* R$ ${passagem.valor.toFixed(2)}

━━━━━━━━━━━━━━━━━━
📞 Em caso de dúvidas, entre em contato.
Obrigado por escolher a Agência Lira!
Boa viagem! 🚢✨`;

    enviarWhatsapp(passagem.telefone, mensagem);
  };
};

window.gerarComprovanteEncomenda = function (id) {
  const encomenda = encomendas.find((e) => e.id === id);

  if (!encomenda) {
    alert("❌ Encomenda não encontrada!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4"); // 👈 padrão igual passagem

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
  doc.text(`Ordem: ${encomenda.ordem}`, 15, y);
  y += 7;

  doc.text(`Destinatário: ${encomenda.destinatario}`, 15, y);
  y += 7;

  if (encomenda.remetente) {
    doc.text(`Remetente: ${encomenda.remetente}`, 15, y);
    y += 7;
  }

  if (encomenda.telefone) {
    doc.text(`Telefone: ${encomenda.telefone}`, 15, y);
    y += 7;
  }

  y += 3;

  doc.setFont(undefined, "bold");
  doc.text("DETALHES DO TRANSPORTE", 15, y);
  y += 8;

  doc.setFont(undefined, "normal");
  doc.text(`Local: ${encomenda.local}`, 15, y);
  y += 7;

  doc.text(`Espécie: ${encomenda.especie}`, 15, y);
  y += 7;

  doc.text(`Volumes: ${encomenda.volumes}`, 15, y);
  y += 7;

  doc.text(
    `Data: ${new Date(encomenda.dataViagem).toLocaleDateString("pt-BR")}`,
    15,
    y
  );
  y += 12;

  // ===== BLOCO VALOR =====
  doc.setFillColor(232, 244, 248);
  doc.rect(10, y, 190, 25, "F");

  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text(`Valor: R$ ${encomenda.valor.toFixed(2)}`, 15, y + 10);

  // STATUS
  doc.setFontSize(12);

  if (encomenda.statusPagamento === "PAGO") {
    doc.setTextColor(39, 174, 96);
    doc.text("Pagamento: PAGO ", 15, y + 20);
  } else {
    doc.setTextColor(231, 76, 60);
    doc.text("Pagamento: PENDENTE ", 15, y + 20);
  }

  doc.setTextColor(0, 0, 0);

  // ===== RODAPÉ =====
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    105,
    285,
    { align: "center" }
  );

  // ===== PREVIEW =====
  const pdfUrl = doc.output("bloburl");

  document.getElementById("pdfPreview").src = pdfUrl;
  document.getElementById("pdfModal").style.display = "flex";

  document.getElementById("btnBaixarPdf").onclick = function () {
    doc.save(`Comprovante_Encomenda_${encomenda.ordem}.pdf`);
  };

  // ===== WHATSAPP =====
  document.getElementById("btnWhatsapp").onclick = function () {
    const statusTexto =
      encomenda.statusPagamento === "PAGO" ? "✅ *PAGO*" : "❌ *PENDENTE*";

    const mensagem = `🛥️ *AGÊNCIA LIRA*
━━━━━━━━━━━━━━━━━━

📦 *COMPROVANTE DE ENCOMENDA*

🔢 *Ordem:* ${encomenda.ordem}
👤 *Destinatário:* ${encomenda.destinatario}
📍 *Local:* ${encomenda.local}
📦 *Volumes:* ${encomenda.volumes}
📅 *Data:* ${new Date(encomenda.dataViagem).toLocaleDateString("pt-BR")}

💰 *Valor:* R$ ${encomenda.valor.toFixed(2)}
💳 *Pagamento:* ${statusTexto}

━━━━━━━━━━━━━━━━━━
Agência Lira 🚢`;

    enviarWhatsapp(encomenda.telefone, mensagem);
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

  // Cabeçalho
  doc.setFillColor(10, 37, 64);
  doc.rect(0, 0, 210, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, "bold");
  doc.text(" AGÊNCIA LIRA", 105, 15, { align: "center" });

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

  // Resumo Financeiro
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

  // Comissões
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text("COMISSÕES DA AGÊNCIA", 15, finalY);

  doc.autoTable({
    startY: finalY + 5,
    head: [["Tipo", "Base de Cálculo", "Taxa", "Comissão (R$)"]],
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
    columnStyles: {
      3: { halign: "right" },
    },
  });

  finalY = doc.lastAutoTable.finalY + 10;

  // Resumo Final
  doc.setFillColor(232, 244, 248);
  doc.rect(10, finalY, 190, 30, "F");

  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("VALOR A REPASSAR PARA EMBARCAÇÃO:", 15, finalY + 10);
  doc.setFontSize(18);
  doc.setTextColor(39, 174, 96);
  doc.text(`R$ ${dados.lucro.toFixed(2)}`, 15, finalY + 22);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`(Receita Total - Comissões da Agência)`, 15, finalY + 28);

  finalY += 45;

  // Estatísticas Adicionais
  if (finalY < 250) {
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text("ESTATÍSTICAS DA VIAGEM", 15, finalY);

    doc.autoTable({
      startY: finalY + 5,
      head: [["Indicador", "Valor"]],
      body: [
        ["Total de Passageiros", dados.passagens.length],
        ["Total de Encomendas", dados.encomendas.length],
        ["Total de Volumes Transportados", dados.totalVolumes],
        [
          "Ticket Médio Passagem",
          dados.passagens.length > 0
            ? `R$ ${(dados.receitaPass / dados.passagens.length).toFixed(2)}`
            : "R$ 0,00",
        ],
        [
          "Ticket Médio Encomenda",
          dados.encomendas.length > 0
            ? `R$ ${(dados.receitaEnc / dados.encomendas.length).toFixed(2)}`
            : "R$ 0,00",
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [26, 77, 126], fontSize: 11 },
      styles: { fontSize: 10 },
    });
  }

  // Rodapé
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(127, 140, 141);
    doc.text(`Página ${i} de ${pageCount}`, 105, 287, { align: "center" });
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 105, 292, {
      align: "center",
    });
  }

  // 👇 GERAR PREVIEW IGUAL PASSAGEM E ENCOMENDA
  const pdfUrl = doc.output("bloburl");

  document.getElementById("pdfPreview").src = pdfUrl;
  document.getElementById("pdfModal").style.display = "flex";

  document.getElementById("btnBaixarPdf").onclick = function () {
    doc.save(
      `Relatorio_Prestacao_Contas_${dados.dataInicial}_a_${dados.dataFinal}.pdf`,
    );
  };
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
window.onload = function () {
  console.log("Sistema carregado");

  console.log("Passagens carregadas:", passagens.length);
  console.log("Encomendas carregadas:", encomendas.length);

  carregarDados();

  // Definir data de hoje como padrão
  const hoje = new Date().toISOString().split("T")[0];
  document.getElementById("dataViagem").value = hoje;
  document.getElementById("dataViagemEncomenda").value = hoje;

  console.log("Data padrão definida:", hoje);
  console.log("Sistema pronto para uso!");
};

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

    // 🔹 Converter valor formatado
    let valor = document
      .getElementById("valorEncomenda")
      .value.replace("R$ ", "")
      .replace(/\./g, "")
      .replace(",", ".");

    valor = parseFloat(valor);

    if (isNaN(valor)) {
      alert("❌ Informe um valor válido.");
      return;
    }

    const encomenda = {
      ordem: encomendas.length + 1,
      destinatario: document.getElementById("destinatario").value,
      remetente: document.getElementById("remetente").value,
      bilhete: document.getElementById("bilheteEncomenda").value,
      local: document.getElementById("localViagem").value,
      telefone: document.getElementById("telefoneEncomenda").value,
      especie: document.getElementById("especie").value,
      volumes: parseInt(document.getElementById("quantVolumes").value),
      valor: valor,
      statusPagamento: document.getElementById("statusPagamento").value, // 👈 NOVO
      dataViagem: document.getElementById("dataViagemEncomenda").value,
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
