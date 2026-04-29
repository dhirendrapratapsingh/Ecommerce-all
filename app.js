const path = require("path");
const fs = require("fs");
const https = require("https");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session); // function is executed gving constructor function
// connect-mongodb-session is used to store session data in MongoDB instead of in memory which is
// not recommended for production environment as it can lead to memory leaks and also it will not work in a clustered environment where we have multiple instances of the application running.
const csrf = require("csurf");
// csurf is used to protect against Cross-Site Request Forgery (CSRF) attacks by generating a unique token
// for each user session and validating it on each request that modifies data (POST, PUT, DELETE).
const flash = require("connect-flash");
// connect-flash is used to store temporary messages in the session and display them to the user
//  It is often used to display error messages or success messages after a form submission.
const multer = require("multer");
// multer is a middleware used to handle file uploads in Express.js applications. It autmatically looks for & parses the incoming request and extracts the file data, making it available in the req.file object.
// It provides middleware for handling multipart/form-data(encoding type) used for file uploads in HTML forms.
// The uploaded image file is accessed through req.file and its path is stored in the database as imageUrl for the product.

const helmet = require("helmet"); // https://helmetjs.github.io/
// Helmet is a middleware for Express.js that helps secure web applications by setting important HTTP security headers automatically

const compression = require("compression");
// Compression is a middleware for Express.js that compresses the response body using gzip or deflate algorithms,
// which can significantly reduce the size of the response and improve the performance of the application by reducing the
// amount of data that needs to be transferred over the network.
const morgan = require("morgan");
// Morgan is a middleware for Express.js that logs HTTP requests and responses to the console or to a file,
// which can be useful for debugging and monitoring the application.

const errorController = require("./controllers/error");
const User = require("./models/user");

const privateKey = fs.readFileSync("server.key"); // read the private key and certificate files for HTTPS server setup
const certificate = fs.readFileSync("server.cert"); // created using OpenSSL for local development, in production you would use a certificate from a trusted CA.

