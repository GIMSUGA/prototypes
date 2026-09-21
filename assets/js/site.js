// GIMSUGA Ebonyi State chapter site. Everything here stays in the visitor's browser.
(function () {
  "use strict";

  var root = document.documentElement;
  var AUTH = "gimsuga-auth";

  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function remove(key) { try { localStorage.removeItem(key); } catch (e) {} }

  var accounts = {};
  try { accounts = JSON.parse(document.getElementById("accounts-data").textContent); } catch (e) {}

  function auth() { return root.getAttribute("data-auth") || "guest"; }

  function setAuth(value) {
    root.setAttribute("data-auth", value);
    try { localStorage.setItem(AUTH, value); } catch (e) {}
    renderAccount();
  }

  function renderAccount() {
    var who = accounts[auth()];
    document.querySelectorAll("[data-account-name]").forEach(function (el) { el.textContent = who ? who.name : ""; });
    document.querySelectorAll("[data-account-first]").forEach(function (el) { el.textContent = who ? who.name.split(" ")[0] : ""; });
    document.querySelectorAll("[data-account-initial]").forEach(function (el) { el.textContent = who ? who.name.charAt(0) : ""; });
    document.querySelectorAll("[data-account-role]").forEach(function (el) { el.textContent = who ? who.role : ""; });
    var btn = document.getElementById("account-button");
    if (btn) btn.setAttribute("aria-label", who ? "Your account, " + who.name : "Your account");
    markYou(who);
    var count = document.querySelector("[data-pending-count]");
    if (count) {
      var n = drafts().filter(function (d) { return !d.published && d.by !== "me"; }).length;
      count.textContent = n ? "· " + n + " waiting" : "";
    }
  }

  // The signed-in member's own card says so, with no contact buttons to themselves
  function markYou(who) {
    document.querySelectorAll("[data-you]").forEach(function (el) { el.remove(); });
    document.querySelectorAll("[data-person-card]").forEach(function (card) {
      var actions = card.querySelector(".card__actions");
      var mine = who && card.getAttribute("data-person-card") === who.name;
      if (actions) actions.hidden = !!mine;
      if (mine) {
        var badge = document.createElement("span");
        badge.className = "you-badge";
        badge.setAttribute("data-you", "");
        badge.textContent = "You";
        card.querySelector(".card__title").append(" ", badge);
      }
    });
  }

  // Toast
  var toastTimer;
  function toast(text) {
    var el = document.querySelector("[data-toast]");
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 4200);
  }

  // Sheets
  function openSheet(id) {
    var d = document.getElementById(id);
    if (d && typeof d.showModal === "function") d.showModal();
  }
  function closeSheets() {
    document.querySelectorAll("dialog[open]").forEach(function (d) { d.close(); });
  }

  // Events: upcoming or past is decided here from the date, so nothing goes stale (Phase 3, 5.4)
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function sortEvents() {
    var now = today();
    var upcoming = document.querySelector("[data-events-upcoming]");
    var past = document.querySelector("[data-events-past]");
    if (upcoming && past) {
      Array.prototype.slice.call(upcoming.querySelectorAll("[data-event-date]"))
        .filter(function (li) { return li.getAttribute("data-event-date") < now; })
        .sort(function (a, b) { return a.getAttribute("data-event-date") < b.getAttribute("data-event-date") ? 1 : -1; })
        .forEach(function (li) { past.appendChild(li); });
      var none = document.querySelector("[data-events-none]");
      if (none) none.hidden = upcoming.children.length > 0;
    }
    var next = document.querySelector("[data-next-event]");
    if (next) {
      var found = Array.prototype.slice.call(next.querySelectorAll("[data-event-date]"))
        .filter(function (el) { return el.getAttribute("data-event-date") >= now; })[0];
      if (found) found.hidden = false;
      else next.querySelector(".next__none").hidden = false;
    }
    document.querySelectorAll("[data-term-ends]").forEach(function (el) {
      el.hidden = el.getAttribute("data-term-ends") >= now;
    });
  }

  // Directory search
  function setupFilters() {
    document.querySelectorAll("[data-filter-list]").forEach(function (input) {
      var listId = input.getAttribute("data-filter-list");
      var list = document.getElementById(listId);
      var empty = document.querySelector('[data-filter-empty="' + listId + '"]');
      if (!list) return;
      input.addEventListener("input", function () {
        var q = input.value.trim().toLowerCase();
        var shown = 0;
        list.querySelectorAll("[data-filter-text]").forEach(function (li) {
          var match = !q || li.getAttribute("data-filter-text").indexOf(q) >= 0;
          li.hidden = !match;
          if (match) shown++;
        });
        if (empty) empty.hidden = shown > 0;
      });
    });
  }

  // Profile
  function setupProfile() {
    var form = document.querySelector("[data-profile-form]");
    if (!form) return;
    var KEYP = "gimsuga-profile";
    var direct = form.querySelector("[data-contact-direct]");
    function syncMode() {
      var mode = form.querySelector('input[name="contact_mode"]:checked');
      if (direct) direct.hidden = !mode || mode.value !== "direct";
    }
    function fill(data) {
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || !(el.name in data)) return;
        if (el.type === "checkbox") el.checked = !!data[el.name];
        else if (el.type === "radio") el.checked = el.value === data[el.name];
        else el.value = data[el.name];
      });
    }
    var who = accounts[auth()];
    fill(load(KEYP, null) || (who ? { name: who.name } : {}));
    syncMode();
    form.addEventListener("change", syncMode);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var out = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name) return;
        if (el.type === "radio") { if (el.checked) out[el.name] = el.value; return; }
        out[el.name] = el.type === "checkbox" ? el.checked : el.value;
      });
      toast(save(KEYP, out) ? "Profile saved." : "Your browser blocked saving.");
    });
    var exp = document.querySelector("[data-profile-export]");
    if (exp) exp.addEventListener("click", function () {
      var blob = new Blob([JSON.stringify({ profile: load(KEYP, {}) }, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "my-gimsuga-data.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast("Your data has been downloaded.");
    });
    var del = document.querySelector("[data-profile-delete]");
    if (del) del.addEventListener("click", function () { openSheet("confirm-delete"); });
    var confirmDel = document.querySelector("[data-confirm-delete]");
    if (confirmDel) confirmDel.addEventListener("click", function () {
      remove(KEYP);
      form.reset();
      syncMode();
      closeSheets();
      toast("Your profile has been deleted.");
      del.focus();
    });
  }

  // Drafts and approvals. Drafts from another admin can be approved; your own wait for someone else.
  var KEYD = "gimsuga-drafts";
  var SEED = [
    { title: "Report: mid-year general meeting", meta: "Added by Amarachi Nwosu-Kalu, PRO", by: "other", published: false },
    { title: "Officers list for the 2025–2027 term", meta: "Added by Obinna Ekwueme-Ude, Chairman", by: "other", published: false }
  ];
  function drafts() { return load(KEYD, SEED); }

  function niceDate(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T12:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }

  function setupDrafts() {
    var list = document.querySelector("[data-draft-list]");
    if (!list) return;
    var empty = document.querySelector("[data-draft-empty]");
    var pubList = document.querySelector("[data-published-list]");
    var pubSection = document.querySelector("[data-published-section]");
    function render() {
      var all = drafts();
      list.innerHTML = "";
      if (pubList) pubList.innerHTML = "";
      var waiting = 0, published = 0;
      all.forEach(function (d, i) {
        var li = document.createElement("li");
        li.className = "queue__item";
        var badge = document.createElement("span");
        badge.className = "queue__status" + (d.published ? " queue__status--published" : "");
        badge.textContent = d.published ? "Published" : (d.by === "me" ? "Waiting for another admin" : "Waiting for you");
        var title = document.createElement("p");
        title.className = "card__title";
        title.textContent = d.title;
        var meta = document.createElement("p");
        meta.className = "muted small";
        meta.textContent = d.meta;
        li.append(badge, title, meta);
        if (d.published) {
          published++;
          if (pubList) pubList.append(li);
          return;
        }
        waiting++;
        if (d.by !== "me") {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn btn--small";
          btn.textContent = "Approve and publish";
          btn.addEventListener("click", function () {
            all[i].published = true;
            save(KEYD, all);
            render();
            renderAccount();
            toast("Published.");
          });
          li.append(btn);
        }
        list.append(li);
      });
      empty.hidden = waiting > 0;
      if (pubSection) pubSection.hidden = published === 0;
    }
    render();

    var form = document.querySelector("[data-draft-form]");
    if (!form) return;
    var photo = form.querySelector("[data-draft-photo]");
    var preview = form.querySelector("[data-photo-preview]");
    var consent = form.querySelector("[data-photo-consent]");
    photo.addEventListener("change", function () {
      var file = photo.files && photo.files[0];
      preview.innerHTML = "";
      preview.hidden = !file;
      consent.hidden = !file;
      if (!file) return;
      var img = document.createElement("img");
      img.alt = "The photo you chose";
      img.src = URL.createObjectURL(file);
      img.onload = function () { URL.revokeObjectURL(img.src); };
      preview.append(img);
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var hasPhoto = photo.files && photo.files[0];
      var chosen = form.querySelector('input[name="consent"]:checked');
      if (hasPhoto && !chosen) { toast("Choose one of the photo statements before saving."); return; }
      var parts = [niceDate(form.elements.date.value), form.elements.venue.value];
      if (hasPhoto) parts.push(chosen.value === "agreed" ? "photo, consent recorded" : "photo, no people in it");
      var all = drafts();
      all.unshift({ title: form.elements.title.value, meta: parts.filter(Boolean).join(" · "), by: "me", published: false });
      save(KEYD, all);
      form.reset();
      preview.hidden = true;
      consent.hidden = true;
      render();
      toast("Draft saved. Another admin will check it before it goes live.");
    });

    var invite = document.querySelector("[data-invite-form]");
    if (invite) invite.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = invite.elements.name.value.split(" ")[0];
      invite.reset();
      toast("Invitation sent. " + name + " will get an email to sign in.");
    });
  }

  // Guided tour (Driver.js, home page only)
  function startTour() {
    if (!window.driver || !window.driver.js) return;
    var wide = window.matchMedia("(min-width: 900px)").matches;
    var signedIn = auth() !== "guest";
    var steps = [
      { popover: { title: "Welcome", description: "This is the website of the GIMSUGA Ebonyi State chapter. Here is a quick look around.", showButtons: ["next", "close"] } },
      { element: "#next-meeting", popover: { title: "The next meeting", description: "The date, time and place of the next chapter meeting. It moves on by itself once a meeting has passed.", side: "bottom" } },
      { element: wide ? ".topnav" : "#bottom-nav", popover: { title: "Finding your way", description: signedIn ? "Events, the member directory, your profile" + (auth() === "admin" ? ", and Manage for admins." : ".") : "Events, the chapter's work, its officers, and how to join.", side: wide ? "bottom" : "top" } },
      signedIn
        ? { element: "#account-button", popover: { title: "Your account", description: "Your profile and how members can reach you. Sign out from here too.", side: "bottom", align: "end" } }
        : { element: "#signin-button", popover: { title: "For members", description: "Members sign in to find each other and members' businesses. Visitors don't see those pages.", side: "bottom", align: "end" } },
      { popover: { title: signedIn ? "That's it" : "Try it", description: signedIn ? "Explore at your own pace." : "Tap Sign in at the top to see the site as a member or an admin." } }
    ];
    var tour = window.driver.js.driver({
      showProgress: true,
      allowClose: true,
      overlayOpacity: 0.55,
      popoverClass: "gimsuga-tour",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Done",
      steps: steps,
      onDestroyed: function () {
        // Driver.js restores focus itself after this runs, so return it on the next tick
        setTimeout(function () {
          var start = document.querySelector("[data-tour]");
          if (start) start.focus();
        }, 0);
      }
    });
    tour.drive();
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderAccount();

    document.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target : null;
      if (!t) return;
      var opener = t.closest("[data-open]");
      if (opener) { closeSheets(); openSheet(opener.getAttribute("data-open")); return; }
      var signin = t.closest("[data-signin]");
      if (signin) {
        setAuth(signin.getAttribute("data-signin"));
        closeSheets();
        toast("Signed in as " + accounts[auth()].name + ".");
        return;
      }
      if (t.closest("[data-signout]")) {
        setAuth("guest");
        closeSheets();
        toast("Signed out.");
        return;
      }
      var said = t.closest("[data-toast-text]");
      if (said) {
        toast(said.getAttribute("data-toast-text"));
        if (said.hasAttribute("data-connect")) { said.textContent = "Request sent"; said.disabled = true; }
        return;
      }
      if (t.closest("[data-tour]")) { startTour(); }
    });

    // Close a sheet by tapping outside it
    document.querySelectorAll("dialog").forEach(function (d) {
      d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
    });

    sortEvents();
    setupFilters();
    setupProfile();
    setupDrafts();
  });
})();
