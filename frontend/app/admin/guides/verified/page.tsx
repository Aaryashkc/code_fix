import { redirect } from 'next/navigation';

export default function VerifiedGuidesRedirectPage() {
  redirect('/admin/guides?filter=verified');
}
