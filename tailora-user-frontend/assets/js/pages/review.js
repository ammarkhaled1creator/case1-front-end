/**
 * TAILORA USER — REVIEW PAGE CONTROLLER
 * Handles trip and conditional tour-guide review submissions,
 * star rating interactions, live validation, and existing review status.
 */

(function () {
  "use strict";

  const RATING_LABELS = {
    1: "1 - Poor",
    2: "2 - Fair",
    3: "3 - Good",
    4: "4 - Very Good",
    5: "5 - Exceptional"
  };

  function getTripIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("trip_id") || params.get("id");
  }

  function initials(name) {
    if (!name) return "G";
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }

  function extractCountryName(trip) {
    if (!trip) return "Trip";
    if (trip.country && typeof trip.country === "object") {
      return trip.country.name || trip.country.country_name || "Trip";
    }
    return trip.country_name || trip.country || "Trip";
  }

  function showAlert(alertEl, message, type = "error") {
    if (!alertEl) return;
    alertEl.textContent = message;
    alertEl.className = `tl-auth-alert is-visible${type === "success" ? " tl-auth-alert--success" : ""}`;
  }

  function hideAlert(alertEl) {
    if (!alertEl) return;
    alertEl.className = "tl-auth-alert";
    alertEl.textContent = "";
  }

  function setupStarWidget(widgetEl, inputEl, textEl, initialRating = 0) {
    if (!widgetEl || !inputEl) return;

    const stars = widgetEl.querySelectorAll(".tl-star-btn");

    function render(rating) {
      stars.forEach((star) => {
        const val = parseInt(star.dataset.value, 10);
        if (val <= rating) {
          star.classList.add("is-active");
        } else {
          star.classList.remove("is-active");
        }
      });
      if (textEl) {
        textEl.textContent = RATING_LABELS[rating] || "Select rating";
      }
    }

    stars.forEach((star) => {
      star.addEventListener("mouseenter", () => {
        const val = parseInt(star.dataset.value, 10);
        stars.forEach((s) => {
          const sVal = parseInt(s.dataset.value, 10);
          if (sVal <= val) {
            s.classList.add("is-hovered");
          } else {
            s.classList.remove("is-hovered");
          }
        });
      });

      star.addEventListener("click", () => {
        const val = parseInt(star.dataset.value, 10);
        inputEl.value = String(val);
        widgetEl.dataset.rating = String(val);
        render(val);
      });
    });

    widgetEl.addEventListener("mouseleave", () => {
      stars.forEach((s) => s.classList.remove("is-hovered"));
      const current = parseInt(inputEl.value, 10) || 0;
      render(current);
    });

    if (initialRating > 0) {
      inputEl.value = String(initialRating);
      widgetEl.dataset.rating = String(initialRating);
      render(initialRating);
    }
  }

  function setupCharCounter(textarea, counter) {
    if (!textarea || !counter) return;
    textarea.addEventListener("input", () => {
      const len = textarea.value.length;
      counter.textContent = `${len} / 1000`;
      if (len > 900) {
        counter.style.color = "var(--tl-warning)";
      } else {
        counter.style.color = "var(--tl-text-secondary)";
      }
    });
  }

  async function init() {
    const signedOutEl = document.getElementById("review-signed-out");
    const loadingEl = document.getElementById("review-loading");
    const errorEl = document.getElementById("review-error");
    const contentEl = document.getElementById("review-content");

    // Check Auth
    if (!window.TL.Auth.isAuthenticated()) {
      loadingEl?.classList.add("tl-hidden");
      signedOutEl?.classList.remove("tl-hidden");
      return;
    }

    const tripId = getTripIdFromUrl();
    if (!tripId) {
      loadingEl?.classList.add("tl-hidden");
      if (errorEl) {
        document.getElementById("review-error-title").textContent = "Missing Trip ID";
        document.getElementById("review-error-msg").textContent = "No trip ID was provided in the URL. Please select a trip from your account.";
        errorEl.classList.remove("tl-hidden");
      }
      return;
    }

    try {
      const response = await window.TL.Reviews.getTripReviewInfo(tripId);
      const data = response?.data || response;

      if (!data || !data.trip) {
        throw new Error("Unable to retrieve trip details.");
      }

      loadingEl?.classList.add("tl-hidden");
      contentEl?.classList.remove("tl-hidden");

      renderPageData(data, tripId);
    } catch (err) {
      console.error("Failed to load review info:", err);
      loadingEl?.classList.add("tl-hidden");
      if (errorEl) {
        document.getElementById("review-error-title").textContent = "Trip Not Found";
        document.getElementById("review-error-msg").textContent = err.message || "We could not find this trip in your account.";
        errorEl.classList.remove("tl-hidden");
      }
    }
  }

  function renderPageData(data, tripId) {
    const trip = data.trip || {};
    const countryName = extractCountryName(trip);
    const start = trip.start_date ? window.TL.Util.formatDate(trip.start_date) : "";
    const end = trip.end_date ? window.TL.Util.formatDate(trip.end_date) : "";

    // Summary Header
    const summaryTitle = document.getElementById("trip-summary-title");
    const summaryDates = document.getElementById("trip-summary-dates");
    const plannedBtn = document.getElementById("view-planned-btn");

    if (summaryTitle) summaryTitle.textContent = `Trip to ${countryName}`;
    if (summaryDates) {
      summaryDates.textContent = start || end ? `🗓️ ${start}${end ? ` – ${end}` : ""}` : "Custom Trip Dates";
    }
    if (plannedBtn) {
      plannedBtn.href = `trip-details.html?id=${encodeURIComponent(tripId)}`;
    }

    // -------------------------------------------------------------
    // 1. SETUP TRIP REVIEW FORM
    // -------------------------------------------------------------
    const tripForm = document.getElementById("trip-review-form");
    const tripIdInput = document.getElementById("trip-review-trip-id");
    const tripRatingInput = document.getElementById("trip-rating-input");
    const tripStarWidget = document.getElementById("trip-star-widget");
    const tripRatingText = document.getElementById("trip-rating-text");
    const tripComment = document.getElementById("trip-comment-input");
    const tripCharCount = document.getElementById("trip-char-count");
    const tripAlert = document.getElementById("trip-review-alert");
    const tripSubmitBtn = document.getElementById("trip-submit-btn");
    const tripStatusBadge = document.getElementById("trip-review-status-badge");

    if (tripIdInput) tripIdInput.value = String(tripId);

    const existingTripReview = data.existing_trip_review;
    const initialTripRating = existingTripReview ? parseInt(existingTripReview.rating, 10) : 0;

    setupStarWidget(tripStarWidget, tripRatingInput, tripRatingText, initialTripRating);
    setupCharCounter(tripComment, tripCharCount);

    if (existingTripReview) {
      if (tripComment) tripComment.value = existingTripReview.comment || "";
      if (tripCharCount && existingTripReview.comment) {
        tripCharCount.textContent = `${existingTripReview.comment.length} / 1000`;
      }
      if (tripStatusBadge) {
        tripStatusBadge.innerHTML = `
          <div class="tl-submitted-badge">
            <span>✓ You previously reviewed this trip (${existingTripReview.rating}★). Submitting will update your review.</span>
          </div>`;
      }
      if (tripSubmitBtn) {
        tripSubmitBtn.innerHTML = `<span>Update Trip Review</span>`;
      }
    }

    if (tripForm) {
      tripForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert(tripAlert);

        const rating = parseInt(tripRatingInput.value, 10);
        const comment = tripComment ? tripComment.value.trim() : "";

        if (!rating || rating < 1 || rating > 5) {
          showAlert(tripAlert, "Please select a star rating (1 to 5 stars) before submitting.");
          return;
        }

        if (!comment) {
          showAlert(tripAlert, "Please write a brief comment describing your experience.");
          tripComment?.focus();
          return;
        }

        if (tripSubmitBtn) {
          tripSubmitBtn.disabled = true;
          tripSubmitBtn.innerHTML = `<span>Submitting…</span>`;
        }

        try {
          await window.TL.Reviews.submitReview({
            trip_id: parseInt(tripId, 10),
            review_type: "trip",
            rating: rating,
            comment: comment
          });

          showAlert(tripAlert, "Trip review submitted successfully! Thank you for your feedback.", "success");
          window.TL.toast("Trip review submitted successfully!", "success");

          if (tripSubmitBtn) {
            tripSubmitBtn.innerHTML = `<span>Update Trip Review</span>`;
          }
          if (tripStatusBadge) {
            tripStatusBadge.innerHTML = `
              <div class="tl-submitted-badge">
                <span>✓ Review submitted (${rating}★).</span>
              </div>`;
          }
        } catch (err) {
          const msg = err?.message || err?.data?.message || "Failed to submit trip review. Please try again.";
          showAlert(tripAlert, msg, "error");
          window.TL.toast(msg, "error");
        } finally {
          if (tripSubmitBtn) tripSubmitBtn.disabled = false;
        }
      });
    }

    // -------------------------------------------------------------
    // 2. SETUP CONDITIONAL TOUR GUIDE REVIEW FORM
    // -------------------------------------------------------------
    const guideSection = document.getElementById("guide-review-section");
    const guideForm = document.getElementById("guide-review-form");
    const guideIdInput = document.getElementById("guide-review-trip-id");
    const guideRatingInput = document.getElementById("guide-rating-input");
    const guideStarWidget = document.getElementById("guide-star-widget");
    const guideRatingText = document.getElementById("guide-rating-text");
    const guideComment = document.getElementById("guide-comment-input");
    const guideCharCount = document.getElementById("guide-char-count");
    const guideAlert = document.getElementById("guide-review-alert");
    const guideSubmitBtn = document.getElementById("guide-submit-btn");
    const guideStatusBadge = document.getElementById("guide-review-status-badge");
    const guideAvatar = document.getElementById("guide-avatar");
    const guideName = document.getElementById("guide-name");

    // Strictly conditional check
    if (data.has_assigned_tour_guide && data.assigned_tour_guide) {
      guideSection?.classList.remove("tl-hidden");

      const guide = data.assigned_tour_guide;
      const gName = guide.name || guide.full_name || "Tour Guide";

      if (guideName) guideName.textContent = gName;
      if (guideAvatar) guideAvatar.textContent = initials(gName);
      if (guideIdInput) guideIdInput.value = String(tripId);

      const existingGuideReview = data.existing_tour_guide_review;
      const initialGuideRating = existingGuideReview ? parseInt(existingGuideReview.rating, 10) : 0;

      setupStarWidget(guideStarWidget, guideRatingInput, guideRatingText, initialGuideRating);
      setupCharCounter(guideComment, guideCharCount);

      if (existingGuideReview) {
        if (guideComment) guideComment.value = existingGuideReview.comment || "";
        if (guideCharCount && existingGuideReview.comment) {
          guideCharCount.textContent = `${existingGuideReview.comment.length} / 1000`;
        }
        if (guideStatusBadge) {
          guideStatusBadge.innerHTML = `
            <div class="tl-submitted-badge">
              <span>✓ You previously reviewed this tour guide (${existingGuideReview.rating}★). Submitting will update your review.</span>
            </div>`;
        }
        if (guideSubmitBtn) {
          guideSubmitBtn.innerHTML = `<span>Update Tour Guide Review</span>`;
        }
      }

      if (guideForm) {
        guideForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          hideAlert(guideAlert);

          const rating = parseInt(guideRatingInput.value, 10);
          const comment = guideComment ? guideComment.value.trim() : "";

          if (!rating || rating < 1 || rating > 5) {
            showAlert(guideAlert, "Please select a star rating (1 to 5 stars) for your tour guide.");
            return;
          }

          if (!comment) {
            showAlert(guideAlert, "Please write a brief comment describing your experience with your guide.");
            guideComment?.focus();
            return;
          }

          if (guideSubmitBtn) {
            guideSubmitBtn.disabled = true;
            guideSubmitBtn.innerHTML = `<span>Submitting…</span>`;
          }

          try {
            await window.TL.Reviews.submitReview({
              trip_id: parseInt(tripId, 10),
              review_type: "tour_guide",
              rating: rating,
              comment: comment
            });

            showAlert(guideAlert, "Tour guide review submitted successfully! Thank you for recognizing your guide.", "success");
            window.TL.toast("Tour guide review submitted successfully!", "success");

            if (guideSubmitBtn) {
              guideSubmitBtn.innerHTML = `<span>Update Tour Guide Review</span>`;
            }
            if (guideStatusBadge) {
              guideStatusBadge.innerHTML = `
                <div class="tl-submitted-badge">
                  <span>✓ Guide review submitted (${rating}★).</span>
                </div>`;
            }
          } catch (err) {
            const msg = err?.message || err?.data?.message || "Failed to submit tour guide review. Please try again.";
            showAlert(guideAlert, msg, "error");
            window.TL.toast(msg, "error");
          } finally {
            if (guideSubmitBtn) guideSubmitBtn.disabled = false;
          }
        });
      }
    } else {
      // If no tour guide assigned, ensure section remains strictly hidden
      guideSection?.classList.add("tl-hidden");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
