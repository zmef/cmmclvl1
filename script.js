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
  const nav = document.getElementById("nav");
  const progress = document.getElementById("progress");
  // Build each nav item with completion indicator and active state
  nav.innerHTML = cmmcQuestions.map((q, i) => {
    const done = appState.responses[q.id]?.status ? "✔️" : "";
    const active = i === appState.current ? "active" : "";
    return `<div class="nav-item ${active}" data-index="${i}">${done} ${q.id}</div>`;
  }).join("");
  // Attach click handlers after updating HTML
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
  // Update progress text
  const complete = Object.keys(appState.responses).length;
  progress.innerText = `Progress: ${complete}/${cmmcQuestions.length}`;
}

// Jump to the summary screen and compile results
function showSummary() {
  questionSection.hidden = true;
  summarySection.hidden = false;
  // Reset and build a list of results
  let met = 0, notMet = 0, na = 0;
  const listItems = [];
  cmmcQuestions.forEach(q => {
    const res = appState.responses[q.id];
    if (!res) return;
    if (res.status === "MET") met++;
    else if (res.status === "NOT MET") notMet++;
    else if (res.status === "N/A") na++;
    listItems.push(`<li><strong>${q.id}</strong>: ${res.status}${res.evidence ? " – " + res.evidence : ""}</li>`);
  });
  const result = notMet > 0 ? "❌ Not Compliant" : "✅ Compliant";
  summaryStats.innerHTML = `<p><strong>${result}</strong></p>` +
    `<p>MET: ${met}, NOT MET: ${notMet}, N/A: ${na}</p>` +
    `<ul>${listItems.join("")}</ul>`;
  // Show signature section for user confirmation
  signatureSection.hidden = false;
  // Ensure previous signature inputs are cleared
  signatureName.value = "";
  affirmCheckbox.checked = false;
  updateSidebar();
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
  localStorage.removeItem("cmmcResponses");
  location.reload();
};

// --- PWA Install Prompt Logic ---

let deferredPrompt;
const installBtn = document.getElementById('installBtn');

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Update the UI to show the install button
  if (installBtn) {
    installBtn.hidden = false;
  }
});

// Handle the install button click
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      // We've used the prompt, and can't use it again.
      deferredPrompt = null;
      // Hide the install button
      installBtn.hidden = true;
    }
  });
}

// Listen for the appinstalled event
window.addEventListener('appinstalled', () => {
  // Clear the deferredPrompt so it can be garbage collected
  deferredPrompt = null;
  // Log the installation to analytics or console
  console.log('PWA was installed');
  // Hide the install button
  if (installBtn) {
      installBtn.hidden = true;
  }
});