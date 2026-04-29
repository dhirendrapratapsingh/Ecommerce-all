const fs = require("fs");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_KEY);

// https://docs.stripe.com/js/initializing
// my account on Stripe dashboard: https://dashboard.stripe.com/test/dashboard
// https://dashboard.stripe.com/acct_1TKBHZ4KfiHGb76K/test/payments

const PDFDocument = require("pdfkit");
//a library for generating PDF documents in Node.js, it provides a simple API to create PDF documents with text, images, tables, etc. It allows us to create PDF documents on the fly and send them to the client without having to store them on the server.

const Product = require("../models/product");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 2; // number of items to be displayed per page for pagination, we can change this value to display more or less items per page, it is used in the controllers to calculate the number of items to skip and limit the number of items to be retrieved from the database for each page.

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      console.log(products);
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "All Products",
        path: "/products",
        // isAuthenticated is a flag to check if the user is logged in or not in the views and controllers
        isAuthenticated: req.session.isLoggedIn,
        // method provided by middleware to generate a CSRF token for the current
        // session and pass it to the views to include it in the forms that modify data (POST, PUT, DELETE)
        // to protect against CSRF attacks.
        csrfToken: req.csrfToken(),
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
        // isAuthenticated: req.session.isLoggedIn,
        // csrfToken: req.csrfToken(),
        // instead added global middleware to set isAuthenticated in res.locals to make it available in all views without having to pass it in each render method in the controllers.
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1; // req.query by default holds url params
  let totalItems;

  Product.find()
    .countDocuments() // gives total recirds in collectn
    .then((numProducts) => {
      totalItems = numProducts;
      return (
        Product.find()
          .skip((page - 1) * ITEMS_PER_PAGE) // .skip() method is used to skip a certain number of documents in the result set,
          // it is used for pagination to skip the documents that have already been displayed on the previous pages, it takes the number of documents to skip as an argument,
          // in this case we are calculating the number of documents to skip based on the current page number and the number of items to be displayed per page.
          .limit(ITEMS_PER_PAGE)
      ); // limis no of recirds retrieved from db
    })
    .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
        // isAuthenticated: req.session.isLoggedIn,
        // csrfToken: req.csrfToken(),
        // instead added global middleware to set isAuthenticated in res.locals to make it available in all views without having to pass it in each render method in the controllers.
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE), // if totalItems is 5 and ITEMS_PER_PAGE is 2 then lastPage will be 3,
        // if totalItems is 6 and ITEMS_PER_PAGE is 2 then lastPage will be 3, if totalItems is 7 and ITEMS_PER_PAGE is 2 then lastPage will be 4,
        // so it gives the total number of pages based on the total number of items and the number of items to be displayed per page.
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = async (req, res, next) => {
  if (!req.user) {
    console.log("[GET CART] No req.user, redirecting to /login");
    return res.redirect("/login");
  }

  try {
    // applied try-catch & async-await as we commented .execPopulate() for trial
    console.log("[GET CART] req.user id:", req.user._id.toString());

    // .populate() method is used to populate the referenced documents in the result set,
    // in this case it populates the productId field in the cart items with the actual product documents.
    //.execPopulate() // returns a promise that resolves to the user document with the populated cart items,
    // we can use this promise to access the populated cart items in the then() method and render the cart view with the populated cart items.
    const user = await req.user.populate("cart.items.productId");

    console.log("[GET CART] Populated cart for user", user._id.toString());

    const allItems =
      user.cart && Array.isArray(user.cart.items) ? user.cart.items : [];

    // Filter out any cart entries where the referenced product was deleted
    const products = allItems.filter((item) => {
      if (!item.productId) {
        console.log("[GET CART] Dropping cart item with missing productId");
        return false;
      }
      return true;
    });

    console.log("[GET CART] Cart items count:", products.length);

    res.render("shop/cart", {
      path: "/cart",
      pageTitle: "Your Cart",
      products: products,
    });
  } catch (err) {
    console.log("[GET CART] Error while loading cart:", err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      console.log(result);
      res.redirect("/cart");
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    //.execPopulate()
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
        // isAuthenticated: req.session.isLoggedIn,
        // csrfToken: req.csrfToken(),
        // instead added global middleware to set isAuthenticated in res.locals to make it available in all views without having to pass it in each render method in the controllers.
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error("No order found."));
      }
      // check if user allowed to access founded order invoice
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Unauthorized")); // middleware witll catch this with 500 scode
      }
      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join("data", "invoices", invoiceName);

      // fs.readFile(invoicePath, (err, data) => {}) // this will read the entire file into memory before sending it to the client,
      // which can be inefficient for large files, instead we can use streams to read the file in chunks and send it to the client as it is being read, which is more efficient and also allows us to handle large files without running into memory issues.

      const pdfDoc = new PDFDocument(); // creating a new pdf doc
      // fs.createReadStream(invoicePath) a buffer which can process date in chunks
      res.setHeader("Content-Type", "application/pdf"); // set the content type to PDF
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="' + invoiceName + '"',
      ); // tell the browser how handle response, wheter to display the PDF  or as attachment, gives default filename for downloading the PDF if the user chooses to download it instead of viewing it inline
      // inline = opene file in current tab; attachment = download file; filename = default name for downloaded file,`

      pdfDoc.pipe(fs.createWriteStream(invoicePath)); // pipe it a writable filestream to store it in server
      // any content added after this will be written to the file as well as sent to the client as response
      // because we are piping the PDF document to both the file stream and the response stream, so we can write the PDF document to both the file and send it to the client at the same time without having to wait for the entire PDF document to be generated before sending it to the client.
      pdfDoc.pipe(res); // this or file.pipe(res) method is used to pipe the output of the PDFDocument to the response object(a writable stream),
      // sent to the client as it is being generated without having to wait for the entire PDF to be generated before sending it to the client.

      pdfDoc.fontSize(26).text("Invoice", {
        underline: true,
      });
      pdfDoc.text("-----------------------");
      // add text to the PDF document, we can use various methods provided by the PDFDocument
      // class to add text, images, tables, etc. to the PDF document, for example we can use fontSize() method to set the font size,
      // text() method to add text to the PDF document, image() method to add images to the PDF document, etc.
      let totalPrice = 0;
      order.products.forEach((prod) => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc
          .fontSize(14)
          .text(
            prod.product.title +
              " - " +
              prod.quantity +
              " x " +
              "$" +
              prod.product.price,
          );
      });
      pdfDoc.text("-- End of System generated Invoice --");
      pdfDoc.fontSize(20).text("Total Price: $" + totalPrice);

      pdfDoc.end(); // Bot streams above for creating file & sending response will end when we
      // call end() method on the PDFDocument instance, which signals that we have finished
      // writing to the PDF document and it can be finalized and sent to the client as a response.
      //and the file will be saved on the server at the specified path.

      // fs.readFile(invoicePath, (err, data) => {
      //   if (err) {
      //     return next(err);
      //   }
      //   res.setHeader('Content-Type', 'application/pdf');
      //   res.setHeader(
      //     'Content-Disposition',
      //     'inline; filename="' + invoiceName + '"'
      //   );
      //   res.send(data);
      // });
      // const file = fs.createReadStream(invoicePath);

      // file.pipe(res);
    })
    .catch((err) => next(err));
};

