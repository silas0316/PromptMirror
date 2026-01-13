# Quick Start Guide

Get PromptMirror running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

Get your API key from: https://platform.openai.com/api-keys

## Step 3: Run Development Server

```bash
npm run dev
```

## Step 4: Open in Browser

Navigate to: http://localhost:3000

## Step 5: Test the App

1. Upload an image (drag & drop or click)
2. Click "Analyze Image"
3. Wait for analysis to complete
4. Edit variables as needed
5. Click "Generate Image"

## Troubleshooting

### "OPENAI_API_KEY is not set"
- Make sure `.env.local` exists in the root directory
- Check that the file contains `OPENAI_API_KEY=your-key`
- Restart the dev server after adding the key

### "Module not found" errors
- Run `npm install` again
- Delete `node_modules` and `.next` folders, then reinstall

### Images not loading
- Check that the `tmp` directory exists (it's created automatically)
- Make sure file permissions allow reading/writing

### Rate limit errors
- The app has basic rate limiting (10 requests/minute per IP)
- Wait a minute and try again
- For production, consider upgrading to Redis-based rate limiting

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check [docs/sample-analysis.json](./docs/sample-analysis.json) for example API responses
- Review the deployment section in README for publishing instructions
