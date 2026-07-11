const API_URL = 'http://localhost:3000/api/movies';

const movieGrid = document.getElementById('movieGrid');
const playerSection = document.getElementById('playerSection');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const backBtn = document.getElementById('backBtn');
const videoPlayer = document.getElementById('videoPlayer');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');

// Fetch movies from backend
async function fetchMovies(query = '') {
    try {
        const url = query ? `${API_URL}?search=${encodeURIComponent(query)}` : API_URL;
        const response = await fetch(url);
        const movies = await response.json();
        renderMovies(movies);
    } catch (error) {
        console.error("Error fetching movies:", error);
    }
}

// Display movies in the grid
function renderMovies(movies) {
    movieGrid.innerHTML = '';
    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
            <img src="${movie.thumbnail}" alt="${movie.title}">
            <h3>${movie.title}</h3>
        `;
        card.addEventListener('click', () => playMovie(movie.id));
        movieGrid.appendChild(card);
    });
}

// Fetch single movie and play it
async function playMovie(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        const movie = await response.json();
        
        // Hide grid, show player
        movieGrid.classList.add('hidden');
        playerSection.classList.remove('hidden');
        
        nowPlayingTitle.textContent = `Now Playing: ${movie.title}`;
        videoPlayer.src = movie.videoUrl;
        videoPlayer.play();
    } catch (error) {
        console.error("Error loading movie:", error);
    }
}

// Event Listeners
searchBtn.addEventListener('click', () => {
    fetchMovies(searchInput.value);
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchMovies(searchInput.value);
    }
});

backBtn.addEventListener('click', () => {
    // Stop video, hide player, show grid
    videoPlayer.pause();
    videoPlayer.src = "";
    playerSection.classList.add('hidden');
    movieGrid.classList.remove('hidden');
});

// Initial load
fetchMovies();
