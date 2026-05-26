const axios = require('axios');
const Destination = require('../models/Destination');
const Trip = require('../models/Trip');

const THEME_TO_CATEGORY = {
  culture: 'Cultural',
  cultural: 'Cultural',
  adventure: 'Adventure',
  nature: 'Nature',
  religious: 'Religious',
  spiritual: 'Religious',
  urban: 'Urban',
};

function extractJsonBlock(rawValue) {
  if (!rawValue) return null;
  const trimmedValue = String(rawValue).trim();
  const fencedMatch = trimmedValue.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectStart = trimmedValue.indexOf('{');
  const arrayStart = trimmedValue.indexOf('[');
  const start = objectStart === -1 ? arrayStart : arrayStart === -1 ? objectStart : Math.min(objectStart, arrayStart);
  if (start === -1) return null;

  const objectEnd = trimmedValue.lastIndexOf('}');
  const arrayEnd = trimmedValue.lastIndexOf(']');
  const end = Math.max(objectEnd, arrayEnd);
  if (end === -1 || end <= start) return null;

  return trimmedValue.slice(start, end + 1);
}

function parseModelPlan(rawValue) {
  const jsonBlock = extractJsonBlock(rawValue);
  if (!jsonBlock) {
    return null;
  }

  try {
    return JSON.parse(jsonBlock);
  } catch (_error) {
    return null;
  }
}

/**
 * Validates that the model-produced plan matches the expected schema:
 *   { tripName: string, summary: string, places: [{ destinationId, name, day }] }
 *
 * Returns the plan unchanged if valid, or null if the schema is violated.
 * Invalid plans are discarded so the caller falls through to the heuristic.
 *
 * @param {unknown} plan
 * @param {number} maxDays - The requested trip length; day numbers must be in [1..maxDays]
 */
function validatePlanSchema(plan, maxDays) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return null;

  // tripName must be a non-empty string
  if (typeof plan.tripName !== 'string' || !plan.tripName.trim()) return null;

  // summary must be a non-empty string
  if (typeof plan.summary !== 'string' || !plan.summary.trim()) return null;

  // places must be a non-empty array
  if (!Array.isArray(plan.places) || plan.places.length === 0) return null;

  // Each entry must have at least a name and a numeric day in [1..maxDays]
  for (const place of plan.places) {
    if (!place || typeof place !== 'object') return null;
    if (typeof place.name !== 'string' || !place.name.trim()) return null;
    const day = Number(place.day);
    if (!Number.isInteger(day) || day < 1 || day > maxDays) return null;
  }

  return plan;
}

function normalizeBudgetValue(budget) {
  const numericBudget = Number(budget);
  return Number.isFinite(numericBudget) && numericBudget > 0 ? numericBudget : 0;
}

