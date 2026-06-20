// ---------- LOCAL STORAGE ----------

const STORAGE_KEY = "transformationChallengeData";

let appData = {
  participants: ["Lily", "Bror", "Fætter"],
  entries: {},
  weeklyCheckIns: [],
  startDate: "",
  endDate: ""
};

// ---------- DOM ----------

const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");

const participantCount = document.querySelector("#participantCount");

const ruleSlides = document.querySelectorAll(".rule-slide");
const prevRuleBtn = document.querySelector("#prevRule");
const nextRuleBtn = document.querySelector("#nextRule");
const carouselDots = document.querySelector("#carouselDots");

let currentRuleSlide = 0;

// ---------- INIT ----------

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  updateParticipantCount();

  setupNavigation();
  setupCarousel();
});

// ---------- DATA ----------

function loadData() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (savedData) {
    appData = JSON.parse(savedData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

// ---------- NAVIGATION ----------

function setupNavigation() {
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetView = item.dataset.view;

      navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");

      views.forEach((view) => {
        view.classList.remove("active");
      });

      const activeView = document.querySelector(`#${targetView}`);
      if (activeView) {
        activeView.classList.add("active");
      }
    });
  });
}

// ---------- PARTICIPANT COUNT ----------

function updateParticipantCount() {
  if (!participantCount) return;

  participantCount.textContent = `${appData.participants.length} deltagere`;
}

// ---------- CAROUSEL ----------

function setupCarousel() {
  if (!ruleSlides.length) return;

  createCarouselDots();
  showRuleSlide(currentRuleSlide);

  prevRuleBtn?.addEventListener("click", () => {
    changeRuleSlide(-1);
  });

  nextRuleBtn?.addEventListener("click", () => {
    changeRuleSlide(1);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      changeRuleSlide(-1);
    }

    if (event.key === "ArrowRight") {
      changeRuleSlide(1);
    }
  });
}

function createCarouselDots() {
  carouselDots.innerHTML = "";

  ruleSlides.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.classList.add("carousel-dot");
    dot.setAttribute("aria-label", `Gå til regel ${index + 1}`);

    dot.addEventListener("click", () => {
      currentRuleSlide = index;
      showRuleSlide(currentRuleSlide);
    });

    carouselDots.appendChild(dot);
  });
}

function changeRuleSlide(direction) {
  currentRuleSlide += direction;

  if (currentRuleSlide < 0) {
    currentRuleSlide = ruleSlides.length - 1;
  }

  if (currentRuleSlide >= ruleSlides.length) {
    currentRuleSlide = 0;
  }

  showRuleSlide(currentRuleSlide);
}

function showRuleSlide(index) {
  ruleSlides.forEach((slide, slideIndex) => {
    slide.classList.toggle("active", slideIndex === index);
  });

  const dots = document.querySelectorAll(".carousel-dot");

  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === index);
  });

  updateCarouselCounter();
}

function updateCarouselCounter() {
  const counter = document.querySelector("#carouselCounter");

  if (!counter) return;

  counter.textContent = `${currentRuleSlide + 1} / ${ruleSlides.length}`;
}