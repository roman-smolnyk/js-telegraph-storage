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

const parseTelegraphError = (errorText) => {
  switch (errorText) {
    case "ACCESS_TOKEN_INVALID":
      throw new TelAccessTokenInvalid(errorText);
    case "CONTENT_TOO_BIG":
      throw new TelContentTooBig(errorText);
    case "TOO_MANY_REQUESTS":
      throw new TelTooManyRequests(errorText);
    case "PATH_ALREADY_EXISTS":
      throw new TelPathAlreadyExists(errorText);
    case "TITLE_EMPTY":
      throw new TitleEmpty(errorText);
    case "CONTENT_EMPTY":
      throw new TelContentEmpty(errorText);
    case "AUTHOR_NAME_TOO_LONG":
      throw new TelAuthorNameTooLong(errorText);
    case "AUTHOR_URL_INVALID":
      throw new TelAuthorUrlInvalid(errorText);
    case "INVALID_REQUEST":
      throw new TelInvalidRequest(errorText);
    case "INTERNAL_ERROR":
      throw new TelInternalError(errorText);
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
  const nodeElement = {};
  nodeElement.tag = domNode.tagName.toLowerCase();
  for (let i = 0; i < domNode.attributes.length; i++) {
    const attr = domNode.attributes[i];
    if (attr.name == "href" || attr.name == "src") {
      if (!nodeElement.attrs) {
        nodeElement.attrs = {};
      }
      nodeElement.attrs[attr.name] = attr.value;
    }
  }
  if (domNode.childNodes.length > 0) {
    nodeElement.children = [];
    for (let i = 0; i < domNode.childNodes.length; i++) {
      const child = domNode.childNodes[i];
      nodeElement.children.push(domToNode(child));
    }
  }
  return nodeElement;
}

function nodeToDom(node) {
  if (typeof node === "string" || node instanceof String) {
    return document.createTextNode(node);
  }
  let domNode;
  if (node.tag) {
    domNode = document.createElement(node.tag);
    if (node.attrs) {
      for (const name in node.attrs) {
        const value = node.attrs[name];
        domNode.setAttribute(name, value);
      }
    }
  } else {
    domNode = document.createDocumentFragment();
  }
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      domNode.appendChild(nodeToDom(child));
    }
  }
  return domNode;
}

class Telegraph {
  constructor(accessToken = null, domain = "telegra.ph") {
    // console.trace("Telegraph.constructor()");
    this.accessToken = accessToken;
    this.domain = domain;
  }

  _api = async (action, params = {}, path = "") => {
    // console.trace("Telegraph._api()");
    if (this.accessToken && !params.access_token) {
      params.access_token = this.accessToken;
    }

    if (params.content) {
      params.content = JSON.stringify(params.content);
    }

    if (params.fields) {
      params.fields = JSON.stringify(params.fields);
    }

    // console.debug("Telegraph._api -> params", params);

    const query = new URLSearchParams();
    for (const key in params) {
      if (params[key] !== null && params[key] !== undefined) {
        query.append(key, params[key]);
      }
    }

    // console.debug("Telegraph._api -> query", query);

    const url = `https://api.${this.domain}/${action}/${path}?${query.toString()}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      // console.debug("Telegraph._api -> response", response);

      const responseJson = await response.json();

      // console.debug("Telegraph._api -> responseJson", responseJson);

      if (responseJson.ok) {
        return responseJson.result;
      } else {
        parseTelegraphError(responseJson.error);
      }
    } catch (error) {
      throw new Error(`Telegraph API request failed: ${error.message}`);
    }
  };

  createAccount = async (shortName, authorName = null, authorUrl = null, replaceToken = true) => {
    // console.trace("Telegraph.createAccount()");
    const params = { short_name: shortName };
    if (authorName) params.author_name = authorName;
    if (authorUrl) params.author_url = authorUrl;

    const result = await this._api("createAccount", params);

    if (replaceToken) this.accessToken = result.access_token;
    return result;
  };

  getAccountInfo = async (fields = null) => {
    // console.trace("Telegraph.getAccountInfo()");
    const params = fields ? { fields } : {};
    return await this._api("getAccountInfo", params);
  };

  editAccountInfo = async (shortName = null, authorName = null, authorUrl = null) => {
    // console.trace("Telegraph.editAccountInfo()");
    const params = {};
    if (shortName) params.short_name = shortName;
    if (authorName) params.author_name = authorName;
    if (authorUrl) params.author_url = authorUrl;

    return await this._api("editAccountInfo", params);
  };

  revokeAccessToken = async () => {
    // console.trace("Telegraph.revokeAccessToken()");
    const result = await this._api("revokeAccessToken");
    this.accessToken = result.access_token;
    return result;
  };

  createPage = async (
    title,
    content,
    authorName = null,
    authorUrl = null,
    returnContent = false,
    contentIsHtml = false
  ) => {
    // console.trace("Telegraph.createPage()");
    if (contentIsHtml && typeof content === "string") {
      content = domToNode(content);
    }

    const params = {
      title,
      content: Array.isArray(content) ? content : JSON.parse(content),
    };
    if (authorName) params.author_name = authorName;
    if (authorUrl) params.author_url = authorUrl;
    if (returnContent) params.return_content = returnContent;

    return await this._api("createPage", params);
  };

  getPage = async (path, returnContent = true, contentToHtml = false) => {
    // console.trace("Telegraph.getPage()");
    const params = returnContent ? { return_content: returnContent } : {};
    const result = await this._api("getPage", params, path);

    if (returnContent && contentToHtml) {
      result.content = nodeToDom(result.content);
    }
    return result;
  };

  editPage = async (
    path,
    title,
    content,
    authorName = null,
    authorUrl = null,
    returnContent = false,
    contentIsHtml = false
  ) => {
    // console.trace("Telegraph.editPage()");
    if (contentIsHtml && typeof content === "string") {
      content = domToNode(content);
    }

    const params = {
      title,
      content: Array.isArray(content) ? content : JSON.parse(content),
    };
    if (authorName) params.author_name = authorName;
    if (authorUrl) params.author_url = authorUrl;
    if (returnContent) params.return_content = returnContent;

    return await this._api("editPage", params, path);
  };

  getPageList = async (offset = 0, limit = 50) => {
    // console.trace("Telegraph.getPageList()");
    return await this._api("getPageList", { offset, limit });
  };

  getViews = async (path, year = null, month = null, day = null, hour = null) => {
    // console.trace("Telegraph.getViews()");
    const params = { path };
    if (year !== null) params.year = year;
    if (month !== null) params.month = month;
    if (day !== null) params.day = day;
    if (hour !== null) params.hour = hour;

    return await this._api("getViews", params, path);
  };

  uploadFile = async (file) => {
    // console.trace("Telegraph.uploadFile()");
    const formData = new FormData();

    if (typeof file === "string") {
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
        if (error) parseTelegraphError(error);
        return result;
      } else if (result.error) {
        parseTelegraphError(result.error);
      }

      return result;
    } catch (error) {
      throw new Error(`File upload failed: ${error.message}`);
    }
  };
}
