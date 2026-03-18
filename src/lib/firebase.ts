const NO_STORAGE_MODE = true;

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

// Submit feedback without storing data (validation only)
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

    if (!NO_STORAGE_MODE) {
      throw new Error('Storage mode is enabled unexpectedly.');
    }

    // Intentionally do not persist or transmit user feedback in no-storage mode.
    console.log('Feedback received in no-storage mode:', {
      ...data,
      message: `[${message.length} chars]`,
      email: email ? '[provided]' : null,
    });

    return { success: true };
  } catch (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }
};

export default null;
