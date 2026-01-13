# PromptMirror

A production-ready MVP web application that extracts style DNA from reference images and generates new images that preserve the style while applying user edits.

## Features

- **Image Upload**: Drag & drop or click to upload reference images (PNG, JPG, WEBP)
- **AI Analysis**: Automatically extracts style DNA, palette, composition, and editable variables
- **Variable Editing**: Lock/unlock and edit individual prompt variables
- **Style Preservation**: Three modes - Style, Style + Palette, Style + Composition
- **Image Generation**: Generate new images using DALL-E 3 with customizable settings
- **Modern UI**: Clean, minimal interface built with Next.js, Tailwind CSS, and shadcn/ui

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Forms**: react-hook-form + zod validation
- **AI Provider**: OpenAI API (GPT-4 Vision + DALL-E 3)
- **Image Storage**: Local filesystem (dev) - structured for S3 migration

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd PromptMirror
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

Create a `.env.local` file with the following variables:

- `OPENAI_API_KEY` (required): Your OpenAI API key for GPT-4 Vision and DALL-E 3

## Usage

1. **Upload Image**: Drag and drop or click to upload a reference image
2. **Analyze**: Click "Analyze Image" to extract style DNA and prompt variables
3. **Edit Variables**: Unlock and edit variables to customize the output
4. **Adjust Settings**: Set preserve mode, sliders, aspect ratio, and quality
5. **Generate**: Click "Generate Image" to create a new image with your edits
6. **Iterate**: Use generated images as new references to continue refining

## API Endpoints

### POST `/api/upload`
Upload a reference image.

**Request**: `multipart/form-data` with `file` field
**Response**: `{ imageId, previewUrl, hash }`

### POST `/api/analyze`
Analyze an uploaded image to extract style DNA.

**Request**: `{ imageId, preserveMode }`
**Response**: Analysis JSON (see `docs/sample-analysis.json`)

### POST `/api/refine`
Refine analysis suggestions for unlocked variables.

**Request**: `{ imageId, preserveMode, locked, currentValues }`
**Response**: `{ variables, prompt_template }`

### POST `/api/generate`
Generate a new image based on the analysis and user edits.

**Request**: `{ imageId, preserveMode, values, negativePrompt, settings }`
**Response**: `{ outputImageId, outputUrl, revisedPrompt }`

### GET `/api/images/[imageId]`
Serve uploaded or generated images.

## Project Structure

```
PromptMirror/
├── app/
│   ├── api/              # API route handlers
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main page component
├── components/
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── image-storage.ts  # Image storage utilities
│   ├── openai.ts         # OpenAI API integration
│   ├── rate-limit.ts     # Rate limiting
│   ├── schemas.ts        # Zod validation schemas
│   ├── store.ts          # Zustand state management
│   └── utils.ts          # Utility functions
├── tmp/                  # Temporary image storage (dev)
└── docs/                 # Documentation
```

## Known Limitations

1. **Image Storage**: Currently uses local filesystem. Images are automatically deleted after 60 minutes. For production, migrate to S3 or similar.

2. **DALL-E 3 Limitations**: 
   - DALL-E 3 doesn't support direct image-to-image generation. The reference image is used in the prompt context only.
   - For true image-to-image, consider using DALL-E 2 variations or other models.

3. **Composition Preservation**: Advanced composition matching (Style + Composition mode) is best-effort and language-based only. No ControlNet implementation in MVP.

4. **Rate Limiting**: Basic in-memory rate limiting (10 requests/minute per IP). For production, use a proper rate limiting service.

5. **No Database**: All state is in-memory. Images and analysis results are not persisted across server restarts.

6. **Analysis Accuracy**: Style DNA extraction is AI-generated and may not perfectly match the original prompt/seed used to create the reference image.

## Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Security & Privacy

- Images are stored temporarily (60 minutes max)
- No long-term persistence
- Basic rate limiting per IP
- Input validation with Zod
- File size limits (10MB)
- File type restrictions

## Deployment & Publishing

To make PromptMirror publicly accessible, you have several deployment options:

### Option 1: Vercel (Recommended)

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login and click "New Project"
   - Import your GitHub repository
   - Add environment variable: `OPENAI_API_KEY` (your API key)
   - Click "Deploy"

3. **Your app will be live** at `https://your-project.vercel.app`

### Option 2: Netlify

1. **Push to GitHub** (same as above)

2. **Deploy to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `.next`
   - Add environment variable: `OPENAI_API_KEY`
   - Click "Deploy site"

### Option 3: Self-Hosted (VPS/Server)

1. **On your server**, clone and setup:
   ```bash
   git clone <your-repo-url>
   cd PromptMirror
   npm install
   ```

2. **Create `.env.local`** with your `OPENAI_API_KEY`

3. **Build and start**:
   ```bash
   npm run build
   npm start
   ```

4. **Use a reverse proxy** (nginx) to serve on port 80/443:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Important Notes for Production

1. **Image Storage**: The MVP uses local filesystem which won't work on serverless platforms. For production:
   - Migrate to S3, Cloudinary, or similar
   - Update `lib/image-storage.ts` to use cloud storage

2. **Rate Limiting**: Current in-memory rate limiting won't work across multiple instances. Consider:
   - Redis-based rate limiting
   - Vercel's built-in rate limiting
   - Upstash Redis (serverless-friendly)

3. **Environment Variables**: Make sure to set `OPENAI_API_KEY` in your deployment platform's environment variables

4. **File Size Limits**: Adjust `MAX_FILE_SIZE` in `/app/api/upload/route.ts` if needed

5. **CORS**: If needed, add CORS headers in `next.config.js`

## Future Enhancements

- [ ] S3 integration for image storage
- [ ] Database for persisting analysis results
- [ ] User accounts and saved projects
- [ ] Batch generation
- [ ] Advanced composition matching with ControlNet
- [ ] Style library and sharing
- [ ] Export/import prompt templates

## License

MIT

## Support

For issues and questions, please open an issue on the repository.
