'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin, Navigation, Clock, TrendingUp, Mic } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';

interface Destination {
  _id: string;
  name: string;
  category: string;
  images: string[];
  rating: number;
  location: {
    coordinates: [number, number];
    address: string;
  };
}

interface SmartSearchBoxProps {
  destinations: Destination[];
  onSelect: (dest: Destination) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  showVoiceSearch?: boolean;
}

const categoryIcons: Record<string, string> = {
  Adventure: 'A',
  Nature: 'N',
  Religious: 'R',
  Cultural: 'C',
  Urban: 'U',
};

const categoryColors: Record<string, string> = {
  Adventure: 'bg-emerald-500',
  Nature: 'bg-cyan-500',
  Religious: 'bg-amber-500',
  Cultural: 'bg-purple-500',
  Urban: 'bg-blue-500',
};

function fuzzyMatch(str: string, query: string): boolean {
  const strLower = str.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match
  if (strLower.includes(queryLower)) return true;
  
  // Allow for typos (simple implementation)
  let matches = 0;
  let strIdx = 0;
  for (let i = 0; i < queryLower.length; i++) {
    const char = queryLower[i];
    while (strIdx < strLower.length && strLower[strIdx] !== char) {
      strIdx++;
    }
    if (strIdx < strLower.length) {
      matches++;
      strIdx++;
    }
  }
  
  // Match if 70% of characters found in order
  return matches / queryLower.length >= 0.7;
}

export function SmartSearchBox({ 
  destinations, 
  onSelect, 
  onSearch,
  placeholder = "Search destinations, places, or categories...",
  showVoiceSearch = true
}: SmartSearchBoxProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('recentSearches');
      return saved ? JSON.parse(saved).slice(0, 5) : [];
    } catch {
      return [];
    }
  });
  const [isListening, setIsListening] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const suggestions = getSuggestions();
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSelect(suggestions[highlightedIndex]);
      } else {
        onSearch(query);
        addToRecentSearches(query);
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const getSuggestions = () => {
    if (!query.trim()) return [];
    
    return destinations
      .filter((d) => 
        fuzzyMatch(d.name, query) ||
        fuzzyMatch(d.category, query) ||
        fuzzyMatch(d.location.address, query)
      )
      .slice(0, 6);
  };

  const getPopularDestinations = () => {
    // Sort by rating and return top 4
    return [...destinations]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);
  };

  const handleSelect = (dest: Destination) => {
    setQuery(dest.name);
    onSelect(dest);
    addToRecentSearches(dest.name);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const addToRecentSearches = (search: string) => {
    if (!search.trim()) return;
    const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearSearch = () => {
    setQuery('');
    onSearch('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  // Voice search
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice search is not supported in your browser');
      return;
    }

    interface SpeechRecognitionResult {
      readonly transcript: string;
    }
    interface SpeechRecognitionResultList {
      readonly length: number;
      item(index: number): { readonly [index: number]: SpeechRecognitionResult };
      readonly [index: number]: { readonly [index: number]: SpeechRecognitionResult };
    }
    interface SpeechRecognitionEvent extends Event {
      readonly results: SpeechRecognitionResultList;
    }
    interface ISpeechRecognition extends EventTarget {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      onstart: (() => void) | null;
      onresult: ((event: SpeechRecognitionEvent) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start(): void;
    }
    type SpeechRecognitionWindow = Window & {
      SpeechRecognition?: new () => ISpeechRecognition;
      webkitSpeechRecognition?: new () => ISpeechRecognition;
    };
    const w = window as SpeechRecognitionWindow;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    const recognition = new SpeechRecognitionAPI();
    
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setIsListening(true);
    };
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      onSearch(transcript);
      setShowSuggestions(true);
      setIsListening(false);
    };
    
    recognition.onerror = () => {
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.start();
  };

  const suggestions = getSuggestions();
  const popularDestinations = getPopularDestinations();
  const showRecent = !query && recentSearches.length > 0;
  const showPopular = !query && !showRecent;

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearch(e.target.value);
            setShowSuggestions(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-12 pr-24 h-14 text-lg bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500/50"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showVoiceSearch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={startVoiceSearch}
              className={`h-10 w-10 rounded-full transition-all ${
                isListening 
                  ? 'bg-red-500/20 text-red-400 animate-pulse' 
                  : 'hover:bg-white/10 text-slate-400'
              }`}
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSearch}
              className="h-10 w-10 rounded-full hover:bg-white/10 text-slate-400"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <GlassCard className="overflow-hidden max-h-[400px] overflow-y-auto">
              {/* Search Suggestions */}
              {query && (
                <div className="p-2">
                  <p className="text-xs text-slate-400 px-3 py-2 uppercase tracking-wide font-medium">
                    {suggestions.length > 0 ? 'Suggestions' : 'No results found'}
                  </p>
                  {suggestions.map((dest, index) => (
                    <button
                      key={dest._id}
                      onClick={() => handleSelect(dest)}
                      className={`w-full text-left px-3 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                        highlightedIndex === index ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg ${categoryColors[dest.category] || 'bg-slate-500'} flex items-center justify-center text-white text-lg`}>
                        {categoryIcons[dest.category] || '📍'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{dest.name}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {dest.location.address}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-amber-400">
                        <span className="text-sm font-medium">{dest.rating}</span>
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Recent Searches */}
              {showRecent && (
                <div className="p-2 border-t border-white/10">
                  <p className="text-xs text-slate-400 px-3 py-2 uppercase tracking-wide font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Recent Searches
                  </p>
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuery(search);
                        onSearch(search);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-slate-300 flex items-center gap-2"
                    >
                      <Navigation className="h-4 w-4 text-slate-500" />
                      {search}
                    </button>
                  ))}
                </div>
              )}

              {/* Popular Destinations */}
              {showPopular && (
                <div className="p-2 border-t border-white/10">
                  <p className="text-xs text-slate-400 px-3 py-2 uppercase tracking-wide font-medium flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Popular Destinations
                  </p>
                  {popularDestinations.map((dest) => (
                    <button
                      key={dest._id}
                      onClick={() => handleSelect(dest)}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <div className={`w-8 h-8 rounded-lg ${categoryColors[dest.category] || 'bg-slate-500'} flex items-center justify-center text-white`}>
                        {categoryIcons[dest.category] || '📍'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 truncate">{dest.name}</p>
                      </div>
                      <span className="text-xs text-emerald-400">{dest.rating}★</span>
                    </button>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SmartSearchBox;
