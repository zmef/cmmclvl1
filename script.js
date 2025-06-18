// Script to manage CMMC Survey navigation and storage
const appState = {
  current: 0,
  responses: JSON.parse(localStorage.getItem("cmmcResponses") || "{}"),
};

const startBtn = document.getElementById("startBtn");
const questionSection = document.getElementById("question");
const startSection = document.getElementById("start");
const content = document.getElementById("question-content");
const evidence = document.getElementById("evidence");
const form = document.getElementById("responseForm");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const summarySection = document.getElementById("summary");
const summaryStats = document.getElementById("summary-stats");

startBtn.onclick = () => {
  startSection.hidden = true;
  questionSection.hidden = false;
  showQuestion();
};

function showQuestion() {
  const q = cmmcQuestions[appState.current];
  content.innerHTML = `<h3>${q.id} – ${q.title}</h3><p>${q.question}</p>`;
  evidence.value = appState.responses[q.id]?.evidence || "";
  document.querySelectorAll('input[name="status"]').forEach(el => {
    el.checked = appState.responses[q.id]?.status === el.value;
  });
  updateSidebar();
}

form.onsubmit = e => {
  e.preventDefault();
  saveAnswer();
  if (appState.current + 1 < cmmcQuestions.length) {
    appState.current++;
    showQuestion();
  } else {
    showSummary();
  }
};

prevBtn.onclick = () => {
  if (appState.current > 0) {
    saveAnswer();
    appState.current--;
    showQuestion();
  }
};

function saveAnswer() {
  const q = cmmcQuestions[appState.current];
  const selected = document.querySelector('input[name="status"]:checked');
  if (selected) {
    appState.responses[q.id] = {
      status: selected.value,
      evidence: evidence.value,
    };
    localStorage.setItem("cmmcResponses", JSON.stringify(appState.responses));
  }
}

function updateSidebar() {
  const nav = document.getElementById("nav");
  const progress = document.getElementById("progress");
  nav.innerHTML = cmmcQuestions.map((q, i) => {
    const done = appState.responses[q.id]?.status ? "✔️" : "";
    return `<div class="nav-item${i === appState.current ? ' active' : ''}" onclick="jumpTo(${i})">${done} ${q.id}</div>`;
  }).join("");
  const complete = Object.keys(appState.responses).length;
  progress.innerText = `Progress: ${complete}/${cmmcQuestions.length}`;
}

function jumpTo(index) {
  saveAnswer();
  appState.current = index;
  showQuestion();
}

function showSummary() {
  questionSection.hidden = true;
  summarySection.hidden = false;
  let met = 0, notMet = 0, na = 0;
  let html = "<ul>";
  cmmcQuestions.forEach(q => {
    const res = appState.responses[q.id];
    if (!res) return;
    if (res.status === "MET") met++;
    else if (res.status === "NOT MET") notMet++;
    else if (res.status === "N/A") na++;
    html += `<li><strong>${q.id}</strong>: ${res.status}<br/><em>${res.evidence}</em></li>`;
  });
  html += "</ul>";
  let result = notMet > 0 ? "❌ Not Compliant" : "✅ Compliant";
  summaryStats.innerHTML = `<p><strong>${result}</strong><br/>MET: ${met}, NOT MET: ${notMet}, N/A: ${na}</p>` + html;
}

document.getElementById("downloadBtn").onclick = () => {
  html2pdf().from(summaryStats).save("CMMC-Level-1-Summary.pdf");
};

document.getElementById("restartBtn").onclick = () => {
  localStorage.removeItem("cmmcResponses");
  location.reload();
};
