"use strict";
const STORAGE_KEY = 'climbingNotesData';
const DB_NAME = 'climbingNotesDb';
const DB_STORE = 'appData';
const DB_DATA_KEY = 'data';
const THEME_KEY = 'climbingNotesTheme';
const CHART_STYLE_KEY = 'climbingNotesChartStyle';
const createEmptyData = () => ({ version: 1, gyms: [], routes: [], attempts: [] });
const normalizeData = (data) => ({
    version: data.version ?? 1,
    gyms: data.gyms ?? [],
    routes: data.routes ?? [],
    attempts: (data.attempts ?? []).map((attempt) => ({
        ...attempt,
        climbStyle: attempt.climbStyle ?? 'top_rope',
    })),
});
const loadLegacyData = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.gyms)) {
            return null;
        }
        return normalizeData(parsed);
    }
    catch (error) {
        console.warn('Failed to load legacy data', error);
        return null;
    }
};
const openDatabase = () => new Promise((resolve, reject) => {
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
    if (!('storage' in navigator) || !navigator.storage.persist)
        return;
    try {
        const persisted = await navigator.storage.persisted();
        if (!persisted) {
            await navigator.storage.persist();
        }
    }
    catch (error) {
        console.warn('Failed to request persistent storage', error);
    }
};
const loadThemePreference = () => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
    }
    return 'system';
};
const applyThemePreference = (preference) => {
    if (preference === 'system') {
        document.documentElement.removeAttribute('data-theme');
    }
    else {
        document.documentElement.setAttribute('data-theme', preference);
    }
    if (themeSelect && themeSelect.value !== preference) {
        themeSelect.value = preference;
    }
};
const loadChartStyle = () => {
    const stored = localStorage.getItem(CHART_STYLE_KEY);
    if (stored === 'bars' || stored === 'histogram') {
        return stored;
    }
    return 'bars';
};
const statusText = document.getElementById('statusText');
const onlineDot = document.getElementById('onlineDot');
const installButton = document.getElementById('installButton');
const buildInfo = document.getElementById('buildInfo');
const messageBar = document.getElementById('messageBar');
const themeSelect = document.getElementById('themeSelect');
const tabButtons = Array.from(document.querySelectorAll('.tab'));
const tabPanels = Array.from(document.querySelectorAll('.tab-panel'));
const gradeChartStyleSelect = document.getElementById('gradeChartStyle');
const exportCsvButton = document.getElementById('exportCsvButton');
const importCsvButton = document.getElementById('importCsvButton');
const importCsvInput = document.getElementById('importCsvInput');
const importCsvStatus = document.getElementById('importCsvStatus');
const attemptForm = document.getElementById('attemptForm');
const attemptGym = document.getElementById('attemptGym');
const routePicker = document.getElementById('routePicker');
const ropeNumberInput = document.getElementById('ropeNumber');
const routeColorInput = document.getElementById('routeColor');
const setDateInput = document.getElementById('setDate');
const routeGradeInput = document.getElementById('routeGrade');
const climbDateInput = document.getElementById('climbDate');
const climbStyleSelect = document.getElementById('climbStyle');
const completionStyleSelect = document.getElementById('completionStyle');
const attemptNotesInput = document.getElementById('attemptNotes');
const attemptReset = document.getElementById('attemptReset');
const attemptList = document.getElementById('attemptList');
const sessionForm = document.getElementById('sessionForm');
const sessionDateInput = document.getElementById('sessionDate');
const sessionGym = document.getElementById('sessionGym');
const statTotal = document.getElementById('statTotal');
const statMax = document.getElementById('statMax');
const gradeDistribution = document.getElementById('gradeDistribution');
const routeHubForm = document.getElementById('routeHubForm');
const routeHubGym = document.getElementById('routeHubGym');
const routeHubRope = document.getElementById('routeHubRope');
const routeHubColor = document.getElementById('routeHubColor');
const routeHubSetDate = document.getElementById('routeHubSetDate');
const routeHubGrade = document.getElementById('routeHubGrade');
const routeSearchButton = document.getElementById('routeSearch');
const routeSaveButton = document.getElementById('routeSave');
const routeSearchResult = document.getElementById('routeSearchResult');
const routeList = document.getElementById('routeList');
const gymForm = document.getElementById('gymForm');
const gymNameInput = document.getElementById('gymName');
const gymClear = document.getElementById('gymClear');
const gymList = document.getElementById('gymList');
const updateConnectionStatus = () => {
    if (!statusText || !onlineDot)
        return;
    const online = navigator.onLine;
    statusText.textContent = online ? 'You are online' : 'Offline, cached copy';
    onlineDot.style.background = online ? '#22c55e' : '#f59e0b';
    onlineDot.style.boxShadow = online
        ? '0 0 0 6px rgba(34, 197, 94, 0.12)'
        : '0 0 0 6px rgba(245, 158, 11, 0.18)';
};
const updateBuildInfo = () => {
    if (!buildInfo)
        return;
    const appVersion = '0.1.0';
    const modified = document.lastModified ? new Date(document.lastModified) : null;
    const builtOn = modified && !Number.isNaN(modified.getTime()) ? modified.toLocaleString() : 'unknown';
    buildInfo.textContent = `Version ${appVersion} | Built ${builtOn}`;
};
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
updateConnectionStatus();
updateBuildInfo();
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch((err) => {
            console.error('Service worker registration failed:', err);
        });
    });
}
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installButton)
        installButton.hidden = false;
});
installButton?.addEventListener('click', async () => {
    if (!deferredPrompt)
        return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted' && installButton) {
        installButton.textContent = 'Ready to install';
    }
    deferredPrompt = null;
    installButton.hidden = true;
});
const setActiveTab = (tabId) => {
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
        if (!tabId)
            return;
        setActiveTab(tabId);
    });
});
const initialTheme = loadThemePreference();
applyThemePreference(initialTheme);
themeSelect?.addEventListener('change', () => {
    const preference = themeSelect.value;
    localStorage.setItem(THEME_KEY, preference);
    applyThemePreference(preference);
});
const initialChartStyle = loadChartStyle();
if (gradeChartStyleSelect) {
    gradeChartStyleSelect.value = initialChartStyle;
}
gradeChartStyleSelect?.addEventListener('change', () => {
    const style = gradeChartStyleSelect.value;
    localStorage.setItem(CHART_STYLE_KEY, style);
    renderStats();
});
const saveData = async (data) => {
    const normalized = normalizeData(data);
    if (!('indexedDB' in window)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        return;
    }
    let db = null;
    try {
        db = await openDatabase();
        await new Promise((resolve, reject) => {
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
    }
    catch (error) {
        console.error('Failed to save data', error);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        }
        catch (fallbackError) {
            console.error('Failed to save fallback data', fallbackError);
        }
    }
    finally {
        db?.close();
    }
};
const readData = async () => {
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
                const record = request.result;
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
    }
    catch (error) {
        console.error('Failed to open database', error);
        return loadLegacyData() ?? createEmptyData();
    }
};
const state = {
    data: createEmptyData(),
    editingGymName: '',
    editingRouteId: '',
    editingAttemptId: '',
};
let sessionDatePinned = false;
let messageTimeout = null;
const setMessage = (text) => {
    if (!messageBar)
        return;
    messageBar.textContent = text;
    if (messageTimeout) {
        window.clearTimeout(messageTimeout);
    }
    if (text) {
        messageTimeout = window.setTimeout(() => {
            if (messageBar)
                messageBar.textContent = '';
        }, 4000);
    }
};
const setImportStatus = (text) => {
    if (!importCsvStatus)
        return;
    importCsvStatus.textContent = text;
};
const normalizeText = (value) => value.trim();
const normalizeGrade = (value) => value.trim().toLowerCase();
const todayISO = () => new Date().toISOString().slice(0, 10);
const mostRecentSessionDate = () => {
    if (state.data.attempts.length === 0)
        return todayISO();
    return state.data.attempts.reduce((latest, attempt) => {
        if (!latest || attempt.climbDate > latest)
            return attempt.climbDate;
        return latest;
    }, '');
};
const createId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};
const toRouteId = (gymName, ropeNumber, color, setDate) => `${gymName}:${ropeNumber}:${color}:${setDate}`;
const isValidGrade = (grade) => /^5\.(\d+)([abcd])?$/.test(normalizeGrade(grade));
const gradeToValue = (grade) => {
    const trimmed = grade.trim().toLowerCase();
    const match = /^5\.(\d+)([abcd])?$/.exec(trimmed);
    if (!match)
        return null;
    const minor = Number(match[1]);
    const letter = match[2] ?? 'a';
    const letterValue = { a: 0, b: 1, c: 2, d: 3 }[letter] ?? 0;
    return minor * 4 + letterValue;
};
const compareGrades = (a, b) => {
    const aValue = gradeToValue(a);
    const bValue = gradeToValue(b);
    if (aValue === null || bValue === null)
        return 0;
    return aValue - bValue;
};
const CSV_COLUMNS = [
    'record_type',
    'gym_name',
    'route_id',
    'attempt_id',
    'rope_number',
    'color',
    'set_date',
    'grade',
    'climb_date',
    'attempt_index',
    'climb_style',
    'completion_style',
    'notes',
    'created_at',
    'updated_at',
];
const escapeCsvValue = (value) => {
    const needsQuotes = /[",\n\r]/.test(value);
    const escaped = value.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
};
const buildCsv = (rows) => rows.map((row) => row.map((cell) => escapeCsvValue(cell ?? '')).join(',')).join('\n');
const parseCsvRows = (text) => {
    const rows = [];
    let row = [];
    let current = '';
    let inQuotes = false;
    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (char === '"') {
            if (inQuotes && text[index + 1] === '"') {
                current += '"';
                index += 1;
            }
            else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (char === ',' && !inQuotes) {
            row.push(current);
            current = '';
            continue;
        }
        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && text[index + 1] === '\n') {
                index += 1;
            }
            row.push(current);
            rows.push(row);
            row = [];
            current = '';
            continue;
        }
        current += char;
    }
    if (current.length > 0 || row.length > 0) {
        row.push(current);
        rows.push(row);
    }
    if (rows.length > 0 && rows[0][0]) {
        rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
    }
    return rows.filter((csvRow) => csvRow.some((cell) => cell.length > 0));
};
const pickEarlierTimestamp = (a, b) => (a < b ? a : b);
const isIncomingNewer = (incoming, existing) => {
    if (!incoming?.updatedAt)
        return false;
    if (!existing?.updatedAt)
        return true;
    return incoming.updatedAt > existing.updatedAt;
};
const buildCsvRow = (record) => CSV_COLUMNS.map((column) => record[column] ?? '');
const buildExportRows = (data) => {
    const rows = [CSV_COLUMNS.slice()];
    data.gyms
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((gym) => {
        rows.push(buildCsvRow({
            record_type: 'gym',
            gym_name: gym.name,
            created_at: gym.createdAt ?? '',
            updated_at: gym.updatedAt ?? '',
        }));
    });
    data.routes
        .slice()
        .sort((a, b) => {
        if (a.gymName !== b.gymName)
            return a.gymName.localeCompare(b.gymName);
        if (a.ropeNumber !== b.ropeNumber)
            return a.ropeNumber.localeCompare(b.ropeNumber);
        return a.setDate.localeCompare(b.setDate);
    })
        .forEach((route) => {
        rows.push(buildCsvRow({
            record_type: 'route',
            gym_name: route.gymName,
            route_id: route.routeId,
            rope_number: route.ropeNumber,
            color: route.color,
            set_date: route.setDate,
            grade: route.grade,
            created_at: route.createdAt ?? '',
            updated_at: route.updatedAt ?? '',
        }));
    });
    data.attempts
        .slice()
        .sort((a, b) => b.climbDate.localeCompare(a.climbDate))
        .forEach((attempt) => {
        rows.push(buildCsvRow({
            record_type: 'attempt',
            route_id: attempt.routeId,
            attempt_id: attempt.attemptId,
            climb_date: attempt.climbDate,
            attempt_index: String(attempt.attemptIndex),
            climb_style: attempt.climbStyle,
            completion_style: attempt.completionStyle,
            notes: attempt.notes ?? '',
            created_at: attempt.createdAt ?? '',
            updated_at: attempt.updatedAt ?? '',
        }));
    });
    return rows;
};
const parseCsvData = (text, nowIso) => {
    const rows = parseCsvRows(text);
    if (rows.length === 0) {
        throw new Error('CSV is empty.');
    }
    const header = rows[0].map((value) => value.trim().toLowerCase().replace(/\s+/g, '_'));
    const headerIndex = new Map();
    header.forEach((label, index) => {
        if (label)
            headerIndex.set(label, index);
    });
    if (!headerIndex.has('record_type')) {
        throw new Error('CSV missing record_type column.');
    }
    const getValue = (row, key) => {
        const index = headerIndex.get(key);
        if (index === undefined)
            return '';
        return row[index] ?? '';
    };
    const gyms = [];
    const routes = [];
    const attempts = [];
    let skippedRows = 0;
    rows.slice(1).forEach((row) => {
        if (row.every((cell) => cell.trim() === ''))
            return;
        const recordType = normalizeText(getValue(row, 'record_type')).toLowerCase();
        if (!recordType) {
            skippedRows += 1;
            return;
        }
        if (recordType === 'gym') {
            const name = normalizeText(getValue(row, 'gym_name'));
            if (!name) {
                skippedRows += 1;
                return;
            }
            const createdAt = normalizeText(getValue(row, 'created_at')) || nowIso;
            const updatedAt = normalizeText(getValue(row, 'updated_at')) || undefined;
            gyms.push({ name, createdAt, updatedAt });
            return;
        }
        if (recordType === 'route') {
            const gymName = normalizeText(getValue(row, 'gym_name'));
            const ropeNumber = normalizeText(getValue(row, 'rope_number'));
            const color = normalizeText(getValue(row, 'color'));
            const setDate = normalizeText(getValue(row, 'set_date'));
            const gradeRaw = normalizeText(getValue(row, 'grade'));
            if (!gymName || !ropeNumber || !color || !setDate || !gradeRaw) {
                skippedRows += 1;
                return;
            }
            const grade = normalizeGrade(gradeRaw);
            if (!isValidGrade(grade)) {
                skippedRows += 1;
                return;
            }
            const routeId = normalizeText(getValue(row, 'route_id')) || toRouteId(gymName, ropeNumber, color, setDate);
            const createdAt = normalizeText(getValue(row, 'created_at')) || nowIso;
            const updatedAt = normalizeText(getValue(row, 'updated_at')) || undefined;
            routes.push({ routeId, gymName, ropeNumber, color, setDate, grade, createdAt, updatedAt });
            return;
        }
        if (recordType === 'attempt') {
            const routeId = normalizeText(getValue(row, 'route_id'));
            const climbDate = normalizeText(getValue(row, 'climb_date'));
            if (!routeId || !climbDate) {
                skippedRows += 1;
                return;
            }
            const attemptId = normalizeText(getValue(row, 'attempt_id')) || createId();
            const attemptIndexValue = Number.parseInt(getValue(row, 'attempt_index'), 10);
            const attemptIndex = Number.isFinite(attemptIndexValue) && attemptIndexValue > 0 ? attemptIndexValue : 0;
            const climbStyleRaw = normalizeText(getValue(row, 'climb_style')).toLowerCase();
            const completionStyleRaw = normalizeText(getValue(row, 'completion_style')).toLowerCase();
            const climbStyle = climbStyleRaw === 'lead' ? 'lead' : 'top_rope';
            const completionStyle = completionStyleRaw === 'send_clean' ||
                completionStyleRaw === 'send_rested' ||
                completionStyleRaw === 'attempt'
                ? completionStyleRaw
                : 'attempt';
            const notes = getValue(row, 'notes') ?? '';
            const createdAt = normalizeText(getValue(row, 'created_at')) || nowIso;
            const updatedAt = normalizeText(getValue(row, 'updated_at')) || undefined;
            attempts.push({
                attemptId,
                routeId,
                climbDate,
                attemptIndex,
                climbStyle,
                completionStyle,
                notes,
                createdAt,
                updatedAt,
            });
            return;
        }
        skippedRows += 1;
    });
    return { gyms, routes, attempts, skippedRows };
};
const mergeGyms = (existing, incoming) => {
    const map = new Map();
    existing.forEach((gym) => {
        map.set(gym.name.toLowerCase(), gym);
    });
    let added = 0;
    let updated = 0;
    incoming.forEach((gym) => {
        const key = gym.name.toLowerCase();
        const current = map.get(key);
        if (!current) {
            map.set(key, gym);
            added += 1;
            return;
        }
        if (isIncomingNewer(gym, current)) {
            map.set(key, {
                ...current,
                ...gym,
                name: current.name,
                createdAt: pickEarlierTimestamp(current.createdAt, gym.createdAt),
            });
            updated += 1;
        }
    });
    return { gyms: Array.from(map.values()), added, updated };
};
const mergeRoutes = (existing, incoming) => {
    const map = new Map();
    existing.forEach((route) => {
        map.set(route.routeId, route);
    });
    let added = 0;
    let updated = 0;
    incoming.forEach((route) => {
        const current = map.get(route.routeId);
        if (!current) {
            map.set(route.routeId, route);
            added += 1;
            return;
        }
        if (isIncomingNewer(route, current)) {
            map.set(route.routeId, {
                ...current,
                ...route,
                routeId: current.routeId,
                createdAt: pickEarlierTimestamp(current.createdAt, route.createdAt),
            });
            updated += 1;
        }
    });
    return { routes: Array.from(map.values()), added, updated };
};
const mergeAttempts = (existing, incoming) => {
    const map = new Map();
    existing.forEach((attempt) => {
        map.set(attempt.attemptId, attempt);
    });
    let added = 0;
    let updated = 0;
    incoming.forEach((attempt) => {
        const current = map.get(attempt.attemptId);
        if (!current) {
            map.set(attempt.attemptId, attempt);
            added += 1;
            return;
        }
        if (isIncomingNewer(attempt, current)) {
            map.set(attempt.attemptId, {
                ...current,
                ...attempt,
                attemptId: current.attemptId,
                createdAt: pickEarlierTimestamp(current.createdAt, attempt.createdAt),
            });
            updated += 1;
        }
    });
    return { attempts: Array.from(map.values()), added, updated };
};
const normalizeAttemptIndices = (attempts) => {
    const grouped = new Map();
    attempts.forEach((attempt) => {
        const key = `${attempt.routeId}__${attempt.climbDate}`;
        const existing = grouped.get(key);
        if (existing) {
            existing.push(attempt);
        }
        else {
            grouped.set(key, [attempt]);
        }
    });
    grouped.forEach((group) => {
        const hasInvalid = group.some((attempt) => !attempt.attemptIndex || attempt.attemptIndex < 1);
        const indexSet = new Set(group.map((attempt) => attempt.attemptIndex));
        const hasDuplicates = indexSet.size !== group.length;
        if (!hasInvalid && !hasDuplicates)
            return;
        group
            .slice()
            .sort((a, b) => {
            const createdCompare = a.createdAt.localeCompare(b.createdAt);
            if (createdCompare !== 0)
                return createdCompare;
            return a.attemptId.localeCompare(b.attemptId);
        })
            .forEach((attempt, index) => {
            attempt.attemptIndex = index + 1;
        });
    });
};
const mergeImportedData = (current, imported) => {
    const nowIso = new Date().toISOString();
    const gymsToMerge = imported.gyms.slice();
    const gymKeys = new Set(gymsToMerge.map((gym) => gym.name.toLowerCase()));
    imported.routes.forEach((route) => {
        const key = route.gymName.toLowerCase();
        if (!gymKeys.has(key)) {
            gymsToMerge.push({ name: route.gymName, createdAt: route.createdAt ?? nowIso });
            gymKeys.add(key);
        }
    });
    const gymMerge = mergeGyms(current.gyms, gymsToMerge);
    const routeMerge = mergeRoutes(current.routes, imported.routes);
    const routeIds = new Set(routeMerge.routes.map((route) => route.routeId));
    const attemptsToMerge = imported.attempts.filter((attempt) => routeIds.has(attempt.routeId));
    const skippedAttempts = imported.attempts.length - attemptsToMerge.length;
    const attemptMerge = mergeAttempts(current.attempts, attemptsToMerge);
    normalizeAttemptIndices(attemptMerge.attempts);
    return {
        data: normalizeData({
            version: current.version ?? 1,
            gyms: gymMerge.gyms,
            routes: routeMerge.routes,
            attempts: attemptMerge.attempts,
        }),
        addedGyms: gymMerge.added,
        updatedGyms: gymMerge.updated,
        addedRoutes: routeMerge.added,
        updatedRoutes: routeMerge.updated,
        addedAttempts: attemptMerge.added,
        updatedAttempts: attemptMerge.updated,
        skippedAttempts,
    };
};
const setFormDisabled = (form, disabled) => {
    if (!form)
        return;
    form.querySelectorAll('input, select, textarea, button').forEach((element) => {
        element.toggleAttribute('disabled', disabled);
    });
};
const updateSelectOptions = (select, options, config) => {
    if (!select)
        return;
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
    if (!routePicker || !attemptGym)
        return;
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
const findRouteById = (routeId) => state.data.routes.find((route) => route.routeId === routeId) ?? null;
const findRoute = (gymName, ropeNumber, color, setDate) => {
    const routeId = toRouteId(gymName, ropeNumber, color, setDate);
    return findRouteById(routeId);
};
const upsertRoute = (payload) => {
    const routeId = toRouteId(payload.gymName, payload.ropeNumber, payload.color, payload.setDate);
    const existing = findRouteById(routeId);
    if (existing) {
        if (existing.grade !== payload.grade) {
            existing.grade = payload.grade;
            existing.updatedAt = new Date().toISOString();
        }
        return existing;
    }
    const route = {
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
    if (!attemptForm ||
        !climbDateInput ||
        !climbStyleSelect ||
        !completionStyleSelect ||
        !attemptNotesInput) {
        return;
    }
    attemptNotesInput.value = '';
    climbStyleSelect.value = 'top_rope';
    completionStyleSelect.value = 'send_clean';
    climbDateInput.value = climbDateInput.value || todayISO();
    state.editingAttemptId = null;
    const submitButton = attemptForm.querySelector('button[type="submit"]');
    if (submitButton)
        submitButton.textContent = 'Save attempt';
};
const resetRouteForm = () => {
    if (!routeHubForm)
        return;
    routeHubForm.reset();
    state.editingRouteId = null;
    if (routeSaveButton)
        routeSaveButton.textContent = 'Add route';
};
const resetGymForm = () => {
    if (!gymForm)
        return;
    gymForm.reset();
    state.editingGymName = null;
    const submitButton = gymForm.querySelector('button[type="submit"]');
    if (submitButton)
        submitButton.textContent = 'Save gym';
};
const renderGyms = () => {
    if (!gymList)
        return;
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
        const card = document.createElement('details');
        card.className = 'list-item compact-card';
        const summary = document.createElement('summary');
        summary.className = 'compact-summary';
        const textWrap = document.createElement('div');
        textWrap.className = 'compact-text';
        const title = document.createElement('div');
        title.className = 'compact-title';
        title.textContent = gym.name;
        const meta = document.createElement('div');
        meta.className = 'compact-meta';
        meta.textContent = `${routesCount} routes, ${attemptsCount} attempts`;
        const chevron = document.createElement('span');
        chevron.className = 'compact-chevron';
        chevron.textContent = '›';
        chevron.setAttribute('aria-hidden', 'true');
        textWrap.append(title, meta);
        summary.append(textWrap, chevron);
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'ghost';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => {
            if (!gymNameInput)
                return;
            gymNameInput.value = gym.name;
            state.editingGymName = gym.name;
            const submitButton = gymForm?.querySelector('button[type="submit"]');
            if (submitButton)
                submitButton.textContent = 'Update gym';
        });
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'ghost';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
            const confirmDelete = window.confirm(`Delete ${gym.name}? This removes routes and attempts for this gym.`);
            if (!confirmDelete)
                return;
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
        const actions = document.createElement('div');
        actions.className = 'actions';
        actions.append(editButton, deleteButton);
        const details = document.createElement('div');
        details.className = 'compact-details';
        details.append(actions);
        card.append(summary, details);
        gymList.appendChild(card);
    });
};
const renderRoutes = () => {
    if (!routeList)
        return;
    routeList.innerHTML = '';
    if (state.data.routes.length === 0) {
        routeList.innerHTML = '<div class="empty">No routes yet. Add a route or log an attempt.</div>';
        return;
    }
    state.data.routes
        .slice()
        .sort((a, b) => {
        if (a.gymName !== b.gymName)
            return a.gymName.localeCompare(b.gymName);
        if (a.ropeNumber !== b.ropeNumber)
            return a.ropeNumber.localeCompare(b.ropeNumber);
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
            if (routeSaveButton)
                routeSaveButton.textContent = 'Update route';
        });
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'ghost';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
            const confirmDelete = window.confirm(`Delete rope ${route.ropeNumber} (${route.color})? This removes all attempts.`);
            if (!confirmDelete)
                return;
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
    if (!attemptList)
        return;
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
        if (!route)
            return;
        const completionLabel = attempt.completionStyle === 'send_clean'
            ? 'Send (no rest)'
            : attempt.completionStyle === 'send_rested'
                ? 'Send (rested)'
                : 'Attempt only';
        const climbStyleLabel = attempt.climbStyle === 'lead' ? 'Lead' : 'Top rope';
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
        meta.textContent = `${attempt.climbDate} · ${route.grade} · ${climbStyleLabel} · Attempt ${attempt.attemptIndex} · ${completionLabel}`;
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
            if (!attemptGym ||
                !ropeNumberInput ||
                !routeColorInput ||
                !setDateInput ||
                !routeGradeInput ||
                !climbDateInput ||
                !climbStyleSelect ||
                !completionStyleSelect ||
                !attemptNotesInput) {
                return;
            }
            attemptGym.value = route.gymName;
            updateRoutePicker();
            ropeNumberInput.value = route.ropeNumber;
            routeColorInput.value = route.color;
            setDateInput.value = route.setDate;
            routeGradeInput.value = route.grade;
            climbDateInput.value = attempt.climbDate;
            climbStyleSelect.value = attempt.climbStyle ?? 'top_rope';
            completionStyleSelect.value = attempt.completionStyle;
            attemptNotesInput.value = attempt.notes;
            state.editingAttemptId = attempt.attemptId;
            if (routePicker)
                routePicker.value = route.routeId;
            const submitButton = attemptForm?.querySelector('button[type="submit"]');
            if (submitButton)
                submitButton.textContent = 'Update attempt';
        });
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'ghost';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
            const confirmDelete = window.confirm('Delete this attempt?');
            if (!confirmDelete)
                return;
            state.data.attempts = state.data.attempts.filter((item) => item.attemptId !== attempt.attemptId);
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
    if (!sessionDateInput || sessionDatePinned)
        return;
    sessionDateInput.value = mostRecentSessionDate();
};
const renderStats = () => {
    if (!sessionDateInput || !statTotal || !statMax || !gradeDistribution)
        return;
    const sessionDate = sessionDateInput.value || todayISO();
    const gymFilter = sessionGym?.value ?? '';
    const attempts = state.data.attempts.filter((attempt) => {
        if (attempt.climbDate !== sessionDate)
            return false;
        const route = findRouteById(attempt.routeId);
        if (!route)
            return false;
        if (gymFilter && route.gymName !== gymFilter)
            return false;
        return true;
    });
    statTotal.textContent = String(attempts.length);
    const gradeCounts = new Map();
    let maxGrade = null;
    attempts.forEach((attempt) => {
        const route = findRouteById(attempt.routeId);
        if (!route)
            return;
        gradeCounts.set(route.grade, (gradeCounts.get(route.grade) ?? 0) + 1);
        if (!maxGrade || compareGrades(route.grade, maxGrade) > 0) {
            maxGrade = route.grade;
        }
    });
    statMax.textContent = maxGrade ?? '-';
    gradeDistribution.innerHTML = '';
    const chartStyle = gradeChartStyleSelect?.value ?? loadChartStyle();
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
const renderRouteSearchResult = (routes) => {
    if (!routeSearchResult)
        return;
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
        if (a.gymName !== b.gymName)
            return a.gymName.localeCompare(b.gymName);
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
        }
        else {
            attempts.forEach((attempt) => {
                const completionLabel = attempt.completionStyle === 'send_clean'
                    ? 'Send (no rest)'
                    : attempt.completionStyle === 'send_rested'
                        ? 'Send (rested)'
                        : 'Attempt only';
                const climbStyleLabel = attempt.climbStyle === 'lead' ? 'Lead' : 'Top rope';
                const line = document.createElement('div');
                line.className = 'meta';
                line.textContent = `${attempt.climbDate} · ${climbStyleLabel} · Attempt ${attempt.attemptIndex} · ${completionLabel}`;
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
exportCsvButton?.addEventListener('click', () => {
    const rows = buildExportRows(state.data);
    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `climbing-notes-${todayISO()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage('CSV export downloaded.');
});
importCsvButton?.addEventListener('click', () => {
    importCsvInput?.click();
});
importCsvInput?.addEventListener('change', async () => {
    const input = importCsvInput;
    if (!input)
        return;
    const file = input.files?.[0];
    if (!file)
        return;
    try {
        const text = await file.text();
        const parsed = parseCsvData(text, new Date().toISOString());
        const totalRows = parsed.gyms.length + parsed.routes.length + parsed.attempts.length;
        if (totalRows === 0) {
            setMessage('No valid rows found to import.');
            setImportStatus('No valid rows found in the CSV file.');
            return;
        }
        const confirmImport = window.confirm(`Import ${parsed.gyms.length} gyms, ${parsed.routes.length} routes, and ${parsed.attempts.length} attempts? This will merge with existing data.`);
        if (!confirmImport) {
            setImportStatus('Import canceled.');
            return;
        }
        const merged = mergeImportedData(state.data, parsed);
        state.data = merged.data;
        await saveData(state.data);
        renderAll();
        const updatedTotal = merged.updatedGyms + merged.updatedRoutes + merged.updatedAttempts;
        const skippedTotal = parsed.skippedRows + merged.skippedAttempts;
        const status = `Imported ${merged.addedGyms} gyms, ${merged.addedRoutes} routes, ${merged.addedAttempts} attempts. Updated ${updatedTotal}. Skipped ${skippedTotal}.`;
        setImportStatus(status);
        setMessage('CSV import complete.');
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'CSV import failed.';
        setImportStatus(message);
        setMessage(message);
    }
    finally {
        input.value = '';
    }
});
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
        if (routePicker)
            routePicker.value = '';
    });
});
attemptForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!attemptGym ||
        !ropeNumberInput ||
        !routeColorInput ||
        !setDateInput ||
        !routeGradeInput ||
        !climbDateInput ||
        !climbStyleSelect ||
        !completionStyleSelect ||
        !attemptNotesInput) {
        return;
    }
    const gymName = normalizeText(attemptGym.value);
    const ropeNumber = normalizeText(ropeNumberInput.value);
    const color = normalizeText(routeColorInput.value);
    const setDate = setDateInput.value;
    const grade = normalizeGrade(routeGradeInput.value);
    const climbDate = climbDateInput.value || todayISO();
    const climbStyle = climbStyleSelect.value;
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
        }
        else {
            const originalRouteId = attempt.routeId;
            const originalDate = attempt.climbDate;
            attempt.routeId = route.routeId;
            attempt.climbDate = climbDate;
            attempt.climbStyle = climbStyle;
            attempt.completionStyle = completionStyleSelect.value;
            attempt.notes = normalizeText(attemptNotesInput.value);
            attempt.updatedAt = new Date().toISOString();
            if (originalRouteId !== route.routeId || originalDate !== climbDate) {
                const existingAttempts = state.data.attempts.filter((item) => item.attemptId !== attempt.attemptId &&
                    item.routeId === route.routeId &&
                    item.climbDate === climbDate);
                attempt.attemptIndex = existingAttempts.length + 1;
            }
            saveData(state.data);
            renderAll();
            setMessage('Attempt updated.');
            resetAttemptForm();
            return;
        }
    }
    const attemptIndex = state.data.attempts.filter((attempt) => attempt.routeId === route.routeId && attempt.climbDate === climbDate).length + 1;
    const attempt = {
        attemptId: createId(),
        routeId: route.routeId,
        climbDate,
        attemptIndex,
        climbStyle,
        completionStyle: completionStyleSelect.value,
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
    if (!routeHubGym || !routeHubRope || !routeHubColor || !routeHubSetDate || !routeHubGrade)
        return;
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
        }
        else if (existing && existing.routeId !== route.routeId) {
            setMessage('That route already exists for this gym.');
            return;
        }
        else {
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
                    if (attempt.routeId === oldRouteId)
                        attempt.routeId = newRouteId;
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
    if (!routeHubGym || !routeHubRope || !routeHubColor || !routeHubSetDate)
        return;
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
        if (route.gymName !== gymName)
            return false;
        if (ropeQuery && route.ropeNumber.toLowerCase() !== ropeQuery)
            return false;
        if (colorQuery && route.color.toLowerCase() !== colorQuery)
            return false;
        if (setDateQuery && route.setDate !== setDateQuery)
            return false;
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
    if (!gymNameInput)
        return;
    const gymName = normalizeText(gymNameInput.value);
    if (!gymName) {
        setMessage('Gym name is required.');
        return;
    }
    const existingGym = state.data.gyms.find((gym) => gym.name.toLowerCase() === gymName.toLowerCase());
    if (state.editingGymName) {
        const currentName = state.editingGymName;
        const gym = state.data.gyms.find((item) => item.name === currentName);
        if (!gym) {
            state.editingGymName = null;
        }
        else {
            if (existingGym && existingGym.name !== currentName) {
                setMessage('Another gym already uses that name.');
                return;
            }
            const routeConflicts = state.data.routes.some((route) => {
                if (route.gymName !== currentName)
                    return false;
                const newRouteId = toRouteId(gymName, route.ropeNumber, route.color, route.setDate);
                return state.data.routes.some((other) => other.gymName === gymName && other.routeId === newRouteId);
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
                    if (attempt.routeId === oldRouteId)
                        attempt.routeId = route.routeId;
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
if (climbDateInput)
    climbDateInput.value = todayISO();
if (sessionDateInput)
    sessionDateInput.value = todayISO();
const initApp = async () => {
    await requestPersistentStorage();
    state.data = await readData();
    sessionDatePinned = false;
    renderAll();
};
void initApp();
