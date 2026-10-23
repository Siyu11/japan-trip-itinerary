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

const routeModeStorageKey = 'japan-2026-route-modes';
const geocodeStorageKey = 'japan-2026-geocode-cache';
let routeModes = {};
let geocodeCache = {};

try {
  routeModes = JSON.parse(localStorage.getItem(routeModeStorageKey) || '{}');
  geocodeCache = JSON.parse(localStorage.getItem(geocodeStorageKey) || '{}');
} catch {
  routeModes = {};
  geocodeCache = {};
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function readMapQuery(link) {
  try {
    const url = new URL(link.href);
    return url.searchParams.get('query') || url.searchParams.get('q') || '';
  } catch {
    return '';
  }
}

function getDayStops(day) {
  const stops = [];
  day.querySelectorAll('.schedule .event').forEach((event) => {
    const links = [...event.querySelectorAll('a.map-button')];
    const time = event.querySelector('time')?.textContent.trim() || '';
    const eventTitle = event.querySelector('h4')?.textContent.trim() || '未命名地点';
    const note = event.querySelector('p')?.textContent.trim() || '';
    links.forEach((link, linkIndex) => {
      const query = readMapQuery(link);
      if (!query) return;
      const rawLabel = link.textContent.trim();
      const title = links.length === 1 || !rawLabel || rawLabel === 'Google 地图'
        ? eventTitle
        : rawLabel;
      const lat = Number(link.dataset.lat);
      const lon = Number(link.dataset.lng);
      stops.push({
        title, time, note, query, mapUrl: link.href,
        travelMode: link.dataset.travelMode || '',
        coordinates: Number.isFinite(lat) && Number.isFinite(lon) && link.dataset.lat && link.dataset.lng ? { lat, lon } : null,
        event, linkIndex
      });
    });
  });
  return stops;
}

function googleDirectionsUrl(stops, travelMode) {
  if (!stops.length) return '#';
  if (stops.length === 1) return stops[0].mapUrl;
  const params = new URLSearchParams({
    api: '1',
    origin: stops[0].query,
    destination: stops[stops.length - 1].query
  });
  if (stops.length > 2) params.set('waypoints', stops.slice(1, -1).map((stop) => stop.query).join('|'));
  if (travelMode) params.set('travelmode', travelMode);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

async function geocodeStop(stop) {
  if (stop.coordinates) return stop.coordinates;
  const cacheKey = stop.query.toLowerCase();
  if (geocodeCache[cacheKey]) return geocodeCache[cacheKey];
  const params = new URLSearchParams({ q: stop.query, limit: '1' });
  const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Location lookup failed');
  const payload = await response.json();
  const [match] = payload.features || [];
  if (!match) return null;
  const [lon, lat] = match.geometry.coordinates;
  const result = { lat: Number(lat), lon: Number(lon) };
  geocodeCache[cacheKey] = result;
  try { localStorage.setItem(geocodeStorageKey, JSON.stringify(geocodeCache)); } catch {}
  return result;
}

function modeLabel(mode) {
  return { walking: '步行', driving: '驾车', transit: '公共交通' }[mode] || '方式待定';
}

function routeSegmentKey(day, from, to) {
  return `${day.id}:${from.query.toLowerCase()}=>${to.query.toLowerCase()}`;
}

function makeRouteModule(day) {
  if (day.classList.contains('prep-panel')) return;
  const schedule = day.querySelector('.schedule');
  if (!schedule) return;

  const details = document.createElement('details');
  details.className = 'route-module';
  details.innerHTML = `
    <summary><span><small>ROUTE</small><strong>路线地图</strong></span><span class="route-toggle" aria-hidden="true"></span></summary>
    <div class="route-content">
      <div class="route-map" role="region" aria-label="当天路线地图"></div>
      <p class="route-map-note">地图连线仅表示游览顺序，不代表实际道路、距离或所需时间。</p>
      <div class="route-status" role="status">展开后载入当天地点…</div>
      <ol class="route-stop-list"></ol>
      <div class="route-actions"><a class="route-start" target="_blank" rel="noreferrer">开始导航</a></div>
    </div>`;
  schedule.before(details);

  let map;
  let layerGroup;
  let lastSignature = '';

  const render = async () => {
    const stops = getDayStops(day);
    const signature = stops.map((stop) => `${stop.query}:${stop.title}:${stop.travelMode}:${stop.coordinates?.lat || ''}:${stop.coordinates?.lon || ''}`).join('|');
    const list = details.querySelector('.route-stop-list');
    const status = details.querySelector('.route-status');
    const start = details.querySelector('.route-start');
    list.replaceChildren();

    if (!stops.length) {
      status.textContent = '当天尚无可定位地点。请为行程添加准确的 Google Maps 地点链接。';
      start.hidden = true;
      return;
    }

    stops.forEach((stop, index) => {
      const item = document.createElement('li');
      const segmentKey = index < stops.length - 1
        ? routeSegmentKey(day, stop, stops[index + 1])
        : '';
      item.innerHTML = `<span class="route-number">${index + 1}</span><div><strong></strong><small></small></div>`;
      item.querySelector('strong').textContent = stop.title;
      item.querySelector('small').textContent = [stop.time, stop.note].filter(Boolean).join(' · ');
      const controls = document.createElement('div');
      controls.className = 'route-stop-controls';
      const placeLink = document.createElement('a');
      placeLink.href = stop.mapUrl;
      placeLink.target = '_blank';
      placeLink.rel = 'noreferrer';
      placeLink.textContent = '地图';
      placeLink.setAttribute('aria-label', `在 Google Maps 打开${stop.title}`);
      controls.appendChild(placeLink);

      if (index < stops.length - 1) {
        const select = document.createElement('select');
        select.setAttribute('aria-label', `${stop.title}至${stops[index + 1].title}的交通方式`);
        select.innerHTML = '<option value="">方式待定</option><option value="walking">步行</option><option value="transit">公共交通</option><option value="driving">驾车</option>';
        select.value = Object.prototype.hasOwnProperty.call(routeModes, segmentKey)
          ? routeModes[segmentKey]
          : stop.travelMode;
        const segmentLink = document.createElement('a');
        segmentLink.target = '_blank';
        segmentLink.rel = 'noreferrer';
        segmentLink.className = 'segment-nav';
        const updateSegment = () => {
          const mode = select.value;
          segmentLink.href = googleDirectionsUrl(stops.slice(index, index + 2), mode);
          segmentLink.textContent = `导航至 ${index + 2}`;
          segmentLink.title = `${modeLabel(mode)}：${stop.title} → ${stops[index + 1].title}`;
        };
        updateSegment();
        select.addEventListener('change', () => {
          routeModes[segmentKey] = select.value;
          try {
            localStorage.setItem(routeModeStorageKey, JSON.stringify(routeModes));
            notifyCloudStateChanged();
          } catch {}
          updateSegment();
          updateStartLink();
        });
        controls.append(select, segmentLink);
      }
      item.appendChild(controls);
      list.appendChild(item);
    });

    function updateStartLink() {
      const modes = stops.slice(0, -1).map((stop, index) => {
        const key = routeSegmentKey(day, stop, stops[index + 1]);
        return Object.prototype.hasOwnProperty.call(routeModes, key) ? routeModes[key] : stop.travelMode;
      });
      const selectedModes = [...new Set(modes.filter(Boolean))];
      const mixed = selectedModes.length > 1;
      start.href = mixed ? googleDirectionsUrl(stops.slice(0, 2), modes[0]) : googleDirectionsUrl(stops, selectedModes[0] || '');
      start.textContent = mixed ? '开始分段导航' : '开始导航';
      start.title = mixed ? '各路段交通方式不同，请按列表逐段导航' : '按当天地点顺序在 Google Maps 中打开';
      start.hidden = false;
    }
    updateStartLink();

    if (!details.open || signature === lastSignature) return;
    lastSignature = signature;
    status.textContent = '正在定位当天地点…';
    if (!window.L) {
      status.textContent = '地图组件载入失败，请刷新页面；仍可使用下方 Google Maps 导航。';
      return;
    }
    if (!map) {
      map = L.map(details.querySelector('.route-map'), { scrollWheelZoom: false, zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      layerGroup = L.layerGroup().addTo(map);
    }
    layerGroup.clearLayers();
    const located = [];
    const missing = [];
    for (let index = 0; index < stops.length; index += 1) {
      try {
        const coordinates = await geocodeStop(stops[index]);
        if (coordinates) located.push({ ...stops[index], ...coordinates, index });
        else missing.push(stops[index].title);
      } catch {
        missing.push(stops[index].title);
      }
      if (index < stops.length - 1 && !geocodeCache[stops[index + 1].query.toLowerCase()]) await sleep(1050);
    }
    located.forEach((stop) => {
      const icon = L.divIcon({ className: 'route-marker-shell', html: `<span>${stop.index + 1}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] });
      const marker = L.marker([stop.lat, stop.lon], { icon }).addTo(layerGroup);
      const popup = document.createElement('div');
      popup.className = 'route-popup';
      const title = document.createElement('strong');
      title.textContent = `${stop.index + 1}. ${stop.title}`;
      const meta = document.createElement('span');
      meta.textContent = [stop.time, stop.note].filter(Boolean).join(' · ');
      const link = document.createElement('a');
      link.href = stop.mapUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = '在 Google Maps 打开';
      popup.append(title, meta, link);
      marker.bindPopup(popup);
    });
    if (located.length > 1) {
      L.polyline(located.map((stop) => [stop.lat, stop.lon]), { color: '#22324a', weight: 2, opacity: .55, dashArray: '6 8' }).addTo(layerGroup);
    }
    if (located.length) {
      map.fitBounds(L.latLngBounds(located.map((stop) => [stop.lat, stop.lon])), { padding: [28, 28], maxZoom: 14 });
      setTimeout(() => map.invalidateSize(), 50);
    }
    status.textContent = missing.length
      ? `以下地点无法准确定位，请补充或确认地点链接：${missing.join('、')}`
      : `已按当天行程顺序显示 ${located.length} 个地点。`;
  };

  details.addEventListener('toggle', render);
  const observer = new MutationObserver(() => {
    lastSignature = '';
    if (details.open) render();
  });
  observer.observe(schedule, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href', 'data-travel-mode', 'data-lat', 'data-lng'] });
}

document.querySelectorAll('.day-panel').forEach(makeRouteModule);
