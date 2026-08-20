/**
 * TAILORA USER — REVIEWS API MODULE
 * Handles retrieving trip review information and submitting trip / tour guide reviews.
 */

(function () {
  "use strict";

  function getTripReviewInfo(tripId) {
    return window.TL.Api.get("/trips/" + encodeURIComponent(tripId) + "/review-info");
  }

  function submitReview(data) {
    return window.TL.Api.post("/reviews", data);
  }

  window.TL = window.TL || {};
  window.TL.Reviews = {
    getTripReviewInfo: getTripReviewInfo,
    submitReview: submitReview
  };
})();
