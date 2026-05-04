

const express = require("express");

const router = express.Router();

router.use("/stats",require("./stats.route"));


module.exports = router;