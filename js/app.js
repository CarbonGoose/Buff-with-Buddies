/* ================================
   TRANSFORMATION CHALLENGE JS
   Supabase Auth + Database + Dashboard
================================ */

// ---------- SUPABASE CONFIG ----------
// Indsæt dine egne værdier fra Supabase Project Settings > API.
// Brug KUN anon/public key. Aldrig service_role key.

const SUPABASE_URL = "https://iyrtmmpahvtqkzcqoscp.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cnRtbXBhaHZ0cWt6Y3Fvc2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NTU2MDEsImV4cCI6MjA5NzUzMTYwMX0.4u4tcoJJt9pkpsz80pCFBbh7TBqoS-naOVwsJ1wMO-4";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ---------- APP STATE ----------

let appData = {
  currentUser: null,
  profile: null,
  activeChallenge: null,

  participants: [],
  entries: {},
  dailyLogs: [],
  weeklyCheckIns: []
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

// Auth
const authSection = document.querySelector("#authSection");
const appShell = document.querySelector("#appShell");

const authDisplayName = document.querySelector("#authDisplayName");
const authEmail = document.querySelector("#authEmail");
const authPassword = document.querySelector("#authPassword");
const signInBtn = document.querySelector("#signInBtn");
const signUpBtn = document.querySelector("#signUpBtn");
const signOutBtn = document.querySelector("#signOutBtn");
const authMessage = document.querySelector("#authMessage");

const currentUserName = document.querySelector("#currentUserName");
const currentUserEmail = document.querySelector("#currentUserEmail");

// Participants
const participantForm = document.querySelector("#participantForm");
const participantNameInput = document.querySelector("#participantName");
const participantList = document.querySelector("#participantList");

const activeParticipantSelect = document.querySelector("#activeParticipant");
const weeklyParticipantSelect = document.querySelector("#weeklyParticipant");

// Daily log
const entryDateInput = document.querySelector("#entryDate");
const saveEntryBtn = document.querySelector("#saveEntryBtn");

// Weekly check-in
const saveWeeklyBtn = document.querySelector("#saveWeeklyBtn");
const weightInput = document.querySelector("#weightInput");
const waistInput = document.querySelector("#waistInput");
const weightLostInput = document.querySelector("#weightLostInput");
const weeklyNotes = document.querySelector("#weeklyNotes");

// Race / stats
const raceTrack = document.querySelector("#raceTrack");
const participantCount = document.querySelector("#participantCount");
const statsParticipantCount = document.querySelector("#statsParticipantCount");
const leaderName = document.querySelector("#leaderName");
const leaderPoints = document.querySelector("#leaderPoints");

// Old date fields
const startDateInput = document.querySelector("#startDate");
const endDateInput = document.querySelector("#endDate");
const resetAllDataBtn = document.querySelector("#resetAllDataBtn");

// Logbog
const logParticipantFilter = document.querySelector("#logParticipantFilter");
const clearLogFilterBtn = document.querySelector("#clearLogFilterBtn");
const dailyLogList = document.querySelector("#dailyLogList");

// Carousel
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

document.addEventListener("DOMContentLoaded", async () => {
  ensureChallengePanel();
  setTodayAsDefaultDate();

  setupAuth();
  setupParticipantForm();
  setupDailyLog();
  setupWeeklyCheckIn();
  setupChallengeActions();
  setupNavigation();
  setupCarousel();
  setupResetButton();
  setupLogFilters();

  await checkAuth();
});

// ---------- AUTH ----------

function setupAuth() {
  if (signUpBtn) {
    signUpBtn.addEventListener("click", handleSignUp);
  }

  if (signInBtn) {
    signInBtn.addEventListener("click", handleSignIn);
  }

  if (signOutBtn) {
    signOutBtn.addEventListener("click", handleSignOut);
  }

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    appData.currentUser = session?.user || null;

    if (appData.currentUser) {
      await loadAppFromSupabase();
    } else {
      resetAppState();
      setAuthView(false);
      renderAll();
    }
  });
}

