# Quick Start Guide - Happy First Club Frontend

## 🚀 Getting Started in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Backend API running on `http://localhost:3000`

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Create `.env.local` file:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

### Step 3: Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎯 User Journey

### 1. Registration Flow
1. Visit `/register`
2. Enter phone number (+91 9999999999)
3. Fill in basic details (name, email)
4. Click "Register"
5. Redirected to `/verify-otp`

### 2. OTP Verification
1. Enter 6-digit OTP received via SMS/WhatsApp
2. OTP verified → Access token received
3. Redirected to `/profile-setup`

### 3. Profile Setup (4 Steps)
**Step 1: Personal Info**
- Health status, family, profession, daily schedule

**Step 2: Goals & Preferences**
- Challenges, goals, likes/dislikes
- Choose motivation tone (soft/coach/strict)
- Set reminder time

**Step 3: Select Activities**
- Choose minimum 4 activities from Set 1
- Available: Steps, Yoga, Gym, Floors, Sleep, Water, Happy Days, Healthy Eating

**Step 4: Set Targets**
- Set daily or weekly targets for each selected activity
- Example: Steps - 10,000 daily, Yoga - 3 days weekly

### 4. Home Dashboard
- View stats: Points (88/100), Rank (#3), Streak (16), Efficiency (88)
- See AI insights and recommendations
- Expand sections for detailed views

### 5. Daily Tasks
- Log daily activities
- View streak alerts
- Submit before midnight for points

### 6. Community & Referral
- Discover trending communities
- Join communities and compete
- Share referral link to invite friends

---

## 📋 Page Overview

| Route | Purpose | Authentication |
|-------|---------|----------------|
| `/` | Landing (redirects to register) | Public |
| `/register` | User registration | Public |
| `/verify-otp` | OTP verification | Public |
| `/login` | User login | Public |
| `/profile-setup` | Complete user profile | Protected |
| `/home` | Main dashboard | Protected |
| `/tasks` | Daily activity logging | Protected |
| `/referral` | Referral program | Protected |
| `/community` | Community features | Protected |

---

## 🔑 API Endpoints Used

### Authentication
- `POST /userAuth/register` - Register new user
- `POST /userAuth/verify-otp` - Verify OTP
- `POST /userAuth/login` - Login with credentials
- `POST /userAuth/refresh` - Refresh access token
- `POST /userAuth/logout` - Logout user
- `PATCH /userAuth/update-profile` - Update user profile

### Activities
- `GET /activity/list` - Get available activities
- `GET /weeklyPlan/options` - Get activity options
- `POST /weeklyPlan/create` - Create weekly plan
- `GET /weeklyPlan/current` - Get current weekly plan

### Daily Logging
- `POST /dailyLog` - Submit daily log
- `GET /dailyLog/summary?period=daily|weekly` - Get summary

### Leaderboard
- `GET /leaderboard/weekly` - Weekly leaderboard
- `GET /leaderboard/all-time` - All-time leaderboard
- `GET /leaderboard/referral` - Referral leaderboard

### Recommendations
- `GET /recommendations` - Get personalized recommendations

---

## 🎨 Component Library

### UI Components (in `components/ui/`)
```tsx
// Button
<Button variant="default|outline|ghost" size="sm|default|lg">
  Click Me
</Button>

// Card
<Card>
  <CardContent className="p-4">
    Content
  </CardContent>
</Card>

// Input
<Input type="text" placeholder="Enter value" />
```

### Layout Components
```tsx
// Main Layout with Bottom Navigation
<MainLayout>
  <YourPageContent />
</MainLayout>

// Bottom Navigation (auto-included in MainLayout)
<BottomNav />
```

---

## 🔐 Authentication State

### Using the Auth Store
```tsx
'use client';

import { useAuthStore } from '@/lib/store/authStore';

function MyComponent() {
  const { user, isAuthenticated, setUser, setAccessToken, logout } = useAuthStore();
  
  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.name}</p>
      ) : (
        <p>Please login</p>
      )}
    </div>
  );
}
```

### Protected Routes
```tsx
useEffect(() => {
  if (!isAuthenticated) {
    router.push('/login');
  }
}, [isAuthenticated, router]);
```

---

## 📱 Mobile-First Design

### Responsive Breakpoints
- **Mobile**: Default (< 768px)
- **Tablet**: `md:` prefix (≥ 768px)
- **Desktop**: `lg:` prefix (≥ 1024px)

### Bottom Navigation
- Fixed at bottom on mobile
- 4 main tabs: Home, Tasks, Referral, Community
- Active state highlighting

---

## 🎯 Points System

### How Points Work
- **Max 100 points per week**
- Points divided equally across chosen activities
- Daily activities: Points split across 7 days
- Weekly activities: Points split by session count
- Extra effort counts toward leaderboard rankings

### Example Calculation
```
User selects 5 activities = 20 points each

Daily activity (Steps):
- 20 points ÷ 7 days = 2.86 points per day

Weekly activity (3 Yoga sessions):
- 20 points ÷ 3 sessions = 6.67 points per session
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue: Cannot connect to API**
- Ensure backend is running on `http://localhost:3000`
- Check `.env.local` has correct `NEXT_PUBLIC_API_BASE_URL`
- Verify CORS is enabled on backend

**Issue: 401 Unauthorized errors**
- Check if access token is expired
- Token refresh should happen automatically
- Try logging in again

**Issue: OTP not received**
- Check phone number format
- Verify backend SMS/WhatsApp integration
- Check backend logs for errors

**Issue: Build errors**
- Run `npm install` to ensure all dependencies are installed
- Delete `.next` folder and rebuild: `rm -rf .next && npm run build`
- Check for TypeScript errors: `npm run build`

---

## 🧪 Testing the App

### Manual Testing Checklist

**Registration & Login**
- [ ] Register with phone number
- [ ] Receive and verify OTP
- [ ] Complete profile setup
- [ ] Login with existing account
- [ ] Logout and login again

**Dashboard**
- [ ] View stats cards
- [ ] Expand/collapse sections
- [ ] View AI insights
- [ ] Check activity goals

**Daily Tasks**
- [ ] View all activities
- [ ] Input activity values
- [ ] Submit daily log
- [ ] Verify points earned

**Navigation**
- [ ] Navigate between tabs
- [ ] Active tab highlighting works
- [ ] Back button works on each page

**Responsiveness**
- [ ] Test on mobile viewport
- [ ] Test on tablet viewport
- [ ] Test on desktop viewport

---

## 📊 Sample Data for Testing

### Test User
```
Phone: +91 9999999999
OTP: 123456 (check backend logs)
Name: Test User
Email: test@happyfirstclub.com
```

### Sample Activities Setup
```
1. Steps - 10,000 daily
2. Sleep - 7 hours daily
3. Water - 2L daily
4. Yoga - 3 times weekly
5. Gym - 2 times weekly
```

### Sample Daily Log
```
Steps: 8000
Sleep: 7.5 hours
Water: 2.2L
Yoga: Done (if yoga day)
```

---

## 🔧 Development Tips

1. **Hot Reload**: Changes auto-reload in dev mode
2. **Console Logs**: Check browser console for errors
3. **Network Tab**: Monitor API calls in DevTools
4. **React DevTools**: Install for component debugging
5. **TypeScript**: Hover over variables for type info

---

## 📞 Need Help?

- Check the main README: `FRONTEND_README.md`
- Review API documentation in the backend repo
- Contact the development team
- Check Next.js docs: https://nextjs.org/docs

---

**Happy Coding! 🎉**