// const MONGODB_URI =
//   "mongodb+srv://dhirendrapratapsingh398_db_user:9955075725d@cluster0.bspry5p.mongodb.net/shop?retryWrites=true&w=majority";
const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${
  process.env.MONGO_PASSWORD
}@cluster0.bspry5p.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`;

const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions", // name of the collection in which the session data will be stored in MongoDB
});
// csrf() accepts an options object where we can specify SECRET to sign the token,value of the CSRF token and the name of the field in which the token will be stored in the form data.
// By default, it uses _csrf as the name of the field and it generates a random token for each session.
// return a middleware function that we can use in our routes to protect them against CSRF attacks.
const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
  // .diskStorage() method is used to specify the storage engine for multer, it accepts an object with two properties destination and filename to specify the destination folder and the filename for the uploaded files.
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  // mimetype
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true); // accept the file
  } else {
    cb(null, false); // reject the file
  }
};

app.set("view engine", "ejs");
app.set("views", "views");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

const accessLogStream = fs.createWriteStream(
  // create a write stream to the access.log file in append mode to log the HTTP requests and responses using morgan middleware.
  path.join(__dirname, "access.log"),
  { flags: "a" },
);

app.use(helmet());
app.use(compression());
app.use(morgan("combined", { stream: accessLogStream }));
// "combined" is a predefined format string in morgan that specifies the format of the log entries,
// it includes information like remote address, request method, URL, HTTP version, response status code, user agent etc.
// all logs are written to the Ecommerce-all/access.log file in append mode using the accessLogStream created above.

app.use(bodyParser.urlencoded({ extended: false }));
// urlencoded middleware is used for content type application/x-www-form-urlencoded i.e text type
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image"),
); // multer middleware is used for content type multipart/form-data i.e file type,
// dest is the destination folder where the uploaded files will be stored, single() is used to handle single file upload
// and it accepts the name of the field in which the file will be uploaded in the form data.
app.use(express.static(path.join(__dirname, "public")));
// express.static middleware is used to serve static files like CSS, JS, images etc. from the public folder and images folder
app.use("/images", express.static(path.join(__dirname, "images")));
// if a request comes for "/images/*", it will look for the file in the images folder and serve it as a static file,
// this is required to serve the uploaded images as static files to display them in the views.

app.use(
  session({
    secret: "my secret", // this is used to sign the session ID cookie, it can be any string but it should be kept secret in production environment
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    store: store, // we need to pass the store instance to the session middleware to use MongoDB to store session data
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // session will expire after 24 hours
    },
  }),
);

app.use(csrfProtection); // integrarte the CSRF protection middleware in the application to protect all the routes that modify data (POST, PUT, DELETE) against CSRF attacks.
app.use(flash()); // flash middleware should be used after the session middleware as it uses the session to store the messages

// middleware to set isAuthenticated and csrfToken in the res.locals object[provided by Express] to make it
// available in all the views without having to pass it in each render method in the controllers.
app.use((req, res, next) => {
  // isAuthenticated is a flag to check if the user is logged in or not in the views and controllers
  res.locals.isAuthenticated = req.session.isLoggedIn;
  // method provided by middleware to generate a CSRF token for the current
  // session and pass it to the views to include it in the forms that modify data (POST, PUT, DELETE)
  // to protect against CSRF attacks.
  res.locals.csrfToken = req.csrfToken();

  next();
});

// We can use req.session to store data in the session and it will be available in all the requests
// until the session is destroyed or expired. We can also use req.session.user to store the user data
// in the session and access it in the controllers and views to check if the user is logged in or not and to get the user data.

app.use((req, res, next) => {
  if (!req.session.user) {
    // No user in session for this request
    return next();
  }
  // Note : req.session.user is a plain JS object and it will not have the methods of the
  // User SCHEMA defined in user.js. Hence we need to create an instance of the User SCHEMA using
  // the retrieved object from the session to have access to the methods of the User SCHEMA in the controllers.
  // and put it in the req.user to access it in the controllers and views.
  // If we directly put req.user = req.session.user it will just store plain JS object but not the methods
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        console.log(
          "[SESSION USER] No user found in DB for id",
          req.session.user._id,
        );
        return next(); //if user not found in DB, pass to next middleware
        // without making req.user=undefined to avoid errors
      }
      console.log(
        "[SESSION USER] User loaded and attached to req.user",
        user._id.toString(),
      );
      req.user = user;
      next();
    })
    .catch((err) => {
      console.log(err);
      // Note: throwing an error in a promise will not be caught by the error handling middleware defined in app.js
      // as it is outside the normal request-response cycle of Express.
      //  Hence we need to throw the error outside the async promise block the next() function to let Express know that an error has occurred and it should skip all the remaining middlewares and route handlers and jump to the error handling middleware defined in app.js to handle such errors and render the 500 error page.
      //throw new Error(err); will not work
      return next(new Error(err)); // For promises use this way to pass the error to the error handling middleware defined in app.js to handle such errors and render the 500 error page.
    });
});

// Note: ensure that all views that modify data (POST, PUT, DELETE) include the CSRF token in the form
// data to avoid CSRF token mismatch error.  <input type="hidden" name="_csrf" value="<%= csrfToken %>">

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

// This should be before the 404 middleware to catch any errors that occur in the routes and render the 500 error page instead of the 404 error page.
app.use("/500", errorController.get500);

app.use(errorController.get404);

// If there are 4 params, Express will treat it as an error handling middleware and it will be called whenever
// we pass an error to the next() function in any of the routes or middlewares.
// We can use this middleware to catch any errors that occur in the application and render a 500 error page instead of crashing the application.
app.use((error, req, res, next) => {
  // res.status(error.httpStatusCode).render(...);
  // res.redirect('/500');
  res.status(500).render("500", {
    pageTitle: "Error!",
    path: "/500",
    isAuthenticated: req.session.isLoggedIn,
  });
});

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((result) => {
    console.log("MongoDB Connected!");

    https
      .createServer({ key: privateKey, cert: certificate }, app)
      .listen(process.env.PORT || 3000);

    // Start server only after MongoDB connection attempt has been made
    // (if connection fails, errors will be logged above).
    // In typical setups you might move app.listen into the .then() block,
    // but for local development this pattern is sufficient.

    // app.listen(3000, () => {
    //   console.log("Server started on port 3000");
    // });

    // After signup is impletmented no need to dummy user creation
    // User.findOne().then((user) => {
    //   if (!user) {
    //     const user = new User({
    //       name: "Max",
    //       email: "max@test.com",
    //       cart: {
    //         items: [],
    //       },
    //     });
    //     user.save();
    //   }
    // });
  })
  .catch((err) => {
    console.log("MongoDB connection error:", err);
  });
