const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Handle CORS issues by allowing requests from any origin (or specify your frontend URL)
app.use(cors());
app.use(express.json());

// Mock database of movies
const movies = [
    {
        id: 1,
        title: "Example Movie 1",
        thumbnail: "https://via.placeholder.com/200x300",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
    },
    {
        id: 2,
        title: "Example Movie 2",
        thumbnail: "https://via.placeholder.com/200x300",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
    }
];

// API Endpoint to search/get movies
app.get('/api/movies', (req, res) => {
    const searchQuery = req.query.search;
    if (searchQuery) {
        const filtered = movies.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));
        return res.json(filtered);
    }
    res.json(movies);
});

// API Endpoint to get a single movie's streaming link
app.get('/api/movies/:id', (req, res) => {
    const movie = movies.find(m => m.id === parseInt(req.params.id));
    if (movie) {
        res.json(movie);
    } else {
        res.status(404).json({ error: "Movie not found" });
    }
});

app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
});
