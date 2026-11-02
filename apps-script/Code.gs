/**
 * 寶寶性別投票 — Google Apps Script 後端
 * 投票資料存在這個 Google 試算表的「投票」分頁。
 *
 * 部署方式：擴充功能 → Apps Script → 貼上本檔 → 部署 → 新增部署作業
 *   類型：網頁應用程式
 *   執行身分：我
 *   誰可以存取：所有人
 */

const SHEET_NAME = '投票';
const HEADERS = ['時間', '姓名', '猜測', '理由'];
const GUESS_LABEL = { boy: '男生', girl: '女生' };

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

// 避免試算表公式注入（例如名字以 = 開頭）
function safe_(s) {
  s = String(s == null ? '' : s).trim();
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function readVotes_() {
  const values = getSheet_().getDataRange().getValues();
  const votes = [];
  for (let i = 1; i < values.length; i++) {
    const [time, name, guess, reason] = values[i];
    if (!name) continue;
    votes.push({
      time: time instanceof Date ? time.toISOString() : String(time),
      name: String(name).replace(/^'/, ''),
      // 也接受舊版的「男寶／女寶」
      guess: /^男/.test(guess) ? 'boy' : /^女/.test(guess) ? 'girl' : String(guess),
      reason: String(reason).replace(/^'/, ''),
    });
  }
  return votes;
}

function doGet() {
  return json_({ ok: true, votes: readVotes_() });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const name = String(d.name || '').trim().slice(0, 40);
    const reason = String(d.reason || '').trim().slice(0, 500);
    const guess = GUESS_LABEL[d.guess];
    if (!name) return json_({ ok: false, error: '請填寫姓名' });
    if (!guess) return json_({ ok: false, error: '請選擇男生或女生' });
    if (!reason) return json_({ ok: false, error: '請寫下你的理由' });

    const sh = getSheet_();
    const names = sh.getDataRange().getValues().map(r => String(r[1]).replace(/^'/, '').trim());
    const row = [new Date(), safe_(name), guess, safe_(reason)];
    const idx = names.indexOf(name, 1);
    if (idx > 0) {
      // 同名者重新投票：覆蓋原本的票，一人只算一票
      sh.getRange(idx + 1, 1, 1, row.length).setValues([row]);
      return json_({ ok: true, updated: true });
    }
    sh.appendRow(row);
    return json_({ ok: true, updated: false });
  } catch (err) {
    return json_({ ok: false, error: '伺服器錯誤：' + err });
  } finally {
    lock.releaseLock();
  }
}
