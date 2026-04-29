module.exports = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    console.log("[IS AUTH] Unauthenticated access to", req.path);
    return res.status(401).redirect("/login");
  }
  console.log("[IS AUTH] Authenticated request to", req.path);
  next();
};
// we can use this middleware in our routes to protect them against unauthorized access.
// It checks if the user is authenticated by checking if the isLoggedIn property is set to true in the session.
// If the user is not authenticated, it redirects to the login page.
// If the user is authenticated, it calls the next() function to pass control to the next middleware or route handler.
