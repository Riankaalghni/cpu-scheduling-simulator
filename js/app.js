import { runSJF } from "./sjf.js";
import { runMLFQ } from "./mlfq.js";
import { renderGantt } from "./gantt.js";
import { renderComparison } from "./comparison.js";

const sample = [
    { id: "P1", at: 0, bt: 7 },
    { id: "P2", at: 2, bt: 4 },
    { id: "P3", at: 4, bt: 1 },
    { id: "P4", at: 5, bt: 4 }
];

let processes = [];
let lastSjf = null;
let lastMlfq = null;

const $ = id => document.getElementById(id);

const pageNames = {
    dashboard: "Dashboard",
    sjf: "Simulasi SJF",
    mlfq: "Simulasi MLFQ",
    comparison: "Perbandingan Algoritma",
    guide: "Panduan"
};

function toast(message) {
    const el = $("toast");

    el.textContent = message;
    el.classList.add("show");

    window.setTimeout(() => el.classList.remove("show"), 2600);
}

function showPage(name) {
    if (!pageNames[name]) return;

    document.querySelectorAll(".page").forEach(page => {
        page.classList.toggle("active", page.id === `page-${name}`);
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.page === name);
    });

    $("breadcrumbCurrent").textContent = pageNames[name];
    $("sidebar").classList.remove("open");

    window.location.hash = name;
}

function setMessage(id, message, success = false) {
    const el = $(id);

    el.textContent = message;
    el.classList.toggle("success", success);
}

function validateProcess(id, at, bt) {
    const cleanId = id.trim();

    if (!cleanId) {
        return "Process ID tidak boleh kosong.";
    }

    if (processes.some(p => p.id.toLowerCase() === cleanId.toLowerCase())) {
        return "Process ID sudah digunakan. Masukkan ID yang berbeda.";
    }

    if (!Number.isInteger(at) || at < 0) {
        return "Arrival Time harus berupa bilangan bulat nonnegatif.";
    }

    if (!Number.isInteger(bt) || bt <= 0) {
        return "Burst Time harus berupa bilangan bulat positif.";
    }

    return "";
}

function renderProcessTable() {
    const body = $("processTableBody");

    body.replaceChildren();

    if (!processes.length) {
        const row = body.insertRow();
        const cell = row.insertCell();

        cell.colSpan = 4;
        cell.className = "empty-cell";
        cell.textContent = "Belum ada proses. Tambahkan proses atau gunakan data contoh.";
    } else {
        processes.forEach((p, index) => {
            const row = body.insertRow();

            [p.id, p.at, p.bt].forEach(value => {
                const cell = row.insertCell();
                cell.textContent = String(value);
            });

            const action = row.insertCell();
            const button = document.createElement("button");

            button.className = "delete-button";
            button.textContent = "Hapus";
            button.setAttribute("aria-label", `Hapus proses ${p.id}`);

            button.addEventListener("click", () => {
                processes.splice(index, 1);

                invalidateResults();
                renderProcessTable();

                toast(`Proses ${p.id} dihapus.`);
            });

            action.append(button);
        });
    }

    $("statProcesses").textContent = processes.length
        ? String(processes.length)
        : "—";
}

function invalidateResults() {
    lastSjf = null;
    lastMlfq = null;

    $("statTime").textContent = "—";
    $("statWaiting").textContent = "—";
    $("statTurnaround").textContent = "—";

    $("dashboardGantt").className = "empty-state";
    $("dashboardGantt").textContent = "Jalankan simulasi untuk melihat diagram Gantt.";
    $("dashboardGanttCaption").textContent = "Jalankan simulasi untuk melihat diagram Gantt.";
}

function loadSample() {
    processes = sample.map(p => ({ ...p }));

    invalidateResults();
    renderProcessTable();

    setMessage(
        "formMessage",
        "Data contoh berhasil dimuat. Data dapat diubah atau dihapus.",
        true
    );

    toast("Data contoh berhasil dimuat.");
}

function resetData() {
    processes = [];

    invalidateResults();
    renderProcessTable();

    setMessage("formMessage", "Data proses berhasil direset.", true);

    toast("Dataset dikosongkan.");
}

function format(value) {
    return Number(value).toFixed(2);
}

function renderRows(bodyId, rows, columns) {
    const body = $(bodyId);

    body.replaceChildren();

    rows.forEach(row => {
        const tr = body.insertRow();

        columns.forEach(column => {
            const td = tr.insertCell();

            td.textContent = String(row[column] ?? "—");
        });
    });
}

function updateDashboard(result) {
    $("statProcesses").textContent = String(processes.length);
    $("statTime").textContent = String(result.total);
    $("statWaiting").textContent = format(result.averages.wt);
    $("statTurnaround").textContent = format(result.averages.tat);

    $("dashboardGanttCaption").textContent =
        `Diagram hasil ${result.algorithm} · total waktu ${result.total}`;

    renderGantt($("dashboardGantt"), result.segments);
}

