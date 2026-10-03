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
  function readJSON(id, fallback) {
    var el = document.getElementById(id);
    try { return el ? JSON.parse(el.textContent) : fallback; } catch (e) { return fallback; }
  }

  var accounts = readJSON("accounts-data", {});

  function auth() { return root.getAttribute("data-auth") || "guest"; }

  function setAuth(value) {
    root.setAttribute("data-auth", value);
    try { localStorage.setItem(AUTH, value); } catch (e) {}
    renderAccount();
    setupProfile();
    setupMyBusinesses();
  }

  // The signed-in account's name, as the member last saved it on My profile
  function me() {
    var who = accounts[auth()];
    if (!who) return null;
    var saved = load("gimsuga-profile-" + auth(), null) || {};
    var first = saved.first || who.first;
    var title = "title" in saved ? saved.title : who.title;
    var surname = saved.surname || who.surname;
    return {
      first: first,
      greet: (title ? title + " " : "") + first,
      name: [title, first, surname].filter(Boolean).join(" "),
      owner: who.name,
      role: who.role
    };
  }

  function renderAccount() {
    var who = me();
    document.querySelectorAll("[data-account-name]").forEach(function (el) { el.textContent = who ? who.name : ""; });
    document.querySelectorAll("[data-account-first]").forEach(function (el) { el.textContent = who ? who.first : ""; });
    document.querySelectorAll("[data-account-greet]").forEach(function (el) { el.textContent = who ? who.greet : ""; });
    document.querySelectorAll("[data-account-initial]").forEach(function (el) { el.textContent = who ? who.first.charAt(0) : ""; });
    document.querySelectorAll("[data-account-role]").forEach(function (el) { el.textContent = who ? who.role : ""; });
    var btn = document.getElementById("account-button");
    if (btn) btn.setAttribute("aria-label", who ? who.first + ": account menu" : "Account menu");
    var n = applications().filter(function (a) { return !a.status; }).length;
    document.querySelectorAll("[data-pending-count]").forEach(function (el) { el.textContent = n ? "· " + n + " waiting" : ""; });
    document.querySelectorAll("[data-apps-waiting]").forEach(function (el) { el.textContent = String(n); });
  }

  // Toast
  var toastTimer;
  function toast(text) {
    var el = document.querySelector("[data-toast]");
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 5200);
  }

  // Sheets
  function openSheet(id) {
    var d = document.getElementById(id);
    if (d && typeof d.showModal === "function") d.showModal();
  }
  function closeSheets() {
    document.querySelectorAll("dialog[open]").forEach(function (d) { d.close(); });
  }

  // Meetings: upcoming or past is decided here from the date, so nothing goes stale (Phase 3, 5.4)
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function sortMeetings() {
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

  function formValues(form) {
    var out = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.type === "file" || el.type === "password") return;
      if (el.type === "radio") { if (el.checked) out[el.name] = el.value; return; }
      out[el.name] = el.type === "checkbox" ? el.checked : el.value;
    });
    return out;
  }
  function fillForm(form, data) {
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.type === "file") return;
      var has = data && el.name in data && data[el.name] !== null && data[el.name] !== undefined;
      if (el.type === "checkbox") el.checked = has ? !!data[el.name] : false;
      else if (el.type === "radio") el.checked = has ? el.value === String(data[el.name]) : el.defaultChecked;
      else el.value = has ? data[el.name] : "";
    });
  }

  // Shrinks a chosen image so it fits in the browser's storage, and shows it
  function imagePicker(input, preview, alt) {
    var state = { dataUrl: "" };
    input.addEventListener("change", function () {
      var f = input.files && input.files[0];
      preview.innerHTML = "";
      preview.hidden = !f;
      state.dataUrl = "";
      if (!f) return;
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, 900 / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        state.dataUrl = c.toDataURL("image/jpeg", 0.8);
        var shown = document.createElement("img");
        shown.alt = alt;
        shown.src = state.dataUrl;
        preview.append(shown);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(f);
    });
    return state;
  }

  // My profile: each detail has its own "who can see it". Kept per demo account.
  var profileBound = false;
  function setupProfile() {
    var form = document.querySelector("[data-profile-form]");
    if (!form || auth() === "guest") return;
    var key = "gimsuga-profile-" + auth();
    var defaults = readJSON("profile-defaults", {})[auth()] || {};
    fillForm(form, Object.assign({}, defaults, load(key, {})));
    if (profileBound) return;
    profileBound = true;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      toast(save("gimsuga-profile-" + auth(), formValues(form)) ? "Saved." : "Your browser blocked saving.");
      renderAccount();
    });
    var exp = document.querySelector("[data-profile-export]");
    if (exp) exp.addEventListener("click", function () {
      var blob = new Blob([JSON.stringify({ profile: formValues(form) }, null, 2)], { type: "application/json" });
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
      remove("gimsuga-profile-" + auth());
      closeSheets();
      setAuth("guest");
      toast("Your account has been deleted. (In this demo, you can sign in again.)");
    });
  }

  // My businesses: the signed-in member's own businesses, with a form to add or edit one
  var bizBound = false;
  function setupMyBusinesses() {
    var wrap = document.querySelector("[data-my-businesses]");
    if (!wrap) return;
    var who = me();
    var list = wrap.querySelector("[data-my-list]");
    var section = wrap.querySelector("[data-biz-form-section]");
    var form = wrap.querySelector("[data-biz-form]");
    var heading = wrap.querySelector("[data-biz-form-heading]");
    var addRow = wrap.querySelector("[data-biz-add-row]");
    var none = wrap.querySelector("[data-my-none]");
    var editing = null;

    function mine() {
      return Array.prototype.filter.call(list.children, function (li) { return who && li.getAttribute("data-owner") === who.owner; });
    }
    function showList() {
      Array.prototype.forEach.call(list.children, function (li) { li.hidden = !who || li.getAttribute("data-owner") !== who.owner; });
      var count = mine().length;
      none.hidden = count > 0;
      addRow.querySelector("button").textContent = count ? "Add another business" : "Add a business";
    }
    function openForm(li) {
      editing = li;
      var data = li ? JSON.parse(li.getAttribute("data-business")) : {};
      heading.textContent = li ? "Edit " + data.name : "Add a business";
      fillForm(form, data);
      section.hidden = false;
      addRow.hidden = true;
      form.elements.name.focus();
    }
    function closeForm() {
      section.hidden = true;
      addRow.hidden = false;
      editing = null;
    }
    showList();
    closeForm();
    if (bizBound) return;
    bizBound = true;

    wrap.addEventListener("click", function (e) {
      var edit = e.target.closest("[data-biz-edit]");
      if (edit) { openForm(edit.closest("li")); return; }
      if (e.target.closest("[data-biz-add]")) { openForm(null); return; }
      if (e.target.closest("[data-biz-cancel]")) { var back = editing; closeForm(); (back ? back.querySelector("[data-biz-edit]") : addRow.querySelector("button")).focus(); }
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = formValues(form);
      var li = editing;
      if (!li) {
        li = document.createElement("li");
        li.className = "card";
        li.setAttribute("data-owner", who.owner);
        li.innerHTML = '<p class="card__title" data-biz-name></p><p class="muted small" data-biz-seen></p>' +
          '<div class="card__actions"><button type="button" class="btn btn--small btn--quiet" data-biz-edit>Edit</button></div>';
        list.append(li);
      }
      li.setAttribute("data-business", JSON.stringify(data));
      li.querySelector("[data-biz-name]").textContent = data.name;
      li.querySelector("[data-biz-seen]").textContent = "Visible to: " + (data.public ? "Members and the public" : "Members only");
      closeForm();
      showList();
      li.querySelector("[data-biz-edit]").focus();
      toast(data.public ? "Saved. It has its own public page you can share." : "Saved. Signed-in members can see it.");
    });
  }

  // Drafts and approvals. Drafts from another officer can be approved; your own wait for someone else.
  var KEYD = "gimsuga-drafts";
  var SEED = [
    { title: "Report: mid-year general meeting", meta: "Added by Amarachi Nwosu-Kalu, PRO", by: "other", published: false,
      body: "The executive presented the half-year report. Members agreed to hold the end-of-year get-together in December. Thanks to everyone who attended." },
    { title: "Officers list for the 2025–2027 term", meta: "Added by Obinna Ekwueme-Ude, Chairman", by: "other", published: false,
      body: "Chairman, Vice Chairman, Secretary, Treasurer, Public Relations Officer and Technical Officer for the 2025–2027 term, as elected at the annual general meeting." }
  ];
  function drafts() { return load(KEYD, SEED); }

  function showDetail(title, rows, extra, actions) {
    var sheet = document.getElementById("detail");
    if (!sheet) return;
    sheet.querySelector("[data-detail-title]").textContent = title;
    var body = sheet.querySelector("[data-detail-body]");
    body.innerHTML = "";
    if (rows && rows.length) {
      var dl = document.createElement("dl");
      rows.forEach(function (r) {
        if (!r[1]) return;
        var div = document.createElement("div");
        var dt = document.createElement("dt"); dt.textContent = r[0];
        var dd = document.createElement("dd"); dd.textContent = r[1];
        div.append(dt, dd);
        dl.append(div);
      });
      body.append(dl);
    }
    if (extra) body.append(extra);
    var act = sheet.querySelector("[data-detail-actions]");
    act.innerHTML = "";
    (actions || []).forEach(function (a) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn" + (a.kind ? " btn--" + a.kind : "");
      b.textContent = a.label;
      b.addEventListener("click", function () { sheet.close(); a.run(); });
      act.append(b);
    });
    closeSheets();
    sheet.showModal();
  }

  function niceDate(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T12:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }
  function niceTime(hhmm) {
    if (!hhmm) return "";
    var p = hhmm.split(":"), h = +p[0];
    return (h % 12 || 12) + ":" + p[1] + (h < 12 ? " am" : " pm");
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
        badge.textContent = d.published ? "Published" : (d.by === "me" ? "Waiting for another officer" : "Waiting for you");
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
        function approve() {
          all[i].published = true;
          save(KEYD, all);
          render();
          toast("Published.");
        }
        var row = document.createElement("div");
        row.className = "queue__row";
        var view = document.createElement("button");
        view.type = "button";
        view.className = "btn btn--small btn--quiet";
        view.textContent = "View";
        view.addEventListener("click", function () {
          var text = document.createElement("p");
          text.className = "agenda";
          text.textContent = d.body || "A meeting draft: " + d.title + (d.meta ? " (" + d.meta + ")." : ".");
          showDetail(d.title, [["Status", d.by === "me" ? "Waiting for another officer" : "Waiting for you"], ["Details", d.meta]], text,
            d.by === "me" ? [] : [{ label: "Approve and publish", run: approve }]);
        });
        row.append(view);
        if (d.by !== "me") {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn btn--small";
          btn.textContent = "Approve and publish";
          btn.addEventListener("click", approve);
          row.append(btn);
        }
        li.append(row);
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
      var parts = [niceDate(form.elements.date.value), niceTime(form.elements.time.value), form.elements.venue.value];
      if (hasPhoto) parts.push(chosen.value === "agreed" ? "photo, consent recorded" : "photo, no people in it");
      var agenda = form.elements.agenda.value.trim();
      var all = drafts();
      all.unshift({ title: form.elements.title.value, meta: parts.filter(Boolean).join(" · "), by: "me", published: false,
        body: "Meeting: " + form.elements.title.value + ". " + parts.filter(Boolean).join(", ") + "." + (agenda ? "\n\nAgenda:\n" + agenda : "") });
      save(KEYD, all);
      form.reset();
      preview.hidden = true;
      consent.hidden = true;
      render();
      toast("Draft saved. Another officer will check it before it goes live.");
    });
  }

  // Personal registration links. Seeded ones are in the page; new ones are kept in this browser.
  function setupInvites() {
    var form = document.querySelector("[data-invite-form]");
    if (!form) return;
    var list = document.querySelector("[data-invite-list]");
    var result = document.querySelector("[data-invite-result]");
    var link = document.querySelector("[data-invite-link]");
    var KEYI = "gimsuga-invites";
    function row(inv) {
      var li = document.createElement("li");
      li.className = "queue__item";
      var badge = document.createElement("span");
      badge.className = "queue__status";
      badge.textContent = "Waiting";
      var title = document.createElement("p");
      title.className = "card__title";
      title.textContent = inv.name;
      var meta = document.createElement("p");
      meta.className = "muted small";
      meta.textContent = (inv.kind === "new" ? "New member" : "Existing member") + " · created " + niceDate(inv.created);
      li.append(badge, title, meta);
      return li;
    }
    load(KEYI, []).forEach(function (inv) { list.prepend(row(inv)); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var inv = { name: form.elements.name.value.trim(), kind: form.elements.kind.value, created: today() };
      var all = load(KEYI, []);
      all.push(inv);
      save(KEYI, all);
      list.prepend(row(inv));
      var token = "demo" + Math.random().toString(36).slice(2, 12);
      link.value = "https://example.com/register/?invite=" + token;
      document.querySelector("[data-invite-for]").textContent = inv.name;
      result.hidden = false;
      form.reset();
      result.focus();
    });
    document.querySelector("[data-invite-copy]").addEventListener("click", function () {
      var done = function () { toast("Link copied. Paste it into a WhatsApp chat or an email."); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link.value).then(done, function () { link.select(); done(); });
      else { link.select(); done(); }
    });
  }

  // Registrations with a dues receipt (G-042, G-053). Seeded ones come from the page; new ones from Register.
  var KEYA = "gimsuga-applications";
  var KEYMINE = "gimsuga-my-registrations";
  function applications() {
    var state = load(KEYA, {});
    return readJSON("applications-data", []).concat(load(KEYMINE, [])).map(function (a) {
      var s = state[a.id] || {};
      return Object.assign({}, a, { status: s.status || "" });
    });
  }
  function fullName(a) { return [a.title, a.first, a.surname].filter(Boolean).join(" "); }
  function setStatus(id, status) {
    var state = load(KEYA, {});
    state[id] = { status: status };
    save(KEYA, state);
  }

  function setupRegister() {
    var form = document.querySelector("[data-register-form]");
    if (!form) return;
    var picked = imagePicker(form.querySelector("[data-register-receipt]"), form.querySelector("[data-register-preview]"), "Your receipt");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = formValues(form);
      var mine = load(KEYMINE, []);
      mine.push({
        id: "mine-" + Date.now(), first: v.first, surname: v.surname, title: v.title, email: v.email,
        year: v.year, department: v.department, whatsapp: v.whatsapp, introduced_by: v.introduced_by,
        submitted: today(), receipt_data: picked.dataUrl
      });
      if (!save(KEYMINE, mine)) { toast("Your browser blocked saving the registration."); return; }
      form.reset();
      form.querySelector("[data-register-preview]").hidden = true;
      toast("Sent. An officer will check it and approve your account.");
      renderAccount();
    });
  }

  function setupApplications() {
    var list = document.querySelector("[data-app-list]");
    if (!list) return;
    var base = list.getAttribute("data-receipt-base");
    var empty = document.querySelector("[data-app-empty]");
    function render() {
      var all = applications();
      list.innerHTML = "";
      var waiting = 0;
      all.forEach(function (a) {
        var name = fullName(a);
        var first = a.first;
        if (!a.status) waiting++;
        var li = document.createElement("li");
        li.className = "queue__item";
        var badge = document.createElement("span");
        badge.className = "queue__status" + (a.status === "approved" ? " queue__status--published" : a.status === "declined" ? " queue__status--declined" : "");
        badge.textContent = a.status === "approved" ? "Approved" : a.status === "declined" ? "Declined and deleted" : "Receipt to check";
        var title = document.createElement("p");
        title.className = "card__title";
        title.textContent = name;
        var meta = document.createElement("p");
        meta.className = "muted small";
        meta.textContent = a.status === "declined" ? "Details deleted" : "Introduced by " + a.introduced_by + " · registered " + niceDate(a.submitted);
        li.append(badge, title, meta);
        if (a.status !== "declined") {
          var row = document.createElement("div");
          row.className = "queue__row";
          var view = document.createElement("button");
          view.type = "button";
          view.className = "btn btn--small" + (a.status ? " btn--quiet" : "");
          view.textContent = a.status ? "View" : "View and check";
          view.addEventListener("click", function () {
            var extra;
            if (!a.status) {
              var src = a.receipt_data || (a.receipt ? base + a.receipt : "");
              if (src) {
                extra = document.createElement("img");
                extra.className = "receipt";
                extra.alt = "Dues receipt sent by " + name;
                extra.src = src;
              }
            } else {
              extra = document.createElement("p");
              extra.className = "muted";
              extra.textContent = "Approved. Their account is open and the receipt has been deleted.";
            }
            showDetail(name, [
              ["Email", a.email],
              ["Year you graduated", String(a.year || "")],
              ["Department", a.department],
              ["WhatsApp number", a.whatsapp],
              ["Introduced by", a.introduced_by],
              ["Registered", niceDate(a.submitted)]
            ], extra, a.status ? [] : [
              { label: "Approve", run: function () { setStatus(a.id, "approved"); render(); renderAccount(); toast(name + " approved. Their receipt has been deleted. Remember to add them to the WhatsApp group and tell them their account is ready."); } },
              { label: "Decline and delete", kind: "danger", run: function () { setStatus(a.id, "declined"); render(); renderAccount(); toast(first + "'s registration was declined and deleted."); } }
            ]);
          });
          row.append(view);
          li.append(row);
        }
        list.append(li);
      });
      empty.hidden = waiting > 0;
    }
    render();
  }

  // Guided tour (Driver.js, home page only)
  function startTour() {
    if (!window.driver || !window.driver.js) return;
    var wide = window.matchMedia("(min-width: 900px)").matches;
    var signedIn = auth() !== "guest";
    var steps = [
      { popover: { title: "Welcome", description: "This is the website of the GIMSUGA Ebonyi State chapter. Here is a quick look around.", showButtons: ["next", "close"] } },
      { element: "#next-meeting", popover: { title: "The next meeting", description: "The date, time and place of the next chapter meeting. It moves on by itself once a meeting has passed.", side: "bottom" } },
      { element: wide ? ".topnav" : "#bottom-nav", popover: { title: "Finding your way", description: signedIn ? "Meetings, the chapter's work, its officers, and the businesses members run." : "Meetings, the chapter's work, its officers, and how to join.", side: wide ? "bottom" : "top" } },
      signedIn
        ? { element: "#welcome", popover: { title: "Your things", description: "Your profile, where you choose who sees each detail, and your businesses" + (auth() === "admin" ? ". Officers also get Manage." : "."), side: "bottom" } }
        : null,
      signedIn
        ? { element: "#account-button", popover: { title: "Your account", description: "The same links are under your name, and Sign out too.", side: "bottom", align: "end" } }
        : { element: "#signin-button", popover: { title: "For members", description: "Members sign in to see the businesses members run and to keep their profile. Visitors don't see those pages.", side: "bottom", align: "end" } },
      { popover: { title: signedIn ? "That's it" : "Try it", description: signedIn ? "Explore at your own pace." : "Tap Sign in at the top to see the site as a member or an admin." } }
    ].filter(Boolean);
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
        toast("Signed in as " + me().name + ".");
        return;
      }
      if (t.closest("[data-signout]")) {
        setAuth("guest");
        closeSheets();
        toast("Signed out.");
        return;
      }
      var down = t.closest("[data-takedown]");
      if (down) {
        var item = down.closest("li");
        down.disabled = true;
        down.textContent = "Taken down";
        item.classList.add("is-down");
        toast(down.getAttribute("data-takedown") + " was taken down. It no longer shows to members or the public.");
        return;
      }
      var said = t.closest("[data-toast-text]");
      if (said) { toast(said.getAttribute("data-toast-text")); return; }
      if (t.closest("[data-tour]")) { startTour(); }
    });

    // Close a sheet by tapping outside it
    document.querySelectorAll("dialog").forEach(function (d) {
      d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
    });

    sortMeetings();
    setupProfile();
    setupMyBusinesses();
    setupDrafts();
    setupInvites();
    setupRegister();
    setupApplications();
    renderAccount();
  });
})();
