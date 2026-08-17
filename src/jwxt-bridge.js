export const JWXT_ORIGIN = "https://jwxt.wmu.edu.cn";
export const JWXT_TIMETABLE_URL = `${JWXT_ORIGIN}/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html?gnmkdm=N2151&layout=default`;

const MESSAGE_TYPE = "wmu-timetable-pdf";
const PDF_SIGNATURE = "%PDF-";
const MAX_PDF_BYTES = 32 * 1024 * 1024;

function normalizedAppOrigin(value) {
  const url = new URL(value);
  if (url.origin === "null" || !["http:", "https:"].includes(url.protocol)) {
    throw new TypeError("课表应用必须通过 HTTP 或 HTTPS 打开");
  }
  return url.origin;
}

export function createJwxtBookmarklet(appOrigin) {
  const targetOrigin = JSON.stringify(normalizedAppOrigin(appOrigin));
  const code = `(async()=>{try{const ds=[];const walk=d=>{ds.push(d);for(const i of d.querySelectorAll('iframe'))try{i.contentDocument&&walk(i.contentDocument)}catch{}};walk(document);const d=ds.find(x=>x.getElementById('downForm'));const f=d?.getElementById('downForm');if(!f)throw new Error('当前页不是个人课表查询页，请从课表应用的“打开教务系统”进入');const u=new URL(f.action,d.location.href);if(u.origin!==location.origin||u.pathname!=='/jwglxt/kbcx/xskbcx_cxXsShcPdf.html')throw new Error('未找到可信的课表 PDF 导出地址');const r=await fetch(u,{method:'POST',credentials:'include',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams(new d.defaultView.FormData(f)).toString()});const b=await r.arrayBuffer();const h=new TextDecoder().decode(b.slice(0,5));if(!r.ok||h!=='%PDF-')throw new Error('教务系统没有返回有效的 PDF，请重新登录后再试');if(!window.opener||window.opener.closed)throw new Error('请先从课表应用的“打开教务系统”进入');const n=((f.elements.xnmc?.value||'课表')+'-'+(f.elements.xqmmc?.value||'')+'.pdf').replace(/[\\/:*?\"<>|]/g,'-');window.opener.postMessage({type:'${MESSAGE_TYPE}',filename:n,pdf:b},${targetOrigin},[b]);window.close()}catch(e){alert('发送失败：'+(e?.message||e))}})()`;
  return `javascript:${code}`;
}

export function readJwxtPdfMessage(event, expectedSource = null) {
  if (!event || event.origin !== JWXT_ORIGIN) return null;
  if (!expectedSource || event.source !== expectedSource) return null;

  const data = event.data;
  if (!data || data.type !== MESSAGE_TYPE || !(data.pdf instanceof ArrayBuffer)) return null;
  if (data.pdf.byteLength < PDF_SIGNATURE.length || data.pdf.byteLength > MAX_PDF_BYTES) return null;

  const signature = new TextDecoder().decode(new Uint8Array(data.pdf, 0, PDF_SIGNATURE.length));
  if (signature !== PDF_SIGNATURE) return null;

  const fallbackName = "wmu-timetable.pdf";
  const filename = String(data.filename || fallbackName)
    .replace(/[\\/:*?"<>|]/g, "-")
    .slice(0, 120);

  return {
    filename: filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`,
    bytes: new Uint8Array(data.pdf)
  };
}
