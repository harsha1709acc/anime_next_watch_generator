const API_BASE = 'https://api.jikan.moe/v4';

let lastRequestTime = 0;
const rateLimitDelay = 350;

const animeGrid = document.getElementById('anime-grid');
const skeletonGrid = document.getElementById('skeleton-grid');
const loadingState = document.getElementById('loading');
const errorState = document.getElementById('error-state');
const noResultsState = document.getElementById('no-results');
const retryBtn = document.getElementById('retry-btn');
const filterBtns = document.querySelectorAll('.filter-btn');
const genreSelect = document.getElementById('genre-select');
const sortSelect = document.getElementById('sort-select');
const sectionTitle = document.getElementById('section-title');
const sectionSubtitle = document.getElementById('section-subtitle');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const themeToggle = document.getElementById('theme-toggle');
const favoritesToggle = document.getElementById('favorites-toggle');
const favoritesCount = document.getElementById('favorites-count');
const activeFiltersContainer = document.getElementById('active-filters');
const activeFilterTags = document.getElementById('active-filter-tags');

let currentFilter = 'trending';
let currentGenre = '';
let currentSearch = '';
let currentSort = '';
let rawAnimeData = [];
let favorites = JSON.parse(localStorage.getItem('animeFavorites') || '[]');
let showingFavorites = false;

document.addEventListener('DOMContentLoaded', () => {
    initSkeletons();
    setupEventListeners();
    loadTheme();
    updateFavoritesCount();
    fetchAnimeList(currentFilter);
});

