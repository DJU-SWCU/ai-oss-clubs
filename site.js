"use strict";
document.documentElement.classList.add("js");
const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector("#main-nav");
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  nav.classList.toggle("is-open", open);
});
nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  menuButton.setAttribute("aria-expanded", "false"); nav.classList.remove("is-open");
}));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
    menuButton.click(); menuButton.focus();
  }
});
const queryInput = document.querySelector("#search");
const yearSelect = document.querySelector("#year");
const categorySelect = document.querySelector("#category");
const results = document.querySelector("#results");
const meta = document.querySelector("#result-count");
const sourceLink = document.querySelector("#source-list");
const kind = document.body.dataset.kind;
let data = null;
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text != null) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : null; }
  catch { return null; }
}
function link(text, url, className) {
  const href = safeUrl(url);
  if (!href) return null;
  const element = node("a", text, className); element.href = href; return element;
}
function empty(title, description, actionText, actionUrl) {
  const block = node("div", null, "empty");
  const symbol = node("span", null, "empty-symbol"); symbol.setAttribute("aria-hidden", "true");
  symbol.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7h7l2 2h9v10H3z"/><path d="M3 7V5h7l2 2h8v2"/></svg>';
  block.append(symbol, node("h3", title), node("p", description));
  const action = link(actionText, actionUrl, "text-link"); if (action) block.append(action);
  return block;
}
function render() {
  if (!data) return;
  const query = queryInput.value.trim().toLocaleLowerCase("ko");
  const items = data.items.filter(item =>
    String(item.year) === yearSelect.value &&
    (!categorySelect.value || item.category === categorySelect.value) &&
    (!query || [item.title, item.summary, item.category, ...(item.tags || [])].join(" ").toLocaleLowerCase("ko").includes(query))
  );
  results.replaceChildren();
  const params = new URLSearchParams();
  if (queryInput.value.trim()) params.set("q", queryInput.value.trim());
  if (yearSelect.value !== String(data.default_year)) params.set("year", yearSelect.value);
  if (categorySelect.value) params.set("category", categorySelect.value);
  history.replaceState(null, "", location.pathname + (params.size ? "?" + params.toString() : "") + location.hash);
  if (!data.items.length) {
    meta.textContent = yearSelect.value + "년 · 공개 목록 등록 준비";
    results.append(empty(kind === "clubs" ? "동아리 소개와 프로젝트를 준비하고 있습니다" : "공개할 캡스톤 프로젝트를 준비하고 있습니다", kind === "clubs" ? "공개 자료를 등록하면 동아리 소개와 프로젝트, 활동 기록을 이곳에서 찾아볼 수 있습니다." : "공개 자료를 등록하면 연도별 프로젝트와 코드·보고서·발표·시연 자료를 이곳에서 찾아볼 수 있습니다.", "GitHub의 연도별 목록 보기 ↗", data.source_list_url));
    return;
  }
  meta.textContent = yearSelect.value + "년 · 검색 결과 " + items.length + "건";
  if (!items.length) {
    results.append(empty("검색 결과가 없습니다", "검색어 또는 분야를 바꾸거나 초기화 버튼을 눌러 전체 목록을 확인해 주세요.", "GitHub의 연도별 목록 보기 ↗", data.source_list_url)); return;
  }
  const grid = node("div", null, "records");
  for (const item of items) {
    const article = node("article", null, "record");
    article.append(node("div", item.year + " · " + (item.category || "프로젝트"), "record-meta"));
    const heading = node("h3"); heading.append(link(item.title, item.profile_url) || node("span", item.title)); article.append(heading);
    article.append(node("p", item.summary));
    const tags = node("div", null, "record-tags"); for (const tag of item.tags || []) tags.append(node("span", tag, "tag")); article.append(tags);
    const links = node("div", null, "record-links");
    const targets = kind === "clubs" ? [["소개", item.profile_url], ["프로젝트", item.repository_url], ["활동·성과", item.outcomes_url]] : [["소개", item.profile_url], ["코드", item.code_url], ["보고서", item.report_url], ["발표", item.slides_url], ["시연", item.demo_url]];
    for (const [label, url] of targets) { const anchor = link(label + " ↗", url); if (anchor) links.append(anchor); }
    if (links.children.length) article.append(links); grid.append(article);
  }
  results.append(grid);
}
async function load() {
  meta.textContent = "공개 목록을 불러오는 중입니다";
  try {
    const response = await fetch("./site-data.json", {cache:"no-cache"});
    if (!response.ok) throw new Error("목록 응답 오류");
    const candidate = await response.json();
    if (!Array.isArray(candidate.items) || !Array.isArray(candidate.years) || !candidate.years.length) throw new Error("목록 형식 오류");
    data = candidate;
    const params = new URLSearchParams(location.search);
    yearSelect.replaceChildren();
    for (const year of data.years) { const option = node("option", year + "년"); option.value = String(year); yearSelect.append(option); }
    const requestedYear = params.get("year") || String(data.default_year);
    yearSelect.value = data.years.map(String).includes(requestedYear) ? requestedYear : String(data.default_year);
    categorySelect.replaceChildren(); const all = node("option", "전체 분야"); all.value = ""; categorySelect.append(all);
    const categories = [...new Set(data.items.map(item => item.category).filter(Boolean))].sort();
    for (const category of categories) { const option = node("option", category); option.value = category; categorySelect.append(option); }
    if (categories.includes(params.get("category"))) categorySelect.value = params.get("category");
    queryInput.value = params.get("q") || "";
    const source = safeUrl(data.source_list_url); if (source) sourceLink.href = source;
    render();
  } catch (error) {
    meta.textContent = "목록을 불러오지 못했습니다";
    const block = empty("목록을 다시 불러와 주세요", "일시적으로 자료를 불러오지 못했습니다. 다시 시도하거나 GitHub의 원본 목록을 확인해 주세요.", "GitHub 원본 목록 보기 ↗", sourceLink.href);
    const retry = node("button", "다시 불러오기", "button secondary"); retry.type = "button"; retry.addEventListener("click", load); block.append(node("br"), retry); results.replaceChildren(block);
    console.error("공개 목록 로드 실패:", error.message);
  }
}
queryInput.addEventListener("input", render); yearSelect.addEventListener("change", render); categorySelect.addEventListener("change", render);
document.querySelector("#reset").addEventListener("click", () => { queryInput.value=""; categorySelect.value=""; if(data) yearSelect.value=String(data.default_year); render(); queryInput.focus(); });
load();
