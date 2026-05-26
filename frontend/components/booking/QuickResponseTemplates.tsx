'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, MapPin, Users, CheckCircle } from 'lucide-react';
import { formatNPR } from '@/lib/currency';

interface QuickResponseTemplatesProps {
  onSelectTemplate: (message: string, price?: number) => void;
  guideRate: number;
  numberOfDays: number;
  touristName?: string;
}

const templates = [
  {
    id: 'accept-standard',
    type: 'accept',
    label: 'Accept Standard Rate',
    message: (touristName: string, rate: number, days: number) => 
      `Hi ${touristName}! I'd love to guide you on this adventure. My standard rate is ${formatNPR(rate * days)} for ${days} days. When are you available to start?`,
    priceAdjustment: 0,
    icon: CheckCircle,
    color: 'text-green-600'
  },
  {
    id: 'discount-small',
    type: 'counter',
    label: '10% Discount',
    message: (touristName: string, rate: number, days: number) => 
      `Hi ${touristName}! Thanks for your interest. I can offer a 10% discount - ${formatNPR(rate * days * 0.9)} for ${days} days. This includes all my expertise and local knowledge!`,
    priceAdjustment: -0.1,
    icon: MessageSquare,
    color: 'text-blue-600'
  },
  {
    id: 'discount-medium',
    type: 'counter',
    label: '15% Discount',
    message: (touristName: string, rate: number, days: number) => 
      `Hi ${touristName}! I'd be happy to guide you. Let me offer a special 15% discount - ${formatNPR(rate * days * 0.85)} for ${days} days. This is a great deal for my experience!`,
    priceAdjustment: -0.15,
    icon: MessageSquare,
    color: 'text-blue-600'
  },
  {
    id: 'premium-experience',
    type: 'counter',
    label: 'Premium Experience (+20%)',
    message: (touristName: string, rate: number, days: number) => 
      `Hi ${touristName}! For a premium experience with exclusive locations and personalized service, I recommend ${formatNPR(rate * days * 1.2)}. This includes hidden gems most tourists miss!`,
    priceAdjustment: 0.2,
    icon: MapPin,
    color: 'text-purple-600'
  },
  {
    id: 'quick-response',
    type: 'message',
    label: 'Quick Response',
    message: (touristName: string, rate: number, days: number) => 
      `Hi ${touristName}! Thanks for your request. I'm available and excited to guide you. Let me know your preferred dates and any specific interests so I can customize the perfect experience for you!`,
    priceAdjustment: 0,
    icon: Clock,
    color: 'text-orange-600'
  },
  {
    id: 'group-discount',
    type: 'counter',
    label: 'Group Discount (4+ people)',
    message: (touristName: string, rate: number, days: number) => 
      `Hi ${touristName}! For groups of 4 or more, I can offer a special group rate of ${formatNPR(rate * days * 0.8)}. How many people are in your group?`,
    priceAdjustment: -0.2,
    icon: Users,
    color: 'text-indigo-600'
  }
];

export default function QuickResponseTemplates({
  onSelectTemplate,
  guideRate,
  numberOfDays,
  touristName = 'Traveler'
}: QuickResponseTemplatesProps) {
  const basePrice = guideRate * numberOfDays;

  const handleTemplateSelect = (template: typeof templates[0]) => {
    const message = template.message(touristName, guideRate, numberOfDays);
    const adjustedPrice = template.priceAdjustment !== 0 
      ? basePrice * (1 + template.priceAdjustment)
      : undefined;
    
    onSelectTemplate(message, adjustedPrice);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Quick Response Templates</h3>
      </div>
      
      <div className="grid gap-3">
        {templates.map((template) => {
          const Icon = template.icon;
          const adjustedPrice = template.priceAdjustment !== 0 
            ? basePrice * (1 + template.priceAdjustment)
            : basePrice;
          
          return (
            <Card 
              key={template.id}
              className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary"
              onClick={() => handleTemplateSelect(template)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg bg-muted ${template.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{template.label}</span>
                        {template.type === 'accept' && (
                          <Badge variant="default" className="text-xs">Accept</Badge>
                        )}
                        {template.type === 'counter' && (
                          <Badge variant="secondary" className="text-xs">Counter</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.message(touristName, guideRate, numberOfDays).substring(0, 100)}...
                      </p>
                    </div>
                  </div>
                  
                  {template.priceAdjustment !== 0 && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">
                        {formatNPR(Math.round(adjustedPrice))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {template.priceAdjustment > 0 ? '+' : ''}{Math.round(template.priceAdjustment * 100)}%
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
        💡 <strong>Pro tip:</strong> Templates help you respond faster and maintain consistency. Personalize the message after selecting a template!
      </div>
    </div>
  );
}
