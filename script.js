const tabs = [...document.querySelectorAll('.date-tab')];
const panels = [...document.querySelectorAll('.day-panel')];
const selectedDayStorageKey = 'japan-2026-selected-day';

function activateDay(tab) {
  tabs.forEach((item) => {
    const active = item === tab;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
  });
  panels.forEach((panel) => {
    const active = panel.id === tab.dataset.day;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
  try {
    localStorage.setItem(selectedDayStorageKey, tab.dataset.day);
  } catch {
    // Date switching still works when browser storage is unavailable.
  }
  if (window.matchMedia('(max-width: 700px)').matches) {
    tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateDay(tab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(index + offset + tabs.length) % tabs.length];
    activateDay(next);
    next.focus();
  });
});

try {
  const savedDay = localStorage.getItem(selectedDayStorageKey);
  const savedTab = tabs.find((tab) => tab.dataset.day === savedDay);
  if (savedTab) activateDay(savedTab);
} catch {
  // Keep the first day selected when browser storage is unavailable.
}

document.querySelector('#print-button').addEventListener('click', () => window.print());

const prepStorageKey = 'japan-2026-preparation-checklist';
let prepState = {};

try {
  prepState = JSON.parse(localStorage.getItem(prepStorageKey) || '{}');
} catch {
  prepState = {};
}

document.querySelectorAll('[data-prep]').forEach((checkbox) => {
  checkbox.checked = Boolean(prepState[checkbox.dataset.prep]);
  checkbox.closest('.prep-item')?.classList.toggle('checked', checkbox.checked);
  checkbox.addEventListener('change', () => {
    prepState[checkbox.dataset.prep] = checkbox.checked;
    checkbox.closest('.prep-item')?.classList.toggle('checked', checkbox.checked);
    try {
      localStorage.setItem(prepStorageKey, JSON.stringify(prepState));
    } catch {
      // Checklist interaction still works when browser storage is unavailable.
    }
  });
});

const visitedStorageKey = 'japan-2026-visited-stops';
let visitedStops = {};

try {
  visitedStops = JSON.parse(localStorage.getItem(visitedStorageKey) || '{}');
} catch {
  visitedStops = {};
}

document.querySelectorAll('.day-panel').forEach((day) => {
  day.querySelectorAll('.event').forEach((event) => {
    const title = event.querySelector('h4')?.textContent.trim();
    if (!title) return;

    const stopId = `${day.id}:${title}`;
    const content = event.querySelector(':scope > div');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'visit-button';

    const updateVisitedState = (visited) => {
      event.classList.toggle('visited', visited);
      button.classList.toggle('checked', visited);
      button.setAttribute('aria-pressed', String(visited));
      button.setAttribute('aria-label', visited ? `取消${title}的已去过状态` : `标记${title}为已去过`);
      button.title = visited ? '取消已去过' : '标记已去过';
      button.innerHTML = `<span aria-hidden="true">${visited ? '✓' : ''}</span>`;
    };

    updateVisitedState(Boolean(visitedStops[stopId]));
    button.addEventListener('click', () => {
      const visited = !event.classList.contains('visited');
      visitedStops[stopId] = visited;
      updateVisitedState(visited);
      try {
        localStorage.setItem(visitedStorageKey, JSON.stringify(visitedStops));
      } catch {
        // The visual state still works when browser storage is unavailable.
      }
    });

    content.appendChild(button);
  });
});
