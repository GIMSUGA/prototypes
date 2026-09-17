// GIMSUGA prototypes: demo bar state and in-browser-only interactions.
// Nothing here sends data anywhere. Storage is wrapped so blocked storage still works from the URL.
(function () {
  "use strict";

  var DIRS = ["A", "B", "C"];
  var VIEWS = ["visitor", "member", "officer"];
  var SCOPES = ["single", "multi"];
  var KEY = "gimsuga-demo";
  var root = document.documentElement;

  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function state() {
    return { dir: root.getAttribute("data-dir") || "A", as: root.getAttribute("data-as") || "visitor", chapters: root.getAttribute("data-chapters") || "multi" };
  }

  function apply(next) {
    var s = state();
    var dir = DIRS.indexOf(next.dir) >= 0 ? next.dir : s.dir;
    var as = VIEWS.indexOf(next.as) >= 0 ? next.as : s.as;
    var chapters = SCOPES.indexOf(next.chapters) >= 0 ? next.chapters : s.chapters;
    root.setAttribute("data-dir", dir);
    root.setAttribute("data-as", as);
    root.setAttribute("data-chapters", chapters);
    save(KEY, { dir: dir, as: as, chapters: chapters });
    var url = new URL(location.href);
    url.searchParams.set("dir", dir);
    url.searchParams.set("as", as);
    url.searchParams.set("chapters", chapters);
    history.replaceState(null, "", url);
    syncControls();
    document.dispatchEvent(new CustomEvent("demo:change"));
  }

  var LABELS = { A: "Option A · Lean", B: "Option B · Members area", C: "Option C · Community portal", visitor: "Visitor", member: "Member", officer: "Officer", single: "Chapter site", multi: "Multi-chapter site" };

  function syncControls() {
    var s = state();
    var summary = document.querySelector("[data-demo-summary]");
    if (summary) summary.textContent = [LABELS[s.dir], LABELS[s.as], LABELS[s.chapters]].join(" · ");
    document.querySelectorAll('[data-demo-controls] input[name="dir"]').forEach(function (i) { i.checked = i.value === s.dir; });
    document.querySelectorAll('[data-demo-controls] input[name="as"]').forEach(function (i) { i.checked = i.value === s.as; });
    document.querySelectorAll('[data-demo-controls] input[name="chapters"]').forEach(function (i) { i.checked = i.value === s.chapters; });
  }

  // Keep the chosen view when following links, even if storage is blocked.
  function carryState(event) {
    var a = event.target.closest && event.target.closest("a[href]");
    if (!a || a.target === "_blank" || event.defaultPrevented) return;
    var url;
    try { url = new URL(a.getAttribute("href"), location.href); } catch (e) { return; }
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
    if (url.searchParams.has("dir") && url.searchParams.has("as") && url.searchParams.has("chapters")) return;
    var s = state();
    if (!url.searchParams.has("dir")) url.searchParams.set("dir", s.dir);
    if (!url.searchParams.has("as")) url.searchParams.set("as", s.as);
    if (!url.searchParams.has("chapters")) url.searchParams.set("chapters", s.chapters);
    a.setAttribute("href", url.pathname + url.search + url.hash);
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // Events: upcoming versus past is decided here, from the date (Phase 3, 5.4).
  function sortEvents() {
    var now = today();
    var upcoming = document.querySelector("[data-events-upcoming]");
    var past = document.querySelector("[data-events-past]");
    if (upcoming && past) {
      var items = Array.prototype.slice.call(upcoming.querySelectorAll("[data-event-date]"));
      items.filter(function (li) { return li.getAttribute("data-event-date") < now; })
        .sort(function (a, b) { return a.getAttribute("data-event-date") < b.getAttribute("data-event-date") ? 1 : -1; })
        .forEach(function (li) {
          li.querySelectorAll("[data-upcoming-only]").forEach(function (el) { el.remove(); });
          past.appendChild(li);
        });
      var none = document.querySelector("[data-events-none]");
      if (none) none.hidden = upcoming.children.length > 0;
    }
    var next = document.querySelector("[data-next-event]");
    if (next) {
      var found = Array.prototype.slice.call(next.querySelectorAll("[data-event-date]"))
        .filter(function (el) { return el.getAttribute("data-event-date") >= now; })[0];
      if (found) found.hidden = false;
      else next.querySelector(".next-card__none").hidden = false;
    }
    document.querySelectorAll("[data-term-ends]").forEach(function (el) {
      el.hidden = el.getAttribute("data-term-ends") >= now;
    });
  }

  function setupRsvp() {
    var rsvps = load("gimsuga-demo-rsvp", {});
    document.querySelectorAll("[data-rsvp]").forEach(function (btn) {
      var id = btn.getAttribute("data-rsvp");
      function render() {
        var on = !!rsvps[id];
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.textContent = on ? "You plan to attend" : "I plan to attend";
      }
      render();
      btn.addEventListener("click", function () {
        rsvps[id] = !rsvps[id];
        save("gimsuga-demo-rsvp", rsvps);
        render();
      });
    });
  }

  function setupFilters() {
    document.querySelectorAll("[data-filter-list]").forEach(function (input) {
      var listId = input.getAttribute("data-filter-list");
      var list = document.getElementById(listId);
      var empty = document.querySelector('[data-filter-empty="' + listId + '"]');
      var scope = document.querySelector('[data-scope-for="' + listId + '"]');
      var scopeNote = document.querySelector('[data-scope-note="' + listId + '"]');
      if (!list) return;
      function run() {
        var q = input.value.trim().toLowerCase();
        var where = root.getAttribute("data-chapters") === "single" ? "abakaliki" : (scope ? scope.value : "all");
        var shown = 0;
        list.querySelectorAll("[data-filter-text]").forEach(function (li) {
          var inScope = where === "all" || li.getAttribute("data-chapter") === where;
          var match = inScope && (!q || li.getAttribute("data-filter-text").indexOf(q) >= 0);
          li.hidden = !match;
          if (match) shown++;
        });
        if (empty) empty.hidden = shown > 0;
        if (scopeNote) scopeNote.hidden = where === "abakaliki";
      }
      input.addEventListener("input", run);
      if (scope) scope.addEventListener("change", run);
      document.addEventListener("demo:change", run);
      run();
    });
  }

  function setupProfile() {
    var form = document.querySelector("[data-profile-form]");
    if (!form) return;
    var direct = form.querySelector("[data-contact-direct]");
    function syncMode() {
      var mode = form.querySelector('input[name="contact_mode"]:checked');
      if (direct) direct.hidden = !mode || mode.value !== "direct";
    }
    form.addEventListener("change", syncMode);
    var status = document.querySelector("[data-profile-status]");
    var KEYP = "gimsuga-demo-profile";
    var data = load(KEYP, null);
    if (data) {
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || !(el.name in data)) return;
        if (el.type === "checkbox") el.checked = !!data[el.name];
        else if (el.type === "radio") el.checked = el.value === data[el.name];
        else el.value = data[el.name];
      });
    }
    syncMode();
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var out = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name) return;
        if (el.type === "radio") { if (el.checked) out[el.name] = el.value; return; }
        out[el.name] = el.type === "checkbox" ? el.checked : el.value;
      });
      status.textContent = save(KEYP, out) ? "Saved in this browser only." : "Your browser blocked saving. Nothing was stored.";
    });
    var exp = document.querySelector("[data-profile-export]");
    if (exp) exp.addEventListener("click", function () {
      var current = load(KEYP, {});
      var blob = new Blob([JSON.stringify({ note: "Demo export. In the real site this file holds everything the chapter keeps about you.", profile: current }, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "my-gimsuga-data-demo.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      status.textContent = "Download prepared. In this demo it holds only what you typed here.";
    });
    var del = document.querySelector("[data-profile-delete]");
    if (del) del.addEventListener("click", function () {
      remove(KEYP);
      form.reset();
      syncMode();
      status.textContent = "Profile deleted. In the real site this deletes it from the chapter's server too.";
    });
  }

  function setupPosts() {
    var form = document.querySelector("[data-post-form]");
    if (!form) return;
    var status = document.querySelector("[data-post-status]");
    var list = document.querySelector("[data-posts]");
    function render() {
      list.querySelectorAll(".post--pending").forEach(function (el) { el.remove(); });
      load("gimsuga-demo-posts", []).forEach(function (p) {
        var li = document.createElement("li");
        li.className = "post post--pending";
        var meta = document.createElement("p");
        meta.className = "post__meta";
        meta.textContent = "You · waiting for an officer to review";
        var h = document.createElement("h3");
        h.textContent = p.title;
        var body = document.createElement("p");
        body.textContent = p.body;
        li.append(meta, h, body);
        list.prepend(li);
      });
    }
    render();
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var posts = load("gimsuga-demo-posts", []);
      posts.push({ title: form.elements.title.value, body: form.elements.body.value });
      save("gimsuga-demo-posts", posts);
      form.reset();
      status.textContent = "Sent for review. Only you can see it until an officer approves it.";
      render();
    });
  }

  function setupDrafts() {
    var form = document.querySelector("[data-draft-form]");
    if (!form) return;
    var list = document.querySelector("[data-draft-list]");
    var empty = document.querySelector("[data-draft-empty]");
    var status = document.querySelector("[data-draft-status]");
    var KEYD = "gimsuga-demo-drafts";
    function render() {
      var drafts = load(KEYD, []);
      list.innerHTML = "";
      drafts.forEach(function (d, i) {
        var li = document.createElement("li");
        li.className = "queue__item";
        var badge = document.createElement("span");
        badge.className = "queue__status" + (d.published ? " queue__status--published" : "");
        badge.textContent = d.published ? "Published (demo only)" : "Waiting for approval";
        var title = document.createElement("p");
        title.innerHTML = "<strong></strong>";
        title.firstChild.textContent = d.title;
        var meta = document.createElement("p");
        meta.className = "muted";
        meta.textContent = [d.date, d.venue, d.photo].filter(Boolean).join(" · ");
        li.append(badge, title, meta);
        if (!d.published) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "button button--small";
          btn.textContent = "Approve and publish";
          btn.addEventListener("click", function () {
            drafts[i].published = true;
            save(KEYD, drafts);
            render();
          });
          li.append(btn);
        }
        list.append(li);
      });
      empty.hidden = drafts.length > 0;
    }
    render();
    var photo = form.querySelector("[data-draft-photo]");
    var preview = form.querySelector("[data-photo-preview]");
    var consent = form.querySelector("[data-photo-consent]");
    if (photo) photo.addEventListener("change", function () {
      var file = photo.files && photo.files[0];
      preview.innerHTML = "";
      preview.hidden = !file;
      consent.hidden = !file;
      if (!file) return;
      var img = document.createElement("img");
      img.alt = "Preview of the photo you chose";
      img.src = URL.createObjectURL(file);
      img.onload = function () { URL.revokeObjectURL(img.src); };
      var note = document.createElement("span");
      note.className = "muted";
      note.textContent = "Shown from your own device. Nothing is uploaded in this demo.";
      preview.append(img, note);
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (photo && photo.files && photo.files[0] && !form.querySelector('input[name="consent"]:checked')) {
        status.textContent = "Choose one of the photo statements before saving.";
        return;
      }
      var drafts = load(KEYD, []);
      var chosen = form.querySelector('input[name="consent"]:checked');
      drafts.unshift({ title: form.elements.title.value, date: form.elements.date.value, venue: form.elements.venue.value, photo: photo && photo.files && photo.files[0] ? (chosen && chosen.value === "agreed" ? "photo, consent recorded" : "photo, no people in it") : "", published: false });
      save(KEYD, drafts);
      form.reset();
      if (preview) { preview.innerHTML = ""; preview.hidden = true; }
      if (consent) consent.hidden = true;
      status.textContent = "Draft saved. The approver sees it on the right.";
      render();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    apply(state());
    document.querySelectorAll("[data-demo-controls] input").forEach(function (input) {
      input.addEventListener("change", function () {
        var change = {};
        change[input.name] = input.value;
        apply(change);
      });
    });
    var controls = document.querySelector("[data-demo-controls]");
    if (controls) controls.addEventListener("submit", function (e) { e.preventDefault(); });
    var toggle = document.querySelector("[data-demo-toggle]");
    var bar = document.querySelector(".demobar");
    if (toggle && bar) toggle.addEventListener("click", function () {
      var open = bar.getAttribute("data-collapsed") === "true";
      bar.setAttribute("data-collapsed", open ? "false" : "true");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "Done" : "Change";
    });
    var storyId = new URLSearchParams(location.search).get("story");
    if (storyId && /^[a-z0-9-]+$/.test(storyId)) {
      var guide = document.querySelector('[data-story-id="' + storyId + '"]');
      if (guide) guide.hidden = false;
    }
    document.addEventListener("click", function (e) {
      var setter = e.target.closest && e.target.closest("[data-set-as]");
      if (setter) apply({ as: setter.getAttribute("data-set-as") });
      var explain = e.target.closest && e.target.closest("[data-explain]");
      if (explain) {
        var out = explain.closest(".contact").querySelector("[data-explain-out]");
        if (out) { out.textContent = explain.getAttribute("data-explain"); out.hidden = false; }
        if (explain.hasAttribute("data-connect")) {
          explain.textContent = "Request sent";
          explain.disabled = true;
        }
      }
      carryState(e);
    });
    sortEvents();
    setupRsvp();
    setupFilters();
    setupProfile();
    setupPosts();
    setupDrafts();
  });
})();
