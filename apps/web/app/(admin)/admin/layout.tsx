import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/current-user';
import { AdminHeader } from './_components/admin-header';
import { AdminNav } from './_components/admin-nav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');
  // Solo ADMIN y MANAGER administran; un EMPLEADO vuelve al inicio.
  if (user.rol === 'EMPLEADO') redirect('/');

  return (
    <div className="flex min-h-dvh">
      <AdminNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader user={user} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
