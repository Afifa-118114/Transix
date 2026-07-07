function success(res, data) {
  return res.json({
    success: true,
    data,
  });
}

function failure(res, error, data = null) {
  return res.status(200).json({
    success: false,
    error: error.code || "UNKNOWN_ERROR",
    message: error.message,
    data,
  });
}

module.exports = { success, failure };
