const client = new Appwrite.Client()
  .setEndpoint('https://daxsh.dev/v1')
  .setProject('6a198260002a89a80145');      

const databases = new Appwrite.Databases(client);
const storage = new Appwrite.Storage(client);

window.BLOG_CONFIG = {
  endpoint: 'https://daxsh.dev/v1', 
  projectId: '6a198260002a89a80145',
  databaseId: '6a1a5d9f0004fb94b4d3',
  collectionId: 'posts',
  bucketId: '6a1a6a56000a2f8ef36f'
};

window.appwriteClient = client;
window.appwriteDatabases = databases;
window.appwriteStorage = storage;
// config.js: keep this file only for Appwrite client + config export