async function checkAuth() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    showAuthMessage(error.message, "error");
    setAuthView(false);
    return;
  }

  const session = data.session;
  appData.currentUser = session?.user || null;

  if (appData.currentUser) {
    await loadAppFromSupabase();
  } else {
    setAuthView(false);
  }
}

async function handleSignUp() {
  const email = authEmail?.value.trim();
  const password = authPassword?.value;
  const displayName = authDisplayName?.value.trim() || "Ny deltager";

  if (!email || !password) {
    showAuthMessage("Skriv både email og password 🫶", "error");
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName
      }
    }
  });

  if (error) {
    showAuthMessage(error.message, "error");
    return;
  }

  if (!data.session) {
    showAuthMessage(
      "Bruger oprettet! Tjek din email for bekræftelse ✨",
      "success"
    );
    return;
  }

  showAuthMessage("Bruger oprettet og logget ind ✨", "success");
}

async function handleSignIn() {
  const email = authEmail?.value.trim();
  const password = authPassword?.value;

  if (!email || !password) {
    showAuthMessage("Skriv både email og password 🫶", "error");
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showAuthMessage(error.message, "error");
    return;
  }

  showAuthMessage("Du er logget ind ✨", "success");
}

async function handleSignOut() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert(error.message);
  }
}

function setAuthView(isLoggedIn) {
  if (!authSection || !appShell) return;

  authSection.classList.toggle("d-none", isLoggedIn);
  appShell.classList.toggle("d-none", !isLoggedIn);
}

function showAuthMessage(message, type = "success") {
  if (!authMessage) return;

  authMessage.textContent = message;
  authMessage.classList.remove("success", "error");
  authMessage.classList.add(type);
}

function updateUserDisplay() {
  if (!appData.currentUser) return;

  if (currentUserName) {
    currentUserName.textContent =
      appData.profile?.display_name ||
      appData.currentUser.email?.split("@")[0] ||
      "Bruger";
  }

  if (currentUserEmail) {
    currentUserEmail.textContent = appData.currentUser.email || "—";
  }
}

// ---------- LOAD DATA FROM SUPABASE ----------

async function loadAppFromSupabase() {
  setAuthView(true);

  await loadProfile();
  await loadUserChallenge();
  await loadChallengeData();

  updateUserDisplay();
  renderAll();
  updateChallengePanel();
}

async function loadProfile() {
  const user = appData.currentUser;

  if (!user) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, display_name")
    .eq("id", user.id)
    .single();

  if (error) {
    console.warn("Kunne ikke hente profil:", error.message);

    appData.profile = {
      id: user.id,
      display_name: user.email?.split("@")[0] || "Bruger"
    };

    return;
  }

  appData.profile = data;
}

async function loadUserChallenge() {
  const user = appData.currentUser;

  if (!user) return;

  const { data, error } = await supabaseClient
    .from("challenge_members")
    .select("challenge_id, role, challenges(id, title, invite_code)")
    .eq("user_id", user.id)
    .limit(1);

  if (error) {
    console.warn("Kunne ikke hente challenge:", error.message);
    appData.activeChallenge = null;
    return;
  }

  if (!data || data.length === 0) {
    appData.activeChallenge = null;
    return;
  }

  const membership = data[0];

  appData.activeChallenge = {
    id: membership.challenges.id,
    title: membership.challenges.title,
    invite_code: membership.challenges.invite_code,
    role: membership.role
  };
}

async function loadChallengeData() {
  if (!appData.activeChallenge) {
    appData.participants = [];
    appData.entries = {};
    appData.dailyLogs = [];
    appData.weeklyCheckIns = [];
    return;
  }

  await loadParticipants();
  await loadDailyLogs();
  await loadWeeklyCheckIns();
}

