// Implementing client-side JavaScript to handle the delete product functionality
// using AJAX to avoid page reloads and provide a better user experience.
const deleteProduct = (btn) => {
  // this = btn element that was clicked, we can use it to get the productId and csrf token from  hidden
  // input fields in the form and then make a fetch request to the server to delete the product and then
  // remove the product element from the DOM if the deletion is successful.
  const prodId = btn.parentNode.querySelector("[name=productId]").value;
  const csrf = btn.parentNode.querySelector("[name=_csrf]").value;

  const productElement = btn.closest("article"); // Get the closest ancestor element that matches
  // the selector "article", which is the product card element that we want to remove from the DOM after successful deletion.

  fetch("/admin/product/" + prodId, {
    // fetch API provide by browser, it takes endpoint "/admin/product/:productId" where :productId is the id of the product we want to delete,
    // we are also sending the csrf token in the headers for security reasons,
    method: "DELETE",
    headers: {
      "csrf-token": csrf,
    },
  })
    .then((result) => {
      return result.json();
      // IMPORTANT .json() method is used to parse the JSON response from the server,
      // it returns a promise that resolves with the result of parsing the body text as JSON,
      // which is the message we sent from the server in case of successful deletion or error.
    })
    .then((data) => {
      console.log(data);
      productElement.parentNode.removeChild(productElement);
    })
    .catch((err) => {
      console.log(err);
    });
};
