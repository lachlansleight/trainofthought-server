import { Express } from "express";
//import cors = require("cors");

const setupHttpEndpoints = (app: Express) => {
    app.get("/", (req, res) => {
        res.json({ message: "Hello World!" });
    });
};

export default setupHttpEndpoints;
