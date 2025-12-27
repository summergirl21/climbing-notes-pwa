import { describe, expect, it } from 'vitest';
import { buildCsv, buildExportRows, mergeImportedData, parseCsvData } from '../src/csv.js';
import { createEmptyData } from '../src/models.js';

describe('csv helpers', () => {
  it('round-trips exported CSV rows', () => {
    const data = createEmptyData();
    const gym = { name: 'Movement', createdAt: '2024-01-01T00:00:00.000Z' };
    const route = {
      routeId: 'Movement:1:Red:2024-01-01',
      gymName: 'Movement',
      ropeNumber: '1',
      color: 'Red',
      setDate: '2024-01-01',
      grade: '5.10a',
      createdAt: '2024-01-02T00:00:00.000Z',
    };
    const attempt = {
      attemptId: 'attempt-1',
      routeId: route.routeId,
      climbDate: '2024-01-03',
      attemptIndex: 1,
      climbStyle: 'lead' as const,
      completionStyle: 'send_clean' as const,
      notes: 'Felt solid.',
      createdAt: '2024-01-03T12:00:00.000Z',
    };
    data.gyms.push(gym);
    data.routes.push(route);
    data.attempts.push(attempt);

    const rows = buildExportRows(data);
    const csv = buildCsv(rows);
    const parsed = parseCsvData(csv, '2024-02-01T00:00:00.000Z');

    expect(parsed.gyms).toHaveLength(1);
    expect(parsed.routes).toHaveLength(1);
    expect(parsed.attempts).toHaveLength(1);
    expect(parsed.routes[0]?.routeId).toBe(route.routeId);
    expect(parsed.attempts[0]?.climbStyle).toBe('lead');
    expect(parsed.attempts[0]?.completionStyle).toBe('send_clean');
  });

  it('merges newer rows and adds implied gyms', () => {
    const current = createEmptyData();
    current.gyms.push({
      name: 'Base',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    });
    current.routes.push({
      routeId: 'Base:1:Blue:2024-01-01',
      gymName: 'Base',
      ropeNumber: '1',
      color: 'Blue',
      setDate: '2024-01-01',
      grade: '5.9',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    });

    const merged = mergeImportedData(current, {
      gyms: [],
      routes: [
        {
          routeId: 'Base:1:Blue:2024-01-01',
          gymName: 'Base',
          ropeNumber: '1',
          color: 'Blue',
          setDate: '2024-01-01',
          grade: '5.10a',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-02-01T00:00:00.000Z',
        },
        {
          routeId: 'NewGym:2:Green:2024-01-05',
          gymName: 'NewGym',
          ropeNumber: '2',
          color: 'Green',
          setDate: '2024-01-05',
          grade: '5.8',
          createdAt: '2024-01-05T00:00:00.000Z',
          updatedAt: '2024-01-06T00:00:00.000Z',
        },
      ],
      attempts: [],
      skippedRows: 0,
    });

    const updatedRoute = merged.data.routes.find(
      (route) => route.routeId === 'Base:1:Blue:2024-01-01'
    );
    expect(updatedRoute?.grade).toBe('5.10a');
    expect(merged.data.gyms.some((gym) => gym.name === 'NewGym')).toBe(true);
  });
});
