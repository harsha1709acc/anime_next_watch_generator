# Anime Next Watch Generator 🎌

A sleek, modern, and highly responsive web application designed to help you quickly find your next anime obsession. The app features a stunning glassmorphism interface, smooth micro-animations, and dynamic real-time filtering powered by Vanilla JavaScript.

## 🔗 Live Demo
[**Anime Next Watch Generator - Live Preview**](https://harsha1709acc.github.io/anime_next_watch_generator/)

## ✨ Features
- **Discover Trending**: Pulls real-time trending anime episodes from the robust Jikan API.
- **Top Rated Shows**: Easily load the highest-rated, critically-acclaimed anime series in an instant.
- **Advanced Filtering**: Narrow down choices by popular genres including action, romance, comedy, sci-fi, and more.
- **Real-time Search & Sort**: Fully client-side search and sorting operations utilizing optimized Higher-Order Array functions (e.g., `map`, `filter`, `sort`). No frustrating loading screens for simple data manipulation!
- **Favorites System**: Instantly save compelling anime titles to your personalized watchlist. Data is persisted directly to your browser's `localStorage`.
- **Dynamic Theming**: Switch seamlessly between polished Dark and Light modes.
- **Premium Interactivity**: Clean hover interactions, button feedback, and expandable detail-cards create an immersive user experience.

## 🛠 Technology Stack
- **HTML5**: Semantic and clearly structured DOM built for accessibility.
- **CSS3 (Vanilla)**: Features comprehensive CSS variables (`:root`), Flexbox, CSS Grid, and responsive queries. Styled entirely from scratch—no Tailwind or Bootstrap required.
- **JavaScript (Vanilla)**: Modern ES6+ syntax, asynchronous DOM manipulation, and dynamic integration with the Fetch API.
- **[Jikan API v4](https://docs.api.jikan.moe)**: The premier unofficial MyAnimeList REST API providing extensive anime data.

## 🚀 Running Locally

Because this is a completely vanilla web application, running it locally is incredibly straightforward without a complex build pipeline.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/harsha1709acc/anime_next_watch_generator.git
   ```
2. **Navigate to the directory:**
   ```bash
   cd anime_next_watch_generator
   ```
3. **Start the App:**
   - You can simply open the `index.html` file directly in your web browser.
   - *Recommended:* For the optimal development experience and to prevent strict CORS issues with certain fetch requests, serve the folder using an extension like **Live Server** in VS Code, or python's built-in HTTP server:
     ```bash
     python3 -m http.server 8000
     ```

## 🤝 Contributing
Contributions, bug reports, and feature requests are very welcome! If you enhance the design or functionality, feel free to open a Pull Request.

## 📜 License
This project is open-source and created for educational & personal discovery purposes. Enjoy finding your next favorite anime!
