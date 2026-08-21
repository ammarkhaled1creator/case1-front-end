/**
 * TAILORA ADMIN — REVIEWS PAGE CONTROLLER
 * Handles listing, filtering, approving, rejecting, and deleting
 * Trip Reviews and Tour Guide Reviews.
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const P = TL.Pages;
    const state = document.getElementById("reviewsState");
    const refreshButton = document.getElementById("reviewsRefresh");
    const filterContainer = document.getElementById("reviewFilters");

    let allReviews = [];
    let currentFilter = "all";

    function formatDate(raw) {
      if (!raw) return "—";
      try {
        const d = new Date(raw);
        if (isNaN(d.getTime())) return raw;
        return d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      } catch (_) {
        return raw;
      }
    }

    function renderStars(rating) {
      const num = parseInt(rating, 10) || 0;
      let starsHtml = "";
      for (let i = 1; i <= 5; i++) {
        if (i <= num) {
          starsHtml += `<span style="color:#eab308;">★</span>`;
        } else {
          starsHtml += `<span style="color:rgba(255,255,255,0.2);">★</span>`;
        }
      }
      return `<div style="display:inline-flex;align-items:center;gap:3px;"><span style="font-size:14px;line-height:1;">${starsHtml}</span><strong class="ms-1" style="font-size:12.5px;">${num}/5</strong></div>`;
    }

    function renderTable(rows) {
      if (!state) return;

      if (!rows.length) {
        state.innerHTML = P.empty(
          "No reviews found",
          currentFilter === "all"
            ? "No customer reviews submitted yet."
            : `No ${currentFilter === "trip" ? "trip" : "tour guide"} reviews found.`,
          "bi-star"
        );
        return;
      }

      state.innerHTML = `
        <div class="tl-table-wrap">
          <table class="tl-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Review Type</th>
                <th>Target Details</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(function (review) {
                const user = review.user?.name || review.user_name || (review.user_id ? `User #${review.user_id}` : "Traveler");
                const userEmail = review.user?.email || "";
                const isGuideReview = review.review_type === "tour_guide" || Boolean(review.tour_guide_id);

                const typeBadge = isGuideReview
                  ? `<span class="tl-badge tl-badge--purple"><i class="bi bi-person-badge me-1"></i> Tour Guide</span>`
                  : `<span class="tl-badge tl-badge--info"><i class="bi bi-geo-alt me-1"></i> Trip</span>`;

                const guideName = review.tour_guide?.name || review.tourGuide?.name || "Assigned Guide";
                const tripCountry = review.trip?.country?.name || review.trip?.country_name || (review.trip_id ? `Trip #${review.trip_id}` : "Trip");

                const targetDetails = isGuideReview
                  ? `<strong>${P.escape(guideName)}</strong><div class="tl-metadata" style="font-size:11px;">Trip #${P.escape(review.trip_id || "")} (${P.escape(tripCountry)})</div>`
                  : `<strong>${P.escape(tripCountry)}</strong><div class="tl-metadata" style="font-size:11px;">Trip #${P.escape(review.trip_id || "")}</div>`;

                const content = review.comment || review.review_text || review.content || "—";
                const rating = review.rating || 0;
                const status = (review.status || "pending").toLowerCase();
                const dateStr = formatDate(review.created_at || review.created);

                return `
                  <tr>
                    <td>
                      <strong>${P.escape(user)}</strong>
                      ${userEmail ? `<div class="tl-metadata" style="font-size:11px;">${P.escape(userEmail)}</div>` : ""}
                    </td>
                    <td>${typeBadge}</td>
                    <td>${targetDetails}</td>
                    <td>${renderStars(rating)}</td>
                    <td style="max-width:320px;">
                      <div style="font-size:13.5px;color:var(--tl-text);line-height:1.5;white-space:normal;word-break:break-word;">
                        ${P.escape(content)}
                      </div>
                    </td>
                    <td><span style="font-size:12px;white-space:nowrap;">${P.escape(dateStr)}</span></td>
                    <td>${P.badge(status)}</td>
                    <td>
                      <div class="tl-table-actions">
                        ${status !== "approved" ? `
                          <button
                            type="button"
                            class="tl-btn tl-btn--outline tl-btn--sm"
                            data-approve="${P.escape(review.id)}"
                            title="Approve Review"
                          >
                            <i class="bi bi-check-circle"></i> Approve
                          </button>` : ""}

                        ${status !== "rejected" ? `
                          <button
                            type="button"
                            class="tl-btn tl-btn--outline tl-btn--sm"
                            data-reject="${P.escape(review.id)}"
                            title="Reject Review"
                          >
                            <i class="bi bi-x-circle"></i> Reject
                          </button>` : ""}

                        <button
                          type="button"
                          class="tl-btn tl-btn--danger tl-btn--sm"
                          data-review-delete="${P.escape(review.id)}"
                          title="Delete Review"
                        >
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    function applyFilter() {
      if (currentFilter === "trip") {
        const filtered = allReviews.filter((r) => r.review_type === "trip" || (!r.review_type && !r.tour_guide_id));
        renderTable(filtered);
      } else if (currentFilter === "tour_guide") {
        const filtered = allReviews.filter((r) => r.review_type === "tour_guide" || Boolean(r.tour_guide_id));
        renderTable(filtered);
      } else {
        renderTable(allReviews);
      }
    }

    async function load() {
      if (!state) return;

      state.innerHTML = `
        <div class="tl-inline-loader">
          <div class="tl-spinner"></div>
        </div>
      `;

      try {
        const response = await TL.Reviews.getReviews();
        const rows = response?.data?.data || response?.data || response;

        if (!Array.isArray(rows)) {
          state.innerHTML = P.empty(
            "Review data unavailable",
            "Unable to load customer reviews at this time.",
            "bi-star"
          );
          return;
        }

        allReviews = rows;
        applyFilter();
      } catch (e) {
        console.error("Failed to load reviews:", e);
        state.innerHTML = P.error(e.message || "Failed to load reviews.");
      }
    }

    // Filter Buttons
    if (filterContainer) {
      filterContainer.addEventListener("click", function (e) {
        const btn = e.target.closest("[data-filter]");
        if (!btn) return;

        filterContainer.querySelectorAll("[data-filter]").forEach((b) => {
          b.className = "tl-btn tl-btn--sm tl-btn--outline";
        });
        btn.className = "tl-btn tl-btn--sm tl-btn--primary";

        currentFilter = btn.dataset.filter || "all";
        applyFilter();
      });
    }

    // Refresh Button
    if (refreshButton) {
      refreshButton.addEventListener("click", load);
    }

    // Actions (Approve, Reject, Delete)
    if (state) {
      state.addEventListener("click", async function (e) {
        const approveButton = e.target.closest("[data-approve]");
        const rejectButton = e.target.closest("[data-reject]");
        const deleteButton = e.target.closest("[data-review-delete]");

        try {
          if (approveButton) {
            const id = approveButton.dataset.approve;
            await TL.Reviews.approveReview(id);
            TL.showToast("Review approved successfully.", "success");
            load();
            return;
          }

          if (rejectButton) {
            const id = rejectButton.dataset.reject;
            await TL.Reviews.rejectReview(id);
            TL.showToast("Review rejected successfully.", "success");
            load();
            return;
          }

          if (deleteButton) {
            const id = deleteButton.dataset.reviewDelete;
            if (!P.confirm("Delete this review? This cannot be undone.")) {
              return;
            }
            await TL.Reviews.deleteReview(id);
            TL.showToast("Review deleted successfully.", "success");
            load();
          }
        } catch (err) {
          console.error("Review action failed:", err);
          TL.showToast(err.message || "Review action failed.", "error");
        }
      });
    }

    load();
  });
})();