const { getStatsDataCollection } = require("../config/db");

const addStatsDataService = async (payload) => {
  try {
    if (!payload || typeof payload !== "object") {
      return {
        success: false,
        message: "Not a valid payload"
      };
    }

    const { customerPhone, action, sku } = payload;

    if (!customerPhone || !action || !sku) {
      return {
        success: false,
        message: "customerPhone, action and sku are required"
      };
    }

    const col = await getStatsDataCollection();

    const doc = await col.insertOne({
      customerPhone,
      action,
      sku,
      productId: payload.productId || null,
      productTitle: payload.productTitle || null,
      createdAt: new Date()
    });

    if (doc.insertedId) {
      return {
        success: true,
        data: doc.insertedId
      };
    }

    return {
      success: false,
      message: "Something went wrong"
    };
  } catch (error) {
    console.log("error", error);
    return {
      success: false,
      message: "Something went wrong"
    };
  }
};

module.exports = { addStatsDataService };