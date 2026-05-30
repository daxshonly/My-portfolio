// ── THEME TOGGLE ──
const toggle = document.getElementById('themeToggle');
let dark = document.documentElement.classList.contains('dark');

if (toggle) {
  toggle.textContent = dark ? '☀️' : '🌙';
}

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

// ── CONTACT FORM HANDLING ──
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  const emailInput = document.getElementById('contactEmail');
  const messageInput = document.getElementById('contactMessage');
  const statusEl = document.getElementById('contactStatus');

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    statusEl.className = 'contact-status';
    const email = (emailInput.value || '').trim();
    const message = (messageInput.value || '').trim();

    if (!validateEmail(email)) {
      statusEl.textContent = 'Please enter a valid email address.';
      statusEl.classList.add('error');
      return;
    }

    if (!message || message.length < 3) {
      statusEl.textContent = 'Please enter a short message.';
      statusEl.classList.add('error');
      return;
    }

    // Let the browser submit the form to formsubmit.co (action set in HTML)
    statusEl.textContent = 'Sending...';
    contactForm.submit();
  });
}
