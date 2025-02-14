<div align="center">
  <h1>🌟 WikiTimeline</h1>
  <p>Transform Wikipedia articles into beautiful, interactive timelines powered by AI</p>
  <p>
    <a href="https://wiki-timeline.com/timeline/Nikola_Tesla%7CThomas_Edison">Live Demo</a> •
    <a href="#features">Features</a> •
    <a href="#installation">Installation</a> •
    <a href="#usage">Usage</a>
  </p>
</div>

## ✨ Features

- 🔄 **Instant Conversion**: Transform any Wikipedia article into a timeline in seconds
- 🤖 **AI-Powered**: Utilizes Google Gemini to extract and organize chronological events
- 📱 **Responsive Design**: Beautiful interface that works on all devices
- 🌓 **Dark Mode**: Seamless experience in both light and dark themes
- 🔄 **Multi-Timeline**: Compare multiple timelines side by side
- 🎯 **Interactive**: Zoom, scroll, and explore events interactively

## 🚀 Installation

1. Clone the repository:

```bash
git clone https://github.com/wenzhenl/wikitimeline.git
cd wikitimeline
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.development.local
```

4. Configure your environment variables:

   - Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Set up Vercel KV storage:
     1. Install Vercel CLI: `npm i -g vercel`
     2. Link your project: `vercel link`
     3. Create a KV storage in [Vercel Dashboard](https://vercel.com/dashboard)
     4. Connect KV to your project
     5. Pull environment variables: `vercel env pull .env.development.local`

5. Run the development server:

```bash
npm run dev
```

## 🌐 Deployment

1. Deploy to Vercel:

```bash
vercel deploy
```

2. Configure production environment variables in Vercel Dashboard:
   - Add all variables from `.env.example`
   - Connect Vercel KV storage

## 💡 Usage

1. Visit the homepage
2. Search for any Wikipedia topic
3. Select from the autocomplete suggestions
4. Click "Generate Timeline" to view your interactive timeline
5. For multiple timelines, keep adding topics before generating

## 🎯 Example Timelines

- [George Washington & Qianlong Emperor](https://wiki-timeline.com/timeline/George_Washington%7CQianlong_Emperor) - Two great leaders, two empires, one era
- [The Three Titans](https://wiki-timeline.com/timeline/Michelangelo%7CLeonardo_da_Vinci%7CRaphael) - Renaissance masters who shaped art history
- [The Poet Saints](https://wiki-timeline.com/timeline/Li_Bai%7CDu_Fu) - China's greatest poets of the Golden Age

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Database**: Vercel KV (Redis)
- **AI**: [Cursor/Claude for development](https://www.cursor.com/), [Gemini for timeline generation](https://makersuite.google.com/app/apikey)
- **Deployment**: Vercel

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  Built by <a href="https://x.com/organic_program">Wenzheng Li (aka Steven Lee)</a>
</div>
