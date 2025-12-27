export const normalizeText = (value: string) => value.trim();

export const normalizeGrade = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';
  if (trimmed.startsWith('5.')) return trimmed;
  if (/^\d+([abcd]|[+-])?$/.test(trimmed)) {
    return `5.${trimmed}`;
  }
  return trimmed;
};

export const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export const toRouteId = (gymName: string, ropeNumber: string, color: string, setDate: string) =>
  `${gymName}:${ropeNumber}:${color}:${setDate}`;

export const isValidGrade = (grade: string) =>
  /^5\.(\d+)([abcd]|[+-])?$/.test(normalizeGrade(grade));
