/**
 * app.js - Main Application Logic
 * Integrates with Jikan API v4 to fetch and display anime.
 */

// API Base URL
const API_BASE = 'https://api.jikan.moe/v4';

// Minimum cache/rate-limit tracking to respect Jikan's fair usage policy
let lastRequestTime = 0;
const rateLimitDelay = 350; // Ms between requests

// DOM Elements
const animeGrid = document.getElementById('anime-grid');
const skeletonGrid = document.getElementById('skeleton-grid');
const loadingState = document.getElementById('loading');
const errorState = document.getElementById('error-state');
const retryBtn = document.getElementById('retry-btn');
const filterBtns = document.querySelectorAll('.filter-btn');
const genreSelect = document.getElementById('genre-select');
const sectionTitle = document.getElementById('section-title');
const sectionSubtitle = document.getElementById('section-subtitle');

// Current State
let currentFilter = 'trending';
let currentGenre = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initSkeletons();
    setupEventListeners();
    fetchAnimeList(currentFilter);
});

// Setup Event Listeners
function setupEventListeners() {
    // Top buttons (Trending, Top Rated)
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add to clicked
            e.currentTarget.classList.add('active');
            
            // Reset genre select
            genreSelect.value = '';
            
            const filter = e.currentTarget.dataset.filter;
            currentFilter = filter;
            fetchAnimeList(filter);
        });
    });

    // Genre Select
    genreSelect.addEventListener('change', (e) => {
        const genreId = e.target.value;
        if (genreId) {
            // Remove active from buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            
            currentFilter = 'genre';
            currentGenre = genreId;
            const genreName = e.target.options[e.target.selectedIndex].text;
            
            fetchAnimeList('genre', genreId, genreName);
        } else {
            // Revert to trending if cleared
            filterBtns[0].click(); 
        }
    });

    // Retry button
    retryBtn.addEventListener('click', () => {
        fetchAnimeList(currentFilter, currentGenre);
    });
}

// Fetch Logic
async function fetchAnimeList(filter, genreId = null, genreName = '') {
    // UI Updates
    showLoading();
    
    let url = '';
    
    switch (filter) {
        case 'trending':
            url = `${API_BASE}/seasons/now?sfw=true`;
            sectionTitle.textContent = 'Trending Now';
            sectionSubtitle.textContent = 'The hottest shows everyone is watching this season.';
            break;
        case 'top-rated':
            url = `${API_BASE}/top/anime?sfw=true`;
            sectionTitle.textContent = 'Top Rated of All Time';
            sectionSubtitle.textContent = 'The highest acclaimed anime series.';
            break;
        case 'genre':
            url = `${API_BASE}/anime?genres=${genreId}&order_by=score&sort=desc&sfw=true`;
            sectionTitle.textContent = `${genreName} Anime`;
            sectionSubtitle.textContent = `Top rated anime in the ${genreName} genre.`;
            break;
        default:
            url = `${API_BASE}/seasons/now?sfw=true`;
    }

    try {
        // Simple rate limiting logic
        const now = Date.now();
        const timeSinceLast = now - lastRequestTime;
        if (timeSinceLast < rateLimitDelay) {
            await new Promise(resolve => setTimeout(resolve, rateLimitDelay - timeSinceLast));
        }

        const response = await fetch(url);
        lastRequestTime = Date.now();
        
        if (!response.ok) {
            if(response.status === 429) {
                throw new Error("Rate Limited");
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        renderAnimeCards(data.data);
    } catch (error) {
        console.error("Failed to fetch anime:", error);
        showError();
    }
}

// Render Logic
function renderAnimeCards(animeList) {
    if (!animeList || animeList.length === 0) {
        showError();
        return;
    }

    // Clear grid
    animeGrid.innerHTML = '';
    
    // Sort array generally to ensure we have images, sometimes API returns empty nodes
    const validAnime = animeList.filter(anime => anime.images && anime.images.jpg.large_image_url);

    validAnime.forEach(anime => {
        // Data Extraction
        const title = anime.title_english || anime.title;
        const imageUrl = anime.images.jpg.large_image_url;
        const score = anime.score ? anime.score.toFixed(1) : 'N/A';
        const year = anime.year || (anime.aired && anime.aired.prop && anime.aired.prop.from ? anime.aired.prop.from.year : 'TBA');
        const episodes = anime.episodes ? `${anime.episodes} EPS` : 'Unknown EPS';
        const synopsis = anime.synopsis ? anime.synopsis.replace('[Written by MAL Rewrite]', '').trim() : 'No synopsis available.';
        
        // Grab max 2 genres for tags
        const genres = anime.genres ? anime.genres.slice(0, 2).map(g => g.name) : [];
        const genreHtml = genres.map(g => `<span class="genre-tag">${g}</span>`).join('');

        // Card Element Construction
        const card = document.createElement('article');
        card.className = 'anime-card';
        card.innerHTML = `
            <div class="card-image-wrapper">
                <img src="${imageUrl}" alt="${title}" class="card-image" loading="lazy">
                <div class="card-score">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    ${score}
                </div>
                <div class="card-overlay">
                    <div class="card-genres">
                        ${genreHtml}
                    </div>
                    <h3 class="card-title">${title}</h3>
                    <div class="card-meta">
                        <span>${year}</span>
                        <span>•</span>
                        <span>${episodes}</span>
                    </div>
                    <div class="expand-hint">
                        <span>Tap for details</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                    </div>
                </div>
            </div>
            
            <div class="synopsis-panel">
                <div class="synopsis-header">
                    <h4 class="synopsis-title">${title}</h4>
                    <button class="close-btn" aria-label="Close details">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div class="synopsis-content">
                    <p>${synopsis}</p>
                </div>
            </div>
        `;

        // Card Click Handler to Expand
        card.addEventListener('click', (e) => {
            // If clicking close button, close it
            if (e.target.closest('.close-btn')) {
                card.classList.remove('expanded');
                return;
            }
            
            // Toggle expanded state
            card.classList.toggle('expanded');
            
            // Close other expanded cards
            if (card.classList.contains('expanded')) {
                document.querySelectorAll('.anime-card.expanded').forEach(otherCard => {
                    if (otherCard !== card) otherCard.classList.remove('expanded');
                });
            }
        });

        animeGrid.appendChild(card);
    });

    hideLoading();
}

// Utility UI Functions
function initSkeletons() {
    skeletonGrid.innerHTML = '';
    // Create 12 skeletons
    for(let i=0; i<12; i++) {
        const skel = document.createElement('div');
        skel.className = 'skeleton-card';
        skeletonGrid.appendChild(skel);
    }
}

function showLoading() {
    animeGrid.classList.add('hidden');
    errorState.classList.add('hidden');
    skeletonGrid.classList.remove('hidden'); // Show skeleton grid as initial feedback
    
    // Fallback or bottom spinner
    if (animeGrid.innerHTML.trim() !== '') {
        loadingState.classList.remove('hidden');
        skeletonGrid.classList.add('hidden');
        animeGrid.classList.add('hidden');
    }
}

function hideLoading() {
    skeletonGrid.classList.add('hidden');
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    animeGrid.classList.remove('hidden');
}

function showError() {
    skeletonGrid.classList.add('hidden');
    loadingState.classList.add('hidden');
    animeGrid.classList.add('hidden');
    errorState.classList.remove('hidden');
}