exports.getCheckout = (req, res, next) => {
  let products;
  let total = 0;
  console.log(
    "[CHECKOUT] Starting checkout for user:",
    req.user && req.user._id ? req.user._id.toString() : "<no user>",
  );
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      console.log("[CHECKOUT] Populated cart for user", user._id.toString());

      const allItems =
        user.cart && Array.isArray(user.cart.items) ? user.cart.items : [];

      // Filter out any cart entries where the referenced product was deleted
      products = allItems.filter((item) => {
        if (!item.productId) {
          console.log("[CHECKOUT] Dropping cart item with missing productId");
          return false;
        }
        return true;
      });

      total = 0;
      products.forEach((p) => {
        total += p.quantity * p.productId.price;
      });

      console.log("[CHECKOUT] Cart items count:", products.length);
      console.log("[CHECKOUT] Total amount:", total);

      return stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: products.map((p) => {
          return {
            price_data: {
              currency: "usd",
              unit_amount: p.productId.price * 100,
              product_data: {
                name: p.productId.title,
                description: p.productId.description,
              },
            },
            quantity: p.quantity,
          };
        }),
        mode: "payment",
        success_url:
          req.protocol + "://" + req.get("host") + "/checkout/success", // => http://localhost:3000
        cancel_url: req.protocol + "://" + req.get("host") + "/checkout/cancel",
      });
    })
    .then((session) => {
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Checkout",
        products: products,
        totalSum: total,
        sessionId: session.id,
      });
    })
    .catch((err) => {
      console.error("[CHECKOUT] Error creating Stripe session:", err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
