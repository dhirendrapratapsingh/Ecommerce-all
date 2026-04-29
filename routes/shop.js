const path = require("path");

const express = require("express");

const shopController = require("../controllers/shop");
const isAuth = require("../middleware/is-auth");

// isAuth middleware is used to protect the routes that require authentication.
// It checks if the user is authenticated before allowing access to the route, and if not,
//  it redirects to the login page.

const router = express.Router();

router.get("/", shopController.getIndex);

router.get("/products", shopController.getProducts);

router.get("/products/:productId", shopController.getProduct);

router.get("/cart", isAuth, shopController.getCart);

router.post("/cart", isAuth, shopController.postCart);

router.post("/cart-delete-item", isAuth, shopController.postCartDeleteProduct);

// router.post("/create-order", isAuth, shopController.postOrder);

router.get("/orders", isAuth, shopController.getOrders);

router.get("/orders/:orderId", isAuth, shopController.getInvoice);

router.get("/checkout", isAuth, shopController.getCheckout);
router.get("/checkout/cancel", isAuth, shopController.getCheckout);
router.get("/checkout/success", isAuth, shopController.getCheckoutSuccess);
// getCheckoutSuccess is used as the success_url in Stripe session creation in getCheckout controller,
// so that after successful payment, user is redirected to this url and order is created in the database with the session details.

module.exports = router;