function loadTheme() {
    const savedTheme = localStorage.getItem('animeTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('animeTheme', next);
}

function isFavorite(malId) {
    return favorites.find(fav => fav.mal_id === malId) !== undefined;
}

function toggleFavorite(anime, e) {
    e.stopPropagation();
    const malId = anime.mal_id;
    
    if (isFavorite(malId)) {
        favorites = favorites.filter(fav => fav.mal_id !== malId);
    } else {
        favorites = [...favorites, {
            mal_id: anime.mal_id,
            title: anime.title_english || anime.title,
            title_english: anime.title_english,
            images: anime.images,
            score: anime.score,
            year: anime.year,
            aired: anime.aired,
            episodes: anime.episodes,
            synopsis: anime.synopsis,
            genres: anime.genres
        }];
    }
    
    localStorage.setItem('animeFavorites', JSON.stringify(favorites));
    updateFavoritesCount();
    
    const card = e.currentTarget.closest('.anime-card');
    if (card) {
        const heartBtn = card.querySelector('.favorite-btn');
        if (heartBtn) {
            heartBtn.classList.toggle('is-favorite');
            heartBtn.classList.add('heart-pop');
            setTimeout(() => heartBtn.classList.remove('heart-pop'), 400);
        }
    }

    if (showingFavorites) {
        renderAnimeCards(favorites);
    }
}

function updateFavoritesCount() {
    favoritesCount.textContent = favorites.length;
    favoritesCount.classList.toggle('hidden', favorites.length === 0);
}

function showFavorites() {
    showingFavorites = !showingFavorites;
    favoritesToggle.classList.toggle('active', showingFavorites);

    if (showingFavorites) {
        filterBtns.forEach(b => b.classList.remove('active'));
        genreSelect.value = '';
        sortSelect.value = '';
        searchInput.value = '';
        currentSearch = '';

        sectionTitle.textContent = 'Your Favorites';
        sectionSubtitle.textContent = `${favorites.length} anime in your watchlist.`;
        
        if (favorites.length === 0) {
            animeGrid.classList.add('hidden');
            showNoResults('No favorites yet — start adding some!');
        } else {
            renderAnimeCards(favorites);
        }
    } else {
        filterBtns[0].classList.add('active');
        currentFilter = 'trending';
        fetchAnimeList(currentFilter);
    }
}

function applySearchAndSort(animeList) {
    let result = [...animeList];

    if (currentSearch.trim() !== '') {
        const query = currentSearch.toLowerCase().trim();
        result = result.filter(anime => {
            const title = (anime.title_english || anime.title || '').toLowerCase();
            const titleJapanese = (anime.title || '').toLowerCase();
            const genreMatch = anime.genres
                ? anime.genres.some(g => g.name.toLowerCase().includes(query))
                : false;
            return title.includes(query) || titleJapanese.includes(query) || genreMatch;
        });
    }

    if (currentSort !== '') {
        result = sortAnimeList(result, currentSort);
    }

    return result;
}

function sortAnimeList(animeList, sortBy) {
    return [...animeList].sort((a, b) => {
        switch (sortBy) {
            case 'score-desc':
                return (b.score || 0) - (a.score || 0);
            case 'score-asc':
                return (a.score || 0) - (b.score || 0);
            case 'title-asc': {
                const titleA = (a.title_english || a.title || '').toLowerCase();
                const titleB = (b.title_english || b.title || '').toLowerCase();
                return titleA.localeCompare(titleB);
            }
            case 'title-desc': {
                const titleA = (a.title_english || a.title || '').toLowerCase();
                const titleB = (b.title_english || b.title || '').toLowerCase();
                return titleB.localeCompare(titleA);
            }
            case 'year-desc': {
                const yearA = a.year || (a.aired?.prop?.from?.year) || 0;
                const yearB = b.year || (b.aired?.prop?.from?.year) || 0;
                return yearB - yearA;
            }
            case 'year-asc': {
                const yearA = a.year || (a.aired?.prop?.from?.year) || 0;
                const yearB = b.year || (b.aired?.prop?.from?.year) || 0;
                return yearA - yearB;
            }
            default:
                return 0;
        }
    });
}

function setupEventListeners() {
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            showingFavorites = false;
            favoritesToggle.classList.remove('active');
            
            filterBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            genreSelect.value = '';
            
            const filter = e.currentTarget.dataset.filter;
            currentFilter = filter;
            fetchAnimeList(filter);
        });
    });

    genreSelect.addEventListener('change', (e) => {
        showingFavorites = false;
        favoritesToggle.classList.remove('active');
        
        const genreId = e.target.value;
        if (genreId) {
            filterBtns.forEach(b => b.classList.remove('active'));
            
            currentFilter = 'genre';
            currentGenre = genreId;
            const genreName = e.target.options[e.target.selectedIndex].text;
            
            fetchAnimeList('genre', genreId, genreName);
        } else {
            filterBtns[0].click(); 
        }
    });

    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        const processed = applySearchAndSort(rawAnimeData);
        if (processed.length > 0) {
            renderAnimeCards(processed, true);
        } else {
            showNoResults();
        }
        updateActiveFiltersUI();
    });

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        searchClear.classList.toggle('hidden', currentSearch === '');
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const processed = applySearchAndSort(rawAnimeData);
            if (processed.length > 0) {
                renderAnimeCards(processed, true);
            } else {
                showNoResults();
            }
            updateActiveFiltersUI();
        }, 250);
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        currentSearch = '';
        searchClear.classList.add('hidden');
        const processed = applySearchAndSort(rawAnimeData);
        renderAnimeCards(processed, true);
        updateActiveFiltersUI();
    });

    themeToggle.addEventListener('click', toggleTheme);

    favoritesToggle.addEventListener('click', showFavorites);

    retryBtn.addEventListener('click', () => {
        fetchAnimeList(currentFilter, currentGenre);
    });
}

function updateActiveFiltersUI() {
    const tags = [];
    
    if (currentSearch.trim() !== '') {
        tags.push({ label: `Search: "${currentSearch}"`, type: 'search' });
    }
    if (currentSort !== '') {
        const sortLabel = sortSelect.options[sortSelect.selectedIndex]?.text || currentSort;
        tags.push({ label: `Sort: ${sortLabel}`, type: 'sort' });
    }

    if (tags.length > 0) {
        activeFiltersContainer.classList.remove('hidden');
        activeFilterTags.innerHTML = tags.map(tag => 
            `<span class="filter-tag">
                ${tag.label}
                <button class="tag-remove" data-type="${tag.type}" aria-label="Remove ${tag.type} filter">×</button>
            </span>`
        ).join('');

        activeFilterTags.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                if (type === 'search') {
                    searchInput.value = '';
                    currentSearch = '';
                    searchClear.classList.add('hidden');
                } else if (type === 'sort') {
                    sortSelect.value = '';
                    currentSort = '';
                }
                const processed = applySearchAndSort(rawAnimeData);
                renderAnimeCards(processed, true);
                updateActiveFiltersUI();
            });
        });
    } else {
        activeFiltersContainer.classList.add('hidden');
    }
}

