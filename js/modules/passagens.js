import { db } from "../firebase.js";
import { validarCPF, formatarDataBR } from "./utils.js";
import { formatarCPFVisual, formatarMoedaInput } from "./utils.js";
import {
  mostrarLoading,
  atualizarProgresso,
  esconderLoading,
} from "./utils.js";
import { atualizarDashboard } from "./dashboard.js";
import { storage } from "../firebase.js";
import { logoBase64 } from "./logo.js";

import {
  ref,
  uploadBytes,
  getDownloadURL,
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

// 🔄 LOADING GLOBAL
window.mostrarLoading = function (mensagem = "Carregando...") {
  console.log("🔄", mensagem);
};

window.esconderLoading = function () {
  console.log("✅ Finalizado");
};

import { auth } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

window.usuarioLogadoEmail = "";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  window.usuarioLogadoEmail = user.email;

  carregarDados(); // chama a função global
});

let passagens = [];
window.passagens = passagens;

async function carregarDados() {
  passagens.length = 0;

  const queryPassagens = await getDocs(collection(db, "passagens"));

  queryPassagens.forEach((docSnap) => {
    passagens.push({ id: docSnap.id, ...docSnap.data() });
  });

  renderizarPassagens();
}

window.carregarDados = carregarDados;

// PASSAGENS
document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
  const form = document.getElementById("formPassagem");
  if (!form) {
    console.error("❌ formPassagem não encontrado no DOM");
    return;
  }

  const cpfInput = document.getElementById("cpfPassageiro");
  const valorInput = document.getElementById("valorPassagem");
  const valorRefeicaoInput = document.getElementById("valorRefeicao");

  // ✅ FORMATAÇÃO AUTOMÁTICA (FORA DO SUBMIT)

  if (cpfInput) {
    cpfInput.addEventListener("input", (e) => {
      e.target.value = formatarCPFVisual(e.target.value);
    });
  }

  if (valorInput) {
    valorInput.addEventListener("input", (e) => {
      e.target.value = formatarMoedaInput(e.target.value);
    });
  }

  if (valorRefeicaoInput) {
    valorRefeicaoInput.addEventListener("input", (e) => {
      e.target.value = formatarMoedaInput(e.target.value);
    });
  }

  // 🔵 AGORA SIM O SUBMIT (igual estava)

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nome = document.getElementById("selectCliente").value.trim();
    const nascimentoInput = document.getElementById("dataNascimento");
    const telefoneInput = document.getElementById("telefone");
    const emailInput = document.getElementById("emailPassageiro");
    const embarqueInput = document.getElementById("embarque");
    const destinoInput = document.getElementById("destino");
    const bilheteInput = document.getElementById("bilhete");
    const dataInput = document.getElementById("dataViagem");
    const pcdInput = document.getElementById("pcdPassageiro");

    const cpf = cpfInput.value.replace(/\D/g, "");
    const nascimento = nascimentoInput.value;
    const telefoneVal = telefoneInput.value.trim();
    const emailVal = emailInput ? emailInput.value.trim() : "";
    const embarqueVal = embarqueInput.value;
    const destinoVal = destinoInput.value;
    const bilheteVal = bilheteInput.value.trim();
    const dataVal = dataInput.value;
    const pcd = pcdInput.checked;

    // 🔹 VALOR PASSAGEM
    let valor = valorInput.value
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim();

    valor = parseFloat(valor);

    // 🔹 VALOR REFEIÇÃO
    let valorRefeicao = 0;
    if (valorRefeicaoInput && valorRefeicaoInput.value) {
      valorRefeicao =
        parseFloat(
          valorRefeicaoInput.value
            .replace("R$", "")
            .replace(/\./g, "")
            .replace(",", ".")
            .trim(),
        ) || 0;
    }

    // 🔥 VALIDAÇÕES
    if (!validarCPF(cpf)) {
      alert("❌ CPF inválido!");
      return;
    }

    // 🔒 NÃO PERMITIR CPF DUPLICADO
    const cpfLimpo = cpf.replace(/\D/g, "");

    const cpfJaExiste = passagens.some((p) => {
      const cpfExistente = (p.cpf || "").replace(/\D/g, "");

      // Se estiver editando, ignora o próprio registro
      if (window.passagemEditandoId && p.id === window.passagemEditandoId) {
        return false;
      }

      return cpfExistente === cpfLimpo;
    });

    if (cpfJaExiste) {
      alert("❌ Já existe uma passagem cadastrada com esse CPF!");
      return;
    }

    if (isNaN(valor) || valor <= 0) {
      alert("❌ Valor inválido!");
      return;
    }

    // 🔹 OBJETO
    const passagem = {
      ordem: passagens.length + 1,
      bilhete: bilheteVal,
      nome,
      cpf,
      dataNascimento: nascimento,
      telefone: telefoneVal,
      email: emailVal,
      embarque: embarqueVal,
      destino: destinoVal,
      valor: Number(valor.toFixed(2)),
      valorRefeicao: Number(valorRefeicao.toFixed(2)),
      dataViagem: dataVal,
      status: "ATIVO",
      dataCadastro: new Date().toISOString(),
      pcd,
    };

    try {
      await addDoc(collection(db, "passagens"), passagem);

      alert("✅ Passagem cadastrada com sucesso!");

      form.reset();

      // 🔥 ATUALIZA LISTA IMEDIATAMENTE
      await carregarDados();
    } catch (error) {
      console.error(error);
      alert("❌ Erro ao salvar passagem.");
    }
  });
});

