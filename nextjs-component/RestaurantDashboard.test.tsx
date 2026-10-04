import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RestaurantDashboard from './RestaurantDashboard';

describe('RestaurantDashboard Component (Next.js 14 / Shadcn UI Dark Mode)', () => {
  test('renders dashboard header and stats overview', () => {
    render(<RestaurantDashboard />);

    expect(screen.getByText(/Studio Restauration Fidfud/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Plats/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Vidéos Verticales/i).length).toBeGreaterThan(0);
  });

  test('displays initial dishes and allows availability toggling', () => {
    render(<RestaurantDashboard />);

    // Check presence of initial dish
    expect(screen.getByText(/Smash Burger Gold Supreme/i)).toBeInTheDocument();

    // Find availability toggle button
    const stockButtons = screen.getAllByRole('button', { name: /Changer disponibilité/i });
    expect(stockButtons.length).toBeGreaterThan(0);

    // Toggle availability
    fireEvent.click(stockButtons[0]);
    expect(screen.getByText(/Disponibilité de/i)).toBeInTheDocument();
  });

  test('allows opening dish modal and adding a new dish (CRUD)', async () => {
    render(<RestaurantDashboard />);

    // Click "Nouveau Plat" button in header
    const newDishBtns = screen.getAllByRole('button', { name: /Nouveau Plat/i });
    fireEvent.click(newDishBtns[0]);

    // Verify modal appears
    expect(screen.getByText(/Nouveau Plat au Menu/i)).toBeInTheDocument();

    // Fill form using aria-labels
    const nameInput = screen.getByLabelText(/Nom de la spécialité/i);
    const priceInput = screen.getByLabelText(/Prix en euros/i);

    fireEvent.change(nameInput, { target: { value: 'Tacos Birria Supreme' } });
    fireEvent.change(priceInput, { target: { value: '14.50' } });

    // Submit form
    const form = nameInput.closest('form')!;
    fireEvent.submit(form);

    // Check if new dish appears in DOM (card + toast)
    await waitFor(() => {
      const items = screen.getAllByText(/Tacos Birria Supreme/i);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  test('switches to Vertical Videos tab and displays 9:16 video cards with dish associations', () => {
    render(<RestaurantDashboard />);

    // Switch tab to Vidéos Verticales
    const videoTab = screen.getByRole('button', { name: /Vidéos Verticales 9:16/i });
    fireEvent.click(videoTab);

    // Check video titles & dish badges
    expect(screen.getByText(/Bibliothèque de Vidéos Verticales 9:16/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Plat Associé/i).length).toBeGreaterThan(0);
  });

  test('allows uploading a new vertical video and linking it to a dish', async () => {
    render(<RestaurantDashboard />);

    // Switch to videos tab
    const videoTab = screen.getByRole('button', { name: /Vidéos Verticales 9:16/i });
    fireEvent.click(videoTab);

    // Click upload video
    const uploadBtn = screen.getByRole('button', { name: /Uploader Vidéo 9:16/i });
    fireEvent.click(uploadBtn);

    // Fill video title
    const titleInput = screen.getByLabelText(/Titre \/ Légende Vidéo/i);
    fireEvent.change(titleInput, { target: { value: 'Recette Secret Pizza Truffe 450°C' } });

    // Submit form
    const form = titleInput.closest('form')!;
    fireEvent.submit(form);

    // Verify video appears
    await waitFor(() => {
      const items = screen.getAllByText(/Recette Secret Pizza Truffe 450°C/i);
      expect(items.length).toBeGreaterThan(0);
    });
  });
});
