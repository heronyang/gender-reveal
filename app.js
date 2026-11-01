// 共用：讀取票數、畫出票數條與理由清單
const LABEL = { boy: "男寶", girl: "女寶" };

async function fetchVotes() {
  const res = await fetch(window.VOTE_API_URL, { method: "GET" });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "讀取失敗");
  return data.votes;
}

async function submitVote(vote) {
  // 不設定 Content-Type（預設 text/plain），避免瀏覽器 CORS 預檢
  const res = await fetch(window.VOTE_API_URL, { method: "POST", body: JSON.stringify(vote) });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "送出失敗");
  return data;
}

function countVotes(votes) {
  const c = { boy: 0, girl: 0 };
  votes.forEach(v => { if (c[v.guess] !== undefined) c[v.guess]++; });
  return c;
}

function renderTally(el, votes) {
  const c = countVotes(votes);
  const total = c.boy + c.girl;
  const pb = total ? Math.round((c.boy / total) * 100) : 50;
  el.innerHTML = `
    <div class="tally-labels"><span class="b">男寶 ${c.boy} 票</span><span class="g">${c.girl} 票 女寶</span></div>
    <div class="bar" role="img" aria-label="男寶 ${c.boy} 票，女寶 ${c.girl} 票">
      <div class="b" style="width:${pb}%"></div><div class="g" style="width:${100 - pb}%"></div>
    </div>
    <p class="muted">共 ${total} 人投票</p>`;
}

function fmtTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function renderReasons(ul, votes) {
  ul.replaceChildren();
  [...votes].sort((a, b) => (b.time > a.time ? 1 : -1)).forEach(v => {
    const li = document.createElement("li");
    li.className = v.guess;
    const head = document.createElement("div");
    const who = document.createElement("span"); who.className = "who"; who.textContent = v.name;
    const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = LABEL[v.guess] || v.guess;
    head.append(who, tag);
    const reason = document.createElement("p"); reason.className = "reason"; reason.textContent = v.reason;
    const when = document.createElement("p"); when.className = "when"; when.textContent = fmtTime(v.time);
    li.append(head, reason, when);
    ul.append(li);
  });
}