async function loadParticipants() {
  const challengeId = appData.activeChallenge.id;

  const { data: members, error: membersError } = await supabaseClient
    .from("challenge_members")
    .select("user_id, role, joined_at")
    .eq("challenge_id", challengeId);

  if (membersError) {
    console.error(membersError.message);
    appData.participants = [];
    return;
  }

  const userIds = members.map((member) => member.user_id);

  if (userIds.length === 0) {
    appData.participants = [];
    return;
  }

  const { data: profiles, error: profilesError } = await supabaseClient
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  if (profilesError) {
    console.error(profilesError.message);
    appData.participants = [];
    return;
  }

  appData.participants = members
    .map((member) => {
      const profile = profiles.find((profileItem) => {
        return profileItem.id === member.user_id;
      });

      return {
        id: member.user_id,
        name: profile?.display_name || "Ukendt deltager",
        role: member.role,
        joinedAt: member.joined_at
      };
    })
    .sort((a, b) => {
      if (a.role === "owner" && b.role !== "owner") return -1;
      if (b.role === "owner" && a.role !== "owner") return 1;
      return a.name.localeCompare(b.name);
    });
}

async function loadDailyLogs() {
  const challengeId = appData.activeChallenge.id;

  const { data, error } = await supabaseClient
    .from("daily_logs")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("log_date", { ascending: true });

  if (error) {
    console.error(error.message);
    appData.dailyLogs = [];
    appData.entries = {};
    return;
  }

  appData.dailyLogs = data || [];
  appData.entries = {};

  appData.dailyLogs.forEach((log) => {
    if (!appData.entries[log.user_id]) {
      appData.entries[log.user_id] = {};
    }

    appData.entries[log.user_id][log.id] = {
      id: log.id,
      userId: log.user_id,
      date: log.log_date,
      checkedValues: log.checked_values || [],
      baseComplete: log.base_complete,
      basePoints: log.base_points,
      bonusPoints: log.bonus_points,
      totalPoints: log.total_points,
      kind: "daily"
    };
  });
}

async function loadWeeklyCheckIns() {
  const challengeId = appData.activeChallenge.id;

  const { data, error } = await supabaseClient
    .from("weekly_checkins")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("checkin_date", { ascending: true });

  if (error) {
    console.error(error.message);
    appData.weeklyCheckIns = [];
    return;
  }

  appData.weeklyCheckIns = data || [];
}

function resetAppState() {
  appData = {
    currentUser: null,
    profile: null,
    activeChallenge: null,
    participants: [],
    entries: {},
    dailyLogs: [],
    weeklyCheckIns: []
  };
}

// ---------- CHALLENGE PANEL ----------

function ensureChallengePanel() {
  const mainContent = document.querySelector(".main-content");

  if (!mainContent || document.querySelector("#challengeSetupSection")) {
    return;
  }

  const topbar = document.querySelector(".topbar");

  const section = document.createElement("section");
  section.className = "content-section";
  section.id = "challengeSetupSection";

  section.innerHTML = `
    <div class="section-header simple-header">
      <div class="section-number">00</div>
      <div>
        <h2>Challenge Setup</h2>
        <p>Opret en challenge eller join med invite code</p>
      </div>
    </div>

    <div class="dashboard-card">
      <div id="currentChallengeBox" class="mb-4">
        <h3>Nuværende challenge</h3>
        <p id="currentChallengeTitle">Ingen challenge valgt endnu</p>
        <p>
          Invite code:
          <strong id="currentInviteCode">—</strong>
        </p>
      </div>

      <div class="row g-3">
        <div class="col-md-6">
          <h3>Opret challenge</h3>
          <label class="form-label" for="challengeTitleInput">Challenge navn</label>
          <input
            type="text"
            id="challengeTitleInput"
            class="form-control"
            placeholder="Fx 1-Måneds Transformation Challenge"
          />
          <button id="createChallengeBtn" class="primary-button mt-3" type="button">
            Opret challenge
          </button>
        </div>

        <div class="col-md-6">
          <h3>Join challenge</h3>
          <label class="form-label" for="inviteCodeInput">Invite code</label>
          <input
            type="text"
            id="inviteCodeInput"
            class="form-control"
            placeholder="Fx A1B2C3D4"
          />
          <button id="joinChallengeBtn" class="secondary-button mt-3" type="button">
            Join challenge
          </button>
        </div>
      </div>

      <p id="challengeMessage" class="auth-message mt-3"></p>
    </div>
  `;

  if (topbar) {
    topbar.insertAdjacentElement("afterend", section);
  } else {
    mainContent.prepend(section);
  }
}

