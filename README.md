# NEXUS OS Creative Studio

AI-powered creative studio for image generation, chat, YouTube search, and TikTok shorts player.

## Features

- **AI Image Generation** - Generate images from text prompts using DALL-E
- **Image Database** - Save, view, and manage generated images
- **AI Chat** - Chat with AI assistant
- **YouTube Search** - Search and play YouTube videos
- **TikTok Shorts** - Search TikTok videos with full-screen swipe player

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS
- **Prisma** - Database ORM (SQLite)
- **shadcn/ui** - UI components
- **z-ai-web-dev-sdk** - AI integration

## Quick Start

```bash
# Install dependencies
bun install

# Setup database
bun run db:generate
bun run db:push

# Copy environment file
cp .env.example .env

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Build for Production

```bash
# Build
bun run build

# Start production server
bun run start
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate-image/route.ts  # AI image generation
│   │   ├── images/route.ts          # Image database CRUD
│   │   ├── chat/route.ts            # AI chat
│   │   ├── youtube-search/route.ts  # YouTube search
│   │   └── tiktok-search/route.ts   # TikTok search
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                     # Main UI
├── lib/
│   └── db.ts                        # Prisma client
└── components/ui/                   # shadcn components

public/
└── index.html                       # Standalone HTML version
```

## Environment Variables

```env
DATABASE_URL="file:./db/custom.db"
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate-image` | POST | Generate AI image |
| `/api/images` | GET | List all images |
| `/api/images` | POST | Save image |
| `/api/images` | DELETE | Delete image |
| `/api/chat` | POST | AI chat |
| `/api/youtube-search` | GET | Search YouTube |
| `/api/tiktok-search` | GET | Search TikTok |

## TikTok Player Controls

- **Swipe Up** - Next video
- **Swipe Down** - Previous video
- **Mouse Wheel** - Navigate on desktop
- **Arrow Keys** - Navigate
- **Escape** - Close player

## License

MIT
