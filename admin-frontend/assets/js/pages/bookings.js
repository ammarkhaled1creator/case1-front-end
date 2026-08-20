(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const P = TL.Pages;
    const state = document.getElementById("bookingsState");

    function getBookingIdInput() {
      return document.getElementById("booking_id") || document.getElementById("booking_action_id");
    }

    async function load() {
      if (!state) return;
      state.innerHTML = `
        <div class="tl-inline-loader">
          <div class="tl-spinner"></div>
        </div>
      `;

      try {
        const r = await TL.Bookings.getBookings();
        const rows = P.list(r);

        if (!rows) {
          state.innerHTML = P.empty(
            "Booking data unavailable",
            "Unable to load booking records at this time.",
            "bi-calendar-x"
          );
          return;
        }

        if (!rows.length) {
          state.innerHTML = P.empty(
            "No bookings available",
            "There are currently no customer bookings recorded.",
            "bi-calendar-x"
          );
          return;
        }

        function formatTourGuideStatus(b) {
          const wantsGuide = Boolean(b.wants_tour_guide || b.tour_guide_requests?.length || b.tourGuideRequests?.length);
          const assignedGuide = b.tour_guide || b.tourGuide;
          
          if (assignedGuide) {
            return `<span class="tl-badge" style="background:rgba(32,227,194,0.15);color:#20E3C2;border:1px solid rgba(32,227,194,0.3);"><i class="bi bi-check-circle-fill me-1"></i> Accepted (${P.escape(assignedGuide.name || assignedGuide.email)})</span>`;
          }

          const requests = b.tour_guide_requests || b.tourGuideRequests || [];
          const pendingReq = requests.find(r => r.status === "pending" && r.tour_guide_id);
          if (pendingReq) {
            const gName = pendingReq.tour_guide?.name || pendingReq.tourGuide?.name || "Guide";
            return `<span class="tl-badge" style="background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);"><i class="bi bi-clock-history me-1"></i> Awaiting Response (${P.escape(gName)})</span>`;
          }

          const rejectedReq = requests.find(r => r.status === "rejected");
          if (rejectedReq) {
            return `<span class="tl-badge" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);"><i class="bi bi-x-circle-fill me-1"></i> Declined — Reassign Required</span>`;
          }

          if (wantsGuide) {
            return `<span class="tl-badge" style="background:rgba(77,163,255,0.15);color:#4DA3FF;border:1px solid rgba(77,163,255,0.3);"><i class="bi bi-exclamation-circle-fill me-1"></i> Tour Guide Requested</span>`;
          }

          return `<span class="tl-badge tl-badge--neutral" style="opacity:0.6;">Not Requested</span>`;
        }

        state.innerHTML = `
          <div class="tl-table-wrap">
            <table class="tl-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Booking Status</th>
                  <th>Tour Guide Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(function (b) {
                  const customerName = P.escape(P.pick(b, ["user.name", "user.email"], "Customer"));
                  const tgBadge = formatTourGuideStatus(b);
                  return `
                    <tr>
                      <td><strong>#${P.escape(P.display(b.id))}</strong></td>
                      <td>${customerName}</td>
                      <td>${P.badge(b.status)}</td>
                      <td>${tgBadge}</td>
                      <td>${P.escape(P.date(b.created_at || b.created))}</td>
                      <td>
                        <div class="d-flex gap-1 flex-wrap">
                          <button class="tl-btn tl-btn--outline tl-btn--sm" data-booking-select="${P.escape(b.id)}">
                            <i class="bi bi-pencil"></i> Select
                          </button>
                          <button class="tl-btn tl-btn--primary tl-btn--sm" data-assign-guide="${P.escape(b.id)}" data-customer="${customerName}">
                            <i class="bi bi-person-badge"></i> Assign Guide
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
      } catch (e) {
        state.innerHTML = P.error(e.message);
      }
    }

    const refreshBtn = document.getElementById("bookingsRefresh");
    if (refreshBtn) refreshBtn.addEventListener("click", load);

    let cachedBookings = [];

    if (state) {
      state.addEventListener("click", async function (e) {
        const selBtn = e.target.closest("[data-booking-select]");
        if (selBtn) {
          const input = getBookingIdInput();
          if (input) {
            input.value = selBtn.dataset.bookingSelect;
            input.focus();
            TL.showToast(`Selected Booking #${selBtn.dataset.bookingSelect}`, "info");
          }
          return;
        }

        const assignBtn = e.target.closest("[data-assign-guide]");
        if (assignBtn) {
          const bId = assignBtn.dataset.assignGuide;
          const customer = assignBtn.dataset.customer || "Customer";

          document.getElementById("assignBookingId").value = bId;
          document.getElementById("assignBookingMeta").innerHTML = `
            <strong>Booking #${P.escape(bId)}</strong> &bull; Customer: ${P.escape(customer)}
          `;

          const selectEl = document.getElementById("selectTourGuide");
          selectEl.innerHTML = `<option value="">Loading available tour guides...</option>`;

          const modalEl = document.getElementById("assignGuideModal");
          const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
          modal.show();

          try {
            const r = await TL.Bookings.getAvailableGuides();
            const guides = P.list(r) || [];
            if (!guides.length) {
              selectEl.innerHTML = `<option value="">No tour guides available</option>`;
              return;
            }

            selectEl.innerHTML = `
              <option value="">-- Choose Tour Guide --</option>
              ${guides.map(g => `
                <option value="${P.escape(g.id)}">${P.escape(g.name || g.full_name || g.email)} (${P.escape(g.email)})</option>
              `).join("")}
            `;
          } catch (err) {
            selectEl.innerHTML = `<option value="">Error loading tour guides</option>`;
            TL.showToast(err.message || "Failed to fetch tour guides", "error");
          }
        }
      });
    }

    const assignForm = document.getElementById("assignGuideForm");
    if (assignForm) {
      assignForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const bId = document.getElementById("assignBookingId").value;
        const guideId = document.getElementById("selectTourGuide").value;

        if (!bId || !guideId) {
          return TL.showToast("Please select a tour guide.", "warning");
        }

        const btn = document.getElementById("confirmAssignBtn");
        btn.disabled = true;
        btn.textContent = "Sending Assignment...";

        try {
          await TL.Bookings.assignGuide(bId, guideId);
          TL.showToast("Tour guide assigned! Awaiting guide acceptance.", "success");
          
          const modalEl = document.getElementById("assignGuideModal");
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();

          load();
        } catch (err) {
          TL.showToast(err.message || "Failed to assign tour guide", "error");
        } finally {
          btn.disabled = false;
          btn.innerHTML = `<i class="bi bi-check-circle"></i> Send Assignment`;
        }
      });
    }

    const updateBtn = document.getElementById("bookingUpdateBtn");
    if (updateBtn) {
      updateBtn.addEventListener("click", async function () {
        const input = getBookingIdInput();
        const id = input ? input.value : "";
        const statusEl = document.getElementById("booking_status");
        const status = statusEl ? statusEl.value : "";

        if (!id || !status) return TL.showToast("Enter both booking ID and status.", "warning");

        try {
          await TL.Bookings.updateBooking(id, { status });
          TL.showToast("Booking updated successfully.", "success");
          load();
        } catch (e) {
          TL.showToast(e.message, "error");
        }
      });
    }

    const deleteBtn = document.getElementById("bookingDeleteBtn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async function () {
        const input = getBookingIdInput();
        const id = input ? input.value : "";
        if (!id) return TL.showToast("Enter a booking ID.", "warning");
        if (!P.confirm("Delete this booking? This cannot be undone.")) return;

        try {
          await TL.Bookings.deleteBooking(id);
          TL.showToast("Booking deleted.", "success");
          if (input) input.value = "";
          load();
        } catch (e) {
          TL.showToast(e.message, "error");
        }
      });
    }

    load();
  });
})();