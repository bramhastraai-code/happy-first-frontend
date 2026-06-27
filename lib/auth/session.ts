import { authAPI } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import { clearRefreshQueue } from '@/lib/auth/tokenManager';

export async function performLogout() {
  clearRefreshQueue();
  try {
    await authAPI.logout();
  } catch {
    // Clear local session even if the server call fails.
  }
  useAuthStore.getState().logout();
}
