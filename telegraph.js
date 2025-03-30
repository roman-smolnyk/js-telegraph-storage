class TelegraphError extends Error {}
class TelAccessTokenInvalid extends TelegraphError {}
class TelContentTooBig extends TelegraphError {}
class TelTooManyRequests extends TelegraphError {}
class TelPathAlreadyExists extends TelegraphError {}
class TitleEmpty extends TelegraphError {}
class TelContentEmpty extends TelegraphError {}
class TelAuthorNameTooLong extends TelegraphError {}
class TelAuthorUrlInvalid extends TelegraphError {}
class TelInvalidRequest extends TelegraphError {}
class TelInternalError extends TelegraphError {}

parseTelegraphError = (errorText) => {
  switch (errorText) {
    case "ACCESS_TOKEN_INVALID":
      throw new TelAccessTokenInvalid(errorText);
      break;
    case "CONTENT_TOO_BIG":
      throw new TelContentTooBig(errorText);
      break;
    case "TOO_MANY_REQUESTS":
      throw new TelTooManyRequests(errorText);
      break;
    case "PATH_ALREADY_EXISTS":
      throw new TelPathAlreadyExists(errorText);
      break;
    case "TITLE_EMPTY":
      throw new TitleEmpty(errorText);
      break;
    case "CONTENT_EMPTY":
      throw new TelContentEmpty(errorText);
      break;
    case "AUTHOR_NAME_TOO_LONG":
      throw new TelAuthorNameTooLong(errorText);
      break;
    case "AUTHOR_URL_INVALID":
      throw new TelAuthorUrlInvalid(errorText);
      break;
    case "INVALID_REQUEST":
      throw new TelInvalidRequest(errorText);
      break;
    case "INTERNAL_ERROR":
      throw new TelInternalError(errorText);
      break;
    default:
      throw new TelegraphError(errorText);
  }
};

function domToNode(domNode) {
  if (domNode.nodeType == domNode.TEXT_NODE) {
    return domNode.data;
  }
  if (domNode.nodeType != domNode.ELEMENT_NODE) {
    return false;
  }
  var nodeElement = {};
  nodeElement.tag = domNode.tagName.toLowerCase();
  for (var i = 0; i < domNode.attributes.length; i++) {
    var attr = domNode.attributes[i];
    if (attr.name == "href" || attr.name == "src") {
      if (!nodeElement.attrs) {
        nodeElement.attrs = {};
      }
      nodeElement.attrs[attr.name] = attr.value;
    }
  }
  if (domNode.childNodes.length > 0) {
    nodeElement.children = [];
    for (var i = 0; i < domNode.childNodes.length; i++) {
      var child = domNode.childNodes[i];
      nodeElement.children.push(domToNode(child));
    }
  }
  return nodeElement;
}

function nodeToDom(node) {
  if (typeof node === "string" || node instanceof String) {
    return document.createTextNode(node);
  }
  if (node.tag) {
    var domNode = document.createElement(node.tag);
    if (node.attrs) {
      for (var name in node.attrs) {
        var value = node.attrs[name];
        domNode.setAttribute(name, value);
      }
    }
  } else {
    var domNode = document.createDocumentFragment();
  }
  if (node.children) {
    for (var i = 0; i < node.children.length; i++) {
      var child = node.children[i];
      domNode.appendChild(nodeToDom(child));
    }
  }
  return domNode;
}

/**
 * Telegraph API Client
 * @class
 * @see https://telegra.ph/api
 */
class Telegraph {
  /**
   * Create a Telegraph client instance
   * @param {string|null} [accessToken=null] - Access token for authenticated requests
   * @param {string} [domain="telegra.ph"] - Telegraph API domain (can use alternative mirrors like graph.org)
   */
  constructor(accessToken = null, domain = "telegra.ph") {
    this.accessToken = accessToken;
    this.domain = domain;
  }

