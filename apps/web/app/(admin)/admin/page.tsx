import Link from 'next/link';
import { Building2, ClipboardCheck, Users } from 'lucide-react';
import { checkInEvent, db, empleado, oficina } from '@kaypi/db';
import { Card, CardContent } from '@kaypi/ui';

export default async function AdminHome() {
  const [nOficinas, nEmpleados, nEventos] = await Promise.all([
    db.$count(oficina),
    db.$count(empleado),
    db.$count(checkInEvent),
  ]);

  const metrics = [
    { label: 'Oficinas', value: nOficinas, Icon: Building2, href: '/admin/oficinas' },
    { label: 'Empleados', value: nEmpleados, Icon: Users, href: '/admin/empleados' },
    { label: 'Marcajes', value: nEventos, Icon: ClipboardCheck, href: '/reportes' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Panel de administración</h1>
        <p className="text-muted-foreground">Configura oficinas, jornadas, políticas y empleados.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map(({ label, value, Icon, href }) => (
          <Link key={label} href={href}>
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <div className="text-3xl font-semibold tabular-nums">{value}</div>
                  <div className="text-sm text-muted-foreground">{label}</div>
                </div>
                <Icon className="size-8 text-muted-foreground/40" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
