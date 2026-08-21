/* ==========================================================================
   TAILORA ADMIN — assets/js/api/bookings.js
   Owns: /admin/bookings (4 documented endpoints).
   ========================================================================== */

(function () {
  "use strict";

  // GET /admin/bookings
  function getBookings(query) {
    return window.TL.Api.get("/bookings", query);
  }

  // GET /admin/bookings/{id}
  function getBooking(id) {
    return window.TL.Api.get(`/bookings/${encodeURIComponent(id)}`);
  }

  // PUT /admin/bookings/{id} — body: { status }
  function updateBooking(id, data) {
    return window.TL.Api.put(`/bookings/${encodeURIComponent(id)}`, data);
  }

  // DELETE /admin/bookings/{id}
  function deleteBooking(id) {
    return window.TL.Api.delete(`/bookings/${encodeURIComponent(id)}`);
  }

  // POST /admin/bookings/{id}/assign-guide — body: { tour_guide_id }
  function assignTourGuide(id, tourGuideId) {
    return window.TL.Api.post(`/bookings/${encodeURIComponent(id)}/assign-guide`, {
      tour_guide_id: tourGuideId,
    });
  }

  // GET /admin/tour-guides/available
  function getAvailableTourGuides(bookingIdOrParams) {
    let query;
    if (typeof bookingIdOrParams === "object" && bookingIdOrParams !== null) {
      query = bookingIdOrParams;
    } else if (bookingIdOrParams) {
      query = { booking_id: bookingIdOrParams };
    }
    return window.TL.Api.get("/tour-guides/available", query);
  }

  window.TL = window.TL || {};
  window.TL.Bookings = {
    getBookings,
    getBooking,
    updateBooking,
    deleteBooking,
    assignTourGuide,
    getAvailableTourGuides,
  };
})();