function runSjfAction() {
    try {
        if (!processes.length) {
            throw new Error("Tambahkan proses terlebih dahulu melalui Dashboard.");
        }

        lastSjf = runSJF(processes);

        $("sjfAvgWt").textContent = format(lastSjf.averages.wt);
        $("sjfAvgTat").textContent = format(lastSjf.averages.tat);
        $("sjfAvgRt").textContent = format(lastSjf.averages.rt);
        $("sjfTotal").textContent = String(lastSjf.total);

        renderGantt($("sjfGantt"), lastSjf.segments);

        renderRows(
            "sjfResultBody",
            lastSjf.results,
            ["id", "at", "bt", "start", "ct", "tat", "wt", "rt"]
        );

        const list = $("sjfExplanation");

        list.replaceChildren();

        lastSjf.explanation.forEach(text => {
            const li = document.createElement("li");

            li.textContent = text;
            list.append(li);
        });

        updateDashboard({
            ...lastSjf,
            algorithm: "SJF"
        });

        toast("Simulasi SJF berhasil dihitung.");

        return lastSjf;

    } catch (error) {
        toast(error.message);

        return null;
    }
}

function runMlfqAction() {
    try {
        if (!processes.length) {
            throw new Error("Tambahkan proses terlebih dahulu melalui Dashboard.");
        }

        const q1 = Number($("q1Quantum").value);
        const q2 = Number($("q2Quantum").value);

        if (
            !Number.isInteger(q1) ||
            q1 <= 0 ||
            !Number.isInteger(q2) ||
            q2 <= 0
        ) {
            throw new Error("Quantum Queue 1 dan Queue 2 harus bilangan bulat positif.");
        }

        lastMlfq = runMLFQ(processes, q1, q2);

        $("mlfqAvgWt").textContent = format(lastMlfq.averages.wt);
        $("mlfqAvgTat").textContent = format(lastMlfq.averages.tat);
        $("mlfqAvgRt").textContent = format(lastMlfq.averages.rt);
        $("mlfqTotal").textContent = String(lastMlfq.total);

        renderGantt($("mlfqGantt"), lastMlfq.segments);

        renderRows(
            "mlfqResultBody",
            lastMlfq.rows,
            ["id", "at", "bt", "ct", "tat", "wt", "rt", "history", "preemptions"]
        );

        const list = $("mlfqExplanation");

        list.replaceChildren();

        lastMlfq.decisions.forEach(text => {
            const li = document.createElement("li");

            li.textContent = text;
            list.append(li);
        });

        updateDashboard(lastMlfq);

        setMessage(
            "mlfqMessage",
            "Simulasi selesai. Total waktu CPU tervalidasi sama dengan jumlah burst time.",
            true
        );

        toast("Simulasi MLFQ berhasil dihitung.");

        return lastMlfq;

    } catch (error) {
        setMessage("mlfqMessage", error.message);
        toast(error.message);

        return null;
    }
}

function compareAction() {
    if (!processes.length) {
        toast("Tambahkan proses terlebih dahulu.");
        return;
    }

    const sjf = runSjfAction();
    const mlfq = runMlfqAction();

    if (!sjf || !mlfq) return;

    renderComparison(
        $("comparisonChart"),
        $("comparisonConclusion"),
        sjf,
        mlfq
    );

    toast("Perbandingan berhasil diperbarui.");
}

$("processForm").addEventListener("submit", event => {
    event.preventDefault();

    const id = $("processId").value;
    const atRaw = $("arrivalTime").value.trim();
    const btRaw = $("burstTime").value.trim();

    const at = atRaw === "" ? NaN : Number(atRaw);
    const bt = btRaw === "" ? NaN : Number(btRaw);

    const error = validateProcess(id, at, bt);

    if (error) {
        setMessage("formMessage", error);
        return;
    }

    processes.push({
        id: id.trim(),
        at,
        bt
    });

    invalidateResults();
    renderProcessTable();

    $("processForm").reset();
    $("processId").focus();

    setMessage("formMessage", "Proses berhasil ditambahkan.", true);
});

$("loadSample").addEventListener("click", loadSample);
$("resetData").addEventListener("click", resetData);
$("runSjf").addEventListener("click", runSjfAction);
$("runMlfq").addEventListener("click", runMlfqAction);
$("runCompare").addEventListener("click", compareAction);

$("menuToggle").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
});

document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.go);
    });
});

window.addEventListener("hashchange", () => {
    showPage(window.location.hash.slice(1) || "dashboard");
});

if (window.lucide) {
    window.lucide.createIcons();
}

renderProcessTable();

showPage(window.location.hash.slice(1) || "dashboard");