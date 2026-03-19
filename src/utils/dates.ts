import dayjs from 'dayjs';

export function nowIso() {
  return new Date().toISOString();
}

export function todayIso() {
  return dayjs().startOf('day').toISOString();
}

export function plusDaysIso(days: number) {
  return dayjs().add(days, 'day').startOf('day').toISOString();
}

export function formatShortDate(value?: string | null) {
  if (!value) {
    return 'n/a';
  }

  return dayjs(value).format('DD MMM');
}

export function formatRelativeStudyDate(value?: string | null) {
  if (!value) {
    return 'Not scheduled';
  }

  const date = dayjs(value).startOf('day');
  const today = dayjs().startOf('day');
  const diff = date.diff(today, 'day');

  if (diff === 0) {
    return 'Today';
  }
  if (diff === 1) {
    return 'In 1 day';
  }
  if (diff > 1) {
    return `In ${diff} days`;
  }
  if (diff === -1) {
    return 'Yesterday';
  }

  return `${Math.abs(diff)} days ago`;
}