function setupChallengeActions() {
  const createChallengeBtn = document.querySelector("#createChallengeBtn");
  const joinChallengeBtn = document.querySelector("#joinChallengeBtn");

  if (createChallengeBtn) {
    createChallengeBtn.addEventListener("click", handleCreateChallenge);
  }

  if (joinChallengeBtn) {
    joinChallengeBtn.addEventListener("click", handleJoinChallenge);
  }
}

async function handleCreateChallenge() {
  const input = document.querySelector("#challengeTitleInput");
  const title =
    input?.value.trim() ||
    "1-Måneds Transformation Challenge";

  const { data, error } = await supabaseClient.rpc("create_challenge", {
    challenge_title: title
  });

  if (error) {
    showChallengeMessage(error.message, "error");
    return;
  }

  showChallengeMessage("Challenge oprettet ✨", "success");

  await loadAppFromSupabase();
}

async function handleJoinChallenge() {
  const input = document.querySelector("#inviteCodeInput");
  const code = input?.value.trim();

  if (!code) {
    showChallengeMessage("Skriv en invite code først 🫶", "error");
    return;
  }

  const { data, error } = await supabaseClient.rpc("join_challenge_by_code", {
    code_to_join: code
  });

  if (error) {
    showChallengeMessage(error.message, "error");
    return;
  }

  showChallengeMessage("Du er nu med i challenge ✨", "success");

  await loadAppFromSupabase();
}

function updateChallengePanel() {
  const titleEl = document.querySelector("#currentChallengeTitle");
  const inviteEl = document.querySelector("#currentInviteCode");

  if (!titleEl || !inviteEl) return;

  if (!appData.activeChallenge) {
    titleEl.textContent = "Ingen challenge valgt endnu";
    inviteEl.textContent = "—";
    return;
  }

  titleEl.textContent = appData.activeChallenge.title;
  inviteEl.textContent = appData.activeChallenge.invite_code;
}

function showChallengeMessage(message, type = "success") {
  const messageEl = document.querySelector("#challengeMessage");

  if (!messageEl) return;

  messageEl.textContent = message;
  messageEl.classList.remove("success", "error");
  messageEl.classList.add(type);
}

// ---------- DEFAULT DATES ----------

function setTodayAsDefaultDate() {
  const today = new Date().toISOString().split("T")[0];

  if (entryDateInput) {
    entryDateInput.value = today;
  }

  if (startDateInput) {
    startDateInput.value = "";
  }

  if (endDateInput) {
    endDateInput.value = "";
  }
}

// ---------- SETUP ----------

function setupParticipantForm() {
  if (!participantForm || !participantNameInput) return;

  participantForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = participantNameInput.value.trim();

    if (!name) return;

    await updateOwnDisplayName(name);

    participantNameInput.value = "";
  });
}

async function updateOwnDisplayName(name) {
  if (!appData.currentUser) return;

  const { error } = await supabaseClient
    .from("profiles")
    .upsert(
      {
        id: appData.currentUser.id,
        display_name: name
      },
      {
        onConflict: "id"
      }
    );

  if (error) {
    alert(error.message);
    return;
  }

  await loadAppFromSupabase();

  alert("Dit navn er opdateret ✨");
}

function setupDailyLog() {
  if (!saveEntryBtn) return;

  saveEntryBtn.addEventListener("click", handleSaveEntry);
}

function setupWeeklyCheckIn() {
  if (!saveWeeklyBtn) return;

  saveWeeklyBtn.addEventListener("click", handleSaveWeeklyCheckIn);
}

