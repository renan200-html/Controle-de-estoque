/* ==========================================
   Controle de Estoque Proença - REALTIME DATABASE
   ========================================== */

// 1. IMPORTAR OS MÓDULOS DO FIREBASE (REALTIME DATABASE)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    set, 
    push, 
    onValue, 
    update, 
    remove 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 2. SUAS CREDENCIAIS REAIS DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAEFPBH0CrqBJ42FdaK2EN-5_iUqyz3JVo",
    authDomain: "estoque-c27e1.firebaseapp.com",
    databaseURL: "https://estoque-c27e1-default-rtdb.firebaseio.com", // Seu link do banco de dados
    projectId: "estoque-c27e1",
    storageBucket: "estoque-c27e1.firebasestorage.app",
    messagingSenderId: "109591752115",
    appId: "1:109591752115:web:ef6ee3853601ee7051afc6"
};

// Inicializa o Firebase e o Realtime Database
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Referências das "tabelas" no banco
const alimentosRef = ref(db, "alimentos");
const paletesRef = ref(db, "paletes");

// Variáveis locais para controle da interface
let estoqueAlimentos = [];
let historicoPaletes = [];

// Elementos do HTML
const formAlimento = document.getElementById("form-alimento");
const formMovimentacao = document.getElementById("form-movimentacao");
const formPaletes = document.getElementById("form-paletes");

const selectAlimento = document.getElementById("select-alimento");
const tabelaEstoque = document.getElementById("tabela-estoque");
const listaPaletes = document.getElementById("lista-paletes");
const saldoPaletes = document.getElementById("saldo-paletes");

// Formatador de data simples (AAAA-MM-DD para DD/MM/AAAA)
function formatarData(dataString) {
    if (!dataString) return "Não informada";
    const partes = dataString.split("-");
    if (partes.length !== 3) return dataString;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// ==========================================
// 3. SINCRONIZAÇÃO EM TEMPO REAL
// ==========================================

// Monitora a tabela de alimentos
onValue(alimentosRef, (snapshot) => {
    estoqueAlimentos = [];
    const data = snapshot.val();
    if (data) {
        Object.keys(data).forEach((key) => {
            estoqueAlimentos.push({ id: key, ...data[key] });
        });
    }
    renderizarTabela();
    atualizarSelectAlimentos();
});

// Monitora a tabela de paletes
onValue(paletesRef, (snapshot) => {
    historicoPaletes = [];
    const data = snapshot.val();
    if (data) {
        Object.keys(data).forEach((key) => {
            historicoPaletes.push({ id: key, ...data[key] });
        });
    }
    renderizarPaletes();
});

// ==========================================
// 4. RENDERIZAR INTERFACE
// ==========================================
function renderizarTabela() {
    if (!tabelaEstoque) return;
    tabelaEstoque.innerHTML = "";

    if (estoqueAlimentos.length === 0) {
        tabelaEstoque.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">
                    Nenhum alimento cadastrado ainda no banco de dados.
                </td>
            </tr>
        `;
        return;
    }

    estoqueAlimentos.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${item.nome}</strong> <small style="color: var(--text-muted)">(${item.unidade})</small></td>
            <td>${formatarData(item.validade)}</td>
            <td style="color: var(--primary); font-weight: 600;">+${item.entradas}</td>
            <td style="color: var(--text-muted); font-weight: 600;">-${item.saidas}</td>
            <td style="color: #ef4444; font-weight: 600;">-${item.perdas}</td>
            <td style="font-weight: 700;">${item.saldo} ${item.unidade}</td>
            <td>
                <button class="btn-delete" data-id="${item.id}">Excluir</button>
            </td>
        `;
        tabelaEstoque.appendChild(tr);
    });

    // Evento de exclusão
    document.querySelectorAll(".btn-delete").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            excluirAlimento(id);
        });
    });
}

function atualizarSelectAlimentos() {
    if (!selectAlimento) return;
    selectAlimento.innerHTML = '<option value="">-- Escolha um item --</option>';

    estoqueAlimentos.forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = `${item.nome} (Saldo: ${item.saldo} ${item.unidade})`;
        selectAlimento.appendChild(option);
    });
}

