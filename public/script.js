let page = 1;
const LIMIT = 50;

// === Fetch paginated reviews ===
async function fetchReviews(pageNum = 1, query = "", minRating = "") {
  const url = new URL("/software", window.location.origin);
  url.searchParams.set("page", pageNum);
  url.searchParams.set("limit", LIMIT);
  if (query) url.searchParams.set("q", query);
  if (minRating) url.searchParams.set("minRating", minRating);

  const res = await fetch(url);
  const data = await res.json();

  renderTable(data.docs);
  renderPager(data.page, data.total);
}

// === Fetch global statistics ===
async function fetchStats() {
  const res = await fetch("/agg/stats");
  const stats = await res.json();
  const el = document.getElementById("stats");
  if (!stats.totalReviews) {
    el.textContent = "No stats available.";
    return;
  }
  el.innerHTML = `
    <strong>${stats.totalReviews}</strong> total reviews |
    <strong>Average rating:</strong> ${stats.avgRating} ⭐ |
    <strong>Verified purchases:</strong> ${stats.verifiedPercent}%`;
}

// === Render table ===
function renderTable(items) {
  const table = document.getElementById("reviewsTable");
  if (!items || !items.length) {
    table.innerHTML = "<tr><td>No data found</td></tr>";
    return;
  }

  const headers = `
    <tr>
      <th>Title</th>
      <th>Text</th>
      <th>Rating</th>
      <th>Product</th>
      <th>User ID</th>
      <th>Verified</th>
      <th>Timestamp</th>
    </tr>`;

  const rows = items
    .map((r) => {
      const asin = r.asin || "";
      const productUrl = asin ? `https://www.amazon.com/dp/${asin}` : "#";

      const productCell = asin
        ? `<a href="${productUrl}" target="_blank">${asin}
           </a>`
        : "";

      return `
        <tr>
          <td>${r.title || ""}</td>
          <td>${r.text?.slice(0, 150) || ""}</td>
          <td>${r.rating ?? ""}</td>
          <td>${productCell}</td>
          <td>${r.user_id || ""}</td>
          <td>${r.verified_purchase ? "✅" : "❌"}</td>
          <td>${
            r.timestamp ? new Date(r.timestamp).toLocaleDateString("en-GB") : ""
          }</td>
        </tr>`;
    })
    .join("");

  table.innerHTML = headers + rows;
}

// === Pagination controls ===
function renderPager(currentPage, totalItems) {
  const totalPages = Math.max(1, Math.ceil(totalItems / LIMIT));
  const container = document.getElementById("reviewsPager");
  container.innerHTML = `
    <div>
      <button ${currentPage <= 1 ? "disabled" : ""} id="prevBtn">Prev</button>
      <span>Page ${currentPage} / ${totalPages}</span>
      <button ${
        currentPage >= totalPages ? "disabled" : ""
      } id="nextBtn">Next</button>
    </div>`;

  document.getElementById("prevBtn").onclick = () => {
    if (currentPage > 1) {
      page--;
      searchAndFetch();
    }
  };
  document.getElementById("nextBtn").onclick = () => {
    if (currentPage < totalPages) {
      page++;
      searchAndFetch();
    }
  };
}

// === Search handler ===
function searchAndFetch() {
  const query = document.getElementById("searchInput").value.trim();
  const minRating = document.getElementById("minRatingInput").value.trim();
  fetchReviews(page, query, minRating);
}

// === Initialize ===
document.getElementById("searchBtn").addEventListener("click", () => {
  page = 1;
  searchAndFetch();
});

// === Charts ===

async function drawCharts() {
  await drawRatingChart();
  await drawTimeChart();
}

async function drawRatingChart() {
  const res = await fetch("/agg/ratings-distribution");
  const data = await res.json();

  const labels = data.map((d) => d._id);
  const counts = data.map((d) => d.count);

  const ctx = document.getElementById("ratingChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Number of Reviews per Rating",
          data: counts,
          backgroundColor: "#a78bfa",
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Ratings Distribution (1–5 Stars)",
          color: "#fff",
        },
        legend: { display: false },
      },
      scales: {
        x: { ticks: { color: "#ccc" } },
        y: { ticks: { color: "#ccc" } },
      },
    },
  });
}

async function drawTimeChart() {
  const res = await fetch("/agg/reviews-per-year");
  const data = await res.json();

  const labels = data.map((d) => d._id);
  const counts = data.map((d) => d.count);

  const ctx = document.getElementById("timeChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Reviews per Year",
          data: counts,
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139, 92, 246, 0.3)",
          fill: true,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Review Activity Over Time",
          color: "#fff",
        },
        legend: { display: false },
      },
      scales: {
        x: { ticks: { color: "#ccc" } },
        y: { ticks: { color: "#ccc" } },
      },
    },
  });
}

// Run charts after load
drawCharts();

fetchReviews();
fetchStats();
