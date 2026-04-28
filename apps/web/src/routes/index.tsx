import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/lib/auth-store';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (!user) throw redirect({ to: '/login' });
    throw redirect({ to: user.role === 'admin' ? '/admin' : '/app' });
  },
});