function scoreDestination(destination, preferences) {
  let score = Number(destination.rating || 0) * 8;
  const normalizedTheme = preferences.theme.toLowerCase();
  const targetCategory = THEME_TO_CATEGORY[normalizedTheme];

  if (targetCategory && destination.category === targetCategory) {
    score += 45;
  }

  if (preferences.destinationLabel) {
    const haystack = [
      destination.name,
      destination.region,
      destination.shortDescription,
      destination.description,
      destination.location?.address,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const destinationTerms = preferences.destinationLabel.toLowerCase().split(/\s+/).filter(Boolean);
    score += destinationTerms.reduce(
      (total, term) => total + (haystack.includes(term) ? 14 : 0),
      0
    );
  }

  const budget = preferences.budget;
  if (budget > 0) {
    if (budget <= 15000 && destination.priceRange === 'Rs') score += 18;
    if (budget > 15000 && budget <= 35000 && destination.priceRange !== 'Rs Rs Rs') score += 12;
    if (budget > 35000) score += 8;
  }

  return score;
}

function buildHeuristicPlan(destinations, preferences) {
  const scoredDestinations = [...destinations]
    .map((destination) => ({ destination, score: scoreDestination(destination, preferences) }))
    .sort((left, right) => right.score - left.score);

  const desiredStopCount = Math.max(1, Math.min(preferences.days, 6));
  const selectedDestinations = scoredDestinations
    .slice(0, desiredStopCount)
    .map((entry) => entry.destination);

  if (selectedDestinations.length === 0) {
    return null;
  }

  const tripNameParts = [
    preferences.destinationLabel || 'Nepal',
    preferences.theme ? `${preferences.theme} escape` : 'smart itinerary',
  ].filter(Boolean);

  return {
    tripName: tripNameParts.join(' ').replace(/\s+/g, ' ').trim(),
    summary: `Balanced ${preferences.days}-day plan focused on ${preferences.theme || 'your interests'} with realistic stop sequencing.`,
    places: selectedDestinations.map((destination, index) => ({
      destinationId: destination._id.toString(),
      name: destination.name,
      day: index + 1,
      reason: destination.shortDescription || `Recommended ${destination.category.toLowerCase()} stop for this trip.`,
    })),
  };
}

function buildDestinationCatalog(destinations) {
  return destinations.slice(0, 24).map((destination) => ({
    id: destination._id.toString(),
    name: destination.name,
    category: destination.category,
    region: destination.region,
    duration: destination.duration,
    rating: destination.rating,
    shortDescription: destination.shortDescription,
    address: destination.location?.address,
  }));
}

function buildItineraryPrompt(destinationCatalog, preferences) {
  return [
    'Create a Nepal travel itinerary and respond with valid JSON only.',
    'JSON schema:',
    '{"tripName":"string","summary":"string","places":[{"destinationId":"string","name":"string","day":1,"reason":"string"}]}',
    `Days: ${preferences.days}`,
    `Budget NPR: ${preferences.budget || 'flexible'}`,
    `Theme: ${preferences.theme || 'mixed'}`,
    `Destination focus: ${preferences.destinationLabel || 'Nepal'}`,
    `Available destinations: ${JSON.stringify(destinationCatalog)}`,
    'Rules:',
    '- Use only destination IDs from the provided catalog.',
    '- Keep places array length at most the requested number of days.',
    '- Return plain JSON without markdown fences.',
  ].join('\n');
}

async function requestOpenAiCompatiblePlan({ apiBaseUrl, apiKey, model, headers = {}, prompt, maxDays = 14 }) {
  if (!apiBaseUrl || !model) {
    return null;
  }

  const response = await axios.post(
    `${apiBaseUrl}/chat/completions`,
    {
      model,
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: 'You are a travel itinerary planner that outputs strict JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...headers,
      },
      timeout: 30000,
    }
  );

  const parsed = parseModelPlan(response.data?.choices?.[0]?.message?.content);
  // Validate schema — reject structurally invalid plans before they reach resolvePlanPlaces
  return validatePlanSchema(parsed, maxDays);
}

async function requestOpenRouterPlan(destinations, preferences) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return null;
  }

  return requestOpenAiCompatiblePlan({
    apiBaseUrl: (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
    apiKey,
    model: process.env.OPENROUTER_MODEL || 'openrouter/free',
    headers: {
      'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || process.env.FRONTEND_URL || 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'Yatra',
    },
    prompt: buildItineraryPrompt(buildDestinationCatalog(destinations), preferences),
    maxDays: preferences.days,
  });
}

async function requestOllamaPlan(destinations, preferences) {
  return requestOpenAiCompatiblePlan({
    apiBaseUrl: (process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1').replace(/\/$/, ''),
    model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
    prompt: buildItineraryPrompt(buildDestinationCatalog(destinations), preferences),
    maxDays: preferences.days,
  });
}

async function requestOpenAiPlan(destinations, preferences) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return requestOpenAiCompatiblePlan({
    apiBaseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    apiKey,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    prompt: buildItineraryPrompt(buildDestinationCatalog(destinations), preferences),
    maxDays: preferences.days,
  });
}

function getProviderExecutionOrder() {
  const configuredOrder = String(process.env.AI_PROVIDER || 'auto').trim().toLowerCase();

  if (!configuredOrder || configuredOrder === 'auto') {
    return ['openrouter', 'ollama', 'openai', 'heuristic'];
  }

  const requestedProviders = configuredOrder
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!requestedProviders.includes('heuristic')) {
    requestedProviders.push('heuristic');
  }

  return requestedProviders;
}

