/* ================================
   TRANSFORMATION CHALLENGE JS
   LocalStorage + Carousel + Dashboard + Logbog
================================ */

// ---------- LOCAL STORAGE ----------

const STORAGE_KEY = "transformationChallengeData";

let appData = {
  participants: ["Lily", "Bror", "Fætter"],
  entries: {},
  weeklyCheckIns: [],
  startDate: "",
  endDate: ""
};

// ---------- POINT SYSTEM ----------

const dailyRequirements = ["training", "steps", "healthyFood"];

const bonusPoints = {
  vegetables: 1,
  earlySleepWake: 1,
  eightHoursSleep: 1,
  stretching: 1,
  classTraining: 1,
  selfCare: 1,
  water: 1,
  newActivity: 2,
  personalRecord: 1,
  healthyMeal: 1,
  outside: 1
};

// Labels til logbogen
const entryLabels = {
  training: { label: "Trænet", type: "base" },
  steps: { label: "Dagens skridtmål", type: "base" },
  healthyFood: { label: "Spist overordnet sundt", type: "base" },

  vegetables: { label: "Grøntsager", type: "bonus" },
  earlySleepWake: { label: "Tidligt i seng / tidligt op", type: "bonus" },
  eightHoursSleep: { label: "8 timers søvn", type: "bonus" },
  stretching: { label: "Udstrækning / smidighed", type: "bonus" },
  classTraining: { label: "Holdtræning", type: "bonus" },
  selfCare: { label: "Selvpleje", type: "bonus" },
  water: { label: "2+ liter vand", type: "bonus" },
  newActivity: { label: "Ny sport / aktivitet", type: "bonus" },
  personalRecord: { label: "Personlig rekord", type: "bonus" },
  healthyMeal: { label: "Lavet sundt måltid", type: "bonus" },
  outside: { label: "30 min udendørs", type: "bonus" },

  weightLoss: { label: "Vægttab bonus", type: "weight" }
};

// ---------- DOM ELEMENTS ----------

const participantForm = document.querySelector("#participantForm");
const participantNameInput = document.querySelector("#participantName");
const participantList = document.querySelector("#participantList");

const activeParticipantSelect = document.querySelector("#activeParticipant");
const weeklyParticipantSelect = document.querySelector("#weeklyParticipant");

const entryDateInput = document.querySelector("#entryDate");
const saveEntryBtn = document.querySelector("#saveEntryBtn");

const saveWeeklyBtn = document.querySelector("#saveWeeklyBtn");
const weightInput = document.querySelector("#weightInput");
const waistInput = document.querySelector("#waistInput");
const weightLostInput = document.querySelector("#weightLostInput");
const weeklyNotes = document.querySelector("#weeklyNotes");

const raceTrack = document.querySelector("#raceTrack");

const participantCount = document.querySelector("#participantCount");
const statsParticipantCount = document.querySelector("#statsParticipantCount");
const leaderName = document.querySelector("#leaderName");
const leaderPoints = document.querySelector("#leaderPoints");

const startDateInput = document.querySelector("#startDate");
const endDateInput = document.querySelector("#endDate");
const resetAllDataBtn = document.querySelector("#resetAllDataBtn");

// Logbog elements
const logParticipantFilter = document.querySelector("#logParticipantFilter");
const clearLogFilterBtn = document.querySelector("#clearLogFilterBtn");
const dailyLogList = document.querySelector("#dailyLogList");

// Carousel elements
const slides = document.querySelectorAll(".rule-slide");
const dots = document.querySelectorAll(".dot");
const prevSlideBtn = document.querySelector("#prevSlideBtn");
const nextSlideBtn = document.querySelector("#nextSlideBtn");
const resetTourBtn = document.querySelector("#resetTourBtn");
const startChallengeBtn = document.querySelector("#startChallengeBtn");
const currentSlideNumber = document.querySelector("#currentSlideNumber");
const totalSlideNumber = document.querySelector("#totalSlideNumber");

let currentSlide = 0;

// ---------- INIT ----------

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setTodayAsDefaultDate();
  renderAll();

  setupParticipantForm();
  setupDailyLog();
  setupWeeklyCheckIn();
  setupChallengeDates();
  setupNavigation();
  setupCarousel();
  setupResetButton();
  setupLogFilters();
});

