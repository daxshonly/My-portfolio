// ── THEME TOGGLE ──
const toggle = document.getElementById('themeToggle');
let dark = true;

toggle.addEventListener('click', () => {
  dark = !dark;
  document.documentElement.className = dark ? 'dark' : 'light';
  toggle.textContent = dark ? '🌙' : '☀️';
});

// ── SCROLL FADE-IN ──
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