async function fetchAnimeList(filter, genreId = null, genreName = '') {
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
        rawAnimeData = data.data || [];
        
        const processed = applySearchAndSort(rawAnimeData);
        
        if (processed.length > 0) {
            renderAnimeCards(processed);
        } else if (rawAnimeData.length > 0) {
            showNoResults();
        } else {
            showError();
        }
        updateActiveFiltersUI();
    } catch (error) {
        console.error("Failed to fetch anime:", error);
        showError();
    }
}

function renderAnimeCards(animeList, skipLoadingHide = false) {
    if (!animeList || animeList.length === 0) {
        showNoResults();
        return;
    }

    animeGrid.innerHTML = '';
    
    const validAnime = animeList.filter(anime => anime.images && anime.images.jpg && anime.images.jpg.large_image_url);

    if (validAnime.length === 0) {
        showNoResults();
        return;
    }

    validAnime.forEach(anime => {
        const title = anime.title_english || anime.title;
        const imageUrl = anime.images.jpg.large_image_url;
        const score = anime.score ? anime.score.toFixed(1) : 'N/A';
        const year = anime.year || (anime.aired && anime.aired.prop && anime.aired.prop.from ? anime.aired.prop.from.year : 'TBA');
        const episodes = anime.episodes ? `${anime.episodes} EPS` : 'Unknown EPS';
        const synopsis = anime.synopsis ? anime.synopsis.replace('[Written by MAL Rewrite]', '').trim() : 'No synopsis available.';
        
        const genres = anime.genres ? anime.genres.slice(0, 2).map(g => g.name) : [];
        const genreHtml = genres.map(g => `<span class="genre-tag">${g}</span>`).join('');
        
        const isFav = isFavorite(anime.mal_id);

        const card = document.createElement('article');
        card.className = 'anime-card';
        card.innerHTML = `
            <div class="card-image-wrapper">
                <img src="${imageUrl}" alt="${title}" class="card-image" loading="lazy">
                <div class="card-score">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    ${score}
                </div>
                
                <button class="favorite-btn ${isFav ? 'is-favorite' : ''}" aria-label="${isFav ? 'Remove from' : 'Add to'} favorites" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>

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
                <div class="synopsis-actions">
                    <a href="https://myanimelist.net/anime/${anime.mal_id}" target="_blank" rel="noopener noreferrer" class="mal-link">
                        View on MAL
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                </div>
            </div>
        `;

        const favBtn = card.querySelector('.favorite-btn');
        favBtn.addEventListener('click', (e) => toggleFavorite(anime, e));

        card.addEventListener('click', (e) => {
            if (e.target.closest('.favorite-btn') || e.target.closest('.mal-link')) {
                return;
            }
            if (e.target.closest('.close-btn')) {
                card.classList.remove('expanded');
                return;
            }
            
            card.classList.toggle('expanded');
            
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

function initSkeletons() {
    skeletonGrid.innerHTML = '';
    Array.from({ length: 12 }).forEach(() => {
        const skel = document.createElement('div');
        skel.className = 'skeleton-card';
        skeletonGrid.appendChild(skel);
    });
}

function showLoading() {
    animeGrid.classList.add('hidden');
    errorState.classList.add('hidden');
    noResultsState.classList.add('hidden');
    skeletonGrid.classList.remove('hidden');
    
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
    noResultsState.classList.add('hidden');
    animeGrid.classList.remove('hidden');
}

function showError() {
    skeletonGrid.classList.add('hidden');
    loadingState.classList.add('hidden');
    animeGrid.classList.add('hidden');
    noResultsState.classList.add('hidden');
    errorState.classList.remove('hidden');
}

function showNoResults(message) {
    skeletonGrid.classList.add('hidden');
    loadingState.classList.add('hidden');
    animeGrid.classList.add('hidden');
    errorState.classList.add('hidden');
    noResultsState.classList.remove('hidden');
    
    if (message) {
        noResultsState.querySelector('p').textContent = message;
    } else {
        noResultsState.querySelector('p').textContent = 'Try adjusting your search or filters.';
    }
}
