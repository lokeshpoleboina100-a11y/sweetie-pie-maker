import type { Database } from '@/integrations/supabase/types';

export type DbJobCategory = Database['public']['Enums']['job_category'];

export interface ServiceItem {
  slug: string;
  name: string;
}

export interface CategoryGroup {
  id: DbJobCategory;
  name: string;
  icon: string;
  description: string;
  services: ServiceItem[];
}

const s = (name: string): ServiceItem => ({
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
  name,
});

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'home_services',
    name: 'Home Services',
    icon: '🏠',
    description: 'Repairs and upkeep for your home',
    services: ['Plumber', 'Electrician', 'AC Repair', 'Cleaning', 'Carpenter', 'Painter', 'Appliance Repair'].map(s),
  },
  {
    id: 'automotive',
    name: 'Automotive',
    icon: '🚗',
    description: 'Care and repair for your vehicle',
    services: ['Car Repair', 'Bike Repair', 'Car Wash', 'Tyre/Puncture Repair', 'Battery Assistance', 'Vehicle Servicing'].map(s),
  },
  {
    id: 'technology',
    name: 'Technology',
    icon: '💻',
    description: 'Devices, networks and software help',
    services: ['Laptop Repair', 'Mobile Repair', 'CCTV Installation', 'Wi-Fi/Router Setup', 'Computer Support', 'Software Installation'].map(s),
  },
  {
    id: 'education',
    name: 'Education',
    icon: '📚',
    description: 'Tutors, coaching and classes',
    services: ['Home Tutor', 'Online Tutor', 'Exam Coaching', 'Language Classes', 'Music Teacher', 'Coding Teacher'].map(s),
  },
  {
    id: 'beauty_wellness',
    name: 'Beauty & Wellness',
    icon: '💄',
    description: 'Grooming, fitness and self-care',
    services: ['Salon at Home', 'Makeup Artist', 'Fitness Trainer', 'Yoga Trainer', 'Personal Grooming'].map(s),
  },
  {
    id: 'moving_delivery',
    name: 'Moving & Delivery',
    icon: '📦',
    description: 'Shifting, lifting and local delivery',
    services: ['Packers & Movers', 'Local Delivery', 'Loading/Unloading', 'Furniture Moving', 'Courier Assistance'].map(s),
  },
  {
    id: 'gardening_outdoor',
    name: 'Gardening & Outdoor',
    icon: '🌱',
    description: 'Green spaces kept in shape',
    services: ['Gardener', 'Landscaping', 'Lawn Care', 'Tree Trimming', 'Garden Maintenance'].map(s),
  },
  {
    id: 'pet_services',
    name: 'Pet Services',
    icon: '🐕',
    description: 'Care for your furry family',
    services: ['Pet Grooming', 'Pet Walking', 'Pet Sitting', 'Pet Training'].map(s),
  },
  {
    id: 'events_creative',
    name: 'Events & Creative',
    icon: '🎉',
    description: 'Make your occasion memorable',
    services: ['Photographer', 'Videographer', 'Event Decoration', 'Catering', 'DJ', 'Event Planner'].map(s),
  },
  {
    id: 'professional_services',
    name: 'Professional Services',
    icon: '👨‍💼',
    description: 'Business, design and expert help',
    services: ['Accountant', 'Graphic Designer', 'Video Editor', 'Digital Marketing', 'Web Developer', 'Legal/Documentation Assistance'].map(s),
  },
];

/** Older jobs used one enum value per service — map them into the new grouping. */
export const LEGACY_CATEGORY_MAP: Partial<Record<DbJobCategory, { group: DbJobCategory; service: string }>> = {
  ac_repair: { group: 'home_services', service: 'AC Repair' },
  refrigerator_repair: { group: 'home_services', service: 'Appliance Repair' },
  washing_machine_repair: { group: 'home_services', service: 'Appliance Repair' },
  appliance_repair: { group: 'home_services', service: 'Appliance Repair' },
  plumbing: { group: 'home_services', service: 'Plumber' },
  electrical: { group: 'home_services', service: 'Electrician' },
  carpentry: { group: 'home_services', service: 'Carpenter' },
  painting: { group: 'home_services', service: 'Painter' },
  cleaning: { group: 'home_services', service: 'Cleaning' },
  repair: { group: 'home_services', service: 'Appliance Repair' },
  construction: { group: 'home_services', service: 'Carpenter' },
  delivery: { group: 'moving_delivery', service: 'Local Delivery' },
  freelance: { group: 'professional_services', service: 'Graphic Designer' },
};

export function getGroup(id?: string | null): CategoryGroup | undefined {
  if (!id) return undefined;
  const direct = CATEGORY_GROUPS.find((g) => g.id === id);
  if (direct) return direct;
  const legacy = LEGACY_CATEGORY_MAP[id as DbJobCategory];
  return legacy ? CATEGORY_GROUPS.find((g) => g.id === legacy.group) : undefined;
}

/** Display label + icon for any job, old or new. */
export function describeJobCategory(category?: string | null, service?: string | null) {
  const group = getGroup(category);
  const legacy = LEGACY_CATEGORY_MAP[category as DbJobCategory];
  return {
    icon: group?.icon ?? '📋',
    group: group?.name ?? 'Other',
    service: service || legacy?.service || null,
  };
}

export interface FlatService extends ServiceItem {
  groupId: DbJobCategory;
  groupName: string;
  groupIcon: string;
}

export const ALL_SERVICES: FlatService[] = CATEGORY_GROUPS.flatMap((g) =>
  g.services.map((svc) => ({ ...svc, groupId: g.id, groupName: g.name, groupIcon: g.icon }))
);

/** Fuzzy search across category names, services and descriptions. */
export function searchServices(query: string, limit = 8): FlatService[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/).filter((w) => !['near', 'me', 'in', 'a', 'for', 'my'].includes(w));
  const scored = ALL_SERVICES.map((item) => {
    const hay = `${item.name} ${item.groupName}`.toLowerCase();
    let score = 0;
    if (hay.includes(q)) score += 5;
    for (const w of words) if (hay.includes(w)) score += 2;
    if (item.name.toLowerCase().startsWith(q)) score += 3;
    return { item, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((r) => r.item);
}
