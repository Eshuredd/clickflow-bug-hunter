# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Supabase Account**: If using Supabase, have your credentials ready

## Environment Variables

Set these environment variables in your Vercel dashboard:

```bash
# Frontend URL (replace with your actual Vercel domain)
FRONTEND_URL=https://your-app-name.vercel.app

# Supabase Configuration (if using Supabase)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Node Environment
NODE_ENV=production
```

## Deployment Steps

### Method 1: Deploy via Vercel Dashboard (Recommended)

1. **Login to Vercel**

   - Go to [vercel.com](https://vercel.com) and login with your GitHub account

2. **Import Project**

   - Click "New Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Project**

   - Vercel will automatically detect it's a Node.js/React project
   - The build settings should be automatically configured
   - Add your environment variables in the "Environment Variables" section

4. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete (usually 2-5 minutes)

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI**

   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**

   ```bash
   vercel login
   ```

3. **Deploy from your project root**

   ```bash
   vercel
   ```

4. **Set Environment Variables**

   ```bash
   vercel env add FRONTEND_URL
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Post-Deployment

1. **Update CORS Settings**

   - Once deployed, update the FRONTEND_URL in your environment variables
   - Replace `your-app-name` with your actual Vercel domain

2. **Test Your Application**
   - Visit your deployed URL
   - Test both frontend and backend functionality
   - Check browser console for any errors

## Troubleshooting

### Common Issues:

1. **CORS Errors**

   - Make sure FRONTEND_URL environment variable is set correctly
   - Check that your backend CORS configuration allows your frontend domain

2. **Build Failures**

   - Check the build logs in Vercel dashboard
   - Ensure all dependencies are listed in package.json

3. **Function Timeout**

   - The default timeout is 10 seconds
   - We've set it to 30 seconds for Puppeteer operations
   - If you need longer, upgrade to a paid plan

4. **Environment Variables Not Working**
   - Frontend variables must be prefixed with `VITE_`
   - Backend variables don't need prefixes
   - Redeploy after adding new environment variables

## Project Structure

```
clickflow-bug-hunter/
├── vercel.json          # Vercel configuration
├── package.json         # Frontend dependencies & scripts
├── backend/
│   ├── package.json     # Backend dependencies
│   └── src/
│       ├── index.ts     # Serverless function handler
│       ├── app.ts       # Express app
│       └── server.ts    # Local development server
└── src/                 # Frontend React code
```

## Configuration Files

### vercel.json

- Configures serverless functions
- Routes API calls to backend
- Serves frontend as static files

### Backend Changes

- `backend/src/index.ts`: Serverless function handler
- `backend/src/app.ts`: Updated CORS for production
- `backend/package.json`: Added build scripts

## Performance Considerations

1. **Puppeteer on Vercel**

   - Uses Chromium in serverless environment
   - Cold starts may be slower (2-5 seconds)
   - Consider implementing caching for frequently accessed data

2. **Function Limits**
   - Free tier: 10 second execution limit
   - Pro tier: 60 second execution limit
   - Our config sets 30 seconds max duration

## Monitoring

1. **Vercel Analytics**

   - Monitor performance and usage
   - Available in Vercel dashboard

2. **Function Logs**
   - Check serverless function logs in Vercel dashboard
   - Useful for debugging backend issues

## Cost Considerations

- **Free Tier**: 100GB bandwidth, 10,000 serverless function invocations
- **Pro Tier**: $20/month for higher limits
- **Puppeteer**: May consume more resources due to browser automation
