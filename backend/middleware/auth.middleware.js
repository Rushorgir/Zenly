import jwt from "jsonwebtoken";

/**
 * Authentication middleware - verifies JWT token and attaches user info to request
 * Usage: Add to routes that require authentication
 */
export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "No token provided" });
        }

        const token = authHeader.substring(7); // Remove "Bearer " prefix
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            req.userId = decoded.id;
            req.userRole = decoded.role;
            next();
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
            }
            return res.status(401).json({ error: "Invalid token" });
        }
    } catch {
        res.status(500).json({ error: "Authentication error" });
    }
};

/**
 * Optional authentication - doesn't fail if no token, but attaches user if valid
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next();
        }

        const token = authHeader.substring(7);
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            req.userId = decoded.id;
            req.userRole = decoded.role;
        } catch {
            // Token invalid or expired, but we don't fail - just continue without auth
        }
        
        next();
    } catch {
        next();
    }
};

/**
 * SSE Authentication middleware - accepts token from query string
 * EventSource doesn't support custom headers, so token must be in URL
 */
export const sseAuthMiddleware = async (req, res, next) => {
    try {
        // Try to get token from query string first (for SSE)
        let token = req.query.token;
        
        // Fallback to Authorization header if no query token
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }
        }
        
        if (!token) {
            return res.status(401).json({ 
                error: "No token provided",
                message: "Token required in query string (?token=xxx) for SSE endpoints"
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            req.userId = decoded.id;
            req.userRole = decoded.role;
            next();
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({ 
                    error: "Token expired", 
                    code: "TOKEN_EXPIRED" 
                });
            }
            return res.status(401).json({ error: "Invalid token" });
        }
    } catch {
        res.status(500).json({ error: "Authentication error" });
    }
};

/**
 * Role-based authorization middleware
 * Usage: requireRole("admin") or requireRole(["admin", "moderator"])
 */
export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.userRole) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        if (!allowedRoles.includes(req.userRole)) {
            return res.status(403).json({ error: "Insufficient permissions" });
        }

        next();
    };
};

export default authMiddleware;
