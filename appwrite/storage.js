// Small helper for uploading images to Appwrite Storage and building view URLs
(function () {
  async function uploadImage(file) {
    if (!file) throw new Error('No file provided');
    const bucketId = window.BLOG_CONFIG && window.BLOG_CONFIG.bucketId;
    if (!bucketId) throw new Error('BLOG_CONFIG.bucketId is not set');
    // create a unique id for the file
    const fileId = Appwrite.ID.unique();
    const res = await window.appwriteStorage.createFile(bucketId, fileId, file);
    return res; // contains $id, name, mimeType, etc.
  }

  function getViewUrl(fileId) {
    const cfg = window.BLOG_CONFIG || {};
    if (!cfg.endpoint || !cfg.projectId || !cfg.bucketId) {
      throw new Error('BLOG_CONFIG.endpoint, projectId or bucketId missing');
    }
    // endpoint should include /v1
    return `${cfg.endpoint.replace(/\/$/, '')}/storage/buckets/${cfg.bucketId}/files/${fileId}/view?project=${cfg.projectId}`;
  }

  window.AppwriteStorageHelper = {
    uploadImage,
    getViewUrl
  };
})();
