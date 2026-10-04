import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VideoFeed, { DEFAULT_PLACEHOLDER_VIDEOS } from './VideoFeed';

// Mock Lucide-react icons for test environment
jest.mock('lucide-react', () => ({
  Volume2: () => <div data-testid="volume-on" />,
  VolumeX: () => <div data-testid="volume-off" />,
  Heart: ({ className }: any) => <div data-testid="heart-icon" className={className} />,
  MessageSquare: () => <div data-testid="message-icon" />,
  Share2: () => <div data-testid="share-icon" />,
  Bookmark: () => <div data-testid="bookmark-icon" />,
  ShoppingBag: () => <div data-testid="shopping-bag" />,
  Play: () => <div data-testid="play-icon" />,
  Pause: () => <div data-testid="pause-icon" />,
  ChevronDown: () => <div data-testid="chevron-down" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Music: () => <div data-testid="music-icon" />,
  Check: () => <div data-testid="check-icon" />
}));

describe('VideoFeed Component (Next.js / Tailwind CSS)', () => {
  beforeEach(() => {
    window.HTMLVideoElement.prototype.play = jest.fn().mockImplementation(() => Promise.resolve());
    window.HTMLVideoElement.prototype.pause = jest.fn();
  });

  it('renders the initial videos list and displays restaurant title & dish card', () => {
    render(<VideoFeed initialVideos={DEFAULT_PLACEHOLDER_VIDEOS} />);

    expect(screen.getByText(/Double Smash Burger Truffe/i)).toBeInTheDocument();
    expect(screen.getByText(/@Smashed Lab Paris/i)).toBeInTheDocument();
    expect(screen.getByText('Smash Truffe Deluxe')).toBeInTheDocument();
  });

  it('toggles audio mute/unmute when clicking the volume button', () => {
    render(<VideoFeed initialVideos={DEFAULT_PLACEHOLDER_VIDEOS} />);

    const muteBtn = screen.getAllByTitle('Activer le son')[0];
    expect(muteBtn).toBeInTheDocument();

    fireEvent.click(muteBtn);

    expect(screen.getAllByTestId('volume-on')[0]).toBeInTheDocument();
  });

  it('handles heart/like interactions properly', () => {
    render(<VideoFeed initialVideos={DEFAULT_PLACEHOLDER_VIDEOS} />);

    const heartIcon = screen.getAllByTestId('heart-icon')[0];
    const likeBtn = heartIcon.closest('button')!;
    expect(likeBtn).toBeInTheDocument();

    fireEvent.click(likeBtn);

    // Heart icon becomes filled/active with red styling
    expect(heartIcon).toHaveClass('fill-[#FF3B30]');
  });
});
