class Telegraph {
  constructor(accessToken = null, domain = "telegra.ph") {
    this.accessToken = accessToken;
    this.domain = domain;
  }

  _api = async (action, json = {}, path = "") => {
    const url = `https://api.${this.domain}/${action}/${path}`;
    if (this.accessToken && !json.access_token) {
      json.access_token = this.accessToken;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      const responseJson = await response.json();

      if (responseJson.ok) {
        return responseJson.result;
      } else {
        parseTelegraphError(responseJson.error);
      }
    } catch (error) {
      // console.error(error);
      throw error;
    }
  };

  createAccount = async (shortName, authorName = null, authorUrl = null, replaceToken = true) => {
    const data = { short_name: shortName };
    if (authorName) data.author_name = authorName;
    if (authorUrl) data.author_url = authorUrl;

    const result = await this._api("createAccount", data, "");

    if (replaceToken) this.accessToken = result.access_token;
    return result;
  };

  getAccountInfo = async (fields = null) => {
    /*
     List of account fields to return. Available fields:
     short_name, author_name, author_url, auth_url, page_count

     Default: ["short_name","author_name","author_url"]
    */
    const data = fields ? { fields: JSON.stringify(fields) } : {};
    return await this._api("getAccountInfo", data);
  };

  editAccountInfo = async (shortName = null, authorName = null, authorUrl = null) => {
    const data = {};
    if (shortName) data.short_name = shortName;
    if (authorName) data.author_name = authorName;
    if (authorUrl) data.author_url = authorUrl;

    return await this._api("editAccountInfo", data);
  };

  createPage = async (
    title,
    content,
    authorName = null,
    authorUrl = null,
    returnContent = false,
    contentIsHtml = false
  ) => {
    if (contentIsHtml) {
      content = domToNode(article).children;
    }

    const data = { title, content };
    if (authorName) data.author_name = authorName;
    if (authorUrl) data.author_url = authorUrl;
    if (returnContent) data.return_content = returnContent;

    return await this._api("createPage", data);
  };

  getPage = async (path, returnContent = true, contentToHtml = false) => {
    const data = returnContent ? { return_content: returnContent } : {};
    const result = await this._api("getPage", data, path);

    if (returnContent && contentToHtml) {
      result.content = nodeToDom(result.content);
    }
    return result;
  };

  rewokeAccessToken = async () => {
    const result = await this._api("revokeAccessToken");
    this.accessToken = result.access_token;
    return result;
  };
}

// ###########################################################################################################

class TelegraphStorage {
  constructor(accessToken = null) {
    this.telegraph = new Telegraph(accessToken);
    this.accessToken = this.telegraph.accessToken;
  }

  async list() {
    const result = await this.telegraph.getPageList();
    return result.pages.map((page) => page.title);
  }

  async get(name = null, path = null) {
    if (name) {
      const page = await this._getPageByTitle(name);
      if (!page) throw new Error(`Key with name '${name}' is missing`);
      path = page.path;
    }

    const result = await this.telegraph.getPage(path);
    return this._parseData(result.content);
  }

  async set(name, data) {
    let page = await this._getPageByTitle(name);
    if (!page) {
      page = await this._createAndInitPage(name);
    }
    const content = this._prepareData(data);
    return await this.telegraph.editPage(page.path, name, content);
  }

  _prepareData(data) {
    const encryptedData = JSON.stringify(data);
    if (encryptedData.length > 65500) {
      throw new Error(`Data is too long: ${encryptedData.length}`);
    }
    return [{ tag: "p", children: [encryptedData] }];
  }

  _parseData(content) {
    for (const entry of content) {
      const encryptedData = entry.children[0];
      return JSON.parse(encryptedData);
    }
  }

  async _getPageByTitle(title) {
    const result = await this.telegraph.getPageList();
    return result.pages.find((page) => page.title === title);
  }

  async _createAndInitPage(name, data = { Hello: "World" }) {
    const content = this._prepareData(data);
    const result = await this.telegraph.createPage(name, content);
    await this.telegraph.editPage(result.path, name, content);
    return result;
  }
}

// Usage
const storage = new TelegraphStorage();
storage.list().then(console.log);

// Example for setting data
const data = Array(2500).fill({ Hello: "World" });
storage.set("User Data 2", data);

// Example for getting data
storage.get("User Data 2").then(console.log);
