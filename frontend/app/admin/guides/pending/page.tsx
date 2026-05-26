import { redirect } from 'next/navigation';

export default function PendingGuidesRedirectPage() {
  redirect('/admin/guides?filter=unverified');
}
