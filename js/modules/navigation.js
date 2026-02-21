window.showTab = function (tabName, element) {
  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.remove("active");
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  document.getElementById(tabName).classList.add("active");

  if (element) element.classList.add("active");

  if (tabName === "dashboard") {
    if (typeof atualizarDashboard === "function") {
      atualizarDashboard();
    }
  }
};