import { logoBase64 } from "./logo.js";
import { formatarDataBR } from "./utils.js";

// RELATÓRIOS
window.gerarRelatorio = function () {
  const dataInicial = document.getElementById("dataInicial").value;
  const dataFinal = document.getElementById("dataFinal").value;

  if (!dataInicial || !dataFinal) {
    alert("Por favor, selecione as datas inicial e final.");
    return;
  }

  // 🔹 PRIMEIRO FILTRA
const passagensFiltradas = (window.passagens || []).filter((p) => {
  return p.dataViagem >= dataInicial && p.dataViagem <= dataFinal;
});

  console.log(passagens);
  console.log(passagensFiltradas);

  const encomendasFiltradas = (window.encomendas || []).filter((e) => {
    return e.dataViagem >= dataInicial && e.dataViagem <= dataFinal;
  });

  // 🔹 DEPOIS CALCULA
  const receitaPass = passagensFiltradas.reduce((sum, p) => sum + p.valor, 0);
  const receitaEnc = encomendasFiltradas.reduce((sum, e) => sum + e.valor, 0);

  const totalRefeicoes = passagensFiltradas.reduce(
    (sum, p) => sum + (p.refeicoes || 0),
    0,
  );

  const totalVolumes = encomendasFiltradas.reduce(
    (sum, e) => sum + e.volumes,
    0,
  );

  const comissaoPass = receitaPass * 0.1;
  const comissaoEnc = receitaEnc * 0.3;
  const comissaoTotal = comissaoPass + comissaoEnc;

  const lucro = receitaPass + receitaEnc - comissaoTotal;

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
    totalRefeicoes,
  };

  gerarPrestacaoContas();
};


