import { initializeWebStore } from '@/db/web-store';

export async function initializeDatabase() {
  initializeWebStore();
}
