type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type CompletionStyle = 'send_clean' | 'send_rested' | 'attempt';

type Gym = {
  name: string;
  createdAt: string;
  updatedAt?: string;
};

type Route = {
  routeId: string;
  gymName: string;
  ropeNumber: string;
  color: string;
  setDate: string;
  grade: string;
  createdAt: string;
  updatedAt?: string;
};

type Attempt = {
  attemptId: string;
  routeId: string;
  climbDate: string;
  attemptIndex: number;
  completionStyle: CompletionStyle;
  notes: string;
  createdAt: string;
  updatedAt?: string;
};

type DataStore = {
  version: number;
  gyms: Gym[];
  routes: Route[];
  attempts: Attempt[];
};

const STORAGE_KEY = 'climbingNotesData';
const DB_NAME = 'climbingNotesDb';
const DB_STORE = 'appData';
const DB_DATA_KEY = 'data';
const THEME_KEY = 'climbingNotesTheme';
const CHART_STYLE_KEY = 'climbingNotesChartStyle';

type ThemePreference = 'system' | 'light' | 'dark';
type ChartStyle = 'bars' | 'histogram';

const createEmptyData = (): DataStore => ({ version: 1, gyms: [], routes: [], attempts: [] });

const normalizeData = (data: DataStore): DataStore => ({
  version: data.version ?? 1,
  gyms: data.gyms ?? [],
  routes: data.routes ?? [],
  attempts: data.attempts ?? [],
});

const loadLegacyData = (): DataStore | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DataStore;
    if (!parsed || !Array.isArray(parsed.gyms)) {
      return null;
    }
    return normalizeData(parsed);
  } catch (error) {
    console.warn('Failed to load legacy data', error);
    return null;
  }
};

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const requestPersistentStorage = async () => {
  if (!('storage' in navigator) || !navigator.storage.persist) return;
  try {
    const persisted = await navigator.storage.persisted();
    if (!persisted) {
      await navigator.storage.persist();
    }
  } catch (error) {
    console.warn('Failed to request persistent storage', error);
  }
};

const loadThemePreference = (): ThemePreference => {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
};

const applyThemePreference = (preference: ThemePreference) => {
  if (preference === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', preference);
  }
  if (themeSelect && themeSelect.value !== preference) {
    themeSelect.value = preference;
  }
};

const loadChartStyle = (): ChartStyle => {
  const stored = localStorage.getItem(CHART_STYLE_KEY);
  if (stored === 'bars' || stored === 'histogram') {
    return stored;
  }
  return 'bars';
};

const statusText = document.getElementById('statusText') as HTMLSpanElement | null;
const onlineDot = document.getElementById('onlineDot') as HTMLDivElement | null;
const installButton = document.getElementById('installButton') as HTMLButtonElement | null;
const messageBar = document.getElementById('messageBar') as HTMLDivElement | null;
const themeSelect = document.getElementById('themeSelect') as HTMLSelectElement | null;
const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.tab'));
const tabPanels = Array.from(document.querySelectorAll<HTMLElement>('.tab-panel'));
const gradeChartStyleSelect = document.getElementById('gradeChartStyle') as HTMLSelectElement | null;

const attemptForm = document.getElementById('attemptForm') as HTMLFormElement | null;
const attemptGym = document.getElementById('attemptGym') as HTMLSelectElement | null;
const routePicker = document.getElementById('routePicker') as HTMLSelectElement | null;
const ropeNumberInput = document.getElementById('ropeNumber') as HTMLInputElement | null;
const routeColorInput = document.getElementById('routeColor') as HTMLInputElement | null;
const setDateInput = document.getElementById('setDate') as HTMLInputElement | null;
const routeGradeInput = document.getElementById('routeGrade') as HTMLInputElement | null;
const climbDateInput = document.getElementById('climbDate') as HTMLInputElement | null;
const completionStyleSelect = document.getElementById('completionStyle') as HTMLSelectElement | null;
const attemptNotesInput = document.getElementById('attemptNotes') as HTMLTextAreaElement | null;
const attemptReset = document.getElementById('attemptReset') as HTMLButtonElement | null;
const attemptList = document.getElementById('attemptList') as HTMLDivElement | null;

const sessionForm = document.getElementById('sessionForm') as HTMLFormElement | null;
const sessionDateInput = document.getElementById('sessionDate') as HTMLInputElement | null;
const sessionGym = document.getElementById('sessionGym') as HTMLSelectElement | null;
const statTotal = document.getElementById('statTotal') as HTMLDivElement | null;
const statMax = document.getElementById('statMax') as HTMLDivElement | null;
const gradeDistribution = document.getElementById('gradeDistribution') as HTMLDivElement | null;

