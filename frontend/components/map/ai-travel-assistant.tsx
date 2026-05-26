'use client';

import { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  TrendingUp, 
  Clock, 
  MapPin, 
  Compass,
  Sun,
  MessageCircle,
  X,
  ChevronRight,
  Route,
  Calendar
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Destination {
  _id: string;
  name: string;
  category: string;
  images: string[];
  rating: number;
  shortDescription?: string;
  location: {
    coordinates: [number, number];
    address: string;
  };
}

interface AITravelAssistantProps {
  destinations: Destination[];
  nearbyDestinations: Destination[];
  selectedLocation: [number, number] | null;
  userPreferences?: {
    interests?: string[];
    visitedCategories?: string[];
  };
  onDestinationClick: (dest: Destination) => void;
  onCreateTrip: (destinations: Destination[]) => void;
}

interface AIInsight {
  type: 'trending' | 'suggestion' | 'time-based' | 'weather' | 'hidden-gem';
  title: string;
  description: string;
  destinations?: Destination[];
  icon: React.ReactNode;
}

const categoryIcons: Record<string, string> = {
  Adventure: '🏔️',
  Nature: '🌊',
  Religious: '🛕',
  Cultural: '🎭',
  Urban: '🏙️',
};

export function AITravelAssistant({
  destinations,
  nearbyDestinations,
  selectedLocation,
  userPreferences = {},
  onDestinationClick,
  onCreateTrip
}: AITravelAssistantProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const getDestinationsByCategory = useCallback(
    (category: string) => destinations.filter((d) => d.category === category),
    [destinations]
  );

  // Generate AI insights based on context
  const generateInsights = useCallback((): AIInsight[] => {
    const newInsights: AIInsight[] = [];
    const hour = new Date().getHours();

    // 1. Time-based suggestions
    if (hour >= 5 && hour < 11) {
      newInsights.push({
        type: 'time-based',
        title: 'Good Morning! ☀️',
        description: 'Perfect time for sunrise viewpoints and morning temple visits',
        destinations: getDestinationsByCategory('Religious').slice(0, 2),
        icon: <Sun className="h-5 w-5 text-amber-400" />
      });
    } else if (hour >= 17 && hour < 19) {
      newInsights.push({
        type: 'time-based',
        title: 'Evening Views 🌅',
        description: 'Catch the sunset at these scenic spots',
        destinations: getDestinationsByCategory('Nature').slice(0, 2),
        icon: <Sun className="h-5 w-5 text-orange-400" />
      });
    }

    // 2. Trending near you
    if (nearbyDestinations.length > 0) {
      newInsights.push({
        type: 'trending',
        title: 'Trending Near You',
        description: `Found ${nearbyDestinations.length} popular destinations nearby`,
        destinations: nearbyDestinations.slice(0, 3),
        icon: <TrendingUp className="h-5 w-5 text-emerald-400" />
      });
    }

    // 3. Complete your trip (suggest missing categories)
    const visitedCategories = userPreferences.visitedCategories || [];
    const allCategories = Array.from(new Set(destinations.map(d => d.category)));
    const missingCategories = allCategories.filter(c => !visitedCategories.includes(c));
    
    if (missingCategories.length > 0) {
      const suggestedCategory = missingCategories[0];
      const explored = visitedCategories.length > 0
        ? visitedCategories.join(', ')
        : 'popular highlights';
      newInsights.push({
        type: 'suggestion',
        title: 'Complete Your Experience',
        description: `You have explored ${explored}. Try ${suggestedCategory} next!`,
        destinations: getDestinationsByCategory(suggestedCategory).slice(0, 2),
        icon: <Compass className="h-5 w-5 text-cyan-400" />
      });
    }

    // 4. Hidden gems (high rating, less "crowded")
    const hiddenGems = destinations
      .filter(d => d.rating >= 4.5)
      .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))
      .slice(0, 2);
    
    if (hiddenGems.length > 0) {
      newInsights.push({
        type: 'hidden-gem',
        title: 'Hidden Gems 💎',
        description: 'Highly-rated spots off the beaten path',
        destinations: hiddenGems,
        icon: <Sparkles className="h-5 w-5 text-purple-400" />
      });
    }

    return newInsights;
  }, [destinations, nearbyDestinations, userPreferences, selectedLocation, getDestinationsByCategory]);

  useEffect(() => {
    setInsights(generateInsights());
  }, [generateInsights]);

  // AI Chat functionality (rule-based for demo)
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInputMessage('');

    // Generate AI response based on keywords
    setTimeout(() => {
      const response = generateAIResponse(userMsg);
      setMessages(prev => [...prev, { role: 'ai', content: response }]);
    }, 500);
  };

  const generateAIResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('temple') || lowerQuery.includes('religious')) {
      const temples = getDestinationsByCategory('Religious').slice(0, 3);
      return `I found ${temples.length} beautiful temples near you: ${temples.map(t => t.name).join(', ')}. They're best visited in the morning for a peaceful experience.`;
    }
    
    if (lowerQuery.includes('hiking') || lowerQuery.includes('trek') || lowerQuery.includes('adventure')) {
      const adventures = getDestinationsByCategory('Adventure').slice(0, 3);
      return `Perfect! For adventure lovers, I recommend: ${adventures.map(a => a.name).join(', ')}. Don't forget to carry water and start early!`;
    }
    
    if (lowerQuery.includes('plan') || lowerQuery.includes('itinerary') || lowerQuery.includes('trip')) {
      return `I can help you plan! Based on your interests, here's a suggestion:\n\n🌅 Morning: Visit a temple or sunrise viewpoint\n🍽️ Mid-day: Try local cuisine at a cultural site\n🌄 Evening: End at a scenic nature spot\n\nWould you like me to create a detailed itinerary?`;
    }
    
    if (lowerQuery.includes('weather') || lowerQuery.includes('rain') || lowerQuery.includes('sunny')) {
      return `Nepal's weather varies by region. The Kathmandu Valley is generally pleasant now. If you're heading to mountains, mornings are clearer. Would you like indoor recommendations for today?`;
    }
    
    if (lowerQuery.includes('food') || lowerQuery.includes('eat') || lowerQuery.includes('restaurant')) {
      return `Nepali cuisine is amazing! Try momos (dumplings), dal bhat (lentil rice), and local Newari dishes. I can suggest restaurants near your selected destinations.`;
    }
    
    // Default response
    const randomTips = [
      'The best time to visit temples is early morning (6-8 AM) for a peaceful experience.',
      'Carry cash as many remote places don\'t accept cards.',
      'Hire a local guide for historical sites - they share amazing stories!',
      'Try to learn a few Nepali phrases - locals love it!',
      'Always carry a reusable water bottle to stay hydrated.',
    ];
    
    return `I'm here to help with your Nepal adventure! 💡 ${randomTips[Math.floor(Math.random() * randomTips.length)]}\n\nAsk me about temples, hiking trails, trip planning, or local cuisine!`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">AI Travel Assistant</h3>
            <p className="text-xs text-slate-400">Personalized recommendations</p>
          </div>
        </div>
      </div>

      {/* Insights Section */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {/* AI Insights Cards */}
          <AnimatePresence>
            {insights.map((insight, index) => (
              <motion.div
                key={`${insight.type}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="p-3 hover:border-emerald-500/30 transition-colors cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white/5">
                      {insight.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white text-sm group-hover:text-emerald-400 transition-colors">
                        {insight.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {insight.description}
                      </p>
                      
                      {/* Destination chips */}
                      {insight.destinations && insight.destinations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {insight.destinations.map(dest => (
                            <button
                              key={dest._id}
                              onClick={() => onDestinationClick(dest)}
                              className="text-xs px-2 py-1 rounded-full bg-white/10 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 transition-colors flex items-center gap-1"
                            >
                              <span>{categoryIcons[dest.category] || '📍'}</span>
                              <span className="truncate max-w-[100px]">{dest.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Smart Trip Planning Card */}
          {nearbyDestinations.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlassCard className="p-4 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Route className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white text-sm">
                      Plan a Day Trip
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Create an optimal route visiting {Math.min(nearbyDestinations.length, 4)} nearby destinations
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex -space-x-2">
                        {nearbyDestinations.slice(0, 4).map((dest) => (
                          <div 
                            key={dest._id}
                            className="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs"
                          >
                            {categoryIcons[dest.category] || '📍'}
                          </div>
                        ))}
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7"
                        onClick={() => onCreateTrip(nearbyDestinations.slice(0, 4))}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Create Itinerary
                      </Button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Quick Actions */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">
              Quick Questions
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '🛕', text: 'Best temples?', query: 'What are the best temples to visit?' },
                { icon: '🏔️', text: 'Hiking trails?', query: 'Recommend hiking trails near me' },
                { icon: '🍽️', text: 'Local food?', query: 'Where can I find local food?' },
                { icon: '🌅', text: 'Sunrise spots?', query: 'Best sunrise viewpoints' },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setChatOpen(true);
                    setMessages(prev => [...prev, { role: 'user', content: item.query }]);
                    setTimeout(() => {
                      const response = generateAIResponse(item.query);
                      setMessages(prev => [...prev, { role: 'ai', content: response }]);
                    }, 500);
                  }}
                  className="text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm transition-colors flex items-center gap-2"
                >
                  <span>{item.icon}</span>
                  {item.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* AI Chat Button */}
      <div className="p-4 border-t border-white/10">
        <Button
          onClick={() => setChatOpen(true)}
          className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Ask AI Travel Assistant
        </Button>
      </div>

      {/* Chat Modal */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col"
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">AI Travel Assistant</h3>
                  <p className="text-xs text-slate-400">Ask me anything about Nepal travel</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-slate-400">
                      Hi! I'm your AI travel assistant. Ask me about:
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-3">
                      {['Temples', 'Hiking', 'Food', 'Weather', 'Itinerary'].map(tag => (
                        <span key={tag} className="px-3 py-1 rounded-full bg-white/10 text-slate-300 text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-sm'
                        : 'bg-white/10 text-slate-200 rounded-bl-sm'
                    }`}>
                      <p className="text-sm whitespace-pre-line">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your question..."
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AITravelAssistant;
