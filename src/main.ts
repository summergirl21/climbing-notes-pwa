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
const DEFAULT_DATA: DataStore = { version: 1, gyms: [], routes: [], attempts: [] };

const statusText = document.getElementById('statusText') as HTMLSpanElement | null;
const onlineDot = document.getElementById('onlineDot') as HTMLDivElement | null;
const installButton = document.getElementById('installButton') as HTMLButtonElement | null;
const messageBar = document.getElementById('messageBar') as HTMLDivElement | null;

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

const routeSearchForm = document.getElementById('routeSearchForm') as HTMLFormElement | null;
const searchGym = document.getElementById('searchGym') as HTMLSelectElement | null;
const searchRope = document.getElementById('searchRope') as HTMLInputElement | null;
const searchColor = document.getElementById('searchColor') as HTMLInputElement | null;
const searchSetDate = document.getElementById('searchSetDate') as HTMLInputElement | null;
const searchReset = document.getElementById('searchReset') as HTMLButtonElement | null;
const routeSearchResult = document.getElementById('routeSearchResult') as HTMLDivElement | null;

const routeForm = document.getElementById('routeForm') as HTMLFormElement | null;
const routeGym = document.getElementById('routeGym') as HTMLSelectElement | null;
const routeRope = document.getElementById('routeRope') as HTMLInputElement | null;
const routeColorInputEdit = document.getElementById('routeColorInput') as HTMLInputElement | null;
const routeSetDate = document.getElementById('routeSetDate') as HTMLInputElement | null;
const routeGradeInputEdit = document.getElementById('routeGradeInput') as HTMLInputElement | null;
const routeClear = document.getElementById('routeClear') as HTMLButtonElement | null;
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

const loadData = (): DataStore => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_DATA };
  try {
    const parsed = JSON.parse(raw) as DataStore;
    if (!parsed || !Array.isArray(parsed.gyms)) {
      return { ...DEFAULT_DATA };
    }
    return {
      version: parsed.version ?? 1,
      gyms: parsed.gyms ?? [],
      routes: parsed.routes ?? [],
      attempts: parsed.attempts ?? [],
    };
  } catch (error) {
    console.error('Failed to load data', error);
    return { ...DEFAULT_DATA };
  }
};

