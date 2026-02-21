export function formatarCPFVisual(cpf) {
  if (!cpf) return "";

  cpf = cpf.replace(/\D/g, "");

  return cpf
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatarMoedaInput(valor) {
  if (!valor) return "R$ 0,00";

  // remove tudo que não for número
  valor = valor.replace(/\D/g, "");

  // evita NaN
  if (valor === "") return "R$ 0,00";

  valor = (parseInt(valor, 10) / 100).toFixed(2);

  const partes = valor.split(".");
  const inteiro = partes[0];
  const decimal = partes[1];

  // adiciona separador de milhar
  const inteiroFormatado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `R$ ${inteiroFormatado},${decimal}`;
}

export function formatarDataBRs(dataISO) {
  if (!dataISO) return "-";

  const partes = dataISO.split("-");
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


window.logout = async function () {
  await signOut(auth);
  window.location.href = "index.html";
};

export function formatarDataBR(data) {
  if (!data) return "-";

  // Se vier como string ISO (yyyy-mm-dd)
  if (typeof data === "string" && data.includes("-")) {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  // Se vier como objeto Date ou Timestamp
  const d = new Date(data);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();

  return `${dia}/${mes}/${ano}`;
}


export function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, "");

  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  let soma = 0;
  let resto;

  for (let i = 1; i <= 9; i++)
    soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);

  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;

  soma = 0;

  for (let i = 1; i <= 10; i++)
    soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);

  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

export function mostrarLoading(texto) {
  document.getElementById("loadingText").innerText = texto;
  document.getElementById("loadingModal").style.display = "flex";
  atualizarProgresso(0);
}

export function atualizarProgresso(valor) {
  document.getElementById("progressFill").style.width = valor + "%";
}

export function esconderLoading() {
  document.getElementById("loadingModal").style.display = "none";
}