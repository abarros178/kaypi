import { LogOut } from 'lucide-react';
import { Avatar, Badge, buttonVariants } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { logoutAction } from '@/lib/auth/actions';
import type { CurrentUser } from '@/lib/auth/current-user';

export function AdminHeader({ user }: { user: CurrentUser }) {
  return (
    <header className="flex items-center justify-end gap-3 border-b px-6 py-3">
      <Avatar nombre={user.nombre} />
      <div className="text-sm leading-tight">
        <div className="font-medium">{user.nombre}</div>
        <Badge variant="outline" className="mt-0.5">
          {user.rol}
        </Badge>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </header>
  );
}
