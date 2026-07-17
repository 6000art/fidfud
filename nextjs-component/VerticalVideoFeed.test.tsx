import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import VerticalVideoFeed, { NextJsVideo } from './VerticalVideoFeed';

// Mock Lucide-react icons to simplify rendering tests
jest.mock('lucide-react', () => ({
  Volume2: () => <div data-testid="volume-on" />,
  VolumeX: () => <div data-testid="volume-off" />,
  Heart: ({ className }: any) => <div data-testid="heart-icon" className={className} />,
  MessageSquare: () => <div data-testid="message-icon" />,
  Gift: () => <div data-testid="gift-icon" />,
  Share2: () => <div data-testid="share-icon" />,
  ShoppingBag: () => <div data-testid="bag-icon" />,
  X: () => <div data-testid="close-icon" />,
  Check: () => <div data-testid="check-icon" />,
  Star: () => <div data-testid="star-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />
}));

const mockVideos: NextJsVideo[] = [
  {
    id: 'vid-1',
    restaurantId: 'rest-1',
    restaurantName: 'Slab Smash Burger',
    restaurantLogoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=50',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-frying-burgers-on-a-hot-plate-42240-large.mp4',
    title: 'Smash croustillant double bacon cheddar fondu en direct ! 🍔✨',
    likesCount: 256,
    commentsCount: 14,
    associatedDish: {
      id: 'dish-1',
      name: 'Smash Burger Gold',
      description: 'Double beef patty smashed thin, extra gold cheddar, signature smoky sauce.',
      price: 12.90,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
      isAvailable: true
    }
  }
];

describe('VerticalVideoFeed Component (Next.js 14 / Tailwind CSS)', () => {
  beforeEach(() => {
    // Mock HTML5 Video element properties
    window.HTMLVideoElement.prototype.play = jest.fn().mockImplementation(() => Promise.resolve());
    window.HTMLVideoElement.prototype.pause = jest.fn();
  });

  it('renders the video feed with the video element, restaurant details and captions', () => {
    render(<VerticalVideoFeed initialVideos={mockVideos} />);
    
    // Check if the restaurant name is visible
    expect(screen.getByText('Slab Smash Burger')).toBeInTheDocument();
    
    // Check if video caption/title is visible
    expect(screen.getByText(/Smash croustillant double/i)).toBeInTheDocument();
  });

  it('initially displays the audio muted state and toggles to unmuted when clicked', () => {
    render(<VerticalVideoFeed initialVideos={mockVideos} />);
    
    // Audio button should display the mute/off icon first (due to our default isMuted = true)
    expect(screen.getByTestId('volume-off')).toBeInTheDocument();

    const muteBtn = screen.getByTestId('volume-off').parentElement;
    expect(muteBtn).toBeInTheDocument();

    if (muteBtn) {
      fireEvent.click(muteBtn);
    }

    // Now volume-on should be rendered
    expect(screen.getByTestId('volume-on')).toBeInTheDocument();
  });

  it('handles heart/like button clicks and increments/decrements likes count accordingly', () => {
    render(<VerticalVideoFeed initialVideos={mockVideos} />);
    
    // Initial likes count
    expect(screen.getByText('256')).toBeInTheDocument();

    // Click heart button
    const heartBtn = screen.getByTestId('heart-icon').parentElement;
    expect(heartBtn).toBeInTheDocument();

    if (heartBtn) {
      fireEvent.click(heartBtn);
    }

    // Should increment to 257
    expect(screen.getByText('257')).toBeInTheDocument();
  });

  it('schedules and reveals the dish order pop-up suggestion after the 5 seconds threshold', () => {
    jest.useFakeTimers();
    render(<VerticalVideoFeed initialVideos={mockVideos} />);

    // Initially the delayed suggestion popup is hidden
    expect(screen.queryByText('SUGGESTION DU CHEF')).not.toBeInTheDocument();

    // Fast-forward 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // It should now reveal the popup
    expect(screen.getByText('SUGGESTION DU CHEF')).toBeInTheDocument();
    expect(screen.getByText('Smash Burger Gold')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('opens the sliding streetwear drawer when the "Commander" or "MENU" button is pressed', () => {
    jest.useFakeTimers();
    render(<VerticalVideoFeed initialVideos={mockVideos} />);

    // Advance 5 seconds to show the popup
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    const commanderBtn = screen.getByText('Commander');
    fireEvent.click(commanderBtn);

    // Slide up drawer is opened and shows details of the dish
    expect(screen.getByText('PRIX UNITAIRE')).toBeInTheDocument();
    expect(screen.getByText('12.90 €')).toBeInTheDocument();

    jest.useRealTimers();
  });
});
