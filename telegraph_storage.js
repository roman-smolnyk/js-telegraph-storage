class TelegraphStorageError extends Error {}
class KeyIsMissing extends TelegraphStorageError {}
class DataIsTooLong extends TelegraphStorageError {}

class TelegraphStorage {
  static DATA_LENGTH_LIMIT = 65500;

  constructor(accessToken = null, cipher = new DumbCipher()) {
    // console.trace("TelegraphStorage.constructor()");
    if (accessToken) {
      this.telegraph = new Telegraph(accessToken);
    } else {
      this.telegraph = new Telegraph();
    }
    this.cipher = cipher;
  }

  register = async () => {
    // console.trace("TelegraphStorage.register()");
    const result = await this.telegraph.createAccount(crypto.randomUUID().slice(0, 8));
    return result.access_token;
  };

  list = async () => {
    // console.trace("TelegraphStorage.list()");
    const result = await this.telegraph.getPageList();
    return result.pages.map((page) => page.title);
  };

  get = async (key = null, path = null) => {
    // path to the page of other user as it can be fetched without token
    // console.trace("TelegraphStorage.get()");
    if (key) {
      const page = await this._getPageByTitle(key);
      if (!page) {
        throw new KeyIsMissing(`Key with name '${key}' is missing`);
      }
      path = page.path;
    }
    const result = await this.telegraph.getPage(path, true);
    const data = await this._parseData(result.content);
    return data;
  };

  set = async (key, data) => {
    // console.trace("TelegraphStorage.set()");
    let page = await this._getPageByTitle(key);
    if (!page) {
      page = await this._createAndInitPage(key);
    }
    const content = await this._prepareData(data);
    const result = await this.telegraph.editPage(page.path, key, content);
    return result;
  };

  _prepareData = async (data) => {
    // console.trace("TelegraphStorage._prepareData()");
    const encryptedData = this.cipher.encrypt(JSON.stringify(data));
    if (encryptedData.length > TelegraphStorage.DATA_LENGTH_LIMIT) {
      throw new DataIsTooLong(`Length: ${encryptedData.length}`);
    }
    return [{ tag: "p", children: [encryptedData] }];
  };

  _parseData = async (content) => {
    // console.trace("TelegraphStorage._parseData()");
    let encryptedData;
    for (const entry of content) {
      if (entry.children && entry.children[0]) {
        encryptedData = entry.children[0];
        break;
      }
    }
    return JSON.parse(this.cipher.decrypt(encryptedData));
  };

  _getPageByTitle = async (title) => {
    // console.trace("TelegraphStorage._getPageByTitle()");
    const result = await this.telegraph.getPageList();
    return result.pages.find((page) => title === page.title) || null;
  };

  _createAndInitPage = async (name, data = { Hello: "World" }) => {
    // console.trace("TelegraphStorage._createAndInitPage()");
    // const existingPage = await this._getPageByTitle(name);
    // if (existingPage) {
    //   throw new Error(`Page with title '${name}' already exists`);
    // }

    const content = await this._prepareData(data);
    const result = await this.telegraph.createPage(crypto.randomUUID(), content);
    const updatedPage = await this.telegraph.editPage(result.path, name, content);
    return updatedPage;
  };
}

let storage = new TelegraphStorage();
await storage.register();
console.log(storage.telegraph.accessToken);
console.log(await storage.list());
