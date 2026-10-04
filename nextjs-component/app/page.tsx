import React from 'react';
import VideoFeed, { DEFAULT_PLACEHOLDER_VIDEOS, fetchMockVideosPage } from '../VideoFeed';

export default function FeedPage() {
  // Infinite scroll callback to fetch video batches
  const handleFetchVideos = async (page: number) => {
    return fetchMockVideosPage(page, 3);
  };

  return (
    <main className="w-full h-screen bg-black flex items-center justify-center">
      <VideoFeed 
        initialVideos={DEFAULT_PLACEHOLDER_VIDEOS} 
        fetchVideos={handleFetchVideos}
      />
    </main>
  );
}
