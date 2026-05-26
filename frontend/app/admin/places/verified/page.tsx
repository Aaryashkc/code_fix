import { redirect } from 'next/navigation';

export default function VerifiedPlacesRedirectPage() {
  redirect('/admin/places?filter=approved');
}
