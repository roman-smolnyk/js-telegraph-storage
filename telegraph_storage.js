class KeyIsMissing extends Error {}
class DataIsTooLong extends Error {}

/**
 * Telegraph Storage Class
 * @class
 */
class TelegraphStorage {
  static DATA_LENGTH_LIMIT = 65500;

  /**
   * Create a TelegraphStorage instance
   * @param {string|null} [accessToken=null] - Telegraph access token
   * @param {BaseCipher} [cipher=new DumbCipher()] - Cipher instance for encryption
   */
  constructor(accessToken = null, cipher = new DumbCipher()) {
    const shortName = accessToken ? accessToken.slice(0, 8) : crypto.randomUUID().slice(0, 8);
    this.telegraph = new Telegraph(accessToken);
    this.accessToken = this.telegraph.accessToken;
    this.cipher = cipher;
  }

  /**
   * List all page titles in the account
   * @returns {Promise<Array<string>>}
   */
  async list() {
    const result = await this.telegraph.getPageList();
    return result.pages.map((page) => page.title);
  }

  /**
   * Get data from a page by name or path
   * @param {string|null} [name=null] - Page title
   * @param {string|null} [path=null] - Page path
   * @returns {Promise<Object>}
   */
  async get(name = null, path = null) {
    if (name) {
      const page = await this._getPageByTitle(name);
      if (!page) {
        throw new KeyIsMissing(`Key with name '${name}' is missing`);
      }
      path = page.path;
    }
    const result = await this.telegraph.getPage(path, true);
    const data = this._parseData(result.content);
    return data;
  }

  /**
   * Store data in a page
   * @param {string} name - Page title
   * @param {Object} data - Data to store
   * @returns {Promise<Object>}
   */
  async set(name, data) {
    let page = await this._getPageByTitle(name);
    if (!page) {
      page = await this._createAndInitPage(name);
    }
    const content = this._prepareData(data);
    const result = await this.telegraph.editPage(page.path, name, content);
    return result;
  }

  /**
   * Prepare data for storage
   * @private
   * @param {Object} data - Data to prepare
   * @returns {Array<Object>}
   */
  _prepareData(data) {
    const encryptedData = this.cipher.encrypt(JSON.stringify(data));
    if (encryptedData.length > TelegraphStorage.DATA_LENGTH_LIMIT) {
      throw new DataIsTooLong(`Length: ${encryptedData.length}`);
    }
    return [{ tag: "p", children: [encryptedData] }];
  }

  /**
   * Parse stored data
   * @private
   * @param {Array<Object>} content - Page content
   * @returns {Object}
   */
  _parseData(content) {
    let encryptedData;
    for (const entry of content) {
      if (entry.children && entry.children[0]) {
        encryptedData = entry.children[0];
        break;
      }
    }
    return JSON.parse(this.cipher.decrypt(encryptedData));
  }

  /**
   * Find page by title
   * @private
   * @param {string} title - Page title
   * @returns {Promise<Object|null>}
   */
  async _getPageByTitle(title) {
    const result = await this.telegraph.getPageList();
    return result.pages.find((page) => title === page.title) || null;
  }

  /**
   * Create and initialize a new page
   * @private
   * @param {string} name - Page title
   * @param {Object} [data={Hello: "World"}] - Initial data
   * @returns {Promise<Object>}
   */
  async _createAndInitPage(name, data = { Hello: "World" }) {
    const existingPage = await this._getPageByTitle(name);
    if (existingPage) {
      throw new Error(`Page with title '${name}' already exists`);
    }

    const content = this._prepareData(data);
    const result = await this.telegraph.createPage(crypto.randomUUID(), content);
    const updatedPage = await this.telegraph.editPage(result.path, name, content);
    return updatedPage;
  }
}

// Cipher Implementations

/**
 * Base Cipher Interface
 * @interface
 */
class BaseCipher {
  encrypt(data) {
    throw new Error("Not implemented");
  }

  decrypt(data) {
    throw new Error("Not implemented");
  }
}

// Example Usage
async function example() {
  // Create storage with no encryption
  const storage = new TelegraphStorage();

  // Create storage with Base64 encoding
  // const storage = new TelegraphStorage(null, new Base64Cipher());

  // Create storage with ChaCha20 encryption
  // const storage = new TelegraphStorage(null, new ChaCha20Cipher('my-secret-password'));

  // List existing pages
  const pages = await storage.list();
  console.log("Existing pages:", pages);

  // Store data
  await storage.set("test-data", { message: "Hello World", count: 42 });

  // Retrieve data
  const data = await storage.get("test-data");
  console.log("Retrieved data:", data);
}

example().catch(console.error);