function setupResetButton() {
  if (!resetAllDataBtn) return;

  resetAllDataBtn.addEventListener("click", () => {
    alert(
      "Online-versionen nulstiller ikke databasen herfra endnu. Slet logs enkeltvis i logbogen."
    );
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
  updateUserDisplay();
  updateChallengePanel();
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

  if (!appData.activeChallenge) {
    participantList.innerHTML = `
      <li>Opret eller join en challenge for at se deltagere 🏁</li>
    `;
    return;
  }

  appData.participants.forEach((participant, index) => {
    const li = document.createElement("li");

    const isCurrentUser = participant.id === appData.currentUser?.id;
    const isOwner = appData.activeChallenge?.role === "owner";
    const canRemove = isOwner && !isCurrentUser;

    li.innerHTML = `
      <span>
        ${index + 1}. ${escapeHTML(participant.name)}
        ${participant.role === "owner" ? "👑" : ""}
        ${isCurrentUser ? "(dig)" : ""}
      </span>
    `;

    if (canRemove) {
      const button = document.createElement("button");
      button.className = "remove-btn";
      button.type = "button";
      button.title = "Fjern deltager";
      button.textContent = "✕";

      button.addEventListener("click", () => {
        removeChallengeMember(participant.id, participant.name);
      });

      li.appendChild(button);
    }

    participantList.appendChild(li);
  });
}

async function removeChallengeMember(userId, name) {
  const confirmed = confirm(`Vil du fjerne ${name} fra challenge?`);

  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("challenge_members")
    .delete()
    .eq("challenge_id", appData.activeChallenge.id)
    .eq("user_id", userId);

  if (error) {
    alert(error.message);
    return;
  }

  await loadAppFromSupabase();
}

function renderParticipantSelects() {
  if (!activeParticipantSelect || !weeklyParticipantSelect) return;

  activeParticipantSelect.innerHTML = "";
  weeklyParticipantSelect.innerHTML = "";

  if (!appData.currentUser) return;

  const currentParticipant = getParticipantById(appData.currentUser.id);

  const name =
    currentParticipant?.name ||
    appData.profile?.display_name ||
    "Dig";

  const dailyOption = document.createElement("option");
  dailyOption.value = appData.currentUser.id;
  dailyOption.textContent = name;

  const weeklyOption = document.createElement("option");
  weeklyOption.value = appData.currentUser.id;
  weeklyOption.textContent = name;

  activeParticipantSelect.appendChild(dailyOption);
  weeklyParticipantSelect.appendChild(weeklyOption);
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

  if (!appData.activeChallenge || appData.participants.length === 0) {
    leaderName.textContent = "—";
    leaderPoints.textContent = "0 felter";
    return;
  }

  const sortedParticipants = [...appData.participants].sort((a, b) => {
    return getParticipantTotalPoints(b.id) - getParticipantTotalPoints(a.id);
  });

  const leader = sortedParticipants[0];
  const points = getParticipantTotalPoints(leader.id);

  leaderName.textContent = leader.name;
  leaderPoints.textContent = `${points} felter`;
}

// ---------- DAILY ENTRY ----------

async function handleSaveEntry() {
  if (!appData.currentUser) {
    alert("Du skal være logget ind først 🫶");
    return;
  }

  if (!appData.activeChallenge) {
    alert("Opret eller join en challenge først 🏁");
    return;
  }

  const participant = appData.currentUser.id;
  const date = entryDateInput.value;

  if (!participant || !date) {
    alert("Vælg dato først 🫶");
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

  const alreadyLogged = Object.values(appData.entries[participant] || {}).some(
    (entry) => entry.date === date
  );

  if (alreadyLogged) {
    const overwrite = confirm(
      "Du har allerede logget denne dato. Vil du overskrive dagen?"
    );

    if (!overwrite) return;
  }

  const { error } = await supabaseClient
    .from("daily_logs")
    .upsert(
      {
        challenge_id: appData.activeChallenge.id,
        user_id: participant,
        log_date: date,
        checked_values: checkedValues,
        base_complete: baseComplete,
        base_points: basePoints,
        bonus_points: bonusTotal,
        total_points: totalPoints
      },
      {
        onConflict: "challenge_id,user_id,log_date"
      }
    );

  if (error) {
    alert(error.message);
    return;
  }

  await loadChallengeData();
  renderAll();
  clearDailyCheckboxes();

  alert(`Du fik ${totalPoints} felt(er) i dag 🏁`);
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

async function handleSaveWeeklyCheckIn() {
  if (!appData.currentUser) {
    alert("Du skal være logget ind først 🫶");
    return;
  }

  if (!appData.activeChallenge) {
    alert("Opret eller join en challenge først 🏁");
    return;
  }

  const participant = appData.currentUser.id;

  const weight = Number(weightInput.value) || null;
  const waist = Number(waistInput.value) || null;
  const weightLost = Number(weightLostInput.value) || 0;
  const notes = weeklyNotes.value.trim();

  const today = new Date().toISOString().split("T")[0];
  const weightLossBonus = Math.floor(weightLost);

  const { error } = await supabaseClient
    .from("weekly_checkins")
    .insert({
      challenge_id: appData.activeChallenge.id,
      user_id: participant,
      checkin_date: today,
      weight,
      waist,
      weight_lost: weightLost,
      notes,
      bonus_points: weightLossBonus
    });

  if (error) {
    alert(error.message);
    return;
  }

  await loadChallengeData();
  renderAll();
  clearWeeklyInputs();

  alert("Check-in gemt ✨");
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
    option.value = participant.id;
    option.textContent = participant.name;

    logParticipantFilter.appendChild(option);
  });

  const participantExists = appData.participants.some((participant) => {
    return participant.id === selectedValue;
  });

  logParticipantFilter.value = participantExists ? selectedValue : "all";
}

function renderDailyLog() {
  if (!dailyLogList) return;

  const selectedParticipant = logParticipantFilter
    ? logParticipantFilter.value
    : "all";

  const entries = getAllLogEntries(selectedParticipant);

  dailyLogList.innerHTML = "";

  if (!appData.activeChallenge) {
    dailyLogList.innerHTML = `
      <p class="empty-log-message">
        Opret eller join en challenge for at se logbogen 🏁
      </p>
    `;
    return;
  }

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

    const participant = getParticipantById(entry.userId);
    const participantName = participant?.name || "Ukendt deltager";

    const badges = buildLogBadges(entry);
    const canDelete = entry.userId === appData.currentUser?.id;

    card.innerHTML = `
      <div class="log-entry-header">
        <div>
          <h3 class="log-entry-title">
            ${escapeHTML(participantName)}
          </h3>
          <p class="log-entry-meta">
            ${formatDate(entry.date)} · ${entry.kind === "weekly" ? "Ugentlig check-in" : "Daglig log"}
          </p>
        </div>

        <div class="log-entry-points">
          ${entry.totalPoints} felt(er)
        </div>
      </div>

      <div class="entry-badges">
        ${badges || `<span class="entry-badge bonus">Ingen detaljer</span>`}
      </div>

      <div class="log-entry-actions">
        ${
          canDelete
            ? `<button class="delete-log-btn" type="button">Slet</button>`
            : `<small>Kun deltageren selv kan slette denne log</small>`
        }
      </div>
    `;

    const deleteButton = card.querySelector(".delete-log-btn");

    if (deleteButton) {
      deleteButton.addEventListener("click", () => {
        deleteLogEntry(entry);
      });
    }

    dailyLogList.appendChild(card);
  });
}

