export interface BuildTemplate {
  id: string;
  name: string;
  description: string;
  tier: 'budget' | 'midrange' | 'highend' | 'pro';
  discipline: string;
  estimatedCost: { min: number; max: number; currency: string };
  parts: {
    categorySlot: string;
    productSlug?: string;
    suggestion: string;
  }[];
}

export const BUILD_TEMPLATES: BuildTemplate[] = [
  {
    id: 'budget-gt',
    name: 'Budget GT Setup',
    description: 'A solid entry-level rig for GT racing. Great value without compromising on feel.',
    tier: 'budget',
    discipline: 'GT',
    estimatedCost: { min: 400, max: 700, currency: 'GBP' },
    parts: [
      { categorySlot: 'WHEELBASE', suggestion: 'Logitech G29/G923 or Thrustmaster T300' },
      { categorySlot: 'PEDALS', suggestion: 'Included with wheelbase bundle' },
      { categorySlot: 'COCKPIT', suggestion: 'Playseat Challenge X or Next Level Racing Lite' },
      { categorySlot: 'SEAT', suggestion: 'Included with cockpit' },
      { categorySlot: 'DISPLAY', suggestion: 'Existing monitor or TV' },
    ],
  },
  {
    id: 'midrange-gt',
    name: 'Mid-Range GT Rig',
    description: 'Direct drive power with load cell pedals. The sweet spot for serious sim racers.',
    tier: 'midrange',
    discipline: 'GT',
    estimatedCost: { min: 1200, max: 2000, currency: 'GBP' },
    parts: [
      { categorySlot: 'WHEELBASE', suggestion: 'Fanatec CSL DD (8Nm) or Moza R9' },
      { categorySlot: 'WHEEL_RIM', suggestion: 'Fanatec CSL Steering Wheel or Moza ES' },
      { categorySlot: 'PEDALS', suggestion: 'Fanatec CSL Pedals LC or Moza CRP' },
      { categorySlot: 'COCKPIT', suggestion: 'Sim-Lab GT1 Evo or Trak Racer TR80' },
      { categorySlot: 'SEAT', suggestion: 'Any bucket seat or NRG FRP' },
      { categorySlot: 'DISPLAY', suggestion: 'Samsung Odyssey G5 34" ultrawide' },
    ],
  },
  {
    id: 'highend-formula',
    name: 'High-End Formula Cockpit',
    description: 'Premium direct drive with formula-style wheel. Track day simulation at home.',
    tier: 'highend',
    discipline: 'Formula',
    estimatedCost: { min: 3000, max: 5000, currency: 'GBP' },
    parts: [
      { categorySlot: 'WHEELBASE', suggestion: 'Simucube 2 Sport or Fanatec DD2' },
      { categorySlot: 'WHEEL_RIM', suggestion: 'Cube Controls Formula Sport or Ascher Racing F28' },
      { categorySlot: 'PEDALS', suggestion: 'Heusinkveld Sprint or Simtag Hydraulic' },
      { categorySlot: 'COCKPIT', suggestion: 'Sim-Lab P1-X or Advanced SimRacing ASR3' },
      { categorySlot: 'SEAT', suggestion: 'Sparco or OMP FIA seat' },
      { categorySlot: 'SHIFTER', suggestion: 'Heusinkveld Sequential or Aiologs' },
      { categorySlot: 'DISPLAY', suggestion: 'Samsung Odyssey G9 49" or Triple 27" setup' },
    ],
  },
  {
    id: 'pro-endurance',
    name: 'Pro Endurance Setup',
    description: 'No compromises. Used by esports teams and professional sim racers.',
    tier: 'pro',
    discipline: 'Multi',
    estimatedCost: { min: 6000, max: 12000, currency: 'GBP' },
    parts: [
      { categorySlot: 'WHEELBASE', suggestion: 'Simucube 2 Ultimate or VRS DirectForce Pro' },
      { categorySlot: 'WHEEL_RIM', suggestion: 'Cube Controls GT Pro Zero or Precision Sim Engineering' },
      { categorySlot: 'PEDALS', suggestion: 'Heusinkveld Ultimate+ or Simtag Hydraulic Pro' },
      { categorySlot: 'COCKPIT', suggestion: 'Sim-Lab P1-X with keyboard tray and monitor mount' },
      { categorySlot: 'SEAT', suggestion: 'Racetech RT4119 or Sparco EVO QRT' },
      { categorySlot: 'SHIFTER', suggestion: 'Heusinkveld Sequential + H-Pattern combo' },
      { categorySlot: 'EXTRAS', suggestion: 'SimHub dashboard, button box, bass shakers' },
      { categorySlot: 'DISPLAY', suggestion: 'VR (Pimax Crystal) or Triple 32" 1440p' },
    ],
  },
];
