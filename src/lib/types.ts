export type UserRole = 'customer' | 'worker';

export type JobCategory = 'repair' | 'construction' | 'delivery' | 'freelance' | 'cleaning' | 'plumbing' | 'electrical' | 'painting' | 'other';

export type JobStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export type BidStatus = 'pending' | 'accepted' | 'rejected';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  rating: number;
  reviewCount: number;
  location?: { lat: number; lng: number };
}

export interface Worker extends User {
  role: 'worker';
  skills: JobCategory[];
  experience: string;
  serviceRadius: number;
  isVerified: boolean;
  completedJobs: number;
  earnings: number;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  category: JobCategory;
  budget: number;
  budgetType: 'fixed' | 'negotiable';
  status: JobStatus;
  location: { lat: number; lng: number; address: string };
  images: string[];
  customerId: string;
  customerName: string;
  createdAt: string;
  distance?: number;
  bidCount: number;
  isInstant?: boolean;
}

export interface Bid {
  id: string;
  jobId: string;
  workerId: string;
  workerName: string;
  workerAvatar?: string;
  workerRating: number;
  workerReviewCount: number;
  price: number;
  timeEstimate: string;
  message: string;
  status: BidStatus;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAt: string;
}

export const CATEGORY_LABELS: Record<JobCategory, string> = {
  repair: 'Repair',
  construction: 'Construction',
  delivery: 'Delivery',
  freelance: 'Freelance',
  cleaning: 'Cleaning',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  painting: 'Painting',
  other: 'Other',
};

export const CATEGORY_ICONS: Record<JobCategory, string> = {
  repair: '🔧',
  construction: '🏗️',
  delivery: '🚚',
  freelance: '💼',
  cleaning: '🧹',
  plumbing: '🔩',
  electrical: '⚡',
  painting: '🎨',
  other: '📋',
};