const routeHubForm = document.getElementById('routeHubForm') as HTMLFormElement | null;
const routeHubGym = document.getElementById('routeHubGym') as HTMLSelectElement | null;
const routeHubRope = document.getElementById('routeHubRope') as HTMLInputElement | null;
const routeHubColor = document.getElementById('routeHubColor') as HTMLInputElement | null;
const routeHubSetDate = document.getElementById('routeHubSetDate') as HTMLInputElement | null;
const routeHubGrade = document.getElementById('routeHubGrade') as HTMLInputElement | null;
const routeSearchButton = document.getElementById('routeSearch') as HTMLButtonElement | null;
const routeSaveButton = document.getElementById('routeSave') as HTMLButtonElement | null;
const routeSearchResult = document.getElementById('routeSearchResult') as HTMLDivElement | null;
const routeList = document.getElementById('routeList') as HTMLDivElement | null;

const gymForm = document.getElementById('gymForm') as HTMLFormElement | null;
const gymNameInput = document.getElementById('gymName') as HTMLInputElement | null;
const gymClear = document.getElementById('gymClear') as HTMLButtonElement | null;
const gymList = document.getElementById('gymList') as HTMLDivElement | null;

const updateConnectionStatus = () => {
  if (!statusText || !onlineDot) return;
  const online = navigator.onLine;
  statusText.textContent = online ? 'You are online' : 'Offline, cached copy';
  onlineDot.style.background = online ? '#22c55e' : '#f59e0b';
  onlineDot.style.boxShadow = online
    ? '0 0 0 6px rgba(34, 197, 94, 0.12)'
    : '0 0 0 6px rgba(245, 158, 11, 0.18)';
};

window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
updateConnectionStatus();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  });
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  if (installButton) installButton.hidden = false;
});

installButton?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted' && installButton) {
    installButton.textContent = 'Ready to install';
  }
  deferredPrompt = null;
  installButton.hidden = true;
});

const setActiveTab = (tabId: string) => {
  tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === tabId;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });
  tabPanels.forEach((panel) => {
    const isActive = panel.dataset.tabPanel === tabId;
    panel.classList.toggle('active', isActive);
    panel.toggleAttribute('hidden', !isActive);
  });
};

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const tabId = button.dataset.tab;
    if (!tabId) return;
    setActiveTab(tabId);
  });
});

const initialTheme = loadThemePreference();
applyThemePreference(initialTheme);

themeSelect?.addEventListener('change', () => {
  const preference = themeSelect.value as ThemePreference;
  localStorage.setItem(THEME_KEY, preference);
  applyThemePreference(preference);
});

const initialChartStyle = loadChartStyle();
if (gradeChartStyleSelect) {
  gradeChartStyleSelect.value = initialChartStyle;
}

gradeChartStyleSelect?.addEventListener('change', () => {
  const style = gradeChartStyleSelect.value as ChartStyle;
  localStorage.setItem(CHART_STYLE_KEY, style);
  renderStats();
});

const saveData = async (data: DataStore) => {
  const normalized = normalizeData(data);
  if (!('indexedDB' in window)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return;
  }
  let db: IDBDatabase | null = null;
  try {
    db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db?.transaction(DB_STORE, 'readwrite');
      if (!tx) {
        reject(new Error('Failed to create transaction'));
        return;
      }
      const store = tx.objectStore(DB_STORE);
      store.put({ key: DB_DATA_KEY, value: normalized });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.error('Failed to save data', error);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch (fallbackError) {
      console.error('Failed to save fallback data', fallbackError);
    }
  } finally {
    db?.close();
  }
};

const readData = async (): Promise<DataStore> => {
  if (!('indexedDB' in window)) {
    return loadLegacyData() ?? createEmptyData();
  }
  try {
    const db = await openDatabase();
    return await new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const request = store.get(DB_DATA_KEY);
      request.onsuccess = () => {
        const record = request.result as { key: string; value: DataStore } | undefined;
        if (record?.value) {
          resolve(normalizeData(record.value));
          return;
        }
        const legacy = loadLegacyData();
        if (legacy) {
          void saveData(legacy);
          resolve(legacy);
          return;
        }
        resolve(createEmptyData());
      };
      request.onerror = () => {
        console.error('Failed to read data', request.error);
        resolve(loadLegacyData() ?? createEmptyData());
      };
      tx.oncomplete = () => {
        db.close();
      };
      tx.onabort = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to open database', error);
    return loadLegacyData() ?? createEmptyData();
  }
};

const state = {
  data: createEmptyData(),
  editingGymName: '' as string | null,
  editingRouteId: '' as string | null,
  editingAttemptId: '' as string | null,
};

let sessionDatePinned = false;

let messageTimeout: number | null = null;

const setMessage = (text: string) => {
  if (!messageBar) return;
  messageBar.textContent = text;
  if (messageTimeout) {
    window.clearTimeout(messageTimeout);
  }
  if (text) {
    messageTimeout = window.setTimeout(() => {
      if (messageBar) messageBar.textContent = '';
    }, 4000);
  }
};

const normalizeText = (value: string) => value.trim();
const normalizeGrade = (value: string) => value.trim().toLowerCase();

