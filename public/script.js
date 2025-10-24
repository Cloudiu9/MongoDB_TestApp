// === Fetch and render data ===
async function fetchData() {
  const res = await fetch("/data");
  const data = await res.json();

  // Dynamic rendering for flexible NoSQL structure
  renderTable("productsTable", data.products); // no fixed columns
  renderTable("usersTable", data.users);
  renderTable(
    "reviewsTable",
    data.reviews.map((r) => ({
      user: r.userId?.name || "Unknown",
      product: r.productId?.name || "Unknown",
      rating: r.rating,
      comment: r.comment,
    }))
  );
}
// === Render any dataset dynamically ===
function renderTable(id, items, cols = null) {
  const table = document.getElementById(id);
  if (!items.length) {
    table.innerHTML = "<tr><td>No data</td></tr>";
    return;
  }

  // If no columns provided, infer all keys from data (including flexible ones)
  if (!cols) {
    cols = Array.from(new Set(items.flatMap((it) => Object.keys(it))));
  }

  const headers = "<tr>" + cols.map((c) => `<th>${c}</th>`).join("") + "</tr>";

  const rows = items
    .map((it) => {
      return (
        "<tr>" +
        cols
          .map((c) => {
            let val = it[c];
            if (val === null || val === undefined) val = "";
            if (typeof val === "object") val = JSON.stringify(val, null, 0);
            return `<td>${val}</td>`;
          })
          .join("") +
        "</tr>"
      );
    })
    .join("");

  table.innerHTML = headers + rows;
}

// === CSV Upload Handler ===
document.querySelectorAll(".csvForm").forEach((form) => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const type = form.getAttribute("data-type");
    const fileInput = form.querySelector("input[type=file]");
    const resultText = document.getElementById("uploadResult");
    const formData = new FormData();

    if (!fileInput.files.length) return alert("Select a .CSV file first.");
    formData.append("file", fileInput.files[0]);

    resultText.textContent = `Importing ${type}...`;

    try {
      const res = await fetch(`/upload-csv/${type}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      resultText.textContent = data.message || data.error;
      resultText.style.opacity = 1;

      // Wait a moment for MongoDB to finish indexing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Now fetch data sequentially
      await fetchData();
      await fetchAnalysis();

      resultText.style.opacity = 0.6;
    } catch {
      resultText.textContent = "Import failed.";
    }
  });
});

async function fetchAnalysis() {
  const res = await fetch("/analysis/critical-reviews");
  const data = await res.json();
  const el = document.getElementById("analysisResult");

  if (data.error) {
    el.textContent = "Error calculating analysis.";
    return;
  }

  if (data.total === 0) {
    el.textContent = "Niciun review critic care conține 'dar'.";
    return;
  }

  const reviewList = data.reviews
    .map((r) => `<li>"${r.comment}" <span style="opacity:0.7;"></span></li>`)
    .join("");

  el.innerHTML = `
<p style="font-size: 1.2rem; font-weight: 500; margin-top: -1.5rem">
  Review-uri critice (care conțin 'dar'): 
  <span style="font-size: 4rem; font-weight: 900; display: inline-block; margin-left: 1rem; background: linear-gradient(180deg, #3b82f6 0%, #1e40af 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${data.total}</span>
</p>
    <ol style="font-size: 1.2rem">${reviewList}</ol>
  `;
}

// === Clear Table Buttons ===
document.querySelectorAll(".clearBtn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const type = btn.getAttribute("data-type");
    if (!confirm(`Are you sure you want to delete all ${type}?`)) return;

    try {
      const res = await fetch(`/clear/${type}`, { method: "DELETE" });
      const data = await res.json();
      alert(data.message || data.error);
      fetchData();
      fetchAnalysis();
    } catch (err) {
      alert("Failed to clear data.");
      console.error(err);
    }
  });
});

// Load data when the page opens
fetchData();
fetchAnalysis();