function buildLogBadges(entry) {
  if (entry.kind === "weekly") {
    const badges = [];

    if (entry.weight !== null && entry.weight !== undefined) {
      badges.push(`<span class="entry-badge weight">Vægt: ${entry.weight} kg</span>`);
    }

    if (entry.waist !== null && entry.waist !== undefined) {
      badges.push(`<span class="entry-badge weight">Talje: ${entry.waist} cm</span>`);
    }

    if (entry.weightLost > 0) {
      badges.push(
        `<span class="entry-badge weight">Vægttab: ${entry.weightLost} kg</span>`
      );
    }

    if (entry.notes) {
      badges.push(
        `<span class="entry-badge bonus">${escapeHTML(entry.notes)}</span>`
      );
    }

    return badges.join("");
  }

  return entry.checkedValues
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
}

function getAllLogEntries(selectedParticipant = "all") {
  const allEntries = [];

  Object.entries(appData.entries || {}).forEach(([userId, participantEntries]) => {
    if (selectedParticipant !== "all" && userId !== selectedParticipant) {
      return;
    }

    Object.values(participantEntries).forEach((entry) => {
      allEntries.push({
        ...entry,
        userId,
        kind: "daily"
      });
    });
  });

  appData.weeklyCheckIns.forEach((checkIn) => {
    if (
      selectedParticipant !== "all" &&
      checkIn.user_id !== selectedParticipant
    ) {
      return;
    }

    allEntries.push({
      id: checkIn.id,
      userId: checkIn.user_id,
      date: checkIn.checkin_date,
      kind: "weekly",
      weight: checkIn.weight,
      waist: checkIn.waist,
      weightLost: Number(checkIn.weight_lost) || 0,
      notes: checkIn.notes,
      totalPoints: checkIn.bonus_points || 0
    });
  });

  return allEntries.sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
}

