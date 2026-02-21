import { db,auth } from "../firebase.js";
import { atualizarDashboard } from "./dashboard.js";
import { storage } from "../firebase.js";
import { mostrarLoading, atualizarProgresso, esconderLoading } from "./utils.js";
import { logoBase64 } from "./logo.js";



import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";

const functions = getFunctions();
const enviarEmailFunction = httpsCallable(functions, "enviarComprovanteEmail");

let encomendas = [];
window.encomendas = encomendas;

window.usuarioLogadoEmail = "";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  window.usuarioLogadoEmail = user.email;

  carregarDados(); // chama a função global
});

async function carregarDados() {
  encomendas.length = 0;

  const queryEncomendas = await getDocs(collection(db, "encomendas"));

  queryEncomendas.forEach((docSnap) => {
    encomendas.push({ id: docSnap.id, ...docSnap.data() });
  });

  renderizarEncomendas();

  atualizarDashboard(window.passagens || [], encomendas);
}

window.carregarDados = carregarDados;


function renderizarEncomendas() {
  const tbody = document.getElementById("encomendasBody");

  if (!encomendas || encomendas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="13"
          style="text-align:center; color: var(--text-light);">
          Nenhuma encomenda cadastrada
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = encomendas
    .map((e) => {
      const status = e.statusPagamento || "PENDENTE";
      const classeStatus = status === "PAGO" ? "pago" : "pendente";

      return `
      <tr>
        <td>${e.ordem}</td>
        <td>${e.destinatario}</td>
        <td>${e.email || "Sem dados"}</td>
        <td>${e.remetente}</td>
        <td>${e.bilhete}</td>
        <td>${e.local}</td>
        <td>${e.cidadeDestino || "-"}</td>
        <td>${e.especie}</td>
        <td>${e.volumes}</td>
        <td>${Number(e.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
        <td>${new Date(e.dataViagem).toLocaleDateString("pt-BR")}</td>

        <td>
          <span class="status-pagamento ${classeStatus}">
            ${status}
          </span>
        <td>
  <div class="action-buttons-grid">

    <button class="btn-action btn-dark"
      title="Nota Fiscal"
      onclick="gerarNotaEncomenda('${e.id}')">
      🧾
    </button>

    <button class="btn-action btn-primary"
      title="Comprovante"
      onclick="gerarComprovanteEncomenda('${e.id}')">
      📄
    </button>

    ${
      status !== "PAGO"
        ? `
        <button class="btn-action btn-success"
          title="Marcar como Pago"
          onclick="marcarComoPago('${e.id}')">
          💰
        </button>
        `
        : `
        <button class="btn-action btn-success" disabled>
          ✅ Pago
        </button>
        `
    }

    <button class="btn-action btn-danger"
      title="Excluir"
      onclick="excluirEncomenda('${e.id}')">
      🗑️
    </button>

  </div>
</td>
      </tr>
      `;
    })
    .join("");
}

window.editarEncomenda = function (id) {
  const encomenda = encomendas.find((e) => e.id === id);

  if (!encomenda) {
    alert("❌ Encomenda não encontrada!");
    return;
  }

  document.getElementById("destinatario").value = encomenda.destinatario || "";
  document.getElementById("remetente").value = encomenda.remetente || "";
  document.getElementById("bilheteEncomenda").value = encomenda.bilhete || "";
  document.getElementById("localViagem").value = encomenda.local || "";
  document.getElementById("cidadeDestinoEncomenda").value =
    encomenda.cidadeDestino || "";
  document.getElementById("especie").value = encomenda.especie || "";
  document.getElementById("telefoneEncomenda").value = encomenda.telefone || "";
  document.getElementById("emailEncomenda").value = encomenda.email || "";
  document.getElementById("quantVolumes").value = encomenda.volumes || "";
  document.getElementById("valorEncomenda").value =
    `R$ ${encomenda.valor.toFixed(2)}`;
  document.getElementById("dataViagemEncomenda").value =
    encomenda.dataViagem || "";
  document.getElementById("statusPagamento").value =
    encomenda.statusPagamento || "PENDENTE";

  window.encomendaEditandoId = id;

  showTab("encomendas", document.querySelector(".tab-btn:nth-child(3)"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

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


window.gerarComprovanteEncomenda = function (id) {
  const encomenda = encomendas.find((e) => e.id === id);
  if (!encomenda) return alert("❌ Encomenda não encontrada!");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  const protocolo = `E-${Date.now()}`;

  // 🔷 CABEÇALHO
  doc.setFillColor(20, 90, 60);
  doc.rect(0, 0, 210, 40, "F");

  doc.addImage(logoBase64, "PNG", 15, 8, 25, 25);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text("AGÊNCIA LIRA", 105, 18, { align: "center" });

  doc.setFontSize(11);
  doc.text("COMPROVANTE DE ENCOMENDA", 105, 28, { align: "center" });

  doc.setDrawColor(180);
  doc.line(15, 45, 195, 45);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);

  let y = 55;

  const linha = (titulo, valor) => {
    doc.setFont(undefined, "bold");
    doc.text(titulo, 20, y);
    doc.setFont(undefined, "normal");
    doc.text(String(valor), 85, y);
    y += 8;
  };

  linha("Protocolo:", protocolo);
  linha("Ordem:", encomenda.ordem);
  linha("Número do Bilhete:", encomenda.bilhete);
  linha("Destinatário:", encomenda.destinatario);
  linha("Remetente:", encomenda.remetente);
  linha("Telefone:", encomenda.telefone);
  linha("Email:", encomenda.email || "Sem dados");
  linha("Local:", encomenda.local);
  linha("Cidade de Destino:", encomenda.cidadeDestino || "-"); // 🔥 NOVO
  linha("Espécie:", encomenda.especie);
  linha("Volumes:", encomenda.volumes);
  linha("Valor:", `R$ ${encomenda.valor.toFixed(2)}`);

  // STATUS BONITO E ORGANIZADO
  y += 5;

  doc.setFont(undefined, "bold");
  doc.text("Status do Pagamento:", 20, y);

  doc.setFont(undefined, "bold");

  if (encomenda.statusPagamento === "PAGO") {
    doc.setTextColor(39, 174, 96); // verde
  } else {
    doc.setTextColor(231, 76, 60); // vermelho
  }

  doc.text(encomenda.statusPagamento, 90, y);

  doc.setTextColor(0, 0, 0);

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Responsável: ${usuarioLogadoEmail}`, 20, 280);
  doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, 20, 285);

  // 🔥 PREVIEW
  const pdfUrl = doc.output("bloburl");
  document.getElementById("pdfPreview").src = pdfUrl;
  document.getElementById("pdfModal").style.display = "flex";

  // 🔽 BAIXAR
  document.getElementById("btnBaixarPdf").onclick = function () {
    doc.save(`Encomenda_${encomenda.ordem}.pdf`);
  };

  // 📲 WHATSAPP + EMAIL
  document.getElementById("btnWhatsapp").onclick = async function () {
    const confirmar = confirm("Deseja realmente enviar o comprovante?");
    if (!confirmar) return;

    if (!encomenda.telefone) {
      alert("❌ Telefone não cadastrado.");
      return;
    }

    try {
      mostrarLoading("Preparando comprovante...");

      const pdfBlob = doc.output("blob");

      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = String(hoje.getMonth() + 1).padStart(2, "0");

      const nomeArquivo = `encomenda_${encomenda.ordem}.pdf`;
      const caminho = `comprovantes/${usuarioLogadoEmail}/${ano}/${mes}/encomendas/${nomeArquivo}`;

      const storageRef = ref(storage, caminho);

      await uploadBytes(storageRef, pdfBlob);
      const downloadURL = await getDownloadURL(storageRef);

      // 🔥 ENVIA EMAIL
      if (encomenda.email) {
        await enviarEmailFunction({
          email: encomenda.email,
          nome: encomenda.destinatario,
          link: downloadURL,
        });
      }

      // 🔥 ENVIA WHATSAPP
      const mensagem = `
📦 *AGÊNCIA LIRA*

Olá *${encomenda.destinatario}* 👋

Seu comprovante:
${downloadURL}
`;

      
esconderLoading();
      enviarWhatsapp(encomenda.telefone, mensagem);
    } catch (error) {
      esconderLoading();
      console.error(error);
      alert("❌ Erro ao enviar comprovante.");
    }
  };
};


window.gerarNotaEncomenda = function (id) {

  const encomenda = encomendas.find((e) => e.id === id);
  if (!encomenda) return alert("❌ Encomenda não encontrada!");

  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: [80, 250]
  });

  let y = 8;

  const logoWidth = 40;
  const logoHeight = 22;
  const pageWidth = 80;
  const logoX = (pageWidth - logoWidth) / 2;

  doc.addImage(logoBase64, "PNG", logoX, y, logoWidth, logoHeight);
  y += 28;

  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text("AGÊNCIA LIRA", 40, y, { align: "center" });

  y += 5;
  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  doc.text("NOTA DE SERVIÇO - ENCOMENDA", 40, y, { align: "center" });

  y += 6;
  doc.line(5, y, 75, y);
  y += 8;

  const linha = (titulo, valor) => {
    doc.setFont(undefined, "bold");
    doc.text(titulo, 5, y);
    doc.setFont(undefined, "normal");
    doc.text(String(valor), 5, y + 4);
    y += 10;
  };

  linha("Ordem:", encomenda.ordem);
  linha("Bilhete:", encomenda.bilhete);
  linha("Destinatário:", encomenda.destinatario);
  linha("Remetente:", encomenda.remetente);
  linha("Telefone:", encomenda.telefone);
  linha("Email:", encomenda.email && encomenda.email.trim() !== "" ? encomenda.email : "Sem dados");
  linha("Local:", encomenda.local);
  linha("Cidade Destino:", encomenda.cidadeDestino || "Sem dados");
  linha("Espécie:", encomenda.especie);
  linha("Volumes:", encomenda.volumes);

  linha(
    "Valor:",
    Number(encomenda.valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  );

  linha(
    "Data Viagem:",
    new Date(encomenda.dataViagem).toLocaleDateString("pt-BR")
  );

  linha(
    "Data Cadastro:",
    new Date(encomenda.dataCadastro).toLocaleDateString("pt-BR")
  );

  // 🔥 STATUS
  y += 5;
  doc.setFont(undefined, "bold");
  doc.text("Status Pagamento:", 5, y);

  if (encomenda.statusPagamento === "PAGO") {
    doc.setTextColor(39, 174, 96);
    doc.text("PAGO", 5, y + 5);
    doc.setTextColor(0, 0, 0);
  } else {
    doc.setTextColor(231, 76, 60);
    doc.text("PENDENTE", 5, y + 5);
    doc.setTextColor(0, 0, 0);
  }

  y += 15;

  doc.line(5, y, 75, y);
  y += 8;

  doc.setFontSize(8);
  doc.text(`Emitido por: ${window.usuarioLogadoEmail}`, 5, y);
  y += 5;
  doc.text(`Data emissão: ${new Date().toLocaleString("pt-BR")}`, 5, y);

  y += 8;
  doc.text("Via Cliente", 40, y, { align: "center" });

  // 🔥 PREVIEW
  const pdfUrl = doc.output("bloburl");
  document.getElementById("pdfPreview").src = pdfUrl;

  document.getElementById("btnWhatsapp").style.display = "none";
  document.getElementById("btnBaixarPdf").style.display = "inline-block";

  document.getElementById("pdfModal").style.display = "flex";

  document.getElementById("btnBaixarPdf").onclick = function () {
    doc.save(`Nota_Encomenda_${encomenda.ordem}.pdf`);
  };
};