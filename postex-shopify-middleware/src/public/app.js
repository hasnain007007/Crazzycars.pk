document.addEventListener("DOMContentLoaded", () => {
  const checkAll = document.getElementById("check-all");
  if (checkAll) {
    checkAll.addEventListener("change", () => {
      document.querySelectorAll('input[name="ids"]').forEach((el) => {
        el.checked = checkAll.checked;
      });
    });
  }

  document.querySelectorAll(".copy-cn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const cn = btn.getAttribute("data-cn") || "";
      try {
        await navigator.clipboard.writeText(cn);
        btn.textContent = "Copied!";
        setTimeout(() => {
          btn.textContent = cn;
        }, 1200);
      } catch {
        /* ignore */
      }
    });
  });

  document.querySelectorAll(".toggle-log").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-target");
      const row = document.getElementById(id);
      if (!row) return;
      row.classList.toggle("hidden");
      btn.textContent = row.classList.contains("hidden") ? "Expand" : "Hide";
    });
  });
});
