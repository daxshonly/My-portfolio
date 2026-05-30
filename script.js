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

// ── BLOG EDITOR: upload cover image and create `posts` document ──
const postSubmit = document.getElementById('postSubmit');
const postTitle = document.getElementById('postTitle');
const postContent = document.getElementById('postContent');
const postCover = document.getElementById('postCover');
const postPublish = document.getElementById('postPublish');
const postStatus = document.getElementById('postStatus');

if (postSubmit) {
  postSubmit.addEventListener('click', async (e) => {
    e.preventDefault();
    postSubmit.disabled = true;
    if (postStatus) postStatus.textContent = 'Saving...';

    try {
      let coverFileId = null;
      const file = postCover && postCover.files && postCover.files[0];
      if (file) {
        if (postStatus) postStatus.textContent = 'Uploading cover image...';
        const res = await window.AppwriteStorageHelper.uploadImage(file);
        coverFileId = res.$id;
      }

      const titleVal = (postTitle && postTitle.value) || 'Untitled';
      const contentVal = (postContent && postContent.value) || '';
      const slug = titleVal.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');

      const doc = {
        title: titleVal,
        slug,
        content: contentVal,
        excerpt: contentVal.slice(0, 200),
        authorId: '',
        published: !!(postPublish && postPublish.checked),
        publishedAt: (postPublish && postPublish.checked) ? new Date().toISOString() : null,
        coverFileId: coverFileId || null
      };

      if (postStatus) postStatus.textContent = 'Creating post...';
      const resDoc = await window.appwriteDatabases.createDocument(
        window.BLOG_CONFIG.databaseId,
        window.BLOG_CONFIG.collectionId,
        Appwrite.ID.unique(),
        doc
      );

      if (postStatus) postStatus.innerHTML = `Post created — ID: ${resDoc.$id}`;
      // clear form
      if (postTitle) postTitle.value = '';
      if (postContent) postContent.value = '';
      if (postCover) postCover.value = '';
      if (postPublish) postPublish.checked = false;
    } catch (err) {
      console.error('Create post error', err);
      if (postStatus) postStatus.textContent = 'Error: ' + (err.message || err);
    } finally {
      postSubmit.disabled = false;
    }
  });
}
