const tabs = [...document.querySelectorAll('.date-tab')];
const panels = [...document.querySelectorAll('.day-panel')];
const selectedDayStorageKey = 'japan-2026-selected-day';
const notifyCloudStateChanged = () => window.dispatchEvent(new Event('travel-state-changed'));

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
    notifyCloudStateChanged();
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
const prepItemsStorageKey = 'japan-2026-preparation-items';
const defaultPrepItems = [
  { id: 'passport', label: 'Passport' },
  { id: 'sim-card', label: 'SIM Card' },
  { id: 'suica-card', label: 'Suica Card' },
  { id: 'visit-japan-web', label: 'Visit Japan Web', href: 'https://www.vjw.digital.go.jp/', linkLabel: 'Entry Form ↗' },
  { id: 'visa', label: 'Visa' },
  { id: 'travel-insurance', label: 'Travel Insurance' },
  { id: 'medicine', label: 'Medicine' }
];
let prepState = {};
let prepItems = [...defaultPrepItems];

try {
  prepState = JSON.parse(localStorage.getItem(prepStorageKey) || '{}');
  const savedPrepItems = JSON.parse(localStorage.getItem(prepItemsStorageKey) || 'null');
  if (Array.isArray(savedPrepItems)) prepItems = savedPrepItems;
} catch {
  prepState = {};
  prepItems = [...defaultPrepItems];
}

const prepChecklist = document.querySelector('#prep-checklist');
const prepAddForm = document.querySelector('#prep-add-form');
const prepNewItem = document.querySelector('#prep-new-item');

function savePrepData() {
  try {
    localStorage.setItem(prepStorageKey, JSON.stringify(prepState));
    localStorage.setItem(prepItemsStorageKey, JSON.stringify(prepItems));
    notifyCloudStateChanged();
  } catch {
    // Checklist interaction still works when browser storage is unavailable.
  }
}

function renderPrepItems() {
  prepChecklist.replaceChildren();

  prepItems.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'prep-item';
    row.classList.toggle('checked', Boolean(prepState[item.id]));

    const details = document.createElement('div');
    const label = document.createElement('strong');
    label.textContent = item.label;
    details.appendChild(label);

    if (item.href) {
      const link = document.createElement('a');
      link.href = item.href;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = item.linkLabel || 'Open ↗';
      details.appendChild(link);
    }

    const controls = document.createElement('div');
    controls.className = 'prep-item-controls';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'prep-delete-button';
    removeButton.setAttribute('aria-label', `Delete ${item.label}`);
    removeButton.title = 'Delete';
    removeButton.textContent = '×';
    removeButton.addEventListener('click', () => {
      prepItems = prepItems.filter((prepItem) => prepItem.id !== item.id);
      delete prepState[item.id];
      savePrepData();
      renderPrepItems();
    });

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.prep = item.id;
    checkbox.checked = Boolean(prepState[item.id]);
    checkbox.setAttribute('aria-label', `Mark ${item.label} complete`);
    checkbox.addEventListener('change', () => {
      prepState[item.id] = checkbox.checked;
      row.classList.toggle('checked', checkbox.checked);
      savePrepData();
    });

    controls.append(removeButton, checkbox);
    row.append(details, controls);
    prepChecklist.appendChild(row);
  });
}

prepAddForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const label = prepNewItem.value.trim();
  if (!label) return;
  prepItems.push({ id: `custom-${Date.now()}`, label });
  prepNewItem.value = '';
  savePrepData();
  renderPrepItems();
  prepNewItem.focus();
});

renderPrepItems();

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
        notifyCloudStateChanged();
      } catch {
        // The visual state still works when browser storage is unavailable.
      }
    });

    content.appendChild(button);
  });
});