// ---------- DATA ----------

function loadData() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (savedData) {
    appData = JSON.parse(savedData);
  }

  // Safety fallback, hvis localStorage mangler noget
  if (!appData.participants) appData.participants = [];
  if (!appData.entries) appData.entries = {};
  if (!appData.weeklyCheckIns) appData.weeklyCheckIns = [];
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function setTodayAsDefaultDate() {
  const today = new Date().toISOString().split("T")[0];

  if (entryDateInput) {
    entryDateInput.value = today;
  }

  if (startDateInput) {
    startDateInput.value = appData.startDate || "";
  }

  if (endDateInput) {
    endDateInput.value = appData.endDate || "";
  }
}

// ---------- SETUP ----------

function setupParticipantForm() {
  if (!participantForm || !participantNameInput) return;

  participantForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = participantNameInput.value.trim();

    if (!name) return;

    const alreadyExists = appData.participants.some(
      (participant) => participant.toLowerCase() === name.toLowerCase()
    );

    if (alreadyExists) {
      alert("Den deltager findes allerede 👀");
      return;
    }

    appData.participants.push(name);
    participantNameInput.value = "";

    saveData();
    renderAll();
  });
}

function setupDailyLog() {
  if (!saveEntryBtn) return;

  saveEntryBtn.addEventListener("click", handleSaveEntry);
}

function setupWeeklyCheckIn() {
  if (!saveWeeklyBtn) return;

  saveWeeklyBtn.addEventListener("click", handleSaveWeeklyCheckIn);
}

function setupChallengeDates() {
  if (!startDateInput || !endDateInput) return;

  startDateInput.addEventListener("change", () => {
    appData.startDate = startDateInput.value;
    saveData();
  });

  endDateInput.addEventListener("change", () => {
    appData.endDate = endDateInput.value;
    saveData();
  });
}

function setupResetButton() {
  if (!resetAllDataBtn) return;

  resetAllDataBtn.addEventListener("click", () => {
    const confirmed = confirm(
      "Er du sikker på, at du vil nulstille al data? Det kan ikke fortrydes 😭"
    );

    if (!confirmed) return;

    localStorage.removeItem(STORAGE_KEY);

    appData = {
      participants: ["Lily", "Bror", "Fætter"],
      entries: {},
      weeklyCheckIns: [],
      startDate: "",
      endDate: ""
    };

    setTodayAsDefaultDate();
    renderAll();

    alert("Alt er nulstillet ✨");
  });
}

// ---------- NAVIGATION ----------

function setupNavigation() {
  const navigationButtons = document.querySelectorAll("[data-section-target]");

  navigationButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.sectionTarget;
      const targetSection = document.querySelector(`#${targetId}`);

      if (!targetSection) return;

      targetSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      updateActiveNavButton(targetId);
    });
  });

  window.addEventListener("scroll", updateNavOnScroll);
}

function updateActiveNavButton(targetId) {
  const navButtons = document.querySelectorAll(".nav-item");

  navButtons.forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.sectionTarget === targetId
    );
  });
}

function updateNavOnScroll() {
  const sections = document.querySelectorAll(".content-section");
  let currentSectionId = "";

  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();

    if (rect.top <= 160 && rect.bottom >= 160) {
      currentSectionId = section.id;
    }
  });

  if (currentSectionId) {
    updateActiveNavButton(currentSectionId);
  }
}

// ---------- CAROUSEL ----------

function setupCarousel() {
  if (!slides.length) return;

  if (totalSlideNumber) {
    totalSlideNumber.textContent = slides.length;
  }

  if (prevSlideBtn) {
    prevSlideBtn.addEventListener("click", showPreviousSlide);
  }

  if (nextSlideBtn) {
    nextSlideBtn.addEventListener("click", showNextSlide);
  }

  if (resetTourBtn) {
    resetTourBtn.addEventListener("click", () => {
      showSlide(0);
    });
  }

  if (startChallengeBtn) {
    startChallengeBtn.addEventListener("click", () => {
      const dailyLogSection = document.querySelector("#dailyLogSection");

      if (dailyLogSection) {
        dailyLogSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

        updateActiveNavButton("dailyLogSection");
      }
    });
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const slideIndex = Number(dot.dataset.slide);
      showSlide(slideIndex);
    });
  });

  showSlide(currentSlide);
}

