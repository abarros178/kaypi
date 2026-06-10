'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, CalendarClock, LayoutDashboard, ShieldCheck, Users } from 'lucide-react';
import { cn } from '@kaypi/ui/cn';
import { KaypiMark } from '@/app/_components/kaypi-mark';

const ITEMS = [
  { href: '/admin', label: 'Inicio', Icon: LayoutDashboard },
  { href: '/admin/oficinas', label: 'Oficinas', Icon: Building2 },
  { href: '/admin/jornadas', label: 'Jornadas', Icon: CalendarClock },
  { href: '/admin/politicas', label: 'Políticas', Icon: ShieldCheck },
  { href: '/admin/empleados', label: 'Empleados', Icon: Users },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r bg-card/40 p-4 sm:flex">
      <div className="px-2 pb-4">
        <KaypiMark />
      </div>
      {ITEMS.map(({ href, label, Icon }) => {
        const active = href === '/admin' ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-secondary font-medium text-foreground'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </aside>
  );
}
