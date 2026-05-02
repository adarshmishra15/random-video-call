# 🌐 VisionBridge

**VisionBridge** is a premium, real-time random video and text chat platform designed for instant global connections. Built with a focus on privacy, aesthetics, and high performance.

![VisionBridge Preview](https://via.placeholder.com/1200x600/0d0d1a/7c3aed?text=VisionBridge+Interface)

## ✨ Features

- **Instant Matching**: Connect with strangers worldwide in seconds.
- **Dual Mode**: Choose between high-definition **Video Chat** or anonymous **Text Chat**.
- **Global Profiles**: Automatically detects partner location and displays their country flag/name.
- **Dynamic Avatars**: Unique avatars generated for every user using the Dicebear API.
- **Privacy First**: No registration required. User sessions are ephemeral and linked to MongoDB for active tracking.
- **Premium UI**: Sleek, glassmorphic design with smooth animations and responsive layouts.
- **SEO Optimized**: Fully prepared for search engines with meta tags, Open Graph support, and automatic sitemaps.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Lucide React, Framer Motion
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB (via Mongoose)
- **Real-time**: WebRTC (via Simple-Peer)
- **Styling**: Vanilla CSS (Custom Glassmorphism)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (Running locally or a cloud URI)

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd vision-bridge
   ```

2. Install root dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the `server` directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/visionbridge
   PORT=3001
   ```

4. Run in Development Mode:
   ```bash
   # Terminal 1: Start Frontend
   npm run dev

   # Terminal 2: Start Backend
   cd server
   npm start
   ```

## 🌍 Deployment

VisionBridge is pre-configured for deployment on **Railway**:

1. Push this code to a GitHub repository.
2. Link the repository to a new project in Railway.
3. Add the `MONGODB_URI` variable in the Railway dashboard.
4. The app will automatically build and deploy using the root `package.json` scripts.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Built with ❤️ for global connections.