const todayISO = () => new Date().toISOString().slice(0, 10);

const mostRecentSessionDate = () => {
  if (state.data.attempts.length === 0) return todayISO();
  return state.data.attempts.reduce((latest, attempt) => {
    if (!latest || attempt.climbDate > latest) return attempt.climbDate;
    return latest;
  }, '');
};

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const toRouteId = (gymName: string, ropeNumber: string, color: string, setDate: string) =>
  `${gymName}:${ropeNumber}:${color}:${setDate}`;

const isValidGrade = (grade: string) => /^5\.(\d+)([abcd])?$/.test(normalizeGrade(grade));

const gradeToValue = (grade: string) => {
  const trimmed = grade.trim().toLowerCase();
  const match = /^5\.(\d+)([abcd])?$/.exec(trimmed);
  if (!match) return null;
  const minor = Number(match[1]);
  const letter = match[2] ?? 'a';
  const letterValue = { a: 0, b: 1, c: 2, d: 3 }[letter] ?? 0;
  return minor * 4 + letterValue;
};

const compareGrades = (a: string, b: string) => {
  const aValue = gradeToValue(a);
  const bValue = gradeToValue(b);
  if (aValue === null || bValue === null) return 0;
  return aValue - bValue;
};

const setFormDisabled = (form: HTMLFormElement | null, disabled: boolean) => {
  if (!form) return;
  form.querySelectorAll('input, select, textarea, button').forEach((element) => {
    element.toggleAttribute('disabled', disabled);
  });
};

const updateSelectOptions = (
  select: HTMLSelectElement | null,
  options: string[],
  config?: { allowEmpty?: boolean; emptyLabel?: string }
) => {
  if (!select) return;
  const currentValue = select.value;
  select.innerHTML = '';
  if (config?.allowEmpty) {
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = config.emptyLabel ?? 'Select';
    select.appendChild(emptyOption);
  }
  if (options.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No gyms yet';
    option.disabled = true;
    option.selected = true;
    select.appendChild(option);
    return;
  }
  options.forEach((optionValue) => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionValue;
    select.appendChild(option);
  });
  if (currentValue && options.includes(currentValue)) {
    select.value = currentValue;
  }
};

const updateRoutePicker = () => {
  if (!routePicker || !attemptGym) return;
  const gymName = attemptGym.value;
  const routes = state.data.routes
    .filter((route) => route.gymName === gymName)
    .sort((a, b) => a.ropeNumber.localeCompare(b.ropeNumber, undefined, { numeric: true }));
  routePicker.innerHTML = '';
  const baseOption = document.createElement('option');
  baseOption.value = '';
  baseOption.textContent = 'Select a route to fill details';
  routePicker.appendChild(baseOption);
  routes.forEach((route) => {
    const option = document.createElement('option');
    option.value = route.routeId;
    option.textContent = `Rope ${route.ropeNumber} | ${route.color} | ${route.setDate} | ${route.grade}`;
    routePicker.appendChild(option);
  });
};

const findRouteById = (routeId: string) =>
  state.data.routes.find((route) => route.routeId === routeId) ?? null;

const findRoute = (gymName: string, ropeNumber: string, color: string, setDate: string) => {
  const routeId = toRouteId(gymName, ropeNumber, color, setDate);
  return findRouteById(routeId);
};

const upsertRoute = (payload: {
  gymName: string;
  ropeNumber: string;
  color: string;
  setDate: string;
  grade: string;
}) => {
  const routeId = toRouteId(payload.gymName, payload.ropeNumber, payload.color, payload.setDate);
  const existing = findRouteById(routeId);
  if (existing) {
    if (existing.grade !== payload.grade) {
      existing.grade = payload.grade;
      existing.updatedAt = new Date().toISOString();
    }
    return existing;
  }
  const route: Route = {
    routeId,
    gymName: payload.gymName,
    ropeNumber: payload.ropeNumber,
    color: payload.color,
    setDate: payload.setDate,
    grade: payload.grade,
    createdAt: new Date().toISOString(),
  };
  state.data.routes.push(route);
  return route;
};

const resetAttemptForm = () => {
  if (!attemptForm || !climbDateInput || !completionStyleSelect || !attemptNotesInput) return;
  attemptNotesInput.value = '';
  completionStyleSelect.value = 'send_clean';
  climbDateInput.value = climbDateInput.value || todayISO();
  state.editingAttemptId = null;
  const submitButton = attemptForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.textContent = 'Save attempt';
};

const resetRouteForm = () => {
  if (!routeHubForm) return;
  routeHubForm.reset();
  state.editingRouteId = null;
  if (routeSaveButton) routeSaveButton.textContent = 'Add route';
};

const resetGymForm = () => {
  if (!gymForm) return;
  gymForm.reset();
  state.editingGymName = null;
  const submitButton = gymForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.textContent = 'Save gym';
};