function showSlide(index) {
  if (!slides.length) return;

  if (index < 0) {
    currentSlide = slides.length - 1;
  } else if (index >= slides.length) {
    currentSlide = 0;
  } else {
    currentSlide = index;
  }

  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === currentSlide);
  });

  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle("is-active", dotIndex === currentSlide);
  });

  if (currentSlideNumber) {
    currentSlideNumber.textContent = currentSlide + 1;
  }
}

function showPreviousSlide() {
  showSlide(currentSlide - 1);
}

function showNextSlide() {
  showSlide(currentSlide + 1);
}

// ---------- RENDER ----------

function renderAll() {
  renderParticipants();
  renderParticipantSelects();
  renderLogFilterOptions();
  renderParticipantCounts();
  renderRaceTrack();
  renderStats();
  renderDailyLog();
}

function renderParticipants() {
  if (!participantList) return;

  participantList.innerHTML = "";

  appData.participants.forEach((participant, index) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <span>${index + 1}. ${escapeHTML(participant)}</span>
      <button class="remove-btn" data-name="${escapeHTML(participant)}" type="button" title="Fjern deltager">
        ✕
      </button>
    `;

    participantList.appendChild(li);
  });

  const removeButtons = document.querySelectorAll(".remove-btn");

  removeButtons.forEach((button) => {
    button.addEventListener("click", handleRemoveParticipant);
  });
}

function renderParticipantSelects() {
  if (!activeParticipantSelect || !weeklyParticipantSelect) return;

  activeParticipantSelect.innerHTML = "";
  weeklyParticipantSelect.innerHTML = "";

  appData.participants.forEach((participant) => {
    const dailyOption = document.createElement("option");
    dailyOption.value = participant;
    dailyOption.textContent = participant;

    const weeklyOption = document.createElement("option");
    weeklyOption.value = participant;
    weeklyOption.textContent = participant;

    activeParticipantSelect.appendChild(dailyOption);
    weeklyParticipantSelect.appendChild(weeklyOption);
  });
}

function renderParticipantCounts() {
  const count = appData.participants.length;

  if (participantCount) {
    participantCount.textContent = `${count} deltagere`;
  }

  if (statsParticipantCount) {
    statsParticipantCount.textContent = count;
  }
}

function renderStats() {
  if (!leaderName || !leaderPoints) return;

  if (appData.participants.length === 0) {
    leaderName.textContent = "—";
    leaderPoints.textContent = "0 felter";
    return;
  }

  const sortedParticipants = [...appData.participants].sort((a, b) => {
    return getParticipantTotalPoints(b) - getParticipantTotalPoints(a);
  });

  const leader = sortedParticipants[0];
  const points = getParticipantTotalPoints(leader);

  leaderName.textContent = leader;
  leaderPoints.textContent = `${points} felter`;
}

// ---------- PARTICIPANTS ----------

function handleRemoveParticipant(event) {
  const name = event.currentTarget.dataset.name;

  const confirmed = confirm(`Vil du fjerne ${name}?`);

  if (!confirmed) return;

  appData.participants = appData.participants.filter(
    (participant) => participant !== name
  );

  delete appData.entries[name];

  appData.weeklyCheckIns = appData.weeklyCheckIns.filter(
    (checkIn) => checkIn.participant !== name
  );

  saveData();
  renderAll();
}

// ---------- DAILY ENTRY ----------

function handleSaveEntry() {
  if (!activeParticipantSelect || !entryDateInput) return;

  const participant = activeParticipantSelect.value;
  const date = entryDateInput.value;

  if (!participant || !date) {
    alert("Vælg både deltager og dato først 🫶");
    return;
  }

  const checkedValues = getCheckedDailyValues();

  const baseComplete = dailyRequirements.every((requirement) =>
    checkedValues.includes(requirement)
  );

  const basePoints = baseComplete ? 1 : 0;
  const bonusTotal = calculateBonusPoints(checkedValues);
  const totalPoints = basePoints + bonusTotal;

  if (totalPoints === 0) {
    alert("Ingen felter optjent endnu — men hey, no shame. Prøv igen 🫶");
    return;
  }

  if (!appData.entries[participant]) {
    appData.entries[participant] = {};
  }

  const alreadyLogged = appData.entries[participant][date];

  if (alreadyLogged) {
    const overwrite = confirm(
      `${participant} har allerede logget denne dato. Vil du overskrive dagen?`
    );

    if (!overwrite) return;
  }

  appData.entries[participant][date] = {
    date,
    checkedValues,
    baseComplete,
    basePoints,
    bonusPoints: bonusTotal,
    totalPoints
  };

  saveData();
  renderAll();
  clearDailyCheckboxes();

  alert(`${participant} fik ${totalPoints} felt(er) i dag 🏁`);
}

function getCheckedDailyValues() {
  const checkedInputs = document.querySelectorAll(
    "#dailyLogSection input[type='checkbox']:checked"
  );

  return Array.from(checkedInputs).map((input) => input.value);
}

function calculateBonusPoints(checkedValues) {
  return checkedValues.reduce((total, value) => {
    return total + (bonusPoints[value] || 0);
  }, 0);
}

function clearDailyCheckboxes() {
  const checkedInputs = document.querySelectorAll(
    "#dailyLogSection input[type='checkbox']:checked"
  );

  checkedInputs.forEach((input) => {
    input.checked = false;
  });
}

// ---------- WEEKLY CHECK-IN ----------

function handleSaveWeeklyCheckIn() {
  if (!weeklyParticipantSelect) return;

  const participant = weeklyParticipantSelect.value;

  if (!participant) {
    alert("Vælg deltager først 🫶");
    return;
  }

  const weight = Number(weightInput.value) || null;
  const waist = Number(waistInput.value) || null;
  const weightLost = Number(weightLostInput.value) || 0;
  const notes = weeklyNotes.value.trim();

  const today = new Date().toISOString().split("T")[0];
  const weightLossBonus = Math.floor(weightLost);

  appData.weeklyCheckIns.push({
    participant,
    date: today,
    weight,
    waist,
    weightLost,
    notes,
    bonusPoints: weightLossBonus
  });

  if (weightLossBonus > 0) {
    addWeightLossBonus(participant, today, weightLossBonus);
  }

  saveData();
  renderAll();
  clearWeeklyInputs();

  alert(`Check-in gemt for ${participant} ✨`);
}

function addWeightLossBonus(participant, date, points) {
  if (!appData.entries[participant]) {
    appData.entries[participant] = {};
  }

  const bonusKey = `${date}-weight-loss-${Date.now()}`;

  appData.entries[participant][bonusKey] = {
    date,
    checkedValues: ["weightLoss"],
    baseComplete: false,
    basePoints: 0,
    bonusPoints: points,
    totalPoints: points
  };
}

function clearWeeklyInputs() {
  if (weightInput) weightInput.value = "";
  if (waistInput) waistInput.value = "";
  if (weightLostInput) weightLostInput.value = "";
  if (weeklyNotes) weeklyNotes.value = "";
}

// ---------- LOGBOG ----------

function setupLogFilters() {
  if (!logParticipantFilter || !clearLogFilterBtn) return;

  logParticipantFilter.addEventListener("change", renderDailyLog);

  clearLogFilterBtn.addEventListener("click", () => {
    logParticipantFilter.value = "all";
    renderDailyLog();
  });
}

function renderLogFilterOptions() {
  if (!logParticipantFilter) return;

  const selectedValue = logParticipantFilter.value || "all";

  logParticipantFilter.innerHTML = `<option value="all">Alle deltagere</option>`;

  appData.participants.forEach((participant) => {
    const option = document.createElement("option");
    option.value = participant;
    option.textContent = participant;

    logParticipantFilter.appendChild(option);
  });

  logParticipantFilter.value = appData.participants.includes(selectedValue)
    ? selectedValue
    : "all";
}

function renderDailyLog() {
  if (!dailyLogList) return;

  const selectedParticipant = logParticipantFilter
    ? logParticipantFilter.value
    : "all";

  const entries = getAllLogEntries(selectedParticipant);

  dailyLogList.innerHTML = "";

  if (entries.length === 0) {
    dailyLogList.innerHTML = `
      <p class="empty-log-message">
        Ingen logs endnu. Gå til Dagens log og gem den første dag 🏁
      </p>
    `;
    return;
  }

  entries.forEach((entry) => {
    const card = document.createElement("article");
    card.classList.add("log-entry-card");

    const badges = entry.checkedValues
      .map((value) => {
        const item = entryLabels[value] || {
          label: value,
          type: "bonus"
        };

        return `
          <span class="entry-badge ${item.type}">
            ${escapeHTML(item.label)}
          </span>
        `;
      })
      .join("");

    card.innerHTML = `
      <div class="log-entry-header">
        <div>
          <h3 class="log-entry-title">
            ${escapeHTML(entry.participant)}
          </h3>
          <p class="log-entry-meta">
            ${formatDate(entry.date)}
          </p>
        </div>

        <div class="log-entry-points">
          ${entry.totalPoints} felt(er)
        </div>
      </div>

      <div class="entry-badges">
        ${badges || `<span class="entry-badge bonus">Manuel bonus</span>`}
      </div>

      <div class="log-entry-actions">
        <button class="delete-log-btn" type="button">
          Slet
        </button>
      </div>
    `;

    const deleteButton = card.querySelector(".delete-log-btn");

    deleteButton.addEventListener("click", () => {
      deleteLogEntry(entry.participant, entry.entryKey);
    });

    dailyLogList.appendChild(card);
  });
}

function getAllLogEntries(selectedParticipant = "all") {
  const allEntries = [];

  Object.entries(appData.entries || {}).forEach(
    ([participant, participantEntries]) => {
      if (selectedParticipant !== "all" && participant !== selectedParticipant) {
        return;
      }

      Object.entries(participantEntries).forEach(([entryKey, entry]) => {
        allEntries.push({
          participant,
          entryKey,
          ...entry
        });
      });
    }
  );

  return allEntries.sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
}

function deleteLogEntry(participant, entryKey) {
  const confirmed = confirm(
    `Vil du slette denne log for ${participant}?`
  );

  if (!confirmed) return;

  if (!appData.entries[participant]) return;

  delete appData.entries[participant][entryKey];

  saveData();
  renderAll();
}

// ---------- RACE TRACK ----------

function renderRaceTrack() {
  if (!raceTrack) return;

  raceTrack.innerHTML = "";

  if (appData.participants.length === 0) {
    raceTrack.innerHTML = `<p>Tilføj en deltager for at starte racet 🏁</p>`;
    return;
  }

  const sortedParticipants = [...appData.participants].sort((a, b) => {
    return getParticipantTotalPoints(b) - getParticipantTotalPoints(a);
  });

  const highestScore = Math.max(
    30,
    ...sortedParticipants.map((participant) => getParticipantTotalPoints(participant))
  );

  sortedParticipants.forEach((participant) => {
    const fieldTypes = getParticipantFieldTypes(participant);
    const totalPoints = fieldTypes.length;

    const row = document.createElement("div");
    row.classList.add("race-row");
    row.style.gridTemplateColumns = `130px repeat(${highestScore}, 28px)`;

    const name = document.createElement("div");
    name.classList.add("race-name");
    name.textContent = `${participant} (${totalPoints})`;

    row.appendChild(name);

    for (let i = 0; i < highestScore; i++) {
      const cell = document.createElement("div");
      cell.classList.add("race-cell");

      if (fieldTypes[i] === "base") {
        cell.classList.add("base-filled");
      }

      if (fieldTypes[i] === "bonus") {
        cell.classList.add("bonus-filled");
      }

      row.appendChild(cell);
    }

    raceTrack.appendChild(row);
  });
}

function getParticipantFieldTypes(participant) {
  const participantEntries = appData.entries[participant];

  if (!participantEntries) return [];

  const sortedEntries = Object.values(participantEntries).sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  const fieldTypes = [];

  sortedEntries.forEach((entry) => {
    for (let i = 0; i < entry.basePoints; i++) {
      fieldTypes.push("base");
    }

    for (let i = 0; i < entry.bonusPoints; i++) {
      fieldTypes.push("bonus");
    }
  });

  return fieldTypes;
}

function getParticipantTotalPoints(participant) {
  return getParticipantFieldTypes(participant).length;
}

// ---------- HELPERS ----------

function formatDate(dateString) {
  if (!dateString) return "Ukendt dato";

  const date = new Date(dateString);

  return date.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}