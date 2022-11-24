import "./fetchAndUpdateProducts.js";
import express from "express";

const app = express();
import { getUpdatedItems } from "./fetchAndUpdateProducts.js";

const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    items: getUpdatedItems(),
  });
});

app.post("/", (req, res) => {
  console.log(req.body);
  res.status(200);
});

app.listen(port, () => {
  console.log("Server is running on port", port);
});
