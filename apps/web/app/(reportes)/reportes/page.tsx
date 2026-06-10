import { redirect } from 'next/navigation';

// El dashboard vive dentro del shell del admin.
export default function ReportesRedirect() {
  redirect('/admin/reportes');
}
