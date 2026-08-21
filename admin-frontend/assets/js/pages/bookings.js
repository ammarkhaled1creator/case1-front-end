(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const P = TL.Pages;
    const state = document.getElementById("bookingsState");
    let currentBookings = [];
    let selectedBookingForAssign = null;

    function getBookingIdInput() {
      return document.getElementById("booking_id") || document.getElementById("booking_action_id");
    }

    function getTourGuideInfo(b) {
      const requests = Array.isArray(b.tour_guide_requests) ? b.tour_guide_requests : [];
      const acceptedReq = requests.find(r => r.status === "accepted");
      const latestReq = requests.length ? requests[requests.length - 1] : null;

      if (b.tour_guide || acceptedReq) {
        const guideName = b.tour_guide?.name || acceptedReq?.tour_guide?.name || "Assigned Guide";
        return {
          status: "accepted",
          label: `Accepted: ${guideName}`,
          badgeCls: "tl-badge--success",
          icon: "bi-check-circle-fill",
          guideName: guideName,
          guide: b.tour_guide || acceptedReq?.tour_guide,
          needsAssignment: false
        };
      }

      if (latestReq && latestReq.status === "pending") {
        const guideName = latestReq.tour_guide?.name || "Selected Guide";
        return {
          status: "awaiting_response",
          label: `Awaiting: ${guideName}`,
          badgeCls: "tl-badge--info",
          icon: "bi-hourglass-split",
          guideName: guideName,
          guide: latestReq.tour_guide,
          needsAssignment: true
        };
      }

      if (latestReq && (latestReq.status === "rejected" || latestReq.status === "declined")) {
        const guideName = latestReq.tour_guide?.name || "Guide";
        return {
          status: "declined",
          label: `Declined (${guideName}) — Reassignment Required`,
          badgeCls: "tl-badge--danger",
          icon: "bi-arrow-repeat",
          guideName: guideName,
          guide: latestReq.tour_guide,
          needsAssignment: true
        };
      }

      if (b.wants_tour_guide) {
        return {
          status: "pending_assignment",
          label: "Tour Guide Requested — Pending Assignment",
          badgeCls: "tl-badge--warning",
          icon: "bi-person-plus",
          guideName: null,
          guide: null,
          needsAssignment: true
        };
      }

      return {
        status: "not_requested",
        label: "Not Requested",
        badgeCls: "tl-badge--outline",
        icon: "bi-dash",
        guideName: null,
        guide: null,
        needsAssignment: false
      };
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
        currentBookings = rows || [];

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

        state.innerHTML = `
          <div class="tl-table-wrap">
            <table class="tl-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Destination / Hotel</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Tour Guide Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(function (b) {
                  const tg = getTourGuideInfo(b);
                  const customerName = b.user?.name || `User #${b.user_id || 'N/A'}`;
                  const hotelName = b.hotel?.name || "-";
                  const tripCountry = b.trip?.country?.name || "";
                  const destStr = [tripCountry, hotelName].filter(s => s && s !== "-").join(" · ") || "-";
                  const priceStr = b.total_price ? `$${Number(b.total_price).toFixed(2)}` : "-";

                  return `
                    <tr>
                      <td>
                        <div><strong>${P.escape(customerName)}</strong></div>
                        ${b.user?.email ? `<span class="tl-metadata small">${P.escape(b.user.email)}</span>` : ""}
                      </td>
                      <td>
                        <span>${P.escape(destStr)}</span>
                      </td>
                      <td><strong>${P.escape(priceStr)}</strong></td>
                      <td>${P.badge(b.status)}</td>
                      <td>
                        <span class="tl-badge ${tg.badgeCls}">
                          <i class="bi ${tg.icon}"></i> ${P.escape(tg.label)}
                        </span>
                      </td>
                      <td>
                        <div class="tl-flex tl-gap-xs flex-wrap">
                          <button class="tl-btn tl-btn--outline tl-btn--sm" data-booking-view="${P.escape(b.id)}" title="View Booking Details">
                            <i class="bi bi-eye"></i> Details
                          </button>
                          ${(b.wants_tour_guide || tg.needsAssignment) ? `
                            <button class="tl-btn tl-btn--primary tl-btn--sm" data-assign-guide="${P.escape(b.id)}" title="Assign Tour Guide">
                              <i class="bi bi-person-badge"></i> ${tg.status === 'declined' ? 'Reassign' : 'Assign'}
                            </button>
                          ` : ""}
                          <button class="tl-btn tl-btn--ghost tl-btn--sm" data-booking-select="${P.escape(b.id)}" title="Select for status change">
                            <i class="bi bi-arrow-down-short"></i> ID
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

    // Modal: View Booking Details
    function openViewDetailsModal(bookingId) {
      const b = currentBookings.find(item => String(item.id) === String(bookingId));
      if (!b) return;

      const tg = getTourGuideInfo(b);
      const customerName = b.user?.name || `User #${b.user_id || 'N/A'}`;
      const customerEmail = b.user?.email || "N/A";
      const hotelName = b.hotel?.name || "None";
      const flightInfo = b.flight ? `${b.flight.airline || 'Flight'} (${b.flight.origin || ''} → ${b.flight.destination || ''})` : "None";
      const requests = Array.isArray(b.tour_guide_requests) ? b.tour_guide_requests : [];

      const modalBody = document.getElementById("bookingDetailsContent");
      if (modalBody) {
        modalBody.innerHTML = `
          <div class="p-3 mb-3 rounded" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">
            <div class="row g-3">
              <div class="col-md-6">
                <span class="tl-metadata d-block">Booking Reference</span>
                <strong class="fs-5">#${P.escape(b.id)}</strong>
              </div>
              <div class="col-md-6 text-md-end">
                <span class="tl-metadata d-block">Booking Status</span>
                <div>${P.badge(b.status)}</div>
              </div>
              <div class="col-md-6">
                <span class="tl-metadata d-block">Customer</span>
                <strong>${P.escape(customerName)}</strong> (${P.escape(customerEmail)})
              </div>
              <div class="col-md-6">
                <span class="tl-metadata d-block">Total Price</span>
                <strong class="text-teal fs-5">$${b.total_price ? Number(b.total_price).toFixed(2) : '0.00'}</strong>
              </div>
            </div>
          </div>

          <div class="mb-3">
            <h6 class="fw-bold mb-2"><i class="bi bi-geo-alt me-1 text-teal"></i> Reservation Items</h6>
            <ul class="list-group list-group-flush rounded" style="background:transparent;">
              <li class="list-group-item bg-transparent text-light border-secondary border-opacity-25 d-flex justify-content-between">
                <span>🏨 Hotel: <strong>${P.escape(hotelName)}</strong></span>
                <span class="tl-metadata">${b.number_of_nights || 1} night(s)</span>
              </li>
              <li class="list-group-item bg-transparent text-light border-secondary border-opacity-25 d-flex justify-content-between">
                <span>✈️ Flight: <strong>${P.escape(flightInfo)}</strong></span>
              </li>
            </ul>
          </div>

          <div class="mb-3">
            <h6 class="fw-bold mb-2"><i class="bi bi-person-badge me-1 text-teal"></i> Tour Guide Request & Assignment</h6>
            <div class="p-3 rounded" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <span>Tour Guide Required:</span>
                <strong>${b.wants_tour_guide ? '<span class="text-success">Yes ($100 fee included)</span>' : '<span class="text-secondary">No</span>'}</strong>
              </div>
              <div class="d-flex align-items-center justify-content-between mb-2">
                <span>Current Status:</span>
                <span class="tl-badge ${tg.badgeCls}"><i class="bi ${tg.icon}"></i> ${P.escape(tg.label)}</span>
              </div>
              ${tg.guide ? `
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <span>Assigned Guide:</span>
                  <strong>${P.escape(tg.guide.name)} (${P.escape(tg.guide.email || '')})</strong>
                </div>
              ` : ''}
              ${requests.length > 0 ? `
                <div class="mt-3 pt-2 border-top border-secondary border-opacity-25">
                  <span class="tl-metadata d-block mb-1">Assignment History:</span>
                  <div class="small">
                    ${requests.map(r => `
                      <div class="d-flex justify-content-between py-1">
                        <span>Guide: <strong>${P.escape(r.tour_guide?.name || `Guide #${r.tour_guide_id}`)}</strong></span>
                        <span class="tl-badge ${r.status === 'accepted' ? 'tl-badge--success' : r.status === 'rejected' ? 'tl-badge--danger' : 'tl-badge--warning'} text-capitalize">${r.status}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }

      const modalEl = document.getElementById("bookingViewModal");
      if (modalEl) {
        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
      }
    }

    // Modal: Open Assign Tour Guide Modal
    async function openAssignGuideModal(bookingId) {
      const b = currentBookings.find(item => String(item.id) === String(bookingId));
      if (!b) return;
      selectedBookingForAssign = b;

      const summaryMount = document.getElementById("assignGuideSummary");
      const selectMount = document.getElementById("assign_guide_select");
      const customerName = b.user?.name || `User #${b.user_id || 'N/A'}`;
      const tripCountry = b.trip?.country?.name || b.hotel?.name || "Booking Destination";

      const tripDates = (b.trip?.start_date || b.start_date) ? `${(b.trip?.start_date || b.start_date).split('T')[0]}${(b.trip?.end_date || b.end_date) ? ` to ${(b.trip?.end_date || b.end_date).split('T')[0]}` : ''}` : "Flexible / Today";

      if (summaryMount) {
        summaryMount.innerHTML = `
          <div class="row g-2 small">
            <div class="col-6"><span class="tl-metadata d-block">Booking:</span><strong>#${b.id}</strong></div>
            <div class="col-6"><span class="tl-metadata d-block">Customer:</span><strong>${P.escape(customerName)}</strong></div>
            <div class="col-6"><span class="tl-metadata d-block">Destination:</span><strong>${P.escape(tripCountry)}</strong></div>
            <div class="col-6"><span class="tl-metadata d-block">Trip Dates:</span><strong>${P.escape(tripDates)}</strong></div>
          </div>
        `;
      }

      if (selectMount) {
        selectMount.innerHTML = `<option value="">Loading available tour guides...</option>`;
        selectMount.disabled = true;
      }

      const modalEl = document.getElementById("assignGuideModal");
      if (modalEl) {
        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
      }

      try {
        const res = await TL.Bookings.getAvailableTourGuides(b.id);
        const guides = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];

        if (!guides.length) {
          selectMount.innerHTML = `<option value="">No tour guides found in system</option>`;
          selectMount.disabled = true;
          return;
        }

        selectMount.innerHTML = `
          <option value="">-- Choose an available tour guide --</option>
          ${guides.map(g => {
            let availText;
            if (g.is_available) {
              const slotStr = g.active_slot ? ` [${g.active_slot.start_time} - ${g.active_slot.end_time}]` : "";
              availText = `✓ Available${slotStr}`;
            } else {
              availText = `✗ Unavailable: ${g.conflict_reason || 'Busy'}`;
            }
            const countryText = g.dist_country ? ` [${g.dist_country}]` : "";
            return `<option value="${g.id}" ${!g.is_available ? 'disabled' : ''}>${P.escape(g.name)}${countryText} — ${availText}</option>`;
          }).join("")}
        `;
        selectMount.disabled = false;
      } catch (err) {
        if (selectMount) {
          selectMount.innerHTML = `<option value="">Failed to load guides: ${P.escape(err.message)}</option>`;
        }
      }
    }

    // Confirm Assign Tour Guide
    const confirmAssignBtn = document.getElementById("confirmAssignGuideBtn");
    if (confirmAssignBtn) {
      confirmAssignBtn.addEventListener("click", async function () {
        if (!selectedBookingForAssign) return;

        const selectMount = document.getElementById("assign_guide_select");
        const guideId = selectMount ? selectMount.value : "";

        if (!guideId) {
          TL.showToast("Please select an available tour guide.", "warning");
          return;
        }

        confirmAssignBtn.disabled = true;
        confirmAssignBtn.textContent = "Assigning...";

        try {
          await TL.Bookings.assignTourGuide(selectedBookingForAssign.id, Number(guideId));
          TL.showToast(`Tour guide assignment request sent successfully!`, "success");

          const modalEl = document.getElementById("assignGuideModal");
          if (modalEl) {
            const inst = bootstrap.Modal.getInstance(modalEl);
            if (inst) inst.hide();
          }

          load();
        } catch (err) {
          TL.showToast(err.message || "Failed to assign tour guide.", "error");
        } finally {
          confirmAssignBtn.disabled = false;
          confirmAssignBtn.innerHTML = `<i class="bi bi-send-check me-1"></i> Send Assignment Request`;
        }
      });
    }

    const refreshBtn = document.getElementById("bookingsRefresh");
    if (refreshBtn) refreshBtn.addEventListener("click", load);

    if (state) {
      state.addEventListener("click", function (e) {
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

        const viewBtn = e.target.closest("[data-booking-view]");
        if (viewBtn) {
          openViewDetailsModal(viewBtn.dataset.bookingView);
          return;
        }

        const assignBtn = e.target.closest("[data-assign-guide]");
        if (assignBtn) {
          openAssignGuideModal(assignBtn.dataset.assignGuide);
          return;
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