window.gerarPrestacaoContas = function () {
  if (!window.dadosRelatorio) {
    alert("⚠️ Gere o relatório primeiro!");
    return;
  }

  const dados = window.dadosRelatorio;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  let y = 15;

  // ===============================
  // 🔢 CÁLCULOS IMPORTANTES
  // ===============================

  const totalValorRefeicoes = dados.passagens.reduce(
    (total, p) => total + Number(p.valorRefeicao || 0),
    0,
  );

  const qtdRefeicoesPagas = dados.passagens.filter(
    (p) => Number(p.valorRefeicao || 0) > 0,
  ).length;

  const receitaTotalPass = dados.receitaPass + totalValorRefeicoes;

  // ===============================
  // 🔷 CABEÇALHO
  // ===============================

  const pageWidth = doc.internal.pageSize.getWidth();
  const imgProps = doc.getImageProperties(logoBase64);
  const imgWidth = 55;
  const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
  const x = (pageWidth - imgWidth) / 2;

  doc.addImage(logoBase64, "PNG", x, y, imgWidth, imgHeight);
  y += imgHeight + 8;

  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text("AGÊNCIA LIRA", 105, y, { align: "center" });

  y += 8;
  doc.setFontSize(13);
  doc.text("PRESTAÇÃO DE CONTAS - RELAÇÃO DE VIAGEM", 105, y, {
    align: "center",
  });

  y += 8;
  doc.setFontSize(11);
  doc.text(
    `Período: ${formatarDataBR(dados.dataInicial)} a ${formatarDataBR(dados.dataFinal)}`,
    105,
    y,
    { align: "center" },
  );

  y += 15;

  // ===============================
  // 🟦 BALANÇO PASSAGENS
  // ===============================

  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text("BALANÇO GERAL - PASSAGENS", 15, y);
  y += 5;

  doc.autoTable({
    startY: y,
    head: [["Descrição", "Valor (R$)"]],
    body: [
      ["Total Passagens", `R$ ${dados.receitaPass.toFixed(2)}`],
      ["Total Refeições", `R$ ${totalValorRefeicoes.toFixed(2)}`],
      ["Receita Bruta Total", `R$ ${receitaTotalPass.toFixed(2)}`],
      ["Comissão Agência (10%)", `R$ ${dados.comissaoPass.toFixed(2)}`],
      [
        "Lucro Líquido",
        `R$ ${(receitaTotalPass - dados.comissaoPass).toFixed(2)}`,
      ],
      ["Quantidade Passageiros", dados.passagens.length],
      ["Passageiros que pagaram Refeição", qtdRefeicoesPagas],
      ["Total Passageiros PCD", dados.passagens.filter((p) => p.pcd).length],
    ],
    theme: "grid",
    headStyles: { fillColor: [0, 70, 140] },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ===============================
  // 🧍 RELAÇÃO PASSAGEIROS
  // ===============================

  doc.setFont(undefined, "bold");
  doc.text("RELAÇÃO DE PASSAGEIROS", 15, y);
  y += 5;

  doc.autoTable({
    startY: y,
    head: [
      [
        "Ordem",
        "Nome",
        "Nascimento",
        "Telefone",
        "Embarque",
        "Destino",
        "CPF",
        "Bilhete",
        "PCD",
        "Refeição (R$)",
        "Passagem (R$)",
      ],
    ],
    body:
      dados.passagens.length > 0
        ? dados.passagens.map((p, index) => [
            p.ordem ?? index + 1,
            p.nome ?? "-",
            p.dataNascimento ? formatarDataBR(p.dataNascimento) : "-",
            p.telefone ?? "-",
            p.embarque ?? "-",
            p.destino ?? "-",
            p.cpf ?? "-",
            p.bilhete ?? "-",
            p.pcd ? "SIM" : "NÃO",
            `R$ ${Number(p.valorRefeicao || 0).toFixed(2)}`,
            `R$ ${Number(p.valor || 0).toFixed(2)}`,
          ])
        : [["-", "Nenhum passageiro encontrado"]],
    theme: "grid",
    styles: { fontSize: 7 },
    headStyles: { fillColor: [26, 77, 126] },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ===============================
// 📦 BALANÇO ENCOMENDAS
// ===============================

if (dados.encomendas.length > 0) {
  doc.addPage();

  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text("BALANÇO GERAL - ENCOMENDAS", 15, 20);

  doc.autoTable({
    startY: 25,
    head: [["Descrição", "Valor (R$)"]],
    body: [
      ["Total Encomendas", `R$ ${dados.receitaEnc.toFixed(2)}`],
      ["Comissão Agência (30%)", `R$ ${dados.comissaoEnc.toFixed(2)}`],
      ["Lucro Líquido", `R$ ${(dados.receitaEnc - dados.comissaoEnc).toFixed(2)}`],
      ["Quantidade Encomendas", dados.encomendas.length],
      ["Total Volumes", dados.totalVolumes],
    ],
    theme: "grid",
    headStyles: { fillColor: [20, 90, 60] },
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 10,
    head: [
      [
        "Ordem",
        "Destinatário",
        "Remetente",
        "Bilhete",
        "Local",
        "Destino",
        "Volumes",
        "Valor (R$)",
      ],
    ],
    body: dados.encomendas.map((e, index) => [
      e.ordem ?? index + 1,
      e.destinatario ?? "-",
      e.remetente ?? "-",
      e.bilhete ?? "-",
      e.local ?? "-",
      e.cidadeDestino ?? "-",
      e.volumes ?? 0,
      `R$ ${Number(e.valor || 0).toFixed(2)}`,
    ]),
    theme: "grid",
    styles: { fontSize: 8 },
    headStyles: { fillColor: [20, 90, 60] },
  });
}

// ===============================
// 📊 RELAÇÃO DA VIAGEM - DASHBOARD PREMIUM
// ===============================


doc.addPage();


// Fundo leve
doc.setFillColor(245, 248, 255);
doc.rect(0, 0, pageWidth, 297, "F");

// Faixa superior
doc.setFillColor(0, 0, 150);
doc.rect(0, 10, pageWidth, 15, "F");

doc.setFontSize(18);
doc.setTextColor(255, 255, 255);
doc.setFont(undefined, "bold");
doc.text("RELAÇÃO DA VIAGEM - PAINEL EXECUTIVO", 105, 20, { align: "center" });

doc.setTextColor(0, 0, 0);

const lucroPassagem = receitaTotalPass - dados.comissaoPass;
const lucroEncomenda = dados.receitaEnc - dados.comissaoEnc;
const totalGeral = receitaTotalPass + dados.receitaEnc;
const totalComissao = dados.comissaoPass + dados.comissaoEnc;
const lucroTotal = totalGeral - totalComissao;

// ===============================
// 🔷 FUNÇÃO PARA CAIXA DASHBOARD
// ===============================

function desenharCaixa(titulo, x, y, largura, altura, corTopo, dadosLinhas) {
  // Corpo
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, largura, altura, 3, 3, "F");

  // Topo colorido
  doc.setFillColor(...corTopo);
  doc.roundedRect(x, y, largura, 12, 3, 3, "F");

  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(titulo, x + largura / 2, y + 8, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  let linhaY = y + 20;

  dadosLinhas.forEach((linha) => {
    doc.text(linha.label, x + 5, linhaY);
    doc.text(linha.valor, x + largura - 5, linhaY, { align: "right" });
    linhaY += 8;
  });
}

// ===============================
// 🔵 PASSAGENS
// ===============================

desenharCaixa(
  "PASSAGENS",
  15,
  40,
  80,
  55,
  [0, 0, 150],
  [
    { label: "Total Gerado", valor: `R$ ${receitaTotalPass.toFixed(2)}` },
    { label: "Comissão (10%)", valor: `R$ ${dados.comissaoPass.toFixed(2)}` },
    { label: "Lucro Líquido", valor: `R$ ${lucroPassagem.toFixed(2)}` },
    { label: "Qtd Vendida", valor: `${dados.passagens.length}` },
  ]
);

// ===============================
// ⚫ REFEIÇÕES
// ===============================

desenharCaixa(
  "REFEIÇÕES",
  110,
  40,
  80,
  45,
  [90, 90, 90],
  [
    { label: "Total Arrecadado", valor: `R$ ${totalValorRefeicoes.toFixed(2)}` },
    { label: "Qtd Refeições", valor: `${qtdRefeicoesPagas}` },
    { label: "Comissão", valor: "Não se aplica" },
  ]
);

// ===============================
// 🟢 ENCOMENDAS
// ===============================

desenharCaixa(
  "ENCOMENDAS",
  15,
  110,
  80,
  55,
  [0, 120, 60],
  [
    { label: "Total Gerado", valor: `R$ ${dados.receitaEnc.toFixed(2)}` },
    { label: "Comissão (30%)", valor: `R$ ${dados.comissaoEnc.toFixed(2)}` },
    { label: "Lucro Líquido", valor: `R$ ${lucroEncomenda.toFixed(2)}` },
    { label: "Qtd Encomendas", valor: `${dados.encomendas.length}` },
  ]
);

// ===============================
// 🟣 TOTAL GERAL (DESTAQUE)
// ===============================

doc.setFillColor(255, 255, 255);
doc.roundedRect(110, 110, 80, 65, 4, 4, "F");

doc.setFillColor(120, 0, 150);
doc.roundedRect(110, 110, 80, 15, 4, 4, "F");

doc.setFontSize(12);
doc.setTextColor(255, 255, 255);
doc.text("TOTAL GERAL", 150, 120, { align: "center" });

doc.setTextColor(0, 0, 0);
doc.setFontSize(11);

doc.text("Total Bruto:", 115, 135);
doc.text(`R$ ${totalGeral.toFixed(2)}`, 185, 135, { align: "right" });

doc.text("Total Comissão:", 115, 145);
doc.text(`R$ ${totalComissao.toFixed(2)}`, 185, 145, { align: "right" });

// Destaque no lucro
doc.setFont(undefined, "bold");
doc.setFontSize(14);
doc.setTextColor(0, 120, 0);
doc.text("LUCRO LÍQUIDO:", 115, 160);
doc.text(`R$ ${lucroTotal.toFixed(2)}`, 185, 160, { align: "right" });

doc.setTextColor(0, 0, 0);

  // ===============================
  // 📄 RODAPÉ
  // ===============================

  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(`Página ${i} de ${pages}`, 105, 290, { align: "center" });
  }

  const pdfUrl = doc.output("bloburl");
  document.getElementById("pdfPreview").src = pdfUrl;
  document.getElementById("pdfModal").style.display = "flex";

  document.getElementById("btnWhatsapp").style.display = "none";
  document.getElementById("btnBaixarPdf").style.display = "inline-block";

  document.getElementById("btnBaixarPdf").onclick = function () {
    const dataInicialFormatada = formatarDataBR(dados.dataInicial).replace(
      /\//g,
      "-",
    );
    const dataFinalFormatada = formatarDataBR(dados.dataFinal).replace(
      /\//g,
      "-",
    );

    doc.save(
      `Prestacao_Contas_${dataInicialFormatada}_a_${dataFinalFormatada}.pdf`,
    );
  };
};

