import { redirect } from 'next/navigation';

export default function RejectedGuidesRedirectPage() {
  redirect('/admin/guides?filter=suspended');
}
