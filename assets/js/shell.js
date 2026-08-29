/** Return the theme currently painted by the browser. */
function resolvedTheme() {
  const explicitTheme = document.documentElement.dataset.theme;
  if (explicitTheme === 'light' || explicitTheme === 'dark') return explicitTheme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Keep the toggle label truthful for pointer and assistive-technology users. */
function updateThemeToggle() {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;
  const nextTheme = resolvedTheme() === 'dark' ? 'light' : 'dark';
  toggle.setAttribute('aria-label', `Switch to ${nextTheme} mode`);
}

/** Persist a deliberate day/night choice while retaining system mode initially. */
function initializeThemeToggle() {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const nextTheme = resolvedTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem('laboratory-theme', nextTheme);
    updateThemeToggle();
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeToggle);
  updateThemeToggle();
}

/** Set shared shell behaviour after the document exists. */
function initializeShell() {
  initializeThemeToggle();
  const year = document.getElementById('currentYear');
  if (year) year.textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', initializeShell);
