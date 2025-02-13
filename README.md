# NoteLocker

A secure, end-to-end encrypted note-taking application with a focus on privacy and security. Built with FastAPI, Preact, and modern web technologies.

![NoteLocker Application Screenshot](screenshot.png)

## Features

- 🔒 Secure authentication and authorization
- 📝 Rich note editing with multimedia support
- 🎨 Color coding and organization
- 📱 Responsive design for all devices
- 🌙 Dark mode support
- 🚀 High performance and scalability
- 🔄 Real-time updates
- 📎 File attachments with preview

## Tech Stack

### Backend
- FastAPI for the API framework
- PostgreSQL for data storage
- Redis for caching and task queue
- Celery for background tasks
- Nginx for reverse proxy and load balancing
- Docker for containerization

### Frontend
- Preact for UI components
- TailwindCSS for styling
- TypeScript for type safety
- Vite for build tooling

## Prerequisites

- Docker and Docker Compose
- Git
- Node.js 18+ (for frontend development)
- Python 3.11+ (for backend development)

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/notelocker.git
   cd notelocker
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start the application:
   ```bash
   docker-compose up -d
   ```

   The application will be available at:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Development Setup

### Backend Development

1. Create a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   .\venv\Scripts\activate  # Windows
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run migrations:
   ```bash
   alembic upgrade head
   ```

4. Start the development server:
   ```bash
   uvicorn src.main:app --reload
   ```

### Frontend Development

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

### Docker Deployment

The application is containerized and can be deployed using Docker Compose:

1. Build and start containers:
   ```bash
   docker-compose up -d --build
   ```

2. Run database migrations:
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

3. Create initial admin user:
   ```bash
   docker-compose exec backend python -m src.scripts.create_admin
   ```

### Manual Deployment

For manual deployment, refer to the detailed instructions in [DEPLOYMENT.md](DEPLOYMENT.md).

## Architecture

```
notelocker/
├── src/                 # Backend source code
├── frontend/           # Frontend source code
├── alembic/            # Database migrations
├── tests/             # Test suite
├── docker/            # Docker configuration
└── nginx/             # Nginx configuration
```

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with modern open-source technologies
- Community contributions welcome 