# 🚀 Deployment Guide - Happy First Club Frontend

## 📋 Pre-Deployment Checklist

Before deploying, ensure:
- [ ] Backend API is deployed and accessible
- [ ] Environment variables are configured
- [ ] Build passes without errors
- [ ] All pages load correctly
- [ ] API integration is tested
- [ ] Mobile responsiveness verified
- [ ] Browser compatibility checked

---

## 🌐 Deployment Options

### Option 1: Vercel (Recommended) ⭐

**Why Vercel?**
- Built by Next.js creators
- Zero configuration
- Automatic HTTPS
- Global CDN
- Serverless functions
- Free tier available

**Steps:**

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add NEXT_PUBLIC_API_BASE_URL production
   ```
   Enter your production API URL: `https://api.happyfirstclub.com/api/v1`

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

**Web Dashboard Method:**
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - Framework: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: .next
5. Add environment variable:
   - Key: `NEXT_PUBLIC_API_BASE_URL`
   - Value: Your API URL
6. Click Deploy

**Domain Configuration:**
- Vercel provides: `your-app.vercel.app`
- Custom domain: Add in Project Settings → Domains

---

### Option 2: Netlify

**Steps:**

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login**
   ```bash
   netlify login
   ```

3. **Initialize**
   ```bash
   netlify init
   ```

4. **Configure `netlify.toml`**
   ```toml
   [build]
     command = "npm run build"
     publish = ".next"

   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```

5. **Deploy**
   ```bash
   netlify deploy --prod
   ```

6. **Set Environment Variables**
   - Go to Site Settings → Environment Variables
   - Add `NEXT_PUBLIC_API_BASE_URL`

---

### Option 3: AWS Amplify

**Steps:**

1. **Install Amplify CLI**
   ```bash
   npm install -g @aws-amplify/cli
   ```

2. **Configure**
   ```bash
   amplify configure
   ```

3. **Initialize**
   ```bash
   amplify init
   ```

4. **Add Hosting**
   ```bash
   amplify add hosting
   ```
   - Choose: Hosting with Amplify Console
   - Choose: Manual deployment

5. **Create `amplify.yml`**
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

6. **Deploy**
   ```bash
   amplify publish
   ```

---

### Option 4: Azure Static Web Apps

**Steps:**

1. **Create Azure Static Web App**
   ```bash
   az staticwebapp create \
     --name happy-first-club \
     --resource-group MyResourceGroup \
     --source https://github.com/yourusername/repo \
     --branch main \
     --app-location "/" \
     --api-location "api" \
     --output-location ".next"
   ```

2. **Configure `staticwebapp.config.json`**
   ```json
   {
     "navigationFallback": {
       "rewrite": "/index.html"
     },
     "routes": [
       {
         "route": "/*",
         "allowedRoles": ["anonymous"]
       }
     ]
   }
   ```

3. **Set Environment Variables**
   - Portal → Configuration → Application Settings
   - Add `NEXT_PUBLIC_API_BASE_URL`

---

### Option 5: Docker + Self-Hosted

**Dockerfile:**
```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_BASE_URL=https://api.happyfirstclub.com/api/v1
    restart: unless-stopped
```

**Build and Run:**
```bash
# Build
docker build -t happy-first-frontend .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_BASE_URL=https://api.happyfirstclub.com/api/v1 \
  happy-first-frontend

# Or use docker-compose
docker-compose up -d
```

---

## 🔧 Build Configuration

### Update `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // For Docker deployment
  reactStrictMode: true,
  images: {
    domains: ['api.happyfirstclub.com'], // Add API domain for images
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
};

export default nextConfig;
```

---

## 🌍 Environment Variables

### Development (`.env.local`)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

### Staging (`.env.staging`)
```env
NEXT_PUBLIC_API_BASE_URL=https://staging-api.happyfirstclub.com/api/v1
```

### Production (`.env.production`)
```env
NEXT_PUBLIC_API_BASE_URL=https://api.happyfirstclub.com/api/v1
```

**Important**: Never commit `.env` files to version control!

---

## 🔍 Pre-Deployment Testing

### Local Production Build
```bash
# Build for production
npm run build

# Test production build locally
npm start

