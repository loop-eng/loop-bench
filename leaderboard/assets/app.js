(function () {
  "use strict";

  let data = null;
  let sortKey = "compositeScore";
  let sortDir = "desc";
  let filterModel = "all";

  const COLUMNS = [
    { key: "rank", label: "#", format: rankFormat, align: "center" },
    { key: "loopDesign", label: "Loop Design", format: nameFormat },
    { key: "compositeScore", label: "Score", format: scoreFormat, align: "right" },
    { key: "passRate", label: "Pass Rate", format: pctFormat, align: "right" },
    { key: "avgCostPerTask", label: "$/Task", format: dollarFormat, align: "right" },
    { key: "avgIterations", label: "Iters", format: decFormat, align: "right" },
    { key: "avgConvergenceRate", label: "Converge", format: dec3Format, align: "right" },
    { key: "avgDriftScore", label: "Drift", format: dec2Format, align: "right" },
    { key: "avgHonestyScore", label: "Honesty", format: dec2Format, align: "right" },
    { key: "avgErosionScore", label: "Erosion", format: dec2Format, align: "right" },
    { key: "avgRubricScore", label: "Rubric", format: dec2Format, align: "right" },
    { key: "totalTasks", label: "Tasks", format: intFormat, align: "right" },
  ];

  async function init() {
    try {
      const resp = await fetch("data/leaderboard.json");
      if (!resp.ok) throw new Error("Failed to load leaderboard data");
      data = await resp.json();
      renderMeta();
      populateFilters();
      renderTable();
    } catch (err) {
      document.getElementById("table-body").innerHTML =
        '<tr><td colspan="12" class="empty-state">Failed to load data. Run <code>bench report</code> first.</td></tr>';
    }
  }

  function renderMeta() {
    document.getElementById("meta-version").textContent = data.benchmark_version;
    document.getElementById("meta-tasks").textContent = data.total_tasks;
    document.getElementById("meta-submissions").textContent = data.total_submissions;
    document.getElementById("meta-date").textContent = new Date(data.generated_at).toLocaleDateString();
  }

  function populateFilters() {
    var sel = document.getElementById("filter-model");
    sel.innerHTML = '<option value="all">All Models</option>';
    (data.models || []).forEach(function (m) {
      var opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", function () {
      filterModel = this.value;
      renderTable();
    });
  }

  function getFilteredEntries() {
    var entries = data.entries || [];
    if (filterModel !== "all") {
      entries = entries.filter(function (e) { return e.model === filterModel; });
    }
    return entries;
  }

  function renderTable() {
    var entries = getFilteredEntries();
    entries = sortEntries(entries);

    // Re-rank after sort
    entries.forEach(function (e, i) { e._displayRank = i + 1; });

    var thead = document.getElementById("table-head");
    var tbody = document.getElementById("table-body");

    // Render header
    thead.innerHTML = "";
    var tr = document.createElement("tr");
    COLUMNS.forEach(function (col) {
      var th = document.createElement("th");
      th.textContent = col.label;
      th.dataset.key = col.key;
      if (col.align === "right") th.classList.add("text-right");
      if (col.align === "center") th.style.textAlign = "center";
      if (col.key === sortKey) {
        th.classList.add(sortDir === "asc" ? "sorted-asc" : "sorted-desc");
      }
      th.addEventListener("click", function () {
        if (sortKey === col.key) {
          sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
          sortKey = col.key;
          sortDir = col.key === "loopDesign" ? "asc" : "desc";
        }
        renderTable();
      });
      tr.appendChild(th);
    });
    thead.appendChild(tr);

    // Render body
    tbody.innerHTML = "";
    if (entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="12" class="empty-state">No matching submissions.</td></tr>';
      return;
    }

    entries.forEach(function (entry) {
      var row = document.createElement("tr");
      COLUMNS.forEach(function (col) {
        var td = document.createElement("td");
        if (col.align === "right") td.classList.add("text-right");
        var value = col.key === "rank" ? entry._displayRank : entry[col.key];
        td.innerHTML = col.format(value, entry);
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
  }

  function sortEntries(entries) {
    var sorted = entries.slice();
    sorted.sort(function (a, b) {
      var av = a[sortKey];
      var bv = b[sortKey];
      if (typeof av === "string") {
        var cmp = av.localeCompare(bv);
        return sortDir === "asc" ? cmp : -cmp;
      }
      var diff = (av || 0) - (bv || 0);
      return sortDir === "asc" ? diff : -diff;
    });
    return sorted;
  }

  // Formatters
  function rankFormat(v) {
    var cls = v <= 3 ? "rank-" + v : "";
    return '<span class="rank-cell ' + cls + '">' + v + "</span>";
  }

  function nameFormat(v) {
    return '<span class="loop-name">' + escapeHtml(v) + "</span>";
  }

  function scoreFormat(v) {
    var width = Math.round(v * 100);
    return (
      '<span class="composite">' + v.toFixed(3) + "</span>" +
      '<span class="score-bar" style="width:' + width + 'px"></span>'
    );
  }

  function pctFormat(v) {
    return (v * 100).toFixed(0) + "%";
  }

  function dollarFormat(v) {
    return "$" + v.toFixed(2);
  }

  function decFormat(v) {
    return v.toFixed(1);
  }

  function dec2Format(v) {
    return v.toFixed(2);
  }

  function dec3Format(v) {
    return v.toFixed(3);
  }

  function intFormat(v) {
    return String(v);
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
