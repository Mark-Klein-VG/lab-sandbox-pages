(() => {
  "use strict";
  const liveCount = document.querySelectorAll('.lab-card[data-status="live"]').length;
  const countNode = document.querySelector("#prototype-count");
  if (countNode) countNode.textContent = String(liveCount);
  const yearNode = document.querySelector("#footer-year");
  if (yearNode) yearNode.textContent = String(new Date().getFullYear());
})();
