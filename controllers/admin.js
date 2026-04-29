const { validationResult } = require("express-validator");
const mongoose = require("mongoose"); // temp to create DB duplicate entry error
const Product = require("../models/product");
const fileHelper = require("../util/file");

exports.getProducts = (req, res, next) => {
  // Authorisation implementation: Only fetch products created by the logged-in user
  Product.find({ userId: req.user._id })
    // .select('title price -_id')
    // .populate('userId', 'name')
    .then((products) => {
      console.log(products);
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
        hasError: false,
        errorMessage: null,
        validationErrors: [],
        // isAuthenticated: req.session.isLoggedIn,
        // csrfToken: req.csrfToken(),
      });
    })
    .catch((err) => {
      // this is better approach to handle runtime errors in global middleware explained in line 111
      res.redirect("/500");
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getAddProduct = (req, res, next) => {
  // Instead of checking for authentication in every controller, we can create a middleware to
  // check for authentication and use it in the routes where we want to protect the routes from unauthenticated users.
  // This way we can keep our controllers clean and also we can reuse the middleware in other routes as well.
  // if (!req.session.isLoggedIn) {
  //   return res.redirect("/login");
  // }

  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    product: { title: "", imageUrl: "", price: "", description: "" },
    errorMessage: null,
    validationErrors: [],
    isAuthenticated: req.session.isLoggedIn,
    csrfToken: req.csrfToken(),
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  // Always store files in file systems & path to the file in the database instead of storing the file itself in the database to avoid performance issues and also to avoid database size issues as files can be large in size and it will increase the size of the database significantly if we store the files in the database.

  if (!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
      errorMessage: "Attached file is not an image.",
      validationErrors: [],
    });
  }

  // Build imageUrl from uploaded file path
  const imageUrl = image.path;

  // validate data before consumption
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        imageUrl: imageUrl,
        price: price,
        description: description,
      },
      errorMessage: errors.array()[0].msg, // send the first error message to the view to display it to the user
      // to inform user thst error in user input and not from server, sending validation errors array to the view to highlight the fields with errors and display the error messages next to the respective fields.
      validationErrors: errors.array(),
    });
  }

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user,
  });
  product
    .save()
    .then((result) => {
      // console.log(result);
      console.log("Created Product");
      res.redirect("/admin/products");
    })
    .catch((err) => {
      // Example for throwing runtime database server error
      // return res.status(500).render("admin/edit-product", {
      //   pageTitle: "Add Product",
      //   path: "/admin/add-product",
      //   editing: false,
      //   hasError: true,
      //   product: {
      //     title: title,
      //     imageUrl: imageUrl,
      //     price: price,
      //     description: description,
      //   },
      //   errorMessage: "Database operation failed, please try again.",
      //   validationErrors: [],
      // });
      // For handling such runtime errors we can also create a middleware to catch such errors and
      // render a 500 error page instead of rendering the same page with an error message to
      // avoid code duplication in all the controllers and also to handle unexpected errors that we might not have handled in the controllers.
      res.redirect("/500");
      const error = new Error(err);
      error.httpStatusCode = 500;
      // If error object is passed to next() function with an argument then Express will skip all the remaining middlewares
      // and route handlers and will jump to the error handling middleware that we have defined in app.js to handle such errors and render the 500 error page.
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: [],
      });
    })
    .catch((err) => {
      res.redirect("/500");
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  // const updatedImageUrl = req.body.imageUrl;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req); // validate data before consumption
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        imageUrl: image ? image.path : "",
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  Product.findById(prodId)
    .then((product) => {
      // Authorisation : Only allow the user who created the product to edit it
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/");
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      // product.imageUrl = updatedImageUrl;
      if (image) {
        // if image field has value delete old one & save the path
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      return product.save().then((result) => {
        console.log("UPDATED PRODUCT!");
        res.redirect("/admin/products");
      });
    })
    .catch((err) => {
      res.redirect("/500");
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// exports.postDeleteProduct = (req, res, next) => {
//   const prodId = req.body.productId;
//   // Product.findByIdAndRemove(prodId) // This will delete the product without checking for the user who created it.
//   // So we need to check for the user who created the product before deleting it to prevent unauthorized deletion of products by other users.
//   // Product.deleteOne({ _id: prodId, userId: req.user._id })
//   Product.findById(prodId)
//     .then((product) => {
//       if (!product) {
//         return next(new Error("Product not found."));
//       }
//       fileHelper.deleteFile(product.imageUrl);
//       return Product.deleteOne({ _id: prodId, userId: req.user._id });
//     })
//     .then(() => {
//       console.log("DESTROYED PRODUCT");
//       res.redirect("/admin/products");
//     })
//     .catch((err) => {
//       res.redirect("/500");
//       const error = new Error(err);
//       error.httpStatusCode = 500;
//       return next(error);
//     });
// };

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return next(new Error("Product not found."));
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.deleteOne({ _id: prodId, userId: req.user._id });
    })
    .then(() => {
      console.log("DESTROYED PRODUCT");
      // res.redirect("/admin/products"); REDIRECTION & RELOAD is not good experience hence send json response to client to handle the UI update without reloading the page
      res.status(200).json({ message: "Product deleted successfully." });
    })
    .catch((err) => {
      // res.redirect("/500");
      // const error = new Error(err);
      // error.httpStatusCode = 500;
      // return next(error);
      res.status(500).json({ message: "Deleting product failed." });
    });
};
