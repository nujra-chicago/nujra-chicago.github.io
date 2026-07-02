const SHEET_NAME = "ArticleStats";

function doGet(e) {
  const params = e.parameter || {};
  const callback = String(params.callback || "").replace(/[^\w$.]/g, "");
  const action = String(params.action || "get").toLowerCase();
  const key = normalizeKey_(params.key);
  const title = String(params.title || "");

  if (!callback) {
    return text_("Missing callback");
  }

  if (!key) {
    return jsonp_(callback, { ok: false, error: "Missing key" });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    const sheet = getSheet_();
    const row = findOrCreateRow_(sheet, key, title);
    const values = sheet.getRange(row, 1, 1, 6).getValues()[0];
    let views = Number(values[2] || 0);
    let likes = Number(values[3] || 0);

    if (action === "view") {
      views += 1;
    } else if (action === "like") {
      likes += 1;
    } else if (action === "unlike") {
      likes = Math.max(0, likes - 1);
    }

    sheet.getRange(row, 1, 1, 6).setValues([[
      key,
      title || values[1],
      views,
      likes,
      new Date(),
      action
    ]]);

    return jsonp_(callback, {
      ok: true,
      key,
      title: title || values[1],
      views,
      likes
    });
  } finally {
    lock.releaseLock();
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, 6).setValues([[
      "key",
      "title",
      "views",
      "likes",
      "updatedAt",
      "lastAction"
    ]]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function findOrCreateRow_(sheet, key, title) {
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const index = keys.indexOf(key);
    if (index !== -1) {
      return index + 2;
    }
  }

  const row = Math.max(lastRow + 1, 2);
  sheet.getRange(row, 1, 1, 6).setValues([[key, title, 0, 0, new Date(), "create"]]);
  return row;
}

function normalizeKey_(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/^\/+/, "")
    .replace(/[?#].*$/, "")
    .slice(0, 200);
}

function jsonp_(callback, payload) {
  return ContentService
    .createTextOutput(`${callback}(${JSON.stringify(payload)});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function text_(message) {
  return ContentService
    .createTextOutput(message)
    .setMimeType(ContentService.MimeType.TEXT);
}