async function deleteLogEntry(entry) {
  const confirmed = confirm("Vil du slette denne log?");

  if (!confirmed) return;

  let query;

  if (entry.kind === "weekly") {
    query = supabaseClient
      .from("weekly_checkins")
      .delete()
      .eq("id", entry.id)
      .eq("user_id", appData.currentUser.id);
  } else {
    query = supabaseClient
      .from("daily_logs")
      .delete()
      .eq("id", entry.id)
      .eq("user_id", appData.currentUser.id);
  }

  const { error } = await query;

  if (error) {
    alert(error.message);
    return;
  }

  await loadChallengeData();
  renderAll();
}

// ---------- RACE TRACK ----------

function renderRaceTrack() {
  if (!raceTrack) return;

  raceTrack.innerHTML = "";

  if (!appData.activeChallenge) {
    raceTrack.innerHTML = `
      <p>Opret eller join en challenge for at starte racet 🏁</p>
    `;
    return;
  }

  if (appData.participants.length === 0) {
    raceTrack.innerHTML = `<p>Ingen deltagere endnu 🏁</p>`;
    return;
  }

  const sortedParticipants = [...appData.participants].sort((a, b) => {
    return getParticipantTotalPoints(b.id) - getParticipantTotalPoints(a.id);
  });

  const highestScore = Math.max(
    30,
    ...sortedParticipants.map((participant) =>
      getParticipantTotalPoints(participant.id)
    )
  );

  sortedParticipants.forEach((participant) => {
    const fieldTypes = getParticipantFieldTypes(participant.id);
    const totalPoints = fieldTypes.length;

    const row = document.createElement("div");
    row.classList.add("race-row");
    row.style.gridTemplateColumns = `130px repeat(${highestScore}, 28px)`;

    const name = document.createElement("div");
    name.classList.add("race-name");
    name.textContent = `${participant.name} (${totalPoints})`;

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

function getParticipantFieldTypes(userId) {
  const combinedEntries = [];

  const participantEntries = appData.entries[userId];

  if (participantEntries) {
    Object.values(participantEntries).forEach((entry) => {
      combinedEntries.push({
        date: entry.date,
        basePoints: entry.basePoints,
        bonusPoints: entry.bonusPoints
      });
    });
  }

  appData.weeklyCheckIns
    .filter((checkIn) => checkIn.user_id === userId)
    .forEach((checkIn) => {
      combinedEntries.push({
        date: checkIn.checkin_date,
        basePoints: 0,
        bonusPoints: checkIn.bonus_points || 0
      });
    });

  combinedEntries.sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  const fieldTypes = [];

  combinedEntries.forEach((entry) => {
    for (let i = 0; i < entry.basePoints; i++) {
      fieldTypes.push("base");
    }

    for (let i = 0; i < entry.bonusPoints; i++) {
      fieldTypes.push("bonus");
    }
  });

  return fieldTypes;
}

function getParticipantTotalPoints(userId) {
  return getParticipantFieldTypes(userId).length;
}

// ---------- HELPERS ----------

function getParticipantById(userId) {
  return appData.participants.find((participant) => {
    return participant.id === userId;
  });
}

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