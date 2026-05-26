'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="h-16 w-16 text-primary/40" />
            </div>
            <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <span className="text-destructive font-bold text-sm">404</span>
            </div>
          </div>
        </div>

        <h1 className="font-serif text-4xl font-bold text-foreground mb-3">
          Lost in Nepal?
        </h1>
        <p className="text-muted-foreground text-lg mb-2">
          The page you're looking for doesn't exist.
        </p>
        <p className="text-muted-foreground text-sm mb-8">
          It may have been moved, deleted, or perhaps you took a wrong trail.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button className="gap-2 w-full sm:w-auto">
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