  /**
   * Internal API request method
   * @private
   * @param {string} action - API method name
   * @param {Object} [json={}] - Request payload
   * @param {string} [path=""] - Additional path for the request
   * @returns {Promise<Object>} - API response
   * @throws {Error} - On API error or network failure
   */
  async _api(action, json = {}, path = "") {
    const url = `https://api.${this.domain}/${action}/${path}`.replace(/\/+$/, "");
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
      throw new Error(`Telegraph API request failed: ${error.message}`);
    }
  }

  /**
   * Create a new Telegraph account
   * @param {string} shortName - Account name (displayed in interface)
   * @param {string|null} [authorName=null] - Default author name
   * @param {string|null} [authorUrl=null] - Default author URL
   * @param {boolean} [replaceToken=true] - Whether to replace current access token
   * @returns {Promise<Object>} - Account info with access_token
   */
  async createAccount(shortName, authorName = null, authorUrl = null, replaceToken = true) {
    const data = { short_name: shortName };
    if (authorName) data.author_name = authorName;
    if (authorUrl) data.author_url = authorUrl;

    const result = await this._api("createAccount", data);

    if (replaceToken) this.accessToken = result.access_token;
    return result;
  }

  /**
   * Get information about a Telegraph account
   * @param {Array<string>|null} [fields=null] - Fields to return (short_name, author_name, author_url, auth_url, page_count)
   * @returns {Promise<Object>} - Account information
   */
  async getAccountInfo(fields = null) {
    const data = fields ? { fields: JSON.stringify(fields) } : {};
    return await this._api("getAccountInfo", data);
  }

  /**
   * Update information about a Telegraph account
   * @param {string|null} [shortName=null] - New short name
   * @param {string|null} [authorName=null] - New author name
   * @param {string|null} [authorUrl=null] - New author URL
   * @returns {Promise<Object>} - Updated account info
   */
  async editAccountInfo(shortName = null, authorName = null, authorUrl = null) {
    const data = {};
    if (shortName) data.short_name = shortName;
    if (authorName) data.author_name = authorName;
    if (authorUrl) data.author_url = authorUrl;

    return await this._api("editAccountInfo", data);
  }

  /**
   * Revoke access token and generate a new one
   * @returns {Promise<Object>} - New token info
   */
  async revokeAccessToken() {
    const result = await this._api("revokeAccessToken");
    this.accessToken = result.access_token;
    return result;
  }

  /**
   * Create a new Telegraph page
   * @param {string} title - Page title
   * @param {Array|string} content - Page content in Node format (or HTML string if contentIsHtml=true)
   * @param {string|null} [authorName=null] - Author name displayed below title
   * @param {string|null} [authorUrl=null] - Author URL
   * @param {boolean} [returnContent=false] - Return content in response
   * @param {boolean} [contentIsHtml=false] - Parse content as HTML
   * @returns {Promise<Object>} - Created page info
   */
  async createPage(title, content, authorName = null, authorUrl = null, returnContent = false, contentIsHtml = false) {
    if (contentIsHtml && typeof content === "string") {
      content = domToNode(content);
    }

    const data = {
      title,
      content: Array.isArray(content) ? content : JSON.parse(content),
    };
    if (authorName) data.author_name = authorName;
    if (authorUrl) data.author_url = authorUrl;
    if (returnContent) data.return_content = returnContent;

    return await this._api("createPage", data);
  }

  /**
   * Get a Telegraph page
   * @param {string} path - Path to the page (everything after telegra.ph/)
   * @param {boolean} [returnContent=true] - Return content in response
   * @param {boolean} [contentToHtml=false] - Convert content to HTML
   * @returns {Promise<Object>} - Page information
   */
  async getPage(path, returnContent = true, contentToHtml = false) {
    const data = returnContent ? { return_content: returnContent } : {};
    const result = await this._api("getPage", data, path);

    if (returnContent && contentToHtml) {
      result.content = nodeToDom(result.content);
    }
    return result;
  }

  /**
   * Edit an existing Telegraph page
   * @param {string} path - Path to the existing page
   * @param {string} title - New page title
   * @param {Array|string} content - New page content in Node format (or HTML string if contentIsHtml=true)
   * @param {string|null} [authorName=null] - New author name
   * @param {string|null} [authorUrl=null] - New author URL
   * @param {boolean} [returnContent=false] - Return content in response
   * @param {boolean} [contentIsHtml=false] - Parse content as HTML
   * @returns {Promise<Object>} - Updated page info
   */
  async editPage(
    path,
    title,
    content,
    authorName = null,
    authorUrl = null,
    returnContent = false,
    contentIsHtml = false
  ) {
    if (contentIsHtml && typeof content === "string") {
      content = this._htmlToNodes(content);
    }

    const data = {
      title,
      content: Array.isArray(content) ? content : JSON.parse(content),
    };
    if (authorName) data.author_name = authorName;
    if (authorUrl) data.author_url = authorUrl;
    if (returnContent) data.return_content = returnContent;

    return await this._api("editPage", data, path);
  }

  /**
   * Get a list of pages belonging to a Telegraph account
   * @param {number} [offset=0] - Offset of first page to return
   * @param {number} [limit=50] - Maximum number of pages to return (0-200)
   * @returns {Promise<Object>} - Pages list and total count
   */
  async getPageList(offset = 0, limit = 50) {
    return await this._api("getPageList", { offset, limit });
  }

  /**
   * Get the number of views for a Telegraph article
   * @param {string} path - Path to the page
   * @param {number|null} [year=null] - Year for statistics
   * @param {number|null} [month=null] - Month for statistics
   * @param {number|null} [day=null] - Day for statistics
   * @param {number|null} [hour=null] - Hour for statistics
   * @returns {Promise<Object>} - Views statistics
   */
  async getViews(path, year = null, month = null, day = null, hour = null) {
    const data = { path };
    if (year !== null) data.year = year;
    if (month !== null) data.month = month;
    if (day !== null) data.day = day;
    if (hour !== null) data.hour = hour;

    return await this._api("getViews", data, path);
  }

  /**
   * Upload a file to Telegraph (unofficial API)
   * @param {File|Blob|string} file - File to upload (Blob, File, or path)
   * @returns {Promise<Array<Object>>} - Array of uploaded files with src properties
   * @throws {Error} - On upload failure
   */
  async uploadFile(file) {
    const formData = new FormData();

    if (typeof file === "string") {
      // In browser environment, you would need to fetch the file first
      throw new Error("File path uploads are not supported in browser environment");
    } else {
      formData.append("file", file);
    }

    try {
      const response = await fetch(`https://${this.domain}/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (Array.isArray(result)) {
        const error = result[0]?.error;
        if (error) this._parseError(error);
        return result;
      } else if (result.error) {
        this._parseError(result.error);
      }

      return result;
    } catch (error) {
      throw new Error(`File upload failed: ${error.message}`);
    }
  }
}
