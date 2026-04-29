// Bcrypt is a hashing algorithm . bcryptjs library is used to hash the password before storing
// it in the database and also to compare the
// hashed password with the plain text password during login to check if they match or not.
const bcrypt = require("bcryptjs");

// nodemailer-sendgrid-transport is a transport plugin for nodemailer to send emails using SendGrid service.
// We can use it to send emails for password reset, order confirmation, etc.
// nodemailer is a library to send emails from Node.js applications.
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");

// crypto is a built-in module in Node.js to perform cryptographic operations like generating random bytes,
// hashing, etc. We will use it to generate a random token for password reset functionality.
const crypto = require("crypto");

// validationResult is a function provided by express-validator to get the result of the validation and check if
// there are any validation errors in the request.
const { validationResult } = require("express-validator");

const User = require("../models/user");

// .createTransport() method is used to create a transporter object which is used to send emails using the specified transport mechanism.
const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: process.env.SENDGRID_API_KEY,
    },
  }),
);

exports.getLogin = (req, res, next) => {
  // req.flash("error") is used to get the error message stored in the session by the flash middleware and it returns an array of messages.
  // We can check if there are any messages in the array and if there are we can get the first message and pass it to the view to display it to the user.
  // If there are no messages in the array we can set the message variable to null and pass it to the view.
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    // Initiallizing the oldInput used to pre-fill fields with the data last entered by the user after errors with ""
    // to avoid undefined error in the view as oldInput is a mandaory field to pass to the view
    oldInput: {
      email: "",
      password: "",
    },
    validationErrors: [],
    isAuthenticated: req.session.isLoggedIn,
    csrfToken: req.csrfToken(),
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    isAuthenticated: req.session.isLoggedIn,
    csrfToken: req.csrfToken(),
    // oldInput is a mandaory field to passed to the view to pre-fill the form fields with the data entered by the user
    // before the validation error occurred, so that the user does not have to re-enter all the data again and
    // can just correct the invalid fields. hence initiallise getSignup with "" in the get routes
    oldInput: { email: "", password: "", confirmPassword: "" },
    // validationErrors is used to pass the validation errors array to the view to highlight the invalid fields
    // in the form and display the error messages next to the respective fields in the form.
    validationErrors: [],
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  // validationResult stores the result of the validation added at route levels to checks if there are any validation errors in the request.
  // error object is managed by middleware provided by express-validator to store the validation errors, if there are error we can return a response with the error message and the old input data to the view to display it to the user.
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // .isEmpty() method is used to check if there are any validation errors in the request and it returns true if there are no errors and false if there are errors.
    return res.status(422).render("auth/login", {
      // 422 status-code indicate that the request was well-formed but was unable to be followed due to semantic errors, in this case validation errors.
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg, //redirect user to login page with the first error message from the validation errors array
      oldInput: {
        // To auto-fill the fields with last filled values
        email: email,
        password: password,
      },
      // validationErrors is used to pass the validation errors array to the view to highlight the invalid fields
      // in the form and display the error messages next to the respective fields in the form.
      validationErrors: errors.array(),
    });
  }

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        req.flash("error", "Invalid email or password.");
        return res.redirect("/login");
      }
      bcrypt
        .compare(password, user.password)
        // .compare() provided by bycrypt compares the plain text password with the hashed password
        // and returns a promise which resolves to true if they match or false if they don't
        .then((doMatch) => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            // session.save is provided by express-session and  save the session data in the
            // session mongodb store & it takes a callback function which is called after the session
            // data is saved in the session store for actionslike redirections
            return req.session.save((err) => {
              console.log(err);
              res.redirect("/");
            });
          }
          // req.flash("error", "Invalid email or password.");
          // res.redirect("/login");
          return res.status(422).render("auth/login", {
            path: "/login",
            pageTitle: "Login",
            errorMessage: "Invalid email or password.",
            oldInput: {
              email: email,
              password: password,
            },
            validationErrors: [],
          });
        })
        .catch((err) => {
          console.log(err);
          res.redirect("/login");
        });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      // Pass the old input data back to the view to pre-fill the form fields with the data entered by the user
      // before the validation error occurred, so that the user does not have to re-enter all the data again and can just correct the invalid fields.
      // oldInput is a mandaory field to pass to the vie otherwise it will throw an error in the view as it will be undefined
      // hence initiallise tit with "" in the get routes
      oldInput: {
        email: email,
        password: password,
        confirmPassword: confirmPassword,
      },
      // validationErrors is used to pass the validation errors array to the view to highlight the invalid fields
      // in the form and display the error messages next to the respective fields in the form.
      validationErrors: errors.array(),
    });
  }

  User.findOne({ email: email })
    .then((userDoc) => {
      // user is found with the same email address in the database then we will not allow to create a new user with the same email address and redirect to the signup page with an error message
      if (userDoc) {
        req.flash(
          "error",
          "E-Mail exists already, please pick a different one.",
        );
        return res.redirect("/signup");
      }
      return (
        // .hash method takes the plain text password and the number of salt rounds to generate a salt and
        // hash the password with the salt and returns a promise which resolves to the hashed password
        bcrypt
          .hash(password, 12)
          .then((hashedPassword) => {
            const user = new User({
              email: email,
              password: hashedPassword,
              cart: { items: [] },
            });
            return user.save();
          })
          .then((result) => {
            // After signup asking user to login with the credentials just created
            //res.redirect("/login");
            // .sendMail() method is provided by nodemailer to send emails using the transporter object and
            // it takes an object with the email details like to, from, subject, html, etc. and returns a promise which
            // resolves to the result of the email sending operation.
            return transporter.sendMail({
              to: email,
              from: "dhirendrapratapsingh398@gmail.com",
              subject: "Signup succeeded!",
              html: "<h1>You successfully signed up!</h1>",
            });
          })
          .then((result) => {
            console.log("Email sent successfully:", result);
            res.redirect("/login");
          })
          .catch((err) => {
            console.log("Email sending error:", err);
            res.redirect("/login"); // Still redirect even if email fails
          })
      );
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  // This method is provided by express-session and it destroys the session and removes the session ID cookie from the browser.
  // by default it looks for csrf token in the body of the request and if it is not found it will look for it
  // in the query string and if it is not found there it will look for it in the headers of the request.
  // Hence we need to make sure that we are sending the CSRF token in the body of the request or in the query string or in the headers of the request when we are making a POST request to this route to avoid CSRF token mismatch error.
  // It takes a callback function which is called after the session is destroyed and we can use it to redirect to the home page or any other page after logout.
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  // EXTRACT ANY error message stored in the session by the flash middleware
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  console.log("1. Received password reset request for email:", req.body.email);
  // .randomBytes generate a random token for password reset
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log("2. Error generating random bytes:", err);
      return res.redirect("/reset");
    }
    console.log("2. Random bytes generated successfully");
    // buffer is a Buffer object which contains the random bytes generated by the crypto.randomBytes method
    // and we have to convert it to a string using the toString() specify the encoding as 'hex' as buffer is a binary data and
    // we want to convert it to a hexadecimal string representation which we can use as a token for password reset
    const token = buffer.toString("hex");
    console.log("3. Token created:", token);
    User.findOne({ email: req.body.email })
      .then((user) => {
        console.log(
          "4. User lookup result:",
          user ? "User found" : "User NOT found",
        );
        if (!user) {
          // user not found with the provided email address in the database then we will redirect to the reset page with an error message
          req.flash("error", "No account with that email found.");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        console.log("5. Saving user with reset token...");
        return user.save();
      })
      .then((result) => {
        console.log(
          "6. User save result:",
          result ? "Save successful" : "No result (user not found earlier)",
        );
        if (!result) {
          console.log("6b. Skipping email - user was not found");
          return;
        }
        console.log("7. Sending password reset email...");
        return transporter.sendMail({
          to: req.body.email,
          from: "dhirendrapratapsingh398@gmail.com",
          subject: "Password reset",
          html: `
            <p>You requested a password reset</p>
            <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
          `,
          // token is used to identify valid user & allow him to reset password
        });
      })
      .then((emailResult) => {
        console.log("8. Email send result:", emailResult);
        res.redirect("/");
      })
      .catch((err) => {
        console.log("ERROR in postReset:", err);
        res.redirect("/reset");
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token; // extract from url params
  // find the user with the provided reset token and check if the token is still valid by comparing
  // the resetTokenExpiration with the current time to ensure that the token has not expired.
  // $gt is a MongoDB operator which stands for "greater than" and it is used to compare the
  // resetTokenExpiration with the current time (Date.now()) i.e token expiration is in the future.
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then((user) => {
      let message = req.flash("error");
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "New Password",
        errorMessage: message,
        userId: user._id.toString(), // passing userId to the view to identify the user req for update
        passwordToken: token,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  // find user with same token & resetTokenExpiration in future
  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      resetUser = user;
      // .hash method takes the plain text password and the number of salt rounds to generate a salt and
      // hash the password with the salt and returns a promise which resolves to the hashed password
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      res.redirect("/login");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

//////////////////////////////////// old code ////////////////////////////////////

exports.postLogin_withiout_authentication = (req, res, next) => {
  User.findById("69bc20f2caef0f2ad7cc3885")
    .then((user) => {
      req.session.isLoggedIn = true; // flag to check if user is logged in or not in the views and controllers
      // we store data in the session in serverside otherwise if we store it in the req object
      // it will be lost in the next request as req is only valid for the current request but
      // session is valid for all the requests until it is destroyed or expired
      req.session.user = user;
      // After login store the user data in the session and we can access it in the controllers,views to get the user data.
      // user is avaialbl at req.user also
      req.session.save((err) => {
        // session.save is provided by express-session and  save the session data in the
        // session mongodb store & it takes a callback function which is called after the session
        // data is saved in the session store for actionslike redirections
        console.log(err);
        res.redirect("/");
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });

  res.setHeader("Set-Cookie", "loggedIn=true; HttpOnly"); // todo remove later
  // we can set cookies in the response header to store data in the browser
  // but it is not secure as it can be accessed by the client side scripts and also it is
  // not recommended to store sensitive data in cookies as it can be easily tampered with by
  // the client side scripts. Hence we use sessions to store data on the server side and only
  // store a session ID in the cookie which is used to identify the session on the server side.
  // This way we can store sensitive data in the session without worrying about security issues.
};

exports.postLogout_withiout_authentication = (req, res, next) => {
  // session.destroy provided by express-session destroys the session and redirects to the home page
  // deletes the session from the server and also removes the session ID cookie from the browser
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};
