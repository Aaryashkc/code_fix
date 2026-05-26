import { redirect } from 'next/navigation';

export default function PendingPlacesRedirectPage() {
  redirect('/admin/places?filter=pending');
}
