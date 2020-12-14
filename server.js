require("./fetchAndUpdateProducts");
const express = require("express");
const app = express();
const { getUpdatedItems } = require("./fetchAndUpdateProducts");

const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    items: getUpdatedItems(),
  });
});

app.listen(port, () => {
  console.log("Server is running on port", port);
});