const renderGyms = () => {
  if (!gymList) return;
  gymList.innerHTML = '';
  if (state.data.gyms.length === 0) {
    gymList.innerHTML = '<div class="empty">No gyms yet. Add your first gym.</div>';
    return;
  }
  state.data.gyms
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((gym) => {
      const routesCount = state.data.routes.filter((route) => route.gymName === gym.name).length;
      const attemptsCount = state.data.attempts.filter((attempt) => {
        const route = findRouteById(attempt.routeId);
        return route?.gymName === gym.name;
      }).length;

      const card = document.createElement('div');
      card.className = 'list-item';

      const title = document.createElement('strong');
      title.textContent = gym.name;

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `${routesCount} routes, ${attemptsCount} attempts`;

      const actions = document.createElement('div');
      actions.className = 'actions';

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'ghost';
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', () => {
        if (!gymNameInput) return;
        gymNameInput.value = gym.name;
        state.editingGymName = gym.name;
        const submitButton = gymForm?.querySelector('button[type="submit"]');
        if (submitButton) submitButton.textContent = 'Update gym';
      });

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'ghost';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        const confirmDelete = window.confirm(
          `Delete ${gym.name}? This removes routes and attempts for this gym.`
        );
        if (!confirmDelete) return;
        state.data.routes = state.data.routes.filter((route) => route.gymName !== gym.name);
        state.data.attempts = state.data.attempts.filter((attempt) => {
          const route = findRouteById(attempt.routeId);
          return route && route.gymName !== gym.name;
        });
        state.data.gyms = state.data.gyms.filter((item) => item.name !== gym.name);
        saveData(state.data);
        renderAll();
        setMessage(`Gym ${gym.name} deleted.`);
      });

      actions.append(editButton, deleteButton);
      card.append(title, meta, actions);
      gymList.appendChild(card);
    });
};

const renderRoutes = () => {
  if (!routeList) return;
  routeList.innerHTML = '';
  if (state.data.routes.length === 0) {
    routeList.innerHTML = '<div class="empty">No routes yet. Add a route or log an attempt.</div>';
    return;
  }
  state.data.routes
    .slice()
    .sort((a, b) => {
      if (a.gymName !== b.gymName) return a.gymName.localeCompare(b.gymName);
      if (a.ropeNumber !== b.ropeNumber) return a.ropeNumber.localeCompare(b.ropeNumber);
      return a.setDate.localeCompare(b.setDate);
    })
    .forEach((route) => {
      const attempts = state.data.attempts.filter((attempt) => attempt.routeId === route.routeId);
      const lastClimbed = attempts
        .slice()
        .sort((a, b) => b.climbDate.localeCompare(a.climbDate))[0]?.climbDate;

      const card = document.createElement('details');
      card.className = 'list-item compact-card';

      const summary = document.createElement('summary');
      summary.className = 'compact-summary';

      const textWrap = document.createElement('div');
      textWrap.className = 'compact-text';

      const title = document.createElement('div');
      title.className = 'compact-title';
      title.textContent = `${route.gymName} - Rope ${route.ropeNumber} ${route.color}`;

      const meta = document.createElement('div');
      meta.className = 'compact-meta';
      meta.textContent = `Set ${route.setDate} · Grade ${route.grade} · ${attempts.length} attempts`;

      const chevron = document.createElement('span');
      chevron.className = 'compact-chevron';
      chevron.textContent = '›';
      chevron.setAttribute('aria-hidden', 'true');

      textWrap.append(title, meta);
      summary.append(textWrap, chevron);

      const details = document.createElement('div');
      details.className = 'compact-details';

      const detail = document.createElement('div');
      detail.className = 'meta';
      detail.textContent = lastClimbed ? `Last climbed ${lastClimbed}` : 'No climbs yet';

      const actions = document.createElement('div');
      actions.className = 'actions';

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'ghost';
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', () => {
        if (!routeHubGym || !routeHubRope || !routeHubColor || !routeHubSetDate || !routeHubGrade) {
          return;
        }
        routeHubGym.value = route.gymName;
        routeHubRope.value = route.ropeNumber;
        routeHubColor.value = route.color;
        routeHubSetDate.value = route.setDate;
        routeHubGrade.value = route.grade;
        state.editingRouteId = route.routeId;
        if (routeSaveButton) routeSaveButton.textContent = 'Update route';
      });

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'ghost';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        const confirmDelete = window.confirm(
          `Delete rope ${route.ropeNumber} (${route.color})? This removes all attempts.`
        );
        if (!confirmDelete) return;
        state.data.routes = state.data.routes.filter((item) => item.routeId !== route.routeId);
        state.data.attempts = state.data.attempts.filter((attempt) => attempt.routeId !== route.routeId);
        saveData(state.data);
        renderAll();
        setMessage('Route deleted.');
      });

      actions.append(editButton, deleteButton);
      details.append(detail, actions);
      card.append(summary, details);
      routeList.appendChild(card);
    });
};

