
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Existing routes...

// Dummy session ID generator route
app.get('/generate-session-id', (req, res) => {
    const sessionId = Math.random().toString(36).substring(2, 15);
    res.json({ sessionId });
});

// Start server if not already started
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
