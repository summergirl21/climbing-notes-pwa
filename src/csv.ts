import { createId, isValidGrade, normalizeGrade, normalizeText, toRouteId } from './domain.js';
import { normalizeData } from './models.js';
import type { Attempt, ClimbStyle, CompletionStyle, DataStore, Gym, Route } from './models.js';

export const CSV_COLUMNS = [
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
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

export type CsvImportData = {
  gyms: Gym[];
  routes: Route[];
  attempts: Attempt[];
  skippedRows: number;
};

export type MergeSummary = {
  data: DataStore;
  addedGyms: number;
  updatedGyms: number;
  addedRoutes: number;
  updatedRoutes: number;
  addedAttempts: number;
  updatedAttempts: number;
  skippedAttempts: number;
};

const escapeCsvValue = (value: string) => {
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
};

export const buildCsv = (rows: string[][]) =>
  rows.map((row) => row.map((cell) => escapeCsvValue(cell ?? '')).join(',')).join('\n');

const parseCsvRows = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
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

const pickEarlierTimestamp = (a: string, b: string) => (a < b ? a : b);

const isIncomingNewer = (incoming?: { updatedAt?: string }, existing?: { updatedAt?: string }) => {
  if (!incoming?.updatedAt) return false;
  if (!existing?.updatedAt) return true;
  return incoming.updatedAt > existing.updatedAt;
};

const buildCsvRow = (record: Partial<Record<CsvColumn, string>> & { record_type: string }) =>
  CSV_COLUMNS.map((column) => record[column] ?? '');

export const buildExportRows = (data: DataStore) => {
  const rows: string[][] = [CSV_COLUMNS.slice()];

  data.gyms
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((gym) => {
      rows.push(
        buildCsvRow({
          record_type: 'gym',
          gym_name: gym.name,
          created_at: gym.createdAt ?? '',
          updated_at: gym.updatedAt ?? '',
        })
      );
    });

  data.routes
    .slice()
    .sort((a, b) => {
      if (a.gymName !== b.gymName) return a.gymName.localeCompare(b.gymName);
      if (a.ropeNumber !== b.ropeNumber) return a.ropeNumber.localeCompare(b.ropeNumber);
      return a.setDate.localeCompare(b.setDate);
    })
    .forEach((route) => {
      rows.push(
        buildCsvRow({
          record_type: 'route',
          gym_name: route.gymName,
          route_id: route.routeId,
          rope_number: route.ropeNumber,
          color: route.color,
          set_date: route.setDate,
          grade: route.grade,
          created_at: route.createdAt ?? '',
          updated_at: route.updatedAt ?? '',
        })
      );
    });

  data.attempts
    .slice()
    .sort((a, b) => b.climbDate.localeCompare(a.climbDate))
    .forEach((attempt) => {
      rows.push(
        buildCsvRow({
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
        })
      );
    });

  return rows;
};

export const parseCsvData = (text: string, nowIso: string): CsvImportData => {
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    throw new Error('CSV is empty.');
  }
  const header = rows[0].map((value) => value.trim().toLowerCase().replace(/\s+/g, '_'));
  const headerIndex = new Map<string, number>();
  header.forEach((label, index) => {
    if (label) headerIndex.set(label, index);
  });
  if (!headerIndex.has('record_type')) {
    throw new Error('CSV missing record_type column.');
  }

  const getValue = (row: string[], key: string) => {
    const index = headerIndex.get(key);
    if (index === undefined) return '';
    return row[index] ?? '';
  };

  const gyms: Gym[] = [];
  const routes: Route[] = [];
  const attempts: Attempt[] = [];
  let skippedRows = 0;

  rows.slice(1).forEach((row) => {
    if (row.every((cell) => cell.trim() === '')) return;
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
      const routeId =
        normalizeText(getValue(row, 'route_id')) || toRouteId(gymName, ropeNumber, color, setDate);
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
      const attemptIndex =
        Number.isFinite(attemptIndexValue) && attemptIndexValue > 0 ? attemptIndexValue : 0;
      const climbStyleRaw = normalizeText(getValue(row, 'climb_style')).toLowerCase();
      const completionStyleRaw = normalizeText(getValue(row, 'completion_style')).toLowerCase();
      const climbStyle: ClimbStyle = climbStyleRaw === 'lead' ? 'lead' : 'top_rope';
      const completionStyle: CompletionStyle =
        completionStyleRaw === 'send_clean' ||
        completionStyleRaw === 'send_rested' ||
        completionStyleRaw === 'attempt'
          ? (completionStyleRaw as CompletionStyle)
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

const mergeGyms = (existing: Gym[], incoming: Gym[]) => {
  const map = new Map<string, Gym>();
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

const mergeRoutes = (existing: Route[], incoming: Route[]) => {
  const map = new Map<string, Route>();
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

const mergeAttempts = (existing: Attempt[], incoming: Attempt[]) => {
  const map = new Map<string, Attempt>();
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

const normalizeAttemptIndices = (attempts: Attempt[]) => {
  const grouped = new Map<string, Attempt[]>();
  attempts.forEach((attempt) => {
    const key = `${attempt.routeId}__${attempt.climbDate}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(attempt);
    } else {
      grouped.set(key, [attempt]);
    }
  });

  grouped.forEach((group) => {
    const hasInvalid = group.some((attempt) => !attempt.attemptIndex || attempt.attemptIndex < 1);
    const indexSet = new Set(group.map((attempt) => attempt.attemptIndex));
    const hasDuplicates = indexSet.size !== group.length;
    if (!hasInvalid && !hasDuplicates) return;

    group
      .slice()
      .sort((a, b) => {
        const createdCompare = a.createdAt.localeCompare(b.createdAt);
        if (createdCompare !== 0) return createdCompare;
        return a.attemptId.localeCompare(b.attemptId);
      })
      .forEach((attempt, index) => {
        attempt.attemptIndex = index + 1;
      });
  });
};

export const mergeImportedData = (current: DataStore, imported: CsvImportData): MergeSummary => {
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