window.limparFormPassagem = function () {
  document.getElementById("formPassagem").reset();

  // Se quiser limpar explicitamente:
  document.getElementById("bilhete").value = "";

  window.passagemEditandoId = null;
};

function renderizarPassagens() {
  const tbody = document.getElementById("passagensBody");
  tbody.innerHTML = "";

  if (!passagens || passagens.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="13"
          style="text-align:center; color: var(--text-light);">
          Nenhuma passagem cadastrada
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = passagens
    .map(
      (p) => `
      <tr>
        <td>${p.ordem ?? "-"}</td>
        <td>${p.bilhete}</td>
        <td>${p.nome}</td>
        <td>${formatarCPFVisual(p.cpf)}</td>
        <td>${p.email || "Sem dados"}</td>
        <td>${p.embarque}</td>
        <td>${p.destino}</td>
        <td>${formatarDataBR(p.dataViagem)}</td>
        <td>${p.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
        <td>
          ${(p.valorRefeicao || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </td>

        <td>
          ${
            p.pcd
              ? '<span class="badge-pcd">SIM</span>'
              : '<span style="color:#999;">NÃO</span>'
          }
        </td>

        <td>
          <span class="status-badge status-${p.status.toLowerCase()}">
            ${p.status}
          </span>
        </td>
<td>
  <div class="action-buttons-grid">

    <button class="btn-action btn-dark"
      title="Gerar Nota"
      onclick="gerarNotaPassagem('${p.id}')">
      🧾
    </button>

    <button class="btn-action btn-secondary"
      title="Editar"
      onclick="editarPassagem('${p.id}')">
      ✏️
    </button>

    <button class="btn-action btn-primary"
      title="Comprovante"
      onclick="gerarComprovantePassagem('${p.id}')">
      📄
    </button>

    <button class="btn-action btn-warning"
      title="Cancelar"
      onclick="cancelarPassagem('${p.id}')">
      ❌
    </button>

    <button class="btn-action btn-danger btn-full"
      title="Excluir"
      onclick="excluirPassagem('${p.id}')">
      🗑️
    </button>

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
    atualizarDashboard(passagens, window.encomendas || []);
  }
};

window.excluirPassagem = async function (id) {
  if (confirm("Deseja realmente excluir esta passagem?")) {
    await deleteDoc(doc(db, "passagens", id));
    await carregarDados();
    renderizarPassagens();
    atualizarDashboard(passagens, window.encomendas || []);
  }
};

window.editarPassagem = function (id) {
  const passagem = passagens.find((p) => p.id === id);
  if (!passagem) {
    alert("❌ Passagem não encontrada!");
    return;
  }

  // Preenche o formulário
  document.getElementById("selectCliente").value = passagem.nome || "";
  document.getElementById("cpfPassageiro").value = passagem.cpf || "";
  document.getElementById("dataNascimento").value =
    passagem.dataNascimento || "";
  document.getElementById("telefone").value = passagem.telefone || "";
  document.getElementById("emailPassageiro").value = passagem.email || "";
  document.getElementById("embarque").value = passagem.embarque || "";
  document.getElementById("destino").value = passagem.destino || "";
  document.getElementById("bilhete").value = passagem.bilhete || "";
  document.getElementById("dataViagem").value = passagem.dataViagem || "";
  document.getElementById("valorPassagem").value =
    `R$ ${passagem.valor.toFixed(2)}`;
  document.getElementById("valorRefeicao").value =
    `R$ ${(passagem.valorRefeicao || 0).toFixed(2)}`;
  document.getElementById("pcdPassageiro").checked = passagem.pcd || false;

  // Salva ID temporariamente
  window.passagemEditandoId = id;

  // Vai para aba Passagens
  showTab("passagens", document.querySelector(".tab-btn:nth-child(2)"));

  window.scrollTo({ top: 0, behavior: "smooth" });
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
          <td>${p.ordem ?? "-"}</td>
          <td>${p.bilhete}</td>
          <td>${p.nome}</td>
          <td>${p.cpf || "-"}</td>
          <td>${p.email || "Sem dados"}</td>
          <td>${p.embarque}</td>
          <td>${p.destino}</td>
          <td>${new Date(p.dataViagem).toLocaleDateString("pt-BR")}</td>
          <td>R$ ${Number(p.valor || 0).toFixed(2)}</td>
          <td>R$ ${Number(p.valorRefeicao || 0).toFixed(2)}</td>
          <td>
            ${
              p.pcd
                ? '<span class="badge-pcd">SIM</span>'
                : '<span style="color:#999;">NÃO</span>'
            }
          </td>
          <td>
            <span class="status-badge status-${p.status.toLowerCase()}">
              ${p.status}
            </span>
          </td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-small"
                onclick="gerarComprovantePassagem('${p.id}')">
                📄 Comprovante
              </button>
  
              <button class="btn btn-small btn-danger"
                onclick="cancelarPassagem('${p.id}')">
                ❌ Cancelar
              </button>
  
              <button class="btn btn-small btn-secondary"
                onclick="excluirPassagem('${p.id}')">
                🗑️ Excluir
              </button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
};

window.fecharModalPdf = function () {
  document.getElementById("pdfModal").style.display = "none";
  document.getElementById("pdfPreview").src = "";
  document.getElementById("btnBaixarPdf").onclick = null;

  // 🔥 RESETA WHATSAPP
  const btnZap = document.getElementById("btnWhatsapp");
  btnZap.style.display = "inline-flex";
};

window.enviarWhatsapp = function (numeroOriginal, mensagemTexto) {
  if (!numeroOriginal) {
    alert("❌ Nenhum telefone cadastrado.");
    return;
  }

  let numero = numeroOriginal.replace(/\D/g, "");

  // adiciona DDI Brasil se necessário
  if (numero.length === 11 && !numero.startsWith("55")) {
    numero = "55" + numero;
  }

  const mensagem = encodeURIComponent(mensagemTexto);

  // 🔥 SEM DETECTAR DISPOSITIVO
  const url = `https://wa.me/${numero}?text=${mensagem}`;

  window.open(url, "_blank");
};

window.gerarComprovantePassagem = function (id) {
  const passagem = passagens.find((p) => p.id === id);
  if (!passagem) return alert("❌ Passagem não encontrada!");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  const protocolo = `P-${Date.now()}`;

  // 🔷 CABEÇALHO
  doc.setFillColor(15, 45, 90);
  doc.rect(0, 0, 210, 40, "F");

  doc.addImage(logoBase64, "PNG", 15, 8, 25, 25);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text("AGÊNCIA LIRA", 105, 18, { align: "center" });

  doc.setFontSize(11);
  doc.text("COMPROVANTE DE PASSAGEM", 105, 28, { align: "center" });

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
  linha("Ordem:", passagem.ordem ?? "-");
  linha("Bilhete:", passagem.bilhete);
  linha("Nome:", passagem.nome);
  linha("CPF:", passagem.cpf);
  linha("Telefone:", passagem.telefone);
  linha(
    "Email:",
    passagem.email && passagem.email.trim() !== ""
      ? passagem.email
      : "Sem dados",
  );
  linha("Embarque:", passagem.embarque);
  linha("Destino:", passagem.destino);
  linha("Data da Viagem:", passagem.dataViagem.split("-").reverse().join("/"));
  linha(
    "Valor:",
    passagem.valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    }),
  );
  linha("PCD:", passagem.pcd ? "SIM" : "NÃO");

  // 🔹 STATUS
  doc.setFont(undefined, "bold");
  doc.text("Status:", 20, y);

  if (passagem.status === "ATIVO") {
    doc.setTextColor(39, 174, 96);
  } else {
    doc.setTextColor(231, 76, 60);
  }

  doc.text(passagem.status, 85, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  // 🔹 RODAPÉ
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Responsável: ${window.usuarioLogadoEmail || "Sistema"}`, 20, 280);
  doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, 20, 285);

  // 🔥 PREVIEW
  const pdfBlob = doc.output("blob");
  const url = URL.createObjectURL(pdfBlob);

  document.getElementById("pdfPreview").src = url;

  const btnZap = document.getElementById("btnWhatsapp");
  const btnBaixar = document.getElementById("btnBaixarPdf");

  // 🔥 RESETA VISUAL
  btnZap.style.display = "inline-flex";
  btnZap.style.visibility = "visible";
  btnZap.disabled = false;

  btnBaixar.style.display = "inline-flex";

  document.getElementById("pdfModal").style.display = "flex";

  // 🔽 BAIXAR
  btnBaixar.onclick = function () {
    doc.save(`Passagem_${passagem.bilhete}.pdf`);
  };

  // 📲 WHATSAPP + EMAIL
  btnZap.onclick = async function () {
    const confirmar = confirm("Deseja realmente enviar o comprovante?");
    if (!confirmar) return;

    if (!passagem.telefone) {
      alert("❌ Telefone não cadastrado.");
      return;
    }

    try {
      mostrarLoading("Gerando comprovante...");
      atualizarProgresso(20);

      const pdfBlob = doc.output("blob");

      atualizarProgresso(40);

      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = String(hoje.getMonth() + 1).padStart(2, "0");

      const nomeArquivo = `passagem_${passagem.bilhete}.pdf`;
      const caminho = `comprovantes/${window.usuarioLogadoEmail}/${ano}/${mes}/passagens/${nomeArquivo}`;

      const storageRef = ref(storage, caminho);

      atualizarProgresso(60);
      await uploadBytes(storageRef, pdfBlob);

      atualizarProgresso(75);
      const downloadURL = await getDownloadURL(storageRef);

      atualizarProgresso(90);

      // 🔥 EMAIL
      if (passagem.email && passagem.email.trim() !== "") {
        await enviarEmailFunction({
          email: passagem.email,
          nome: passagem.nome,
          link: downloadURL,
        });
      }

      atualizarProgresso(100);

      const mensagem = `🛥️ *AGÊNCIA LIRA*

Olá *${passagem.nome}* 👋

Seu comprovante:
${downloadURL}`;

      esconderLoading();
      enviarWhatsapp(passagem.telefone, mensagem);
    } catch (error) {
      esconderLoading();
      console.error(error);
      alert("❌ Erro ao enviar comprovante.");
    }
  };
};

window.gerarNotaPassagem = function (id) {
  const passagem = passagens.find((p) => p.id === id);
  if (!passagem) return alert("❌ Passagem não encontrada!");

  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: [80, 200],
  });

  let y = 8;

  // 🔷 LOGO CENTRALIZADA CORRETAMENTE
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
  doc.setFont(undefined, "normal");
  doc.setFontSize(8);
  doc.text("Comprovante de Serviço", 40, y, { align: "center" });

  y += 6;
  doc.line(5, y, 75, y);
  y += 8;

  doc.setFontSize(9);

  const linha = (titulo, valor) => {
    doc.setFont(undefined, "bold");
    doc.text(titulo, 5, y);
    doc.setFont(undefined, "normal");
    doc.text(String(valor), 5, y + 4);
    y += 10;
  };

  linha("Ordem:", passagem.ordem);
  linha("Bilhete:", passagem.bilhete);
  linha("Nome:", passagem.nome);
  linha("CPF:", formatarCPFVisual(passagem.cpf));
  linha("Embarque:", passagem.embarque);
  linha("Destino:", passagem.destino);
  linha("Data:", formatarDataBR(passagem.dataViagem));
  linha(
    "Valor:",
    passagem.valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    }),
  );

  doc.line(5, y, 75, y);
  y += 8;

  doc.setFontSize(8);
  doc.text(`Emitido por: ${window.usuarioLogadoEmail}`, 5, y);
  y += 5;
  doc.text(`Data emissão: ${new Date().toLocaleString("pt-BR")}`, 5, y);

  y += 8;
  doc.text("Via Cliente", 40, y, { align: "center" });

  // 🔥 PREVIEW UNIVERSAL
  const pdfBlob = doc.output("blob");
  const url = URL.createObjectURL(pdfBlob);

  document.getElementById("pdfPreview").src = url;
  document.getElementById("pdfModal").style.display = "flex";

  // 🔥 ESCONDE WHATSAPP
  document.getElementById("btnWhatsapp").style.display = "none";

  // 🔥 MOSTRA BAIXAR
  document.getElementById("btnBaixarPdf").style.display = "inline-block";

  document.getElementById("pdfModal").style.display = "flex";

  // 🔽 BOTÃO BAIXAR
  document.getElementById("btnBaixarPdf").onclick = function () {
    doc.save(`Nota_${passagem.bilhete}.pdf`);
  };
};

let clientes = [];

async function carregarClientes() {
  const snapshot = await getDocs(collection(db, "clientes"));

  clientes = [];

  snapshot.forEach((docSnap) => {
    clientes.push({ id: docSnap.id, ...docSnap.data() });
  });
}

window.filtrarClientes = function (valor) {
  const dropdown = document.getElementById("listaClientesDropdown");

  if (!valor) {
    dropdown.style.display = "none";
    return;
  }

  const filtrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(valor.toLowerCase()),
  );

  if (filtrados.length === 0) {
    dropdown.style.display = "none";
    return;
  }

  dropdown.innerHTML = filtrados
    .map(
      (c) => `
      <div onclick="selecionarCliente('${c.id}')">
        ${c.nome}
      </div>
    `,
    )
    .join("");

  dropdown.style.display = "block";
};

window.selecionarCliente = function (id) {
  const cliente = clientes.find((c) => c.id === id);
  if (!cliente) return;

  document.getElementById("selectCliente").value = cliente.nome;
  document.getElementById("cpfPassageiro").value = cliente.cpf || "";
  document.getElementById("dataNascimento").value =
    cliente.dataNascimento || "";
  document.getElementById("telefone").value = cliente.telefone || "";
  document.getElementById("emailPassageiro").value = cliente.email || "";

  document.getElementById("listaClientesDropdown").style.display = "none";
};