async function requestProviderPlan(provider, destinations, preferences) {
  if (provider === 'openrouter') {
    return requestOpenRouterPlan(destinations, preferences);
  }

  if (provider === 'ollama') {
    return requestOllamaPlan(destinations, preferences);
  }

  if (provider === 'openai') {
    return requestOpenAiPlan(destinations, preferences);
  }

  if (provider === 'heuristic') {
    return buildHeuristicPlan(destinations, preferences);
  }

  return null;
}

function resolvePlanPlaces(plan, destinations) {
  if (!plan?.places || !Array.isArray(plan.places)) {
    return [];
  }

  const destinationsById = new Map(destinations.map((destination) => [destination._id.toString(), destination]));
  const destinationsByName = new Map(destinations.map((destination) => [destination.name.toLowerCase(), destination]));
  const seenDestinations = new Set();

  return plan.places
    .map((place, index) => {
      const explicitId = String(place.destinationId || '').trim();
      const explicitName = String(place.name || '').trim().toLowerCase();
      const destination = destinationsById.get(explicitId) || destinationsByName.get(explicitName) || null;

      if (!destination || seenDestinations.has(destination._id.toString())) {
        return null;
      }

      seenDestinations.add(destination._id.toString());
      return {
        destination,
        day: Number(place.day) > 0 ? Number(place.day) : index + 1,
      };
    })
    .filter(Boolean);
}

async function populateTrip(tripId) {
  return Trip.findById(tripId)
    .populate('places.destination', 'name images location category duration rating shortDescription')
    .lean();
}

exports.generateItinerary = async (req, res) => {
  try {
    const days = Math.max(1, Math.min(14, Number(req.body.days) || 0));
    const budget = normalizeBudgetValue(req.body.budget);
    const theme = String(req.body.theme || 'culture').trim();
    const destinationLabel = String(req.body.destination || 'Nepal').trim();

    if (!days) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid number of days',
      });
    }

    const destinations = await Destination.find({
      published: true,
      verificationStatus: 'approved',
    })
      .select('name category region shortDescription description duration rating priceRange location images')
      .lean();

    if (destinations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No destinations are available for itinerary generation',
      });
    }

    const preferences = { days, budget, theme, destinationLabel };
    let plan = null;
    let provider = 'heuristic';
    const providerOrder = getProviderExecutionOrder();

    for (const candidateProvider of providerOrder) {
      try {
        plan = await requestProviderPlan(candidateProvider, destinations, preferences);
        if (plan) {
          provider = candidateProvider;
          break;
        }
      } catch (error) {
        console.warn(`AI itinerary provider "${candidateProvider}" failed, trying next fallback: ${error.message}`);
      }
    }

    if (!plan) {
      plan = buildHeuristicPlan(destinations, preferences);
    }

    const resolvedPlaces = resolvePlanPlaces(plan, destinations);
    const fallbackPlan = buildHeuristicPlan(destinations, preferences);
    const finalPlaces = resolvedPlaces.length > 0
      ? resolvedPlaces
      : resolvePlanPlaces(fallbackPlan, destinations);

    if (finalPlaces.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Unable to generate a usable itinerary for the selected constraints',
      });
    }

    const trip = await Trip.create({
      user: req.user.id,
      name: String(plan?.tripName || fallbackPlan.tripName || 'AI-generated itinerary').trim(),
      places: finalPlaces.map((place, index) => ({
        destination: place.destination._id,
        day: index + 1,
        order: index,
      })),
    });

    const populatedTrip = await populateTrip(trip._id);

    res.status(201).json({
      success: true,
      message: 'AI itinerary generated successfully',
      provider,
      data: populatedTrip,
      generatedPlan: {
        tripName: plan?.tripName || fallbackPlan.tripName,
        summary: plan?.summary || fallbackPlan.summary,
        places: finalPlaces.map((place, index) => ({
          destinationId: place.destination._id.toString(),
          name: place.destination.name,
          day: index + 1,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI itinerary',
      error: error.message,
    });
  }
};
