'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/animations';
import api from '@/lib/api';
import { UserPlus, Eye, EyeOff, Copy, Check, Languages, Award, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const LANGUAGE_OPTIONS = [
  { code: 'ne', name: 'Nepali' },
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
];

const SPECIALIZATION_OPTIONS = [
  'Trekking', 'Mountaineering', 'Cultural Tours', 'Wildlife Safari',
  'Photography', 'Bird Watching', 'Rafting', 'Paragliding',
  'Pilgrimage Tours', 'City Tours', 'Food Tours', 'Cycling',
];

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export default function AddGuidePage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdGuide, setCreatedGuide] = useState<{ name: string; email: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: generatePassword(),
    phone: '',
    location: '',
    bio: '',
    experience: '',
    pricePerDay: '',
    licenseNumber: '',
    languages: [] as { code: string; name: string }[],
    specializations: [] as string[],
  });

  const handleLanguageToggle = (lang: { code: string; name: string }) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.find((l) => l.code === lang.code)
        ? prev.languages.filter((l) => l.code !== lang.code)
        : [...prev.languages, lang],
    }));
  };

  const handleSpecToggle = (spec: string) => {
    setFormData((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter((s) => s !== spec)
        : [...prev.specializations, spec],
    }));
  };

  const copyCredentials = () => {
    if (!createdGuide) {
      return;
    }

    const text = `Guide Account Credentials:\nName: ${createdGuide.name}\nEmail: ${createdGuide.email}\nPassword: ${formData.password}\nPortal: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Credentials copied to clipboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Name, email, and password are required');
      return;
    }

    if (formData.languages.length === 0) {
      toast.error('Please select at least one language');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        location: formData.location,
        bio: formData.bio,
        experience: formData.experience,
        pricePerDay: Number(formData.pricePerDay) || 5000,
        licenseNumber: formData.licenseNumber,
        languages: formData.languages,
        specializations: formData.specializations,
        verified: true,
        available: true,
      };

      const res = await api.post('/auth/users/create-guide', payload);
      setCreatedGuide({
        name: res.data?.user?.name || formData.name,
        email: res.data?.user?.email || formData.email,
      });
      toast.success('Guide account created successfully!');
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to create guide account';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCreatedGuide(null);
    setCopied(false);
    setFormData({
      name: '',
      email: '',
      password: generatePassword(),
      phone: '',
      location: '',
      bio: '',
      experience: '',
      pricePerDay: '',
      licenseNumber: '',
      languages: [],
      specializations: [],
    });
  };

  // Success screen
  if (createdGuide) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto"
      >
        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
              className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6"
            >
              <Check className="h-10 w-10 text-success" />
            </motion.div>

            <h2 className="text-2xl font-bold mb-2">Guide Account Created!</h2>
            <p className="text-muted-foreground mb-6">
              Share these credentials with the guide so they can log in.
            </p>

            <div className="bg-white rounded-lg p-4 text-left space-y-3 border">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Name</p>
                <p className="font-semibold">{createdGuide.name}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <p className="font-semibold">{createdGuide.email}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Temporary Password</p>
                <p className="font-mono font-semibold text-primary">{formData.password}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Login URL</p>
                <p className="text-sm font-semibold">{window.location.origin}/login</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={copyCredentials} variant="outline" className="flex-1 gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy Credentials'}
              </Button>
              <Button onClick={resetForm} className="flex-1 gap-2">
                <UserPlus className="h-4 w-4" />
                Add Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="max-w-3xl mx-auto"
    >
      <motion.div variants={fadeInUp} custom={0} className="mb-8">
        <h1 className="font-serif text-3xl font-bold flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          Add New Guide
        </h1>
        <p className="text-muted-foreground mt-2">
          Create a guide account directly. The guide will use these credentials to log in.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <motion.div variants={fadeInUp} custom={1}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Full Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Pasang Sherpa"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="guide@example.com"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Temporary Password *</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, password: generatePassword() })}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    Generate new password
                  </button>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+977-9800000000"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Kathmandu, Nepal"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">License Number</label>
                  <Input
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    placeholder="e.g., NTB-12345"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp} custom={2}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5" />
                Professional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Experience</label>
                  <Input
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="e.g., 10+ years"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Rate per Day (NPR)</label>
                  <Input
                    type="number"
                    value={formData.pricePerDay}
                    onChange={(e) => setFormData({ ...formData, pricePerDay: e.target.value })}
                    placeholder="e.g., 5000"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Bio</label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Brief description about the guide's background and expertise..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp} custom={3}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Languages className="h-5 w-5" />
                Languages *
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const isSelected = formData.languages.find((l) => l.code === lang.code);
                  return (
                    <motion.button
                      key={lang.code}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleLanguageToggle(lang)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-md'
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                    >
                      {lang.name}
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp} custom={4}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Specializations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATION_OPTIONS.map((spec) => {
                  const isSelected = formData.specializations.includes(spec);
                  return (
                    <motion.button
                      key={spec}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSpecToggle(spec)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        isSelected
                          ? 'bg-secondary text-secondary-foreground border-secondary shadow-md'
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                    >
                      {spec}
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp} custom={5} className="flex gap-4">
          <Button
            type="submit"
            size="lg"
            className="flex-1 gap-2"
            disabled={loading}
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <UserPlus className="h-5 w-5" />
            )}
            {loading ? 'Creating Account...' : 'Create Guide Account'}
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
}
