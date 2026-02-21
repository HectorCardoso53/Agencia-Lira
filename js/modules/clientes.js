import { db } from "../firebase.js";
import { formatarCPFVisual } from "./utils.js";

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


let clienteEditandoId = null;

// SALVAR CLIENTE
document
  .getElementById("formCliente")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const nome = document.getElementById("clienteNome").value.trim();
    const cpfFormatado = document.getElementById("clienteCpf").value.trim();
    const nascimento = document.getElementById("clienteNascimento").value;
    const telefone = document.getElementById("clienteTelefone").value.trim();
    const email = document.getElementById("clienteEmail").value.trim();

    const cpfLimpo = cpfFormatado.replace(/\D/g, "");

    if (!validarCPF(cpfLimpo)) {
      alert("❌ CPF inválido!");
      return;
    }

    try {
      // 🔥 VERIFICA SE CPF JÁ EXISTE
      const q = query(collection(db, "clientes"), where("cpf", "==", cpfLimpo));

      const snapshot = await getDocs(q);

      if (!snapshot.empty && !clienteEditandoId) {
        alert("🚫 Já existe um cliente cadastrado com esse CPF!");
        return;
      }

      const dados = {
        nome,
        cpf: cpfLimpo,
        nascimento,
        telefone,
        email,
      };

      if (clienteEditandoId) {
        await updateDoc(doc(db, "clientes", clienteEditandoId), dados);
        alert("✅ Cliente atualizado com sucesso!");
        clienteEditandoId = null;
      } else {
        await addDoc(collection(db, "clientes"), {
          ...dados,
          criadoEm: new Date(),
        });

        alert("✅ Cliente cadastrado com sucesso!");
      }

      this.reset();
      carregarClientes();
    } catch (error) {
      console.error(error);
      alert("❌ Erro ao salvar cliente");
    }
  });


async function carregarClientes() {
  const body = document.getElementById("clientesBody");
  const select = document.getElementById("selectCliente");

  body.innerHTML = "";
  select.innerHTML = `<option value="">Selecione um cliente...</option>`;

  const q = query(collection(db, "clientes"), orderBy("nome"));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    body.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;">
                    Nenhum cliente cadastrado
                </td>
            </tr>
        `;
    return;
  }

  snapshot.forEach((docSnap) => {
    const cliente = docSnap.data();
    const id = docSnap.id;

    // tabela
    body.innerHTML += `
<tr>
    <td>${cliente.nome}</td>
    <td>${formatarCPFVisual(cliente.cpf)}</td>
    <td>${cliente.telefone}</td>
    <td>${cliente.email}</td>
    <td>
        <button class="btn btn-small" onclick="editarCliente('${id}')">
    ✏ Editar
</button>

        <button class="btn btn-danger btn-small" onclick="removerClienteFirebase('${id}')">
            🗑 Excluir
        </button>
    </td>
</tr>
`;

    // select passagens
    select.innerHTML += `
            <option value="${id}" 
                data-cpf="${cliente.cpf}"
                data-nascimento="${cliente.nascimento}"
                data-telefone="${cliente.telefone}"
                data-email="${cliente.email}">
                ${cliente.nome}
            </option>
        `;
  });
}

window.preencherCliente = function (select) {
  if (!select) return;

  const option = select.options[select.selectedIndex];
  if (!option) return;

  document.getElementById("cpfPassageiro").value =
    option.dataset.cpf || "";

  document.getElementById("dataNascimento").value =
    option.dataset.nascimento || "";

  document.getElementById("telefone").value =
    option.dataset.telefone || "";

  document.getElementById("emailPassageiro").value =
    option.dataset.email || "";
};

function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, "");

  if (cpf.length !== 11) return false;

  // Bloqueia CPFs iguais (111.111.111-11 etc)
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


window.removerClienteFirebase = async function (id) {
  if (!confirm("Deseja realmente excluir esse cliente?")) return;

  try {
    await deleteDoc(doc(db, "clientes", id));
    carregarClientes();
  } catch (error) {
    console.error(error);
    alert("Erro ao excluir cliente");
  }
};

window.editarCliente = async function (id) {
  try {
    const docSnap = await getDoc(doc(db, "clientes", id));

    if (!docSnap.exists()) return;

    const cliente = docSnap.data();

    clienteEditandoId = id;

    document.getElementById("clienteNome").value = cliente.nome;
    document.getElementById("clienteCpf").value =
      formatarCPFVisual(cliente.cpf);
    document.getElementById("clienteNascimento").value =
      cliente.nascimento;
    document.getElementById("clienteTelefone").value =
      cliente.telefone;
    document.getElementById("clienteEmail").value =
      cliente.email;

    document.querySelector(
      "#formCliente button[type='submit']"
    ).textContent = "✏ Atualizar Cliente";
  } catch (error) {
    console.error(error);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
});