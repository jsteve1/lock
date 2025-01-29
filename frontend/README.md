# Keep Clone Frontend

A lightweight, responsive frontend for the Keep Clone application built with Preact and TailwindCSS.

## Features

- 🎨 Modern, responsive UI
- 🌙 Dark mode support
- 📝 Rich note editing
- 📎 File attachments
- 🔒 Secure authentication
- 📱 Mobile-friendly design

## Tech Stack

- Preact for UI components
- TailwindCSS for styling
- Vite for build tooling
- TypeScript for type safety
- Axios for API communication

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/keepclone.git
   cd keepclone/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```
   Update the environment variables as needed.

4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

### Deployment

The application is configured for automatic deployment to GitHub Pages using GitHub Actions. Simply push to the `main` branch, and the workflow will handle the deployment.

## Development

### Project Structure

```
frontend/
├── src/
│   ├── components/    # Reusable UI components
│   ├── services/      # API and utility services
│   ├── app.tsx        # Main application component
│   └── main.tsx       # Application entry point
├── public/            # Static assets
└── index.html         # HTML template
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run deploy` - Deploy to GitHub Pages

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 