// ============================================================================
// Thread Blueprint Engine — category-driven form field configuration
// ============================================================================

export type BlueprintCategory =
  | 'BUILD_ADVICE'
  | 'DIY_MODS'
  | 'SHOWROOM'
  | 'TELEMETRY'
  | 'DEALS'
  | 'GENERAL';

export interface BlueprintFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'url-list' | 'bom';
  placeholder?: string;
  required?: boolean;
  options?: string[];
  validate?: (value: unknown) => string | null;
  monospace?: boolean;
  defaultValue?: unknown;
}

export interface CategoryConfig {
  label: string;
  description: string;
  color: string;
  fields: BlueprintFieldConfig[];
}

export const CATEGORY_BLUEPRINTS: Record<BlueprintCategory, CategoryConfig> = {
  BUILD_ADVICE: {
    label: 'Build Advice',
    description: 'Get feedback on your rig build or planned setup',
    color: '#00FFA3',
    fields: [
      {
        key: 'buildPermalink',
        label: 'RigBuilder Permalink',
        type: 'text',
        placeholder: '/list/abc123',
        required: false,
        validate: (v) => {
          if (!v) return null;
          return String(v).startsWith('/list/') ? null : 'Must be a /list/… permalink';
        },
      },
    ],
  },

  DIY_MODS: {
    label: 'DIY Mods',
    description: 'Share custom modifications and hardware hacks',
    color: '#FFB020',
    fields: [
      {
        key: 'toolsRequired',
        label: 'Tools Required',
        type: 'textarea',
        placeholder: 'One tool per line',
        required: false,
        monospace: true,
      },
      {
        key: 'billOfMaterials',
        label: 'Bill of Materials',
        type: 'bom',
        required: false,
      },
    ],
  },

  SHOWROOM: {
    label: 'Showroom',
    description: 'Show off your completed rig with photos',
    color: '#6E56FF',
    fields: [
      {
        key: 'imageUrls',
        label: 'Image URLs',
        type: 'url-list',
        placeholder: 'https://…',
        required: true,
        validate: (v) => {
          const arr = v as string[];
          if (!arr || arr.length === 0) return 'At least one image URL is required';
          return null;
        },
      },
    ],
  },

  TELEMETRY: {
    label: 'Telemetry',
    description: 'Share and discuss telemetry configs and settings',
    color: '#00B8FF',
    fields: [
      {
        key: 'profileType',
        label: 'Profile Type',
        type: 'select',
        options: ['SimHub', 'LFE', 'Other'],
        required: false,
        defaultValue: 'SimHub',
      },
      {
        key: 'codeSnippet',
        label: 'Configuration',
        type: 'textarea',
        placeholder: 'Paste your JSON / settings here…',
        required: false,
        monospace: true,
      },
    ],
  },

  DEALS: {
    label: 'Deals',
    description: 'Post and discuss hardware deals and sales',
    color: '#FF3366',
    fields: [
      {
        key: 'dealStatus',
        label: 'Deal Status',
        type: 'select',
        options: ['Active', 'Expired'],
        required: false,
        defaultValue: 'Active',
      },
      {
        key: 'price',
        label: 'Price',
        type: 'number',
        placeholder: '0.00',
        required: false,
      },
      {
        key: 'currency',
        label: 'Currency',
        type: 'text',
        placeholder: 'USD',
        required: false,
        defaultValue: 'USD',
      },
    ],
  },

  GENERAL: {
    label: 'General',
    description: 'Everything else — questions, chat, off-topic',
    color: '#7878A0',
    fields: [],
  },
};

export const CATEGORY_LIST: BlueprintCategory[] = [
  'BUILD_ADVICE',
  'DIY_MODS',
  'SHOWROOM',
  'TELEMETRY',
  'DEALS',
  'GENERAL',
];
