'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { Plus, MapPin, Clock, CheckCircle, XCircle, ImagePlus, Loader2, X, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import axios from 'axios';
import dynamic from 'next/dynamic';
const MapAdvanced = dynamic(() => import('@/components/MapAdvanced'), { ssr: false });

interface Place {
  _id: string;
  name: string;
  category: string;
  region: string;
  description: string;
  images?: string[];
  location: {
    coordinates: [number, number];
    address: string;
  };
  verificationStatus: string;
  createdAt: string;
}

interface PlaceStatusConfig {
  variant: 'secondary' | 'default' | 'destructive';
  icon: LucideIcon;
  text: string;
}

export default function GuidePlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<[number, number]>([27.7172, 85.324]);
  const [coordinateInputs, setCoordinateInputs] = useState({
    latitude: '27.7172',
    longitude: '85.324',
  });
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Nature',
    region: 'Central',
    description: '',
    shortDescription: '',
    priceRange: 'Rs',
    address: '',
  });

  const fetchPlaces = useCallback(async (requestedPage: number) => {
    try {
      const response = await api.get('/destinations/my-places', {
        params: { page: requestedPage, limit: 8 },
      });
      setPlaces(response.data.data || []);
      setTotal(response.data.total ?? 0);
      setPages(Math.max(1, response.data.pages ?? 1));
    } catch (error) {
      console.error('Failed to fetch places:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaces(page);
  }, [fetchPlaces, page]);

  const parseCoordinates = () => {
    const latitude = Number(coordinateInputs.latitude);
    const longitude = Number(coordinateInputs.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      toast.error('Enter valid latitude and longitude coordinates');
      return null;
    }

    return [latitude, longitude] as [number, number];
  };

  const applyTypedCoordinates = () => {
    const coordinates = parseCoordinates();
    if (coordinates) setSelectedLocation(coordinates);
  };

  const selectLocationOnMap = (latitude: number, longitude: number) => {
    setSelectedLocation([latitude, longitude]);
    setCoordinateInputs({
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const coordinates = parseCoordinates();
    if (!coordinates) return;

    setSubmitting(true);
    try {
      const response = await api.post('/destinations', {
        ...formData,
        slug: `${formData.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'destination'}-${Date.now()}`,
        location: {
          type: 'Point',
          coordinates: [coordinates[1], coordinates[0]],
          address: formData.address,
        },
      });
      let uploadWarning = false;
      if (photoFiles.length > 0) {
        const photos = new FormData();
        photoFiles.forEach((file) => photos.append('images', file));
        try {
          await api.post(`/destinations/${response.data.data._id}/media`, photos, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          uploadWarning = true;
        }
      }
      if (uploadWarning) {
        toast.warning('Place submitted, but its photos could not be uploaded');
      } else {
        toast.success('Place submitted for admin approval!');
      }
      setDialogOpen(false);
      if (page === 1) {
        fetchPlaces(1);
      } else {
        setPage(1);
      }
      setFormData({
        name: '',
        category: 'Nature',
        region: 'Central',
        description: '',
        shortDescription: '',
        priceRange: 'Rs',
        address: '',
      });
      setSelectedLocation([27.7172, 85.324]);
      setCoordinateInputs({ latitude: '27.7172', longitude: '85.324' });
      setPhotoFiles([]);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      toast.error(message || 'Failed to add place');
    } finally {
      setSubmitting(false);
    }
  };

  const selectPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const nextFiles = [...photoFiles, ...Array.from(files)].slice(0, 10);
    if (photoFiles.length + files.length > 10) {
      toast.error('You can upload up to 10 photos per place');
    }
    setPhotoFiles(nextFiles);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, PlaceStatusConfig> = {
      pending: { variant: 'secondary', icon: Clock, text: 'Pending' },
      approved: { variant: 'default', icon: CheckCircle, text: 'Approved' },
      rejected: { variant: 'destructive', icon: XCircle, text: 'Rejected' },
    };
    const statusConfig = config[status] || config.pending;
    const Icon = statusConfig.icon;
    
    return (
      <Badge variant={statusConfig.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {statusConfig.text}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">My Places</h1>
          <p className="text-muted-foreground mt-1">Add and manage tourist destinations</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Place
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submit New Place</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Place Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Annapurna Base Camp"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Religious">Religious</SelectItem>
                      <SelectItem value="Nature">Nature</SelectItem>
                      <SelectItem value="Adventure">Adventure</SelectItem>
                      <SelectItem value="Cultural">Cultural</SelectItem>
                      <SelectItem value="Urban">Urban</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Region</label>
                  <Select
                    value={formData.region}
                    onValueChange={(value) => setFormData({ ...formData, region: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Eastern">Eastern</SelectItem>
                      <SelectItem value="Central">Central</SelectItem>
                      <SelectItem value="Western">Western</SelectItem>
                      <SelectItem value="Far-Western">Far-Western</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the place..."
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Short Description</label>
                <Input
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  placeholder="A quick summary travelers will see"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Estimated Visitor Budget</label>
                <Select
                  value={formData.priceRange}
                  onValueChange={(value) => setFormData({ ...formData, priceRange: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rs">Low cost</SelectItem>
                    <SelectItem value="Rs Rs">Moderate cost</SelectItem>
                    <SelectItem value="Rs Rs Rs">Higher cost</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  This estimates traveler expenses at the place. Your guide fee per day is set in My Profile.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g., Pokhara, Nepal"
                  required
                />
              </div>

              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <label className="text-sm font-medium">Destination Photos</label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add up to 10 photos. The first image becomes the cover after approval.
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Add Photos
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      multiple
                      onChange={(event) => {
                        selectPhotos(event.target.files);
                        event.target.value = '';
                      }}
                    />
                  </label>
                </div>
                {photoFiles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {photoFiles.map((file, index) => (
                      <span key={`${file.name}-${file.lastModified}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs">
                        <span className="max-w-44 truncate">{index === 0 ? 'Cover: ' : ''}{file.name}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          onClick={() => setPhotoFiles((files) => files.filter((_file, fileIndex) => fileIndex !== index))}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Location on Map
                </label>
                <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <div>
                    <label className="text-xs text-muted-foreground">Latitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={coordinateInputs.latitude}
                      onChange={(e) => setCoordinateInputs({ ...coordinateInputs, latitude: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Longitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={coordinateInputs.longitude}
                      onChange={(e) => setCoordinateInputs({ ...coordinateInputs, longitude: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="button" variant="outline" className="self-end" onClick={applyTypedCoordinates}>
                    Show on Map
                  </Button>
                </div>
                <div className="h-[300px] rounded-xl overflow-hidden border">
                  <MapAdvanced
                    center={selectedLocation}
                    zoom={10}
                    height="300px"
                    enableClickToSelect={true}
                    snackFinderEnabled={false}
                    autoLocate={false}
                    showUserLocationTools={false}
                    markers={[{
                      position: selectedLocation,
                      title: formData.name || 'Selected location',
                      category: formData.category,
                    }]}
                    onMapClick={selectLocationOnMap}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Click on the map or enter coordinates. Selected: {selectedLocation[0].toFixed(4)}, {selectedLocation[1].toFixed(4)}
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit for Approval
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Places List */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-44 rounded-xl border bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : places.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">No places added yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add your first tourist destination to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {places.length} of {total} submitted places
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {places.map((place) => (
              <Card key={place._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{place.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {place.location.address}
                      </p>
                    </div>
                    {getStatusBadge(place.verificationStatus)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Badge variant="outline">{place.category}</Badge>
                    <Badge variant="outline">{place.region}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {place.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Added {new Date(place.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {pages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    aria-disabled={page === 1}
                    className={page === 1 ? 'pointer-events-none opacity-50' : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                  />
                </PaginationItem>
                <PaginationItem className="px-3 text-sm text-muted-foreground">
                  Page <span className="font-semibold text-foreground">{page}</span> of {pages}
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    aria-disabled={page === pages}
                    className={page === pages ? 'pointer-events-none opacity-50' : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      if (page < pages) setPage(page + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
