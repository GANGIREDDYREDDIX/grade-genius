import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { submitFeedback } from '@/lib/firebase';
import { MessageSquare } from 'lucide-react';

interface FeedbackForm {
  rating: string;
  category: 'bug' | 'feature' | 'general' | 'performance' | 'ui';
  message: string;
  email: string;
}

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export function FeedbackModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FeedbackForm>({
    rating: '5',
    category: 'general',
    message: '',
    email: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const message = form.message.trim();
    const email = form.email.trim();

    if (!message) {
      alert('Please enter your feedback');
      return;
    }

    if (message.length > 2000) {
      alert('Message is too long. Please keep it under 2000 characters.');
      return;
    }

    if (email && !EMAIL_REGEX.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await submitFeedback({
        rating: parseInt(form.rating, 10),
        category: form.category,
        message,
        email: email || undefined,
      });

      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setForm({ rating: '5', category: 'general', message: '', email: '' });
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit feedback. Please try again.';
      alert(message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed right-4 md:right-6 bottom-6 md:bottom-8 z-50 h-12 w-12 rounded-full shadow-lg"
          aria-label="Send feedback"
          title="Send us your feedback"
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send us your feedback</DialogTitle>
          <DialogDescription>
            Help us improve Grade Genius by sharing your thoughts
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="text-green-600 text-3xl">✓</div>
            <p className="text-center font-medium">Thank you for your feedback!</p>
            <p className="text-center text-sm text-gray-500">
              We appreciate your input and will review it soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Rating */}
            <div className="space-y-2">
              <Label htmlFor="rating">How would you rate this app?</Label>
              <Select value={form.rating} onValueChange={(value) => setForm({ ...form, rating: value })}>
                <SelectTrigger id="rating">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Not helpful</SelectItem>
                  <SelectItem value="2">2 - Needs improvement</SelectItem>
                  <SelectItem value="3">3 - Okay</SelectItem>
                  <SelectItem value="4">4 - Good</SelectItem>
                  <SelectItem value="5">5 - Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Feedback category</Label>
              <Select value={form.category} onValueChange={(value: any) => setForm({ ...form, category: value })}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General feedback</SelectItem>
                  <SelectItem value="bug">Report a bug</SelectItem>
                  <SelectItem value="feature">Feature request</SelectItem>
                  <SelectItem value="ui">UI/UX improvement</SelectItem>
                  <SelectItem value="performance">Performance issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Your message</Label>
              <Textarea
                id="message"
                placeholder="Tell us what you think..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="min-h-32 resize-none"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional - to reply)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Feedback'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
