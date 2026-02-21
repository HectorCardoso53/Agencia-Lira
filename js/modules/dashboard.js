// DASHBOARD

let graficoResumo = null;
let graficoEvolucaoDashboard = null;

export function atualizarDashboard(passagens, encomendas) {
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

export function gerarGraficosDashboard(receitaPass, receitaEnc) {
  const ctxResumo = document.getElementById("graficoResumo");
  const ctxEvolucao = document.getElementById("graficoEvolucaoDashboard");

  if (graficoResumo instanceof Chart) {
  graficoResumo.destroy();
}

if (graficoEvolucaoDashboard instanceof Chart) {
  graficoEvolucaoDashboard.destroy();
}

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

  [
  ...(Array.isArray(window.passagens) ? window.passagens : []),
  ...(Array.isArray(window.encomendas) ? window.encomendas : [])
].forEach((item) => {
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