const saveData = (data: DataStore) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const state = {
  data: loadData(),
  editingGymName: '' as string | null,
  editingRouteId: '' as string | null,
  editingAttemptId: '' as string | null,
};

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
  if (!routeForm) return;
  routeForm.reset();
  state.editingRouteId = null;
  const submitButton = routeForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.textContent = 'Save route';
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

      const card = document.createElement('div');
      card.className = 'list-item';

      const title = document.createElement('strong');
      title.textContent = `${route.gymName} - Rope ${route.ropeNumber} ${route.color}`;

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `Set ${route.setDate} | Grade ${route.grade} | ${attempts.length} attempts`;

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
        if (!routeGym || !routeRope || !routeColorInputEdit || !routeSetDate || !routeGradeInputEdit) {
          return;
        }
        routeGym.value = route.gymName;
        routeRope.value = route.ropeNumber;
        routeColorInputEdit.value = route.color;
        routeSetDate.value = route.setDate;
        routeGradeInputEdit.value = route.grade;
        state.editingRouteId = route.routeId;
        const submitButton = routeForm?.querySelector('button[type="submit"]');
        if (submitButton) submitButton.textContent = 'Update route';
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
      card.append(title, meta, detail, actions);
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

    const card = document.createElement('div');
    card.className = 'list-item';

    const title = document.createElement('strong');
    title.textContent = `${route.gymName} - Rope ${route.ropeNumber} ${route.color}`;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${attempt.climbDate} | ${route.grade} | Attempt ${attempt.attemptIndex}`;

    const completion = document.createElement('div');
    completion.className = 'meta';
    const completionLabel =
      attempt.completionStyle === 'send_clean'
        ? 'Send (no rest)'
        : attempt.completionStyle === 'send_rested'
          ? 'Send (rested)'
          : 'Attempt only';
    completion.textContent = completionLabel;

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
    card.append(title, meta, completion, notes, actions);
    attemptList.appendChild(card);
  });
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
  if (gradeCounts.size === 0) {
    gradeDistribution.innerHTML = '<div class="empty">No attempts for this session.</div>';
    return;
  }

  [...gradeCounts.entries()]
    .sort((a, b) => compareGrades(a[0], b[0]))
    .forEach(([grade, count]) => {
      const line = document.createElement('div');
      line.textContent = `${grade}: ${count}`;
      gradeDistribution.appendChild(line);
    });
};

const renderRouteSearchResult = (route: Route | null, attempts: Attempt[]) => {
  if (!routeSearchResult) return;
  routeSearchResult.innerHTML = '';
  if (!route) {
    routeSearchResult.innerHTML = '<div class="empty">No matching route found.</div>';
    return;
  }

  const header = document.createElement('div');
  header.className = 'list-item';

  const title = document.createElement('strong');
  title.textContent = `${route.gymName} - Rope ${route.ropeNumber} ${route.color}`;

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `Set ${route.setDate} | Grade ${route.grade}`;

  const history = document.createElement('div');
  history.className = 'meta';

  const sends = attempts.filter((attempt) => attempt.completionStyle !== 'attempt');
  if (sends.length === 0) {
    history.textContent = 'No sends yet.';
  } else {
    const latestSend = sends
      .slice()
      .sort((a, b) => b.climbDate.localeCompare(a.climbDate))[0]?.climbDate;
    history.textContent = `Last send: ${latestSend}`;
  }

  header.append(title, meta, history);
  routeSearchResult.appendChild(header);

  if (attempts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No attempts logged yet.';
    routeSearchResult.appendChild(empty);
    return;
  }

  attempts
    .slice()
    .sort((a, b) => b.climbDate.localeCompare(a.climbDate))
    .forEach((attempt) => {
      const card = document.createElement('div');
      card.className = 'list-item';

      const metaLine = document.createElement('div');
      metaLine.className = 'meta';
      const completionLabel =
        attempt.completionStyle === 'send_clean'
          ? 'Send (no rest)'
          : attempt.completionStyle === 'send_rested'
            ? 'Send (rested)'
            : 'Attempt only';
      metaLine.textContent = `${attempt.climbDate} | Attempt ${attempt.attemptIndex} | ${completionLabel}`;

      const notes = document.createElement('div');
      notes.className = 'meta';
      notes.textContent = attempt.notes ? `Notes: ${attempt.notes}` : 'Notes: -';

      card.append(metaLine, notes);
      routeSearchResult.appendChild(card);
    });
};

const renderAll = () => {
  const gymNames = state.data.gyms.map((gym) => gym.name);
  updateSelectOptions(attemptGym, gymNames);
  updateSelectOptions(routeGym, gymNames);
  updateSelectOptions(searchGym, gymNames);
  updateSelectOptions(sessionGym, gymNames, { allowEmpty: true, emptyLabel: 'All gyms' });
  updateRoutePicker();
  renderGyms();
  renderRoutes();
  renderAttempts();
  renderStats();

  const hasGyms = gymNames.length > 0;
  setFormDisabled(attemptForm, !hasGyms);
  setFormDisabled(routeForm, !hasGyms);
  setFormDisabled(routeSearchForm, !hasGyms);

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

routeForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!routeGym || !routeRope || !routeColorInputEdit || !routeSetDate || !routeGradeInputEdit) {
    return;
  }

  const gymName = normalizeText(routeGym.value);
  const ropeNumber = normalizeText(routeRope.value);
  const color = normalizeText(routeColorInputEdit.value);
  const setDate = routeSetDate.value;
  const grade = normalizeGrade(routeGradeInputEdit.value);

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
});

routeClear?.addEventListener('click', () => {
  resetRouteForm();
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

routeSearchForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!searchGym || !searchRope || !searchColor || !searchSetDate) return;
  const gymName = normalizeText(searchGym.value);
  const ropeNumber = normalizeText(searchRope.value);
  const color = normalizeText(searchColor.value);
  const setDate = searchSetDate.value;
  if (!gymName || !ropeNumber || !color || !setDate) {
    setMessage('Fill in all search fields.');
    return;
  }
  const route = findRoute(gymName, ropeNumber, color, setDate);
  const attempts = route
    ? state.data.attempts.filter((attempt) => attempt.routeId === route.routeId)
    : [];
  renderRouteSearchResult(route, attempts);
});

searchReset?.addEventListener('click', () => {
  routeSearchForm?.reset();
  if (routeSearchResult) routeSearchResult.innerHTML = '';
});

sessionForm?.addEventListener('input', () => {
  renderStats();
});

if (climbDateInput) climbDateInput.value = todayISO();
if (sessionDateInput) sessionDateInput.value = todayISO();

renderAll();
