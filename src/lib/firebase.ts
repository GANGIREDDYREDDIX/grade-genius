import { createClient } from '@supabase/supabase-js';

// Supabase configuration via Vite environment variables
// Set in .env.local for local dev and in Netlify environment variables for production.
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface FeedbackData {
  rating: number;
  category: 'bug' | 'feature' | 'general' | 'performance' | 'ui';
  message: string;
  email?: string;
  timestamp: string;
  userAgent: string;
}

const ALLOWED_CATEGORIES = new Set<FeedbackData['category']>(['bug', 'feature', 'general', 'performance', 'ui']);
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

// Submit feedback to Supabase
export const submitFeedback = async (feedback: Omit<FeedbackData, 'timestamp' | 'userAgent'>) => {
  try {
    const rating = Number(feedback.rating);
    const category = feedback.category;
    const message = feedback.message.trim();
    const email = feedback.email?.trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error('Invalid rating value.');
    }

    if (!ALLOWED_CATEGORIES.has(category)) {
      throw new Error('Invalid feedback category.');
    }

    if (!message || message.length > 2000) {
      throw new Error('Message must be between 1 and 2000 characters.');
    }

    if (email && !EMAIL_REGEX.test(email)) {
      throw new Error('Invalid email address.');
    }

    const data = {
      rating,
      category,
      message,
      email: email || null,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
    };
    
    console.log('Submitting feedback:', data);
    
    const { error } = await supabase
      .from('feedback')
      .insert([data]);
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message || 'Failed to submit feedback');
    }
    
    console.log('Feedback submitted successfully');
    return { success: true };
  } catch (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }
};

export default supabase;
