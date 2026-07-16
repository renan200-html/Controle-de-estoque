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
    databaseURL: "https://estoque-c27e1-default-rtdb.firebaseio.com", 
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
const formPaletes = document.getElementById("form-palete");

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
        tabelaEstoque.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhum alimento cadastrado.</td></tr>`;
        return;
    }

    estoqueAlimentos.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${item.nome}</strong> <small>(${item.unidade})</small></td>
            <td>${formatarData(item.validade)}</td>
            <td style="color: var(--primary)">+${item.entradas}</td>
            <td style="color: var(--text-muted)">-${item.saidas}</td>
            <td style="color: #ef4444">-${item.perdas}</td>
            <td style="font-weight: 700;">${item.saldo} ${item.unidade}</td>
            <td><button class="btn-delete" data-id="${item.id}">Excluir</button></td>
        `;
        tabelaEstoque.appendChild(tr);
    });

    document.querySelectorAll(".btn-delete").forEach(btn => {
        btn.addEventListener("click", () => excluirAlimento(btn.getAttribute("data-id")));
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
            <button class="btn-delete-palete" data-id="${registro.id}" style="margin-left: 10px; cursor: pointer; color: red;">Excluir</button>
        `;
        listaPaletes.appendChild(li);
    });

    saldoPaletes.textContent = totalEstoque;

    document.querySelectorAll(".btn-delete-palete").forEach(btn => {
        btn.addEventListener("click", () => excluirPalete(btn.getAttribute("data-id")));
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

// ==========================================
// 5. OPERAÇÕES DE ESCRITA E EXCLUSÃO
// ==========================================

if (formAlimento) {
    formAlimento.addEventListener("submit", (e) => {
        e.preventDefault();
        const novoAlimentoRef = push(alimentosRef);
        set(novoAlimentoRef, {
            nome: document.getElementById("nome").value.trim(),
            unidade: document.getElementById("unidade").value,
            validade: document.getElementById("validade").value,
            entradas: 0, saidas: 0, perdas: 0, saldo: 0
        }).then(() => formAlimento.reset());
    });
}

if (formMovimentacao) {
    formMovimentacao.addEventListener("submit", (e) => {
        e.preventDefault();
        const idAlimento = document.getElementById("select-alimento").value;
        const tipoMov = document.getElementById("tipo-mov").value;
        const qtd = parseFloat(document.getElementById("quantidade").value) || 0;
        const alimento = estoqueAlimentos.find(a => a.id === idAlimento);

        if (!alimento) return alert("Selecione um alimento!");
        if ((tipoMov === "saida" || tipoMov === "perda") && alimento.saldo < qtd) return alert("Saldo insuficiente!");

        let n = { ...alimento };
        if (tipoMov === "entrada") { n.entradas += qtd; n.saldo += qtd; }
        else if (tipoMov === "saida") { n.saidas += qtd; n.saldo -= qtd; }
        else { n.perdas += qtd; n.saldo -= qtd; }

        update(ref(db, `alimentos/${idAlimento}`), { 
            entradas: n.entradas, saidas: n.saidas, perdas: n.perdas, saldo: n.saldo 
        }).then(() => formMovimentacao.reset());
    });
}

if (formPaletes) {
    formPaletes.addEventListener("submit", (e) => {
        e.preventDefault();
        const novoPaleteRef = push(paletesRef);
        set(novoPaleteRef, {
            data: document.getElementById("data-palete").value,
            montados: parseInt(document.getElementById("qtd-montada").value) || 0,
            saidas: parseInt(document.getElementById("qtd-saida-palete").value) || 0
        }).then(() => formPaletes.reset());
    });
}

function excluirAlimento(id) {
    if (confirm("Deseja realmente remover este alimento?")) {
        remove(ref(db, `alimentos/${id}`));
    }
}

function excluirPalete(id) {
    if (confirm("Deseja realmente remover este registro de palete?")) {
        remove(ref(db, `paletes/${id}`));
    }
}
