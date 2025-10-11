/**
 * Input validation middleware
 * Validates request body against defined schemas
 */

export const validateSignup = (req, res, next) => {
    const { email, password, name } = req.body;
    const errors = [];

    if (!email || !email.trim()) {
        errors.push("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push("Invalid email format");
    }

    if (!password || password.length < 8) {
        errors.push("Password must be at least 8 characters");
    }

    if (!name || !name.trim()) {
        errors.push("Name is required");
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: "Validation failed", errors });
    }

    next();
};

export const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];

    if (!email || !email.trim()) {
        errors.push("Email is required");
    }

    if (!password) {
        errors.push("Password is required");
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: "Validation failed", errors });
    }

    next();
};

export const validateJournal = (req, res, next) => {
    const { content } = req.body;
    const errors = [];

    if (!content || !content.trim()) {
        errors.push("Journal content is required");
    }

    if (req.body.mood !== undefined) {
        const mood = Number(req.body.mood);
        if (isNaN(mood) || mood < 0 || mood > 10) {
            errors.push("Mood must be a number between 0 and 10");
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: "Validation failed", errors });
    }

    next();
};


export const validateForumPost = (req, res, next) => {
    const { title, content } = req.body;
    const errors = [];

    if (!title || !title.trim()) {
        errors.push("Title is required");
    } else if (title.length > 200) {
        errors.push("Title must be less than 200 characters");
    }

    if (!content || !content.trim()) {
        errors.push("Content is required");
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: "Validation failed", errors });
    }

    next();
};

export const validateComment = (req, res, next) => {
    const { content } = req.body;
    const errors = [];

    if (!content || !content.trim()) {
        errors.push("Comment content is required");
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: "Validation failed", errors });
    }

    next();
};
