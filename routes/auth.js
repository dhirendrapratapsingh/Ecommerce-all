const express = require("express");
const { check, body } = require("express-validator");
// check is used for validation of any part of the request, by passing it as middleware to the routes.
// similarly we can destruct body, query, params, headers, cookies etc. from the library and use them for validation of the respective part of the request.
// body is used for validation of the body of the request.
// express-validator is a set of express.js middlewares that wraps the extensive collection of validators and sanitizers offered by validator.js.
// https://express-validator.github.io/docs/ https://github.com/validatorjs/validator.js

const authController = require("../controllers/auth");
const User = require("../models/user");

const router = express.Router();

router.get("/login", authController.getLogin);

router.get("/signup", authController.getSignup);

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email address.") // checks can be chained
      .normalizeEmail(), // Sanitizer from library that normalizes by converting it to lowercase, removing dots in the username part for Gmail addresses. It also removes any whitespace around the email address.
    //   .custom((value, { req }) => { Can add our own customised check with .custom
    //     if (value === "test@test.com") {
    //       throw new Error("This email address is forbidden.");
    //     }
    //     return true; // If the validation is successful then we have to return true otherwise throw an error then the validation will fail and the error message will be added to the validation errors array.
    //   }),
    body(
      "password",
      "Please enter a password with only numbers and text and at least 5 characters.", // 2nd param is usaed as default error message if the validation fails and we have not specified any error message with .withMessage() method.
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(), // remove excess whitespace from the beginning and end of the string
  ],
  authController.postLogin,
);
// router.post("/login", check("email").isEmail().withMessage("Please enter a valid email.").normalizeEmail(), authController.postLogin);
// router.post("/login", body("password", "Please enter a password with only numbers and text and at least 5 characters.").isLength({ min: 5 }).isAlphanumeric().trim(), authController.postLogin);
// We can also chain the validation methods like this, but it is better to use an array of validation middlewares for better readability and maintainability.

router.post(
  "/signup",
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email.")
      .custom((value, { req }) => {
        // if (value === 'test@test.com') {
        //   throw new Error('This email address if forbidden.');
        // }
        // return true;
        //
        // EXAMPLE OF Adding own asynchronous validation(checked in db). express-validator adds the error thrown by rejected promise to the validation errors array and the validation will fail if the promise is rejected.
        //
        // check preexistence even before going to API layer to save resources and give faster feedback to the user.
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject(
              "E-Mail exists already, please pick a different one.",
            );
          }
        });
      })
      .normalizeEmail(),
    body(
      "password",
      "Please enter a password with only numbers and text and at least 5 characters.",
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
    body("confirmPassword")
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords have to match!");
        }
        return true;
      }),
  ],
  authController.postSignup,
);

router.post("/logout", authController.postLogout);

router.get("/reset", authController.getReset);

router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);

module.exports = router;