const renderAttempts = () => {
  if (!attemptList) return;
  attemptList.innerHTML = '';
  if (state.data.attempts.length === 0) {
    attemptList.innerHTML = '<div class="empty">No attempts logged yet.</div>';
    return;
  }
  const attempts = state.data.attempts
    .slice()
    .sort((a, b) => b.climbDate.localeCompare(a.climbDate))
    .slice(0, 12);

  attempts.forEach((attempt) => {
    const route = findRouteById(attempt.routeId);
    if (!route) return;

    const completionLabel =
      attempt.completionStyle === 'send_clean'
        ? 'Send (no rest)'
        : attempt.completionStyle === 'send_rested'
          ? 'Send (rested)'
          : 'Attempt only';
    const card = document.createElement('details');
    card.className = 'list-item compact-card';

    const summary = document.createElement('summary');
    summary.className = 'compact-summary';

    const textWrap = document.createElement('div');
    textWrap.className = 'compact-text';

    const title = document.createElement('div');
    title.className = 'compact-title';
    title.textContent = `${route.gymName} - Rope ${route.ropeNumber} ${route.color}`;

    const meta = document.createElement('div');
    meta.className = 'compact-meta';
    meta.textContent = `${attempt.climbDate} · ${route.grade} · Attempt ${attempt.attemptIndex} · ${completionLabel}`;

    const chevron = document.createElement('span');
    chevron.className = 'compact-chevron';
    chevron.textContent = '›';
    chevron.setAttribute('aria-hidden', 'true');

    textWrap.append(title, meta);
    summary.append(textWrap, chevron);

    const details = document.createElement('div');
    details.className = 'compact-details';

    const notes = document.createElement('div');
    notes.className = 'meta';
    notes.textContent = attempt.notes ? `Notes: ${attempt.notes}` : 'Notes: -';

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'ghost';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => {
      if (
        !attemptGym ||
        !ropeNumberInput ||
        !routeColorInput ||
        !setDateInput ||
        !routeGradeInput ||
        !climbDateInput ||
        !completionStyleSelect ||
        !attemptNotesInput
      ) {
        return;
      }
      attemptGym.value = route.gymName;
      updateRoutePicker();
      ropeNumberInput.value = route.ropeNumber;
      routeColorInput.value = route.color;
      setDateInput.value = route.setDate;
      routeGradeInput.value = route.grade;
      climbDateInput.value = attempt.climbDate;
      completionStyleSelect.value = attempt.completionStyle;
      attemptNotesInput.value = attempt.notes;
      state.editingAttemptId = attempt.attemptId;
      if (routePicker) routePicker.value = route.routeId;
      const submitButton = attemptForm?.querySelector('button[type="submit"]');
      if (submitButton) submitButton.textContent = 'Update attempt';
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'ghost';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
      const confirmDelete = window.confirm('Delete this attempt?');
      if (!confirmDelete) return;
      state.data.attempts = state.data.attempts.filter(
        (item) => item.attemptId !== attempt.attemptId
      );
      saveData(state.data);
      renderAll();
      setMessage('Attempt deleted.');
    });

    actions.append(editButton, deleteButton);
    details.append(notes, actions);
    card.append(summary, details);
    attemptList.appendChild(card);
  });
};

const setSessionDefault = () => {
  if (!sessionDateInput || sessionDatePinned) return;
  sessionDateInput.value = mostRecentSessionDate();
};

const renderStats = () => {
  if (!sessionDateInput || !statTotal || !statMax || !gradeDistribution) return;
  const sessionDate = sessionDateInput.value || todayISO();
  const gymFilter = sessionGym?.value ?? '';
  const attempts = state.data.attempts.filter((attempt) => {
    if (attempt.climbDate !== sessionDate) return false;
    const route = findRouteById(attempt.routeId);
    if (!route) return false;
    if (gymFilter && route.gymName !== gymFilter) return false;
    return true;
  });

  statTotal.textContent = String(attempts.length);

  const gradeCounts = new Map<string, number>();
  let maxGrade: string | null = null;
  attempts.forEach((attempt) => {
    const route = findRouteById(attempt.routeId);
    if (!route) return;
    gradeCounts.set(route.grade, (gradeCounts.get(route.grade) ?? 0) + 1);
    if (!maxGrade || compareGrades(route.grade, maxGrade) > 0) {
      maxGrade = route.grade;
    }
  });

  statMax.textContent = maxGrade ?? '-';

  gradeDistribution.innerHTML = '';
  const chartStyle = (gradeChartStyleSelect?.value as ChartStyle) ?? loadChartStyle();
  gradeDistribution.className = `grade-chart${chartStyle === 'histogram' ? ' histogram' : ''}`;
  if (gradeCounts.size === 0) {
    gradeDistribution.innerHTML = '<div class="empty">No attempts for this session.</div>';
    return;
  }

  const maxCount = Math.max(...gradeCounts.values());

  const entries = [...gradeCounts.entries()].sort((a, b) => compareGrades(a[0], b[0]));

  if (chartStyle === 'histogram') {
    const grid = document.createElement('div');
    grid.className = 'histogram-grid';

    entries.forEach(([grade, count]) => {
      const column = document.createElement('div');
      column.className = 'histogram-bar';

      const countLabel = document.createElement('div');
      countLabel.className = 'histogram-count';
      countLabel.textContent = String(count);

      const track = document.createElement('div');
      track.className = 'histogram-track';

      const fill = document.createElement('div');
      fill.className = 'histogram-fill';
      const height = Math.max(8, Math.round((count / maxCount) * 100));
      fill.style.height = `${height}%`;

      const gradeLabel = document.createElement('div');
      gradeLabel.className = 'histogram-label';
      gradeLabel.textContent = grade;

      track.appendChild(fill);
      column.append(countLabel, track, gradeLabel);
      grid.appendChild(column);
    });

    gradeDistribution.appendChild(grid);
    return;
  }

  entries.forEach(([grade, count]) => {
    const bar = document.createElement('div');
    bar.className = 'grade-bar';

    const header = document.createElement('div');
    header.className = 'grade-bar-header';

    const label = document.createElement('span');
    label.textContent = grade;

    const value = document.createElement('span');
    value.textContent = String(count);

    header.append(label, value);

    const track = document.createElement('div');
    track.className = 'grade-bar-track';

    const fill = document.createElement('div');
    fill.className = 'grade-bar-fill';
    fill.style.width = `${Math.round((count / maxCount) * 100)}%`;

    track.appendChild(fill);
    bar.append(header, track);
    gradeDistribution.appendChild(bar);
  });
};

const renderRouteSearchResult = (routes: Route[]) => {
  if (!routeSearchResult) return;
  routeSearchResult.innerHTML = '';
  if (routes.length === 0) {
    routeSearchResult.innerHTML = '<div class="empty">No matching routes found.</div>';
    return;
  }

  const countLine = document.createElement('div');
  countLine.className = 'meta';
  countLine.textContent = `${routes.length} route${routes.length === 1 ? '' : 's'} found.`;
  routeSearchResult.appendChild(countLine);

  routes
    .slice()
    .sort((a, b) => {
      if (a.gymName !== b.gymName) return a.gymName.localeCompare(b.gymName);
      if (a.ropeNumber !== b.ropeNumber) {
        return a.ropeNumber.localeCompare(b.ropeNumber, undefined, { numeric: true });
      }
      return a.setDate.localeCompare(b.setDate);
    })
    .forEach((route) => {
      const attempts = state.data.attempts
        .filter((attempt) => attempt.routeId === route.routeId)
        .sort((a, b) => b.climbDate.localeCompare(a.climbDate));

      const sends = attempts.filter((attempt) => attempt.completionStyle !== 'attempt');
      const lastSend = sends[0]?.climbDate ?? '-';

      const card = document.createElement('details');
      card.className = 'list-item compact-card';

      const summary = document.createElement('summary');
      summary.className = 'compact-summary';

      const textWrap = document.createElement('div');
      textWrap.className = 'compact-text';

      const title = document.createElement('div');
      title.className = 'compact-title';
      title.textContent = `${route.gymName} - Rope ${route.ropeNumber} ${route.color}`;

      const meta = document.createElement('div');
      meta.className = 'compact-meta';
      meta.textContent = `Set ${route.setDate} · Grade ${route.grade} · Last send ${lastSend}`;

      const chevron = document.createElement('span');
      chevron.className = 'compact-chevron';
      chevron.textContent = '›';
      chevron.setAttribute('aria-hidden', 'true');

      textWrap.append(title, meta);
      summary.append(textWrap, chevron);

      const details = document.createElement('div');
      details.className = 'compact-details';

      if (attempts.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'meta';
        empty.textContent = 'No attempts logged yet.';
        details.appendChild(empty);
      } else {
        attempts.forEach((attempt) => {
          const completionLabel =
            attempt.completionStyle === 'send_clean'
              ? 'Send (no rest)'
              : attempt.completionStyle === 'send_rested'
                ? 'Send (rested)'
                : 'Attempt only';
          const line = document.createElement('div');
          line.className = 'meta';
          line.textContent = `${attempt.climbDate} · Attempt ${attempt.attemptIndex} · ${completionLabel}`;

          const notes = document.createElement('div');
          notes.className = 'meta';
          notes.textContent = attempt.notes ? `Notes: ${attempt.notes}` : 'Notes: -';

          details.append(line, notes);
        });
      }

      card.append(summary, details);
      routeSearchResult.appendChild(card);
    });
};

