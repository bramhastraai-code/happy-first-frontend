# Happy First Club - Frontend

A Next.js-based frontend application for Happy First Club, a wellness tracking and community platform where users can track daily activities, build healthy habits, and compete with friends.

## 🚀 Features

- **User Authentication**
  - Phone number-based registration
  - OTP verification
  - JWT token authentication with automatic refresh
  
- **Activity Tracking**
  - Track multiple wellness activities (Steps, Sleep, Water, Yoga, Gym, etc.)
  - Daily and weekly targets
  - Points and streak system
  
- **Dashboard**
  - Real-time stats (Points, Rank, Streak, Efficiency)
  - AI-powered insights and recommendations
  - Weekly performance tracking
  
- **Community Features**
  - Join and discover communities
  - Leaderboards (Weekly, All-time, Referral)
  - Activity-based rankings
  
- **Referral System**
  - Generate and share referral links
  - Track referral impact
  - Earn rewards for successful referrals

## 📦 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form + Zod
- **UI Components**: Custom components with Radix UI

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd happy-first-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
  NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
happy-first-frontend/
├── app/
│   ├── register/          # User registration page
│   ├── verify-otp/        # OTP verification page
│   ├── login/             # Login page
│   ├── profile-setup/     # Profile and activity setup
│   ├── home/              # Main dashboard
│   ├── tasks/             # Daily task logging
│   ├── referral/          # Referral page
│   ├── community/         # Community discovery
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── input.tsx
│   └── layout/            # Layout components
│       ├── BottomNav.tsx  # Bottom navigation bar
│       └── MainLayout.tsx # Main app layout wrapper
├── lib/
│   ├── api/               # API integration
│   │   ├── axios.ts       # Axios instance with interceptors
│   │   ├── auth.ts        # Authentication APIs
│   │   ├── activity.ts    # Activity APIs
│   │   ├── weeklyPlan.ts  # Weekly plan APIs
│   │   ├── dailyLog.ts    # Daily log APIs
│   │   ├── leaderboard.ts # Leaderboard APIs
│   │   └── recommendations.ts # Recommendations APIs
│   ├── store/             # State management
│   │   └── authStore.ts   # Authentication store (Zustand)
│   └── utils.ts           # Utility functions
├── public/                # Static assets
├── .env.local             # Environment variables
├── next.config.ts         # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Project dependencies
```

## 🔑 Key Features Implementation

### Authentication Flow

1. **Registration** (`/register`)
   - Enter phone number and basic details
   - Receive OTP via SMS/WhatsApp
   
2. **OTP Verification** (`/verify-otp`)
   - Verify 6-digit OTP
   - Receive JWT access token
   - Auto-creates weekly plan
   
3. **Profile Setup** (`/profile-setup`)
   - Complete profile information
   - Select activities (minimum 4)
   - Set targets for each activity
   
4. **Authentication State**
   - Access token stored in memory
   - Refresh token stored in httpOnly cookie
   - Automatic token refresh on 401 errors

### Dashboard (`/home`)

- **Stats Cards**: Points, Rank, Streak, Efficiency
- **AI Insights**: Personalized recommendations and alerts
- **Expandable Sections**:
  - Weekly Performance
  - Activity Goals
  - Leaderboard
  - Streak Tracker
  - Smart Recommendations

### Daily Logging (`/tasks`)

- View all assigned activities
- Input daily achievements
- Track progress toward targets
- Streak alerts for at-risk activities
- Points calculation

### Community (`/community`)

- **Discover Tab**: Browse and join trending communities
- **My Communities Tab**: View joined communities and rankings
- Track community challenges
- View top members

### Referral (`/referral`)

- Generate unique referral link
- Share via social media (Facebook, WhatsApp, Email)
- Track referral stats (Total, Active, Points earned)

## 🔄 API Integration

All API calls are centralized in the `lib/api/` directory. The Axios instance includes:

- **Base URL configuration**
- **Automatic token injection** in request headers
- **Token refresh logic** on 401 errors
- **Credentials support** for httpOnly cookies

Example API call:
```typescript
import { authAPI } from '@/lib/api/auth';

// Register user
const response = await authAPI.register({
  phoneNumber: '9999999999',
  countryCode: '+91',
  name: 'John Doe',
  email: 'john@example.com'
});
```

## 🎨 UI Components

The app uses custom components built with:
- **Tailwind CSS** for styling
- **Radix UI** for accessible primitives
- **Class Variance Authority (CVA)** for variant management
- **clsx + tailwind-merge** for class name management

### Button Component
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default" size="lg">
  Click Me
</Button>
```

### Card Component
```tsx
import { Card, CardContent } from '@/components/ui/card';

<Card>
  <CardContent className="p-4">
    Content here
  </CardContent>
</Card>
```

## 📱 Responsive Design

- Mobile-first approach
- Bottom navigation for easy thumb access
- Optimized for iOS and Android devices
- Touch-friendly UI elements

## 🔐 Security

- JWT token-based authentication
- httpOnly cookies for refresh tokens
- CORS enabled for API communication
- Input validation with Zod schemas
- Secure password handling

## 🧪 Development

### Available Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Code Style

- ESLint configuration for Next.js
- TypeScript strict mode enabled
- Component-based architecture
- Custom hooks for reusable logic

## 🌐 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `http://localhost:3000/api/v1` |

## 📝 Todo / Future Enhancements

- [ ] Add loading skeletons for better UX
- [ ] Implement error boundaries
- [ ] Add analytics integration
- [ ] Implement push notifications
- [ ] Add dark mode support
- [ ] Implement offline support with service workers
- [ ] Add unit and integration tests
- [ ] Implement accessibility improvements
- [ ] Add animation libraries (Framer Motion)
- [ ] Implement PWA features

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential.

## 👥 Team

- **Frontend Development**: [Your Team]
- **Backend API**: Happy First Club Backend Team
- **Design**: Based on provided mockups

## 📞 Support

For support and questions, contact the development team.

---

**Built with ❤️ for Happy First Club**