function renderizarPaletes() {
    if (!listaPaletes || !saldoPaletes) return;
    listaPaletes.innerHTML = "";

    if (historicoPaletes.length === 0) {
        listaPaletes.innerHTML = `<li style="justify-content: center; color: var(--text-muted); font-style: italic;">Nenhum palete registrado.</li>`;
        saldoPaletes.textContent = "0";
        return;
    }

    let totalEstoque = 0;
    historicoPaletes.sort((a, b) => new Date(b.data) - new Date(a.data));

    historicoPaletes.forEach(registro => {
        const saldoLote = registro.montados - registro.saidas;
        totalEstoque += saldoLote;

        const li = document.createElement("li");
        li.innerHTML = `
            <span><strong>Data:</strong> ${formatarData(registro.data)}</span>
            <span>Montados: <strong style="color: var(--primary)">+${registro.montados}</strong> | Saídas: <strong style="color: #ef4444">-${registro.saidas}</strong></span>
        `;
        listaPaletes.appendChild(li);
    });

    saldoPaletes.textContent = totalEstoque;
}

// ==========================================
// 5. OPERAÇÕES DE ESCRITA (SALVAR NO BANCO)
// ==========================================

// Cadastrar Novo Alimento
if (formAlimento) {
    formAlimento.addEventListener("submit", function (e) {
        e.preventDefault();

        const nome = document.getElementById("nome").value.trim();
        const unidade = document.getElementById("unidade").value;
        const validade = document.getElementById("validade").value;

        const novoAlimentoRef = push(alimentosRef); // Gera um ID único no Realtime Database
        
        set(novoAlimentoRef, {
            nome: nome,
            unidade: unidade,
            validade: validade,
            entradas: 0,
            saidas: 0,
            perdas: 0,
            saldo: 0
        }).then(() => {
            formAlimento.reset();
        }).catch(err => console.error("Erro ao salvar:", err));
    });
}

// Movimentar Estoque
if (formMovimentacao) {
    formMovimentacao.addEventListener("submit", function (e) {
        e.preventDefault();

        const idAlimento = document.getElementById("select-alimento").value;
        const tipoMov = document.getElementById("tipo-mov").value;
        const qtd = parseFloat(document.getElementById("quantidade").value) || 0;
        const novaValidade = document.getElementById("nova-validade").value;

        const alimento = estoqueAlimentos.find(a => a.id === idAlimento);

        if (!alimento) {
            alert("Selecione um alimento válido.");
            return;
        }

        if ((tipoMov === "saida" || tipoMov === "perda") && alimento.saldo < qtd) {
            alert(`Saldo insuficiente! Você só tem ${alimento.saldo} ${alimento.unidade}.`);
            return;
        }

        let novosValores = { ...alimento };
        if (tipoMov === "entrada") {
            novosValores.entradas += qtd;
            novosValores.saldo += qtd;
        } else if (tipoMov === "saida") {
            novosValores.saidas += qtd;
            novosValores.saldo -= qtd;
        } else if (tipoMov === "perda") {
            novosValores.perdas += qtd;
            novosValores.saldo -= qtd;
        }

        if (novaValidade) {
            novosValores.validade = novaValidade;
        }

        const itemEspecificoRef = ref(db, `alimentos/${idAlimento}`);
        update(itemEspecificoRef, {
            entradas: novosValores.entradas,
            saidas: novosValores.saidas,
            perdas: novosValores.perdas,
            saldo: novosValores.saldo,
            validade: novosValores.validade
        }).then(() => {
            formMovimentacao.reset();
        }).catch(err => console.error("Erro ao movimentar:", err));
    });
}

// Registrar Paletes
if (formPaletes) {
    formPaletes.addEventListener("submit", function (e) {
        e.preventDefault();

        const dataPalete = document.getElementById("data-palete").value;
        const montados = parseInt(document.getElementById("qtd-montada").value) || 0;
        const saidas = parseInt(document.getElementById("qtd-saida-palete").value) || 0;

        const novoPaleteRef = push(paletesRef);
        set(novoPaleteRef, {
            data: dataPalete,
            montados: montados,
            saidas: saidas
        }).then(() => {
            formPaletes.reset();
        }).catch(err => console.error("Erro ao salvar palete:", err));
    });
}

// Excluir Alimento
function excluirAlimento(id) {
    if (confirm("Deseja realmente remover este alimento do banco de dados?")) {
        const itemEspecificoRef = ref(db, `alimentos/${id}`);
        remove(itemEspecificoRef).catch(err => console.error("Erro ao excluir:", err));
    }
}
