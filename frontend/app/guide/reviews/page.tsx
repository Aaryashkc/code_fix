'use client';

import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/context/AuthContext';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MessageSquare, ThumbsUp, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface CategoryRatings {
  professionalism?: number;
  communication?:   number;
  knowledge?:       number;
  value?:           number;
}
interface Review {
  _id:             string;
  reviewer:        { name: string };
  rating:          number;
  categoryRatings?: CategoryRatings;
  comment:         string;
  helpful:         number;
  photos?:         string[];
  response?:       { text: string; createdAt: string };
  verified:        boolean;
  createdAt:       string;
}

const CATEGORY_LABELS: { key: keyof CategoryRatings; label: string }[] = [
  { key: 'professionalism', label: 'Professionalism' },
  { key: 'communication',   label: 'Communication'   },
  { key: 'knowledge',       label: 'Knowledge'       },
  { key: 'value',           label: 'Value'           },
];

const Stars = ({ n, size = 'sm' }: { n: number; size?: 'sm' | 'lg' }) =>
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(s => (
      <Star key={s} className={`${size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5'} ${s <= n ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
    ))}
  </div>;

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' });

export default function GuideReviewsPage() {
  const auth = useContext(AuthContext);
  const guideId = auth?.user?.id;

  const [reviews,  setReviews]  = useState<Review[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [replying, setReplying] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!guideId) return;
    api.get(`/reviews/guide/${guideId}`)
      .then(r => setReviews(r.data.data ?? []))
      .catch(() => toast.error('Failed to load reviews'))
      .finally(() => setLoading(false));
  }, [guideId]);

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const submitReply = async (reviewId: string) => {
    if (!replyText.trim()) { toast.error('Reply cannot be empty'); return; }
    setSubmitting(true);
    try {
      await api.post(`/reviews/${reviewId}/response`, { text: replyText.trim() });
      toast.success('Reply posted!');
      setReviews(prev => prev.map(r =>
        r._id === reviewId ? { ...r, response: { text: replyText.trim(), createdAt: new Date().toISOString() } } : r
      ));
      setReplying(null);
      setReplyText('');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed to post reply');
    } finally { setSubmitting(false); }
  };

  /* ── summary stats ── */
  const avg      = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const dist     = [5,4,3,2,1].map(n => ({ star: n, count: reviews.filter(r => r.rating === n).length }));
  const catAvgs  = CATEGORY_LABELS.map(({ key, label }) => {
    const vals = reviews.map(r => r.categoryRatings?.[key]).filter((v): v is number => v != null);
    return { label, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null };
  });

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 rounded-xl" />
      {[1,2,3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* ── header ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">What travellers say about guiding with you</p>
      </div>

      {reviews.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-20 text-center space-y-3">
            <div className="h-14 w-14 mx-auto rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-semibold">No reviews yet</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Complete your first trip and ask your traveller to leave a review!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── summary panel ── */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* overall score */}
                <div className="flex flex-col items-center justify-center gap-1 sm:border-r sm:pr-6 sm:min-w-[120px]">
                  <p className="text-5xl font-bold tabular-nums">{avg.toFixed(1)}</p>
                  <Stars n={Math.round(avg)} size="lg" />
                  <p className="text-xs text-muted-foreground mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                </div>

                {/* star distribution */}
                <div className="flex-1 space-y-1.5">
                  {dist.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-right font-medium">{star}</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all duration-500"
                          style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }}
                        />
                      </div>
                      <span className="w-6 text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>

                {/* category ratings */}
                {catAvgs.some(c => c.avg != null) && (
                  <div className="sm:border-l sm:pl-6 space-y-2 min-w-[160px]">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">By Category</p>
                    {catAvgs.filter(c => c.avg != null).map(c => (
                      <div key={c.label} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{c.label}</span>
                        <div className="flex items-center gap-1">
                          <Stars n={Math.round(c.avg!)} />
                          <span className="text-xs font-medium">{c.avg!.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── review list ── */}
          <div className="space-y-4">
            {reviews.map(r => (
              <Card key={r._id} className="border-border/60 shadow-sm">
                <CardContent className="p-5 space-y-3">
                  {/* reviewer + rating */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {r.reviewer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{r.reviewer.name}</p>
                          <p className="text-[11px] text-muted-foreground">{fmt(r.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Stars n={r.rating} />
                      {r.verified && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-200 text-emerald-700">Verified</Badge>
                      )}
                    </div>
                  </div>

                  {/* category ratings (if available) */}
                  {r.categoryRatings && Object.values(r.categoryRatings).some(v => v != null) && (
                    <button
                      onClick={() => toggleExpand(r._id)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {expanded.has(r._id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {expanded.has(r._id) ? 'Hide' : 'Show'} detailed ratings
                    </button>
                  )}
                  {expanded.has(r._id) && r.categoryRatings && (
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-3">
                      {CATEGORY_LABELS.map(({ key, label }) =>
                        r.categoryRatings?.[key] != null ? (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{label}</span>
                            <Stars n={r.categoryRatings[key]!} />
                          </div>
                        ) : null
                      )}
                    </div>
                  )}

                  {/* comment */}
                  <p className="text-sm leading-relaxed">{r.comment}</p>

                  {/* helpful count */}
                  {r.helpful > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {r.helpful} traveller{r.helpful !== 1 ? 's' : ''} found this helpful
                    </div>
                  )}

                  {/* existing response */}
                  {r.response && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                      <p className="text-xs font-semibold text-primary mb-1">Your response · {fmt(r.response.createdAt)}</p>
                      <p>{r.response.text}</p>
                    </div>
                  )}

                  {/* reply section */}
                  {!r.response && (
                    <>
                      {replying === r._id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Write a public reply to this review…"
                            rows={3}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setReplying(null); setReplyText(''); }}>Cancel</Button>
                            <Button size="sm" onClick={() => submitReply(r._id)} disabled={submitting}>
                              {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                              Post Reply
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => { setReplying(r._id); setReplyText(''); }}
                          className="text-xs"
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1.5" />Reply to review
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
