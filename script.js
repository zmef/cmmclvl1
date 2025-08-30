// Script to manage CMMC Survey navigation, storage, and PDF export with signature

// Application state holds current question index and all recorded responses
const appState = {
  current: 0,
  responses: JSON.parse(localStorage.getItem("cmmcResponses") || "{}"),
};

// Cache common DOM elements up front
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
const signatureSection = document.getElementById("signature-section");
const signatureName = document.getElementById("signatureName");
const affirmCheckbox = document.getElementById("affirmCheckbox");

// Kick off the assessment when the user clicks the Start button
startBtn.onclick = () => {
  startSection.hidden = true;
  questionSection.hidden = false;
  showQuestion();
};

// Render the current question and populate any stored response
function showQuestion() {
  const q = cmmcQuestions[appState.current];
  // Display question ID, title and question text
  content.innerHTML = `<strong>${q.id}</strong> – <em>${q.title}</em><br>${q.question}`;
  // Restore evidence text if previously answered
  evidence.value = appState.responses[q.id]?.evidence || "";
  // Restore radio selection based on stored status
  document.querySelectorAll('input[name="status"]').forEach(el => {
    el.checked = appState.responses[q.id]?.status === el.value;
  });
  updateSidebar();
}

// Handle form submission (Next button)
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

// Handle Previous button click
prevBtn.onclick = () => {
  if (appState.current > 0) {
    saveAnswer();
    appState.current--;
    showQuestion();
  }
};

// Persist the current answer into localStorage
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

// Build the sidebar navigation with clickable items and progress indicator
function updateSidebar() {
  renderNav();
  updateProgress();
}

// Render the navigation items in the sidebar
function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = cmmcQuestions.map((q, i) => {
    const done = appState.responses[q.id]?.status ? "✔️" : "";
    const active = i === appState.current ? "active" : "";
    return `<div class="nav-item ${active}" data-index="${i}">${done} ${q.id}</div>`;
  }).join("");

  // Attach click handlers to navigation items
  nav.querySelectorAll(".nav-item").forEach(item => {
    item.onclick = () => {
      const index = parseInt(item.getAttribute("data-index"));
      if (!isNaN(index)) {
        saveAnswer();
        appState.current = index;
        showQuestion();
      }
    };
  });
}

// Update the progress indicator in the sidebar
function updateProgress() {
  const progress = document.getElementById("progress");
  const total = cmmcQuestions.length;
  const complete = Object.keys(appState.responses).length;
  progress.innerText = `Progress: ${complete}/${total}`;
}

// Jump to the summary screen and compile results
function showSummary() {
  questionSection.hidden = true;
  summarySection.hidden = false;

  const summary = calculateSummary();
  renderSummary(summary);

  // Show signature section for user confirmation
  signatureSection.hidden = false;
  signatureName.value = "";
  affirmCheckbox.checked = false;
  updateSidebar();
}

// Calculate summary statistics
function calculateSummary() {
  const summary = {
    met: 0,
    notMet: 0,
    na: 0,
    listItems: [],
  };

  cmmcQuestions.forEach(q => {
    const res = appState.responses[q.id];
    if (!res) return;

    if (res.status === "MET") summary.met++;
    else if (res.status === "NOT MET") summary.notMet++;
    else if (res.status === "N/A") summary.na++;

    summary.listItems.push(`<li><strong>${q.id}</strong>: ${res.status}${res.evidence ? ` – <small>${res.evidence}</small>` : ""}</li>`);
  });

  return summary;
}

// Render the summary statistics on the page
function renderSummary(summary) {
  const result = summary.notMet > 0 ? "❌ Not Compliant" : "✅ Compliant";
  summaryStats.innerHTML = `
    <p><strong>${result}</strong></p>
    <p>MET: ${summary.met}, NOT MET: ${summary.notMet}, N/A: ${summary.na}</p>
    <ul>${summary.listItems.join("")}</ul>`;
}

// Download PDF with signature; validate inputs first
document.getElementById("downloadBtn").onclick = () => {
  // Always save the last answer before exporting
  saveAnswer();
  // Validate signature name
  if (!signatureName.value || signatureName.value.trim() === "") {
    alert("Please enter your name to sign the assessment.");
    return;
  }
  // Validate affirmation checkbox
  if (!affirmCheckbox.checked) {
    alert("Please affirm the accuracy of your responses before downloading the PDF.");
    return;
  }
  // Temporarily append signature information to the summary for inclusion in the PDF
  const sigDiv = document.createElement("div");
  sigDiv.className = "signature-display";
  sigDiv.innerHTML = `<p><strong>Signed by:</strong> ${signatureName.value}</p>` +
    `<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>`;
  summaryStats.appendChild(sigDiv);
  // Generate and save the PDF; remove signature element afterwards
  html2pdf().from(summaryStats).save("CMMC-Level-1-Summary.pdf").then(() => {
    summaryStats.removeChild(sigDiv);
  });
};

// Restart the assessment: clear storage and reload the page
document.getElementById("restartBtn").onclick = () => {
  if (confirm("Are you sure you want to restart? All progress will be lost.")) {
    localStorage.removeItem("cmmcResponses");
    location.reload();
  }
};