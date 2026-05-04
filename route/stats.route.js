

const express = require("express");
const { addDataInStatsController } = require("../controllers/stats.controller");

const router = express.Router();



router.post("/",addDataInStatsController);



module.exports = router;