const renderAll = () => {
  const gymNames = state.data.gyms.map((gym) => gym.name);
  updateSelectOptions(attemptGym, gymNames);
  updateSelectOptions(routeHubGym, gymNames);
  updateSelectOptions(sessionGym, gymNames, { allowEmpty: true, emptyLabel: 'All gyms' });
  updateRoutePicker();
  renderGyms();
  renderRoutes();
  renderAttempts();
  setSessionDefault();
  renderStats();

  const hasGyms = gymNames.length > 0;
  setFormDisabled(attemptForm, !hasGyms);
  setFormDisabled(routeHubForm, !hasGyms);

  if (!hasGyms && messageBar && !messageBar.textContent) {
    setMessage('Add a gym to start logging climbs.');
  }
};

attemptGym?.addEventListener('change', () => {
  updateRoutePicker();
});

routePicker?.addEventListener('change', () => {
  const routeId = routePicker.value;
  const route = routeId ? findRouteById(routeId) : null;
  if (!route || !ropeNumberInput || !routeColorInput || !setDateInput || !routeGradeInput) {
    return;
  }
  ropeNumberInput.value = route.ropeNumber;
  routeColorInput.value = route.color;
  setDateInput.value = route.setDate;
  routeGradeInput.value = route.grade;
});

[ropeNumberInput, routeColorInput, setDateInput, routeGradeInput].forEach((input) => {
  input?.addEventListener('input', () => {
    if (routePicker) routePicker.value = '';
  });
});

attemptForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (
    !attemptGym ||
    !ropeNumberInput ||
    !routeColorInput ||
    !setDateInput ||
    !routeGradeInput ||
    !climbDateInput ||
    !completionStyleSelect ||
    !attemptNotesInput
  ) {
    return;
  }

  const gymName = normalizeText(attemptGym.value);
  const ropeNumber = normalizeText(ropeNumberInput.value);
  const color = normalizeText(routeColorInput.value);
  const setDate = setDateInput.value;
  const grade = normalizeGrade(routeGradeInput.value);
  const climbDate = climbDateInput.value || todayISO();

  if (!gymName || !ropeNumber || !color || !setDate || !grade || !climbDate) {
    setMessage('Fill in all route and attempt fields.');
    return;
  }

  if (!isValidGrade(grade)) {
    setMessage('Grade must use Yosemite format, like 5.10a.');
    return;
  }

  const route = upsertRoute({ gymName, ropeNumber, color, setDate, grade });

  if (state.editingAttemptId) {
    const attempt = state.data.attempts.find((item) => item.attemptId === state.editingAttemptId);
    if (!attempt) {
      state.editingAttemptId = null;
    } else {
      const originalRouteId = attempt.routeId;
      const originalDate = attempt.climbDate;
      attempt.routeId = route.routeId;
      attempt.climbDate = climbDate;
      attempt.completionStyle = completionStyleSelect.value as CompletionStyle;
      attempt.notes = normalizeText(attemptNotesInput.value);
      attempt.updatedAt = new Date().toISOString();
      if (originalRouteId !== route.routeId || originalDate !== climbDate) {
        const existingAttempts = state.data.attempts.filter(
          (item) =>
            item.attemptId !== attempt.attemptId &&
            item.routeId === route.routeId &&
            item.climbDate === climbDate
        );
        attempt.attemptIndex = existingAttempts.length + 1;
      }
      saveData(state.data);
      renderAll();
      setMessage('Attempt updated.');
      resetAttemptForm();
      return;
    }
  }

  const attemptIndex =
    state.data.attempts.filter(
      (attempt) => attempt.routeId === route.routeId && attempt.climbDate === climbDate
    ).length + 1;
  const attempt: Attempt = {
    attemptId: createId(),
    routeId: route.routeId,
    climbDate,
    attemptIndex,
    completionStyle: completionStyleSelect.value as CompletionStyle,
    notes: normalizeText(attemptNotesInput.value),
    createdAt: new Date().toISOString(),
  };
  state.data.attempts.push(attempt);
  saveData(state.data);
  renderAll();
  setMessage('Attempt saved.');
  resetAttemptForm();
});

attemptReset?.addEventListener('click', () => {
  resetAttemptForm();
});

const handleRouteSave = () => {
  if (!routeHubGym || !routeHubRope || !routeHubColor || !routeHubSetDate || !routeHubGrade) return;

  const gymName = normalizeText(routeHubGym.value);
  const ropeNumber = normalizeText(routeHubRope.value);
  const color = normalizeText(routeHubColor.value);
  const setDate = routeHubSetDate.value;
  const grade = normalizeGrade(routeHubGrade.value);

  if (!gymName || !ropeNumber || !color || !setDate || !grade) {
    setMessage('Fill in all route fields.');
    return;
  }

  if (!isValidGrade(grade)) {
    setMessage('Grade must use Yosemite format, like 5.9 or 5.10a.');
    return;
  }

  const newRouteId = toRouteId(gymName, ropeNumber, color, setDate);
  const existing = findRouteById(newRouteId);

  if (state.editingRouteId) {
    const route = state.data.routes.find((item) => item.routeId === state.editingRouteId);
    if (!route) {
      state.editingRouteId = null;
    } else if (existing && existing.routeId !== route.routeId) {
      setMessage('That route already exists for this gym.');
      return;
    } else {
      const oldRouteId = route.routeId;
      route.gymName = gymName;
      route.ropeNumber = ropeNumber;
      route.color = color;
      route.setDate = setDate;
      route.grade = grade;
      route.routeId = newRouteId;
      route.updatedAt = new Date().toISOString();
      if (oldRouteId !== newRouteId) {
        state.data.attempts.forEach((attempt) => {
          if (attempt.routeId === oldRouteId) attempt.routeId = newRouteId;
        });
      }
      saveData(state.data);
      renderAll();
      setMessage('Route updated.');
      resetRouteForm();
      return;
    }
  }

  if (existing) {
    setMessage('That route already exists.');
    return;
  }

  state.data.routes.push({
    routeId: newRouteId,
    gymName,
    ropeNumber,
    color,
    setDate,
    grade,
    createdAt: new Date().toISOString(),
  });
  saveData(state.data);
  renderAll();
  setMessage('Route saved.');
  resetRouteForm();
};

const handleRouteSearch = () => {
  if (!routeHubGym || !routeHubRope || !routeHubColor || !routeHubSetDate) return;

  const gymName = normalizeText(routeHubGym.value);
  const ropeQuery = normalizeText(routeHubRope.value).toLowerCase();
  const colorQuery = normalizeText(routeHubColor.value).toLowerCase();
  const setDateQuery = routeHubSetDate.value;

  if (!gymName) {
    setMessage('Pick a gym to search.');
    return;
  }
  if (!ropeQuery && !colorQuery && !setDateQuery) {
    setMessage('Add at least one search field.');
    return;
  }

  const routes = state.data.routes.filter((route) => {
    if (route.gymName !== gymName) return false;
    if (ropeQuery && route.ropeNumber.toLowerCase() !== ropeQuery) return false;
    if (colorQuery && route.color.toLowerCase() !== colorQuery) return false;
    if (setDateQuery && route.setDate !== setDateQuery) return false;
    return true;
  });
  renderRouteSearchResult(routes);
};

routeHubForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  handleRouteSearch();
});

routeSearchButton?.addEventListener('click', () => {
  handleRouteSearch();
});

routeSaveButton?.addEventListener('click', () => {
  handleRouteSave();
});

gymForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!gymNameInput) return;
  const gymName = normalizeText(gymNameInput.value);
  if (!gymName) {
    setMessage('Gym name is required.');
    return;
  }

  const existingGym = state.data.gyms.find(
    (gym) => gym.name.toLowerCase() === gymName.toLowerCase()
  );

  if (state.editingGymName) {
    const currentName = state.editingGymName;
    const gym = state.data.gyms.find((item) => item.name === currentName);
    if (!gym) {
      state.editingGymName = null;
    } else {
      if (existingGym && existingGym.name !== currentName) {
        setMessage('Another gym already uses that name.');
        return;
      }
      const routeConflicts = state.data.routes.some((route) => {
        if (route.gymName !== currentName) return false;
        const newRouteId = toRouteId(gymName, route.ropeNumber, route.color, route.setDate);
        return state.data.routes.some(
          (other) => other.gymName === gymName && other.routeId === newRouteId
        );
      });
      if (routeConflicts) {
        setMessage('Renaming would conflict with existing routes.');
        return;
      }
      const routesToRename = state.data.routes.filter((route) => route.gymName === currentName);
      routesToRename.forEach((route) => {
        const oldRouteId = route.routeId;
        route.gymName = gymName;
        route.routeId = toRouteId(gymName, route.ropeNumber, route.color, route.setDate);
        state.data.attempts.forEach((attempt) => {
          if (attempt.routeId === oldRouteId) attempt.routeId = route.routeId;
        });
      });
      gym.name = gymName;
      gym.updatedAt = new Date().toISOString();
      saveData(state.data);
      renderAll();
      setMessage('Gym updated.');
      resetGymForm();
      return;
    }
  }

  if (existingGym) {
    setMessage('That gym already exists.');
    return;
  }

  state.data.gyms.push({ name: gymName, createdAt: new Date().toISOString() });
  saveData(state.data);
  renderAll();
  setMessage('Gym saved.');
  resetGymForm();
});

gymClear?.addEventListener('click', () => {
  resetGymForm();
});

sessionDateInput?.addEventListener('change', () => {
  sessionDatePinned = true;
  renderStats();
});

sessionGym?.addEventListener('change', () => {
  renderStats();
});

if (climbDateInput) climbDateInput.value = todayISO();
if (sessionDateInput) sessionDateInput.value = todayISO();

const initApp = async () => {
  await requestPersistentStorage();
  state.data = await readData();
  sessionDatePinned = false;
  renderAll();
};

void initApp();
