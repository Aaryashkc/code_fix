'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, MapPin, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import dynamic from 'next/dynamic';
const MapAdvanced = dynamic(() => import('@/components/MapAdvanced'), { ssr: false });

interface Place {
  _id: string;
  name: string;
  category: string;
  region: string;
  description: string;
  location: {
    coordinates: [number, number];
    address: string;
  };
  verificationStatus: string;
  createdAt: string;
}

export default function GuidePlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<[number, number]>([27.7172, 85.324]);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Nature',
    region: 'Central',
    description: '',
    address: '',
  });

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    try {
      const response = await api.get('/destinations/my-places');
      setPlaces(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch places:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/destinations', {
        ...formData,
        location: {
          type: 'Point',
          coordinates: selectedLocation,
          address: formData.address,
        },
      });
      toast.success('Place submitted for admin approval!');
      setDialogOpen(false);
      fetchPlaces();
      setFormData({
        name: '',
        category: 'Nature',
        region: 'Central',
        description: '',
        address: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add place');
    }
  };

  const getStatusBadge = (status: string) => {
    const config: { [key: string]: any } = {
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
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g., Pokhara, Nepal"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Location on Map (Click to select)
                </label>
                <div className="h-[300px] rounded-xl overflow-hidden border">
                  <MapAdvanced
                    center={selectedLocation}
                    zoom={10}
                    height="300px"
                    enableClickToSelect={true}
                    snackFinderEnabled={false}
                    onMapClick={(lat: number, lng: number) => setSelectedLocation([lat, lng])}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {selectedLocation[0].toFixed(4)}, {selectedLocation[1].toFixed(4)}
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit for Approval</Button>
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
      )}
    </div>
  );
}
