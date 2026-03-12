# 🏔️ ManaKiraa Admin Dashboard

A premium, modern administration portal for the ManaKiraa real estate platform. Built with **React 19**, **TypeScript**, and **Vite**, featuring a sleek dark-themed UI with glassmorphism effects and smooth animations.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

---

## ✨ Key Features

- **📊 Dynamic Dashboard**: Real-time overview of system activities, property listings, and user stats.
- **🏠 Property Management**: Full CRUD operations for property listings with advanced filtering.
- **👥 User Analytics**: Manage user accounts, roles, and track registration trends.
- **🛡️ Verification Portal**: Streamlined workflow for verifying property owners and listings.
- **📈 Advanced Reporting**: Visual data representation using Recharts for actionable insights.
- **🔐 Secure Authentication**: Integrated with Supabase Auth for robust security and role-based access.
- **🎨 Premium UI/UX**: Custom-built CSS with glassmorphism, Framer Motion animations, and Lucide icons.

---

## 🚀 Tech Stack

- **Frontend**: [React 19](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Notifications**: [SweetAlert2](https://sweetalert2.github.io/)

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AMANI-BLU/manakiraa_admin.git
   cd manakiraa_admin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

---

## 📁 Project Structure

```text
src/
├── components/     # Reusable UI components
├── core/           # Configuration, Supabase client, Auth guards
├── pages/          # Full page views (Dashboard, Users, etc.)
├── styles/         # Global styles and design tokens
└── App.tsx         # Main application component & routing
```

---

## 📝 License

This project is private and intended for the ManaKiraa platform administration.

---