# Visit http://localhost:3000
```

### Check Build Output
```bash
npm run build

# Should see:
# ✓ Compiled successfully
# ✓ Optimized for production
# ✓ No errors
```

### Lighthouse Test
1. Open production build in Chrome
2. Open DevTools → Lighthouse
3. Generate report
4. Aim for scores > 90

---

## 🚦 Post-Deployment Checklist

After deployment:
- [ ] All pages load correctly
- [ ] API calls work (check Network tab)
- [ ] Authentication flow works
- [ ] Protected routes redirect to login
- [ ] Forms submit successfully
- [ ] Mobile view is responsive
- [ ] HTTPS is working
- [ ] Custom domain configured
- [ ] Analytics installed (if applicable)
- [ ] Error tracking configured

---

## 📊 Monitoring & Analytics

### Add Google Analytics

1. **Create GA4 Property**
   - Go to [analytics.google.com](https://analytics.google.com)
   - Create new property
   - Get Measurement ID (G-XXXXXXXXXX)

2. **Add to Next.js**

   Create `app/layout.tsx` update:
   ```tsx
   import Script from 'next/script';
   
   export default function RootLayout({ children }) {
     return (
       <html lang="en">
         <head>
           <Script
             src={`https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`}
             strategy="afterInteractive"
           />
           <Script id="google-analytics" strategy="afterInteractive">
             {`
               window.dataLayer = window.dataLayer || [];
               function gtag(){dataLayer.push(arguments);}
               gtag('js', new Date());
               gtag('config', 'G-XXXXXXXXXX');
             `}
           </Script>
         </head>
         <body>{children}</body>
       </html>
     );
   }
   ```

### Add Sentry (Error Tracking)

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

---

## 🔒 Security Headers

Add to `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test
      
    - name: Build
      run: npm run build
      env:
        NEXT_PUBLIC_API_BASE_URL: ${{ secrets.API_BASE_URL }}
        
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        vercel-args: '--prod'
```

---

## 🔄 Rollback Strategy

### Vercel Rollback
```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-url>
```

### Docker Rollback
```bash
# Tag stable version
docker tag happy-first-frontend:latest happy-first-frontend:stable

# Rollback
docker stop happy-first-frontend
docker run -d --name happy-first-frontend happy-first-frontend:stable
```

---

## 📱 PWA Configuration (Optional)

### Install PWA Plugin
```bash
npm install next-pwa
```

### Update `next.config.ts`
```typescript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({
  // your next config
});
```

### Create `public/manifest.json`
```json
{
  "name": "Happy First Club",
  "short_name": "HappyFirst",
  "description": "Build your wellness habits",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563EB",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 📈 Performance Optimization

### Before Deployment
1. **Optimize Images**: Use Next.js Image component
2. **Code Splitting**: Lazy load heavy components
3. **Bundle Analysis**: Check bundle size
   ```bash
   npm install @next/bundle-analyzer
   ```

4. **Lighthouse Score**: Aim for 90+
5. **Core Web Vitals**: Monitor LCP, FID, CLS

---

## 🆘 Troubleshooting

### Build Fails
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### API Connection Issues
- Check CORS settings on backend
- Verify API URL in environment variables
- Test API endpoint with Postman

### 404 on Refresh
- Configure rewrites in hosting platform
- For Vercel: Automatic
- For others: Add rewrite rules

---

## 📞 Support

For deployment issues:
1. Check platform-specific documentation
2. Review deployment logs
3. Test locally with production build
4. Contact platform support
5. Reach out to dev team

---

## ✅ Deployment Success Checklist

- [ ] Build passes without errors
- [ ] Environment variables configured
- [ ] HTTPS enabled
- [ ] Custom domain configured
- [ ] API connection working
- [ ] All pages accessible
- [ ] Mobile responsive
- [ ] Security headers added
- [ ] Analytics installed
- [ ] Error tracking configured
- [ ] Monitoring set up
- [ ] Rollback plan tested

---

**Your Happy First Club frontend is now live! 🎉**

**Production URL**: `https://happyfirstclub.com`
**API URL**: `https://api.happyfirstclub.com/api/v1`

---

**Need help? Check the main documentation or contact the dev team.**
