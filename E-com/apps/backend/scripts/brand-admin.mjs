/**
 * Post-build branding: re-skin the Medusa admin as "Flowcase".
 * - title → Flowcase
 * - real favicon (copied from the storefront public/fevicon.png)
 * - runtime script rewrites SPA titles ("Orders - Medusa" → "Orders - Flowcase")
 *   and hides any stray medusajs.com / Discord / GitHub links.
 * Runs automatically after `medusa build` (see package.json).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const targets = [
  path.join(root, ".medusa/server/public/admin/index.html"),
  path.join(root, ".medusa/client/index.html"),
]

const faviconSrc = path.join(root, "../storefront/public/fevicon.png")
const faviconDest = [
  path.join(root, ".medusa/server/public/admin/fevicon.png"),
  path.join(root, ".medusa/client/fevicon.png"),
]

const BRAND_SCRIPT = `<script>
(function(){
  var RE=/\\bMedusa\\b/g;
  var clean=function(t){return (t||"").replace(RE,"Flowcase")};
  var set=function(){var n=clean(document.title);if(n!==document.title)document.title=n};
  set();
  var swapLogo=function(n){
    if(!n||n.nodeType!==1||!n.querySelectorAll)return;
    var list=[];
    if(n.matches&&n.matches('svg[viewBox="0 0 400 400"]'))list.push(n);
    var found=n.querySelectorAll('svg[viewBox="0 0 400 400"]');
    for(var k=0;k<found.length;k++)list.push(found[k]);
    for(var i=0;i<list.length;i++){
      var s=list[i];
      if(s.getAttribute('data-fc-logo'))continue;
      s.setAttribute('data-fc-logo','1');
      var img=document.createElement('img');
      img.src='./fevicon.png';
      img.alt='Flowcase';
      img.setAttribute('data-fc-logo','1');
      img.style.cssText='display:block;width:104px;height:104px;object-fit:contain';
      img.onerror=function(){this.style.display='none'};
      var chip=s.parentElement&&s.parentElement.parentElement;
      var isChip=chip&&String(chip.className||"").indexOf("size-12")!==-1;
      var target=isChip?chip:s;
      if(target.parentNode)target.parentNode.replaceChild(img,target);
    }
  };
  var scrubText=function(n){
    if(!n)return;
    if(n.nodeType===3){var v=n.nodeValue;if(v&&v.indexOf("Medusa")!==-1)n.nodeValue=clean(v);return}
    if(n.nodeType===1){
      if(n.tagName==="A"&&n.href&&(n.href.indexOf("medusajs")!==-1||n.href.indexOf("discord.gg/medusajs")!==-1))n.style.display="none";
      var w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT),t;
      while((t=w.nextNode())){var tv=t.nodeValue;if(tv&&tv.indexOf("Medusa")!==-1)t.nodeValue=clean(tv)}
      swapLogo(n);
    }
  };
  var obs=new MutationObserver(function(ms){
    set();
    for(var i=0;i<ms.length;i++){
      var m=ms[i];
      if(m.type==="characterData"){
        var v=m.target.nodeValue;
        if(v&&v.indexOf("Medusa")!==-1)m.target.nodeValue=clean(v);
      }else{
        for(var j=0;j<m.addedNodes.length;j++)scrubText(m.addedNodes[j]);
      }
    }
  });
  obs.observe(document.head,{childList:true,subtree:true,characterData:true});
  var start=function(){
    obs.observe(document.body,{childList:true,subtree:true,characterData:true});
    scrubText(document.body);
  };
  if(document.body)start();else document.addEventListener("DOMContentLoaded",start);
})();
</script>`

let patched = 0
for (const file of targets) {
  if (!fs.existsSync(file)) continue
  let html = fs.readFileSync(file, "utf8")

  if (!html.includes("<title>")) {
    html = html.replace("<head>", "<head>\n        <title>Flowcase Admin</title>")
  }
  html = html.replace(
    /<link rel="icon"[^>]*data-placeholder-favicon[^>]*>/,
    '<link rel="icon" type="image/png" href="./fevicon.png" />'
  )
  if (!html.includes("fevicon.png")) {
    html = html.replace(
      "</head>",
      '  <link rel="icon" type="image/png" href="./fevicon.png" />\n    </head>'
    )
  }
  if (!html.includes("var clean=function")) {
    html = html.replace("</head>", `  ${BRAND_SCRIPT}\n    </head>`)
  }

  fs.writeFileSync(file, html)
  patched++
  console.log(`[brand-admin] patched ${path.relative(root, file)}`)
}

if (fs.existsSync(faviconSrc)) {
  for (const dest of faviconDest) {
    if (fs.existsSync(path.dirname(dest))) {
      fs.copyFileSync(faviconSrc, dest)
      console.log(`[brand-admin] favicon → ${path.relative(root, dest)}`)
    }
  }
} else {
  console.warn("[brand-admin] storefront fevicon.png not found — skipping favicon copy")
}

// The admin dev server (vite plugin `writeStaticFiles`) rewrites
// .medusa/client/index.html from its own template on EVERY `medusa start`
// boot — patch that generator too, otherwise branding is wiped at startup.
// The template is an `outdent`-tagged literal: every line needs >=4 spaces
// indent (outdent slices the common indent off) and backslashes must be
// double-escaped so the runtime string keeps a literal `\b` regex boundary.
const bundler = path.join(
  root,
  "node_modules/@medusajs/admin-bundler/dist/index.js"
)
if (fs.existsSync(bundler)) {
  const src = fs.readFileSync(bundler, "utf8")
  const fnStart = src.indexOf("async function writeHTMLFile")
  if (fnStart !== -1) {
    const fnEnd = src.indexOf("var writeStaticFiles2", fnStart)
    if (fnEnd !== -1) {
      const indentedScript = BRAND_SCRIPT.split("\n")
        .map((l) => "            " + l.replace(/\\/g, "\\\\"))
        .join("\n")
      const newFn = `async function writeHTMLFile(outDir) {
  const html = import_outdent.default\`
    <!DOCTYPE html>
    <html>
        <head>
            <title>Flowcase Admin</title>
            <meta
                http-equiv="Content-Type"
                content="text/html; charset=UTF-8"
            />
            <meta
                name="viewport"
                content="width=device-width, initial-scale=1"
            />
            <link rel="icon" type="image/png" href="./fevicon.png" />
            ${indentedScript}
        </head>

        <body>
            <div id="medusa"></div>
            <script type="module" src="./entry.jsx"></script>
        </body>
    </html>
  \`;
  await (0, import_promises.writeFile)((0, import_node_path2.join(outDir, "index.html")), html);`
      fs.writeFileSync(bundler, src.slice(0, fnStart) + newFn + "\n}\n\n" + src.slice(fnEnd))
      console.log("[brand-admin] patched admin-bundler writeHTMLFile template")
    }
  } else {
    console.log("[brand-admin] writeHTMLFile not found — skipping bundler patch")
  }
}

console.log(`[brand-admin] done (${patched} html file(s))`)
