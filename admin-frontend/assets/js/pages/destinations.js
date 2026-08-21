(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const P = TL.Pages;

    // UI Elements
    const citiesListEl = document.getElementById("citiesList");
    const attractionsListEl = document.getElementById("attractionsList");

    const cityCreateForm = document.getElementById("cityCreateForm");
    const cityManageForm = document.getElementById("cityManageForm");
    const cityDeleteBtn = document.getElementById("cityDeleteBtn");

    const attractionCreateForm = document.getElementById("attractionCreateForm");
    const attractionManageForm = document.getElementById("attractionManageForm");
    const attractionDeleteBtn = document.getElementById("attractionDeleteBtn");

    const perPage = 10;
    let cityCurrentPage = 1;
    let attractionCurrentPage = 1;

    let countriesMap = {};
    let citiesMap = {};

    async function loadCountriesOptions() {
      try {
        const res = await TL.Api.get("/countries?per_page=500");
        const list = P.list(res) || P.data(res) || [];
        countriesMap = {};
        const opts = ["<option value=''>Select country</option>"];
        list.forEach(c => {
          if (c && c.id) {
            countriesMap[c.id] = c.name || `Country #${c.id}`;
            opts.push(`<option value="${c.id}">${P.escape(c.name || `Country #${c.id}`)}</option>`);
          }
        });
        const html = opts.join("");
        const createSelect = document.getElementById("city_country_id");
        const editSelect = document.getElementById("city_update_country_id");
        if (createSelect) createSelect.innerHTML = html;
        if (editSelect) editSelect.innerHTML = html;
      } catch (e) {
        console.warn("Failed to load countries:", e);
      }
    }

    async function loadCitiesOptions() {
      try {
        const res = await TL.Cities.getCities({ per_page: 500 });
        const list = P.list(res) || P.data(res) || [];
        citiesMap = {};
        const opts = ["<option value=''>Select city</option>"];
        list.forEach(c => {
          if (c && c.id) {
            citiesMap[c.id] = c.name || `City #${c.id}`;
            opts.push(`<option value="${c.id}">${P.escape(c.name || `City #${c.id}`)}</option>`);
          }
        });
        const html = opts.join("");
        const createSelect = document.getElementById("att_city_id");
        const editSelect = document.getElementById("att_update_city_id");
        if (createSelect) createSelect.innerHTML = html;
        if (editSelect) editSelect.innerHTML = html;
      } catch (e) {
        console.warn("Failed to load cities options:", e);
      }
    }

    // Extract Form Fields Helper
    function extractFormFields(form) {
      const data = {};
      form.querySelectorAll("[name]").forEach(el => {
        const key = el.name;
        if (!key || key === "id") return; // exclude ID from payload
        if (el.type === "file") {
          if (el.files && el.files[0]) {
            data[key] = el.files[0];
          }
        } else {
          const val = el.value.trim();
          if (val !== "") {
            data[key] = val;
          }
        }
      });
      return data;
    }

    // Submit Helper
    async function submitAction(form, actionFn, successMsg, closeModalId, reloadFn) {
      P.clearErrors(form);
      const btn = form.querySelector("button[type=submit]");
      P.setBusy(btn, true);

      try {
        await actionFn();
        TL.showToast(successMsg, "success");
        form.reset();
        
        if (closeModalId) {
          const modalEl = document.getElementById(closeModalId);
          if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
        }

        if (reloadFn) await reloadFn();
      } catch (err) {
        if (err instanceof TL.Api.ApiValidationError) {
          P.showValidation(form, err.errors);
        }
        TL.showToast(err.message || "Request failed.", "error");
      } finally {
        P.setBusy(btn, false);
      }
    }

    // =========================================================================
    // CITIES
    // =========================================================================

    async function loadCities(page = 1) {
      if (!citiesListEl) return;
      cityCurrentPage = page;
      citiesListEl.innerHTML = '<div class="tl-inline-loader"><div class="tl-spinner"></div></div>';

      try {
        const response = await TL.Cities.getCities({ page: cityCurrentPage, per_page: perPage });
        const { rows, meta } = P.extractPagination(response, cityCurrentPage, perPage);
        renderCities(rows, meta);
        await loadCitiesOptions();
      } catch (err) {
        citiesListEl.innerHTML = P.empty("Failed to load cities", err.message, "bi-exclamation-triangle text-danger");
      }
    }

    function renderCities(cities, meta) {
      if (!Array.isArray(cities) || cities.length === 0) {
        citiesListEl.innerHTML = P.empty("No cities found", "Add a city using the form above.");
        return;
      }

      let html = `<div class="table-responsive"><table class="table tl-table align-middle">
        <thead>
          <tr>
            <th>Name</th>
            <th>Country</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>`;

      cities.forEach(city => {
        const countryName = city.country?.name || countriesMap[city.country_id] || (city.country_id ? `Country #${city.country_id}` : "—");
        html += `
          <tr>
            <td class="fw-bold">${P.escape(city.name)}</td>
            <td><strong>${P.escape(countryName)}</strong></td>
            <td class="text-end">
              <button type="button" class="tl-btn tl-btn--outline tl-btn--sm city-edit-btn" 
                data-id="${city.id}" 
                data-name="${P.escape(city.name)}"
                data-country="${city.country_id}"
                data-desc="${P.escape(city.description || '')}">
                <i class="bi bi-pencil"></i> Edit
              </button>
            </td>
          </tr>`;
      });

      html += `</tbody></table></div>`;
      html += P.buildPagination(meta, "data-city-page", "cities", cityCurrentPage);

      citiesListEl.innerHTML = html;
      bindCityActions();
    }

    function bindCityActions() {
      document.querySelectorAll(".city-edit-btn").forEach(btn => {
        btn.addEventListener("click", function () {
          const id = this.dataset.id;
          const name = this.dataset.name;
          const country = this.dataset.country;
          const desc = this.dataset.desc;

          if (cityManageForm) {
            P.clearErrors(cityManageForm);
            cityManageForm.reset();
            document.getElementById("city_update_id").value = id;
            document.getElementById("city_update_name").value = name;
            document.getElementById("city_update_country_id").value = country;
            document.getElementById("city_update_description").value = desc;
          }

          const modalEl = document.getElementById("cityEditModal");
          if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
        });
      });

      citiesListEl.querySelectorAll("[data-city-page]").forEach(btn => {
        btn.addEventListener("click", function () {
          const target = parseInt(this.dataset.cityPage, 10);
          if (!isNaN(target) && target >= 1 && target !== cityCurrentPage) {
            loadCities(target);
          }
        });
      });
    }

    // Create City
    if (cityCreateForm) {
      cityCreateForm.addEventListener("submit", e => {
        e.preventDefault();
        const payload = extractFormFields(cityCreateForm);
        submitAction(
          cityCreateForm,
          () => TL.Cities.createCity(payload),
          "City created successfully.",
          "cityCreateModal",
          () => loadCities(1)
        );
      });
    }

    // Update City
    if (cityManageForm) {
      cityManageForm.addEventListener("submit", e => {
        e.preventDefault();
        const id = document.getElementById("city_update_id").value;
        const payload = extractFormFields(cityManageForm);
        submitAction(
          cityManageForm,
          () => TL.Cities.updateCity(id, payload),
          "City updated successfully.",
          "cityEditModal",
          () => loadCities(cityCurrentPage)
        );
      });
    }

    // Delete City
    if (cityDeleteBtn) {
      cityDeleteBtn.addEventListener("click", async () => {
        const id = document.getElementById("city_update_id").value;
        if (!P.confirm(`Delete City #${id}? This cannot be undone.`)) return;

        P.setBusy(cityDeleteBtn, true);
        try {
          await TL.Cities.deleteCity(id);
          TL.showToast("City deleted successfully.", "success");
          const modalEl = document.getElementById("cityEditModal");
          if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
          loadCities(cityCurrentPage);
        } catch (err) {
          TL.showToast(err.message || "Failed to delete city.", "error");
        } finally {
          P.setBusy(cityDeleteBtn, false);
        }
      });
    }

    // =========================================================================
    // ATTRACTIONS
    // =========================================================================

    async function loadAttractions(page = 1) {
      if (!attractionsListEl) return;
      attractionCurrentPage = page;
      attractionsListEl.innerHTML = '<div class="tl-inline-loader"><div class="tl-spinner"></div></div>';

      try {
        const response = await TL.Attractions.getAttractions({ page: attractionCurrentPage, per_page: perPage });
        const { rows, meta } = P.extractPagination(response, attractionCurrentPage, perPage);
        renderAttractions(rows, meta);
      } catch (err) {
        attractionsListEl.innerHTML = P.empty("Failed to load attractions", err.message, "bi-exclamation-triangle text-danger");
      }
    }

    function renderAttractions(attractions, meta) {
      if (!Array.isArray(attractions) || attractions.length === 0) {
        attractionsListEl.innerHTML = P.empty("No attractions found", "Add an attraction using the form above.");
        return;
      }

      let html = `<div class="table-responsive"><table class="table tl-table align-middle">
        <thead>
          <tr>
            <th>Name</th>
            <th>City</th>
            <th>Price</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>`;

      attractions.forEach(att => {
        const cityName = att.city?.name || citiesMap[att.city_id] || (att.city_id ? `City #${att.city_id}` : "—");
        html += `
          <tr>
            <td class="fw-bold">${P.escape(att.name)}</td>
            <td><strong>${P.escape(cityName)}</strong></td>
            <td>${att.price ? '$' + parseFloat(att.price).toFixed(2) : '-'}</td>
            <td class="text-end">
              <button type="button" class="tl-btn tl-btn--outline tl-btn--sm att-edit-btn" 
                data-id="${att.id}" 
                data-name="${P.escape(att.name)}"
                data-city="${att.city_id}"
                data-price="${att.price || ''}"
                data-lat="${att.latitude || ''}"
                data-lng="${att.longitude || ''}"
                data-desc="${P.escape(att.description || '')}"
                data-cat="${P.escape(att.categories ? att.categories.map(c => c.id || c).join(', ') : '')}">
                <i class="bi bi-pencil"></i> Edit
              </button>
            </td>
          </tr>`;
      });

      html += `</tbody></table></div>`;
      html += P.buildPagination(meta, "data-att-page", "attractions", attractionCurrentPage);

      attractionsListEl.innerHTML = html;
      bindAttractionActions();
    }

    function bindAttractionActions() {
      document.querySelectorAll(".att-edit-btn").forEach(btn => {
        btn.addEventListener("click", function () {
          const ds = this.dataset;

          if (attractionManageForm) {
            P.clearErrors(attractionManageForm);
            attractionManageForm.reset();
            document.getElementById("att_update_id").value = ds.id;
            document.getElementById("att_update_name").value = ds.name;
            document.getElementById("att_update_city_id").value = ds.city;
            document.getElementById("att_update_price").value = ds.price;
            document.getElementById("att_update_latitude").value = ds.lat;
            document.getElementById("att_update_longitude").value = ds.lng;
            document.getElementById("att_update_description").value = ds.desc;
            document.getElementById("att_update_categories").value = ds.cat;
          }

          const modalEl = document.getElementById("attractionEditModal");
          if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
        });
      });

      attractionsListEl.querySelectorAll("[data-att-page]").forEach(btn => {
        btn.addEventListener("click", function () {
          const target = parseInt(this.dataset.attPage, 10);
          if (!isNaN(target) && target >= 1 && target !== attractionCurrentPage) {
            loadAttractions(target);
          }
        });
      });
    }

    // Create Attraction
    if (attractionCreateForm) {
      attractionCreateForm.addEventListener("submit", e => {
        e.preventDefault();
        const payload = extractFormFields(attractionCreateForm);
        submitAction(
          attractionCreateForm,
          () => TL.Attractions.createAttraction(payload),
          "Attraction created successfully.",
          "attractionCreateModal",
          () => loadAttractions(1)
        );
      });
    }

    // Update Attraction
    if (attractionManageForm) {
      attractionManageForm.addEventListener("submit", e => {
        e.preventDefault();
        const id = document.getElementById("att_update_id").value;
        const payload = extractFormFields(attractionManageForm);
        submitAction(
          attractionManageForm,
          () => TL.Attractions.updateAttraction(id, payload),
          "Attraction updated successfully.",
          "attractionEditModal",
          () => loadAttractions(attractionCurrentPage)
        );
      });
    }

    // Delete Attraction
    if (attractionDeleteBtn) {
      attractionDeleteBtn.addEventListener("click", async () => {
        const id = document.getElementById("att_update_id").value;
        if (!P.confirm(`Delete Attraction #${id}? This cannot be undone.`)) return;

        P.setBusy(attractionDeleteBtn, true);
        try {
          await TL.Attractions.deleteAttraction(id);
          TL.showToast("Attraction deleted successfully.", "success");
          const modalEl = document.getElementById("attractionEditModal");
          if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
          loadAttractions(attractionCurrentPage);
        } catch (err) {
          TL.showToast(err.message || "Failed to delete attraction.", "error");
        } finally {
          P.setBusy(attractionDeleteBtn, false);
        }
      });
    }

    // INIT
    (async function init() {
      await Promise.allSettled([loadCountriesOptions(), loadCitiesOptions()]);
      loadCities(1);
      loadAttractions(1);
    })();
  });
})();