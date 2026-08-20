/**
 * TAILORA USER — CATALOG API
 *
 * Public, unauthenticated lookup data.
 * Endpoints:
 * GET /website-settings
 * GET /website-settings/{id}
 * GET /countries
 * GET /countries/search
 * GET /countries/region/{region}
 * GET /countries/{name}
 * GET /cities
 * GET /cities/{id}
 */

(function () {
  "use strict";

  const Settings = {
    all: function () {
      return window.TL.Api.get("/website-settings");
    },

    get: function (id) {
      return window.TL.Api.get("/website-settings/" + id);
    }
  };


  const Countries = {
    all: function (query = {}) {
      return window.TL.Api.get("/countries", query);
    },

    async allFull() {
      const response = await window.TL.Api.get("/countries");
      return window.TL.Util.list(response);
    },

    search: function (query) {
      return window.TL.Api.get("/countries/search", {
        q: query,
        query: query
      });
    },

    byRegion: function (region) {
      return window.TL.Api.get("/countries/region/" + region);
    },

    byName: function (name) {
      return window.TL.Api.get("/countries/" + name);
    }
  };


  const Cities = {
    all: function (query = {}) {
      return window.TL.Api.get("/cities", query);
    },

    async allFull() {
      const response = await window.TL.Api.get("/cities", { per_page: 500 });
      return window.TL.Util.list(response);
    },

    get: function (id) {
      return window.TL.Api.get("/cities/" + id);
    },

    search: function (q) {
      return window.TL.Api.get("/cities", { search: q });
    }
  };


  window.TL = window.TL || {};

  window.TL.Settings = Settings;
  window.TL.Countries = Countries;
  window.TL.Cities = Cities;

})();