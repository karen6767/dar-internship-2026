# Project Guidelines

## Project Overview

This project is a frontend chat interface for an AI interview preparation application.

## Tech Stack

- React
- Vite
- Tailwind CSS
- JavaScript

## Project Structure

- `src/components/chat/` - Chat UI components
- `src/pages/` - Application pages
- `src/services/` - API and backend communication
- `src/App.jsx` - Main application component

## Development Guidelines

- Keep components small and reusable.
- Keep API/backend communication inside `src/services/`.
- Do not put API logic directly inside UI components.
- Use React state for chat interactions.
- Keep the existing UI consistent unless a task requires changing it.
- Use Tailwind CSS for styling.
- Avoid unnecessary dependencies.

## API Layer

The frontend currently uses a fake API response through:

`src/services/api.js`

When the backend is ready, replace the fake implementation with the real API call while keeping the same `sendMessage()` interface whenever possible.

## Chat Flow

User message:

ChatInput → App → API Service → AI Response → ChatMessages

## Git Guidelines

- Create a feature branch for frontend work.
- Make small, meaningful commits.
- Do not commit secrets, API keys, or `.env` files.