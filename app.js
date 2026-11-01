/* PDF MCQ Quiz Maker. Extraction is heuristic: always review before starting. */
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const $=id=>document.getElementById(id);
let questions=[],answers={},current=0,locked={};
const panels=['uploadPanel','reviewPanel','quizPanel','resultPanel'];
function show(id){panels.forEach(p=>$(p).classList.toggle('hidden',p!==id));}
$('pdfFile').addEventListener('change',e=>{$('fileName').textContent=e.target.files[0]?.name||'No PDF selected';$('scanBtn').disabled=!e.target.files.length;});
$('scanBtn').onclick=scanPDF;
$('backBtn').onclick=()=>show('uploadPanel');
$('newPdfBtn').onclick=()=>{questions=[];answers={};locked={};$('pdfFile').value='';$('fileName').textContent='No PDF selected';$('scanBtn').disabled=true;show('uploadPanel');};
$('startBtn').onclick=()=>{saveReview();answers={};locked={};current=0;show('quizPanel');renderQuestion();};
$('prevBtn').onclick=()=>{if(current>0){current--;renderQuestion();}};
$('nextBtn').onclick=()=>{if(current<questions.length-1){current++;renderQuestion();}else showResults();};
$('restartBtn').onclick=()=>{current=0;renderQuestion();show('quizPanel');};
function normalize(s){return s.replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim();}
async function scanPDF(){
 const file=$('pdfFile').files[0];if(!file)return;
 $('scanBtn').disabled=true;$('progress').textContent='Reading PDF…';
 try{
  const data=new Uint8Array(await file.arrayBuffer()),pdf=await pdfjsLib.getDocument({data}).promise;
  let pages=[];
  for(let n=1;n<=pdf.numPages;n++){
   $('progress').textContent=`Reading page ${n} of ${pdf.numPages}…`;
   const page=await pdf.getPage(n),content=await page.getTextContent();
   let text=content.items.map(x=>x.str).join(' ');
   if(text.replace(/\s/g,'').length<30 && window.Tesseract){
    $('progress').textContent=`OCR on scanned page ${n} of ${pdf.numPages}…`;
    const viewport=page.getViewport({scale:1.8}),canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    const result=await Tesseract.recognize(canvas,'eng');text=result.data.text;
   }
   pages.push(text);
  }
  const all=pages.join('\n');questions=parseQuestions(all);
  if(!questions.length)throw new Error('No MCQs could be detected. The PDF may use an unsupported layout or handwritten content.');
  $('count').textContent=questions.length+' detected';
  buildReview();show('reviewPanel');$('progress').textContent='';
 }catch(err){$('progress').textContent='Could not process PDF: '+err.message;}
 finally{$('scanBtn').disabled=false;}
}
function parseQuestions(text){
 const lines=text.split(/\n/).map(normalize).filter(Boolean);
 // PDF text extraction may place multiple questions on one line; split at numbered question starts.
 let joined=lines.join('\n').replace(/(\s)(\d{1,3})[.)]\s+(?=[A-Z])/g,'\n$2. ');
 let blocks=joined.split(/\n(?=\d{1,3}[.)]\s)/);
 let qs=[];
 for(const block of blocks){
  const head=block.match(/^\s*(\d{1,3})[.)]\s*([\s\S]*)$/);if(!head)continue;
  const num=Number(head[1]);if(num>500)continue;
  let body=head[2].replace(/For practice only[\s\S]*/i,'').trim();
  const optRe=/(?:^|\s)([A-E])[.)]\s*/g, matches=[...body.matchAll(optRe)];
  if(matches.length<2)continue;
  const stem=normalize(body.slice(0,matches[0].index));
  const options=[];
  for(let i=0;i<matches.length;i++){
   let start=matches[i].index+matches[i][0].length,end=i+1<matches.length?matches[i+1].index:body.length;
   let val=normalize(body.slice(start,end));
   val=val.replace(/(?:Section B|Answer Key|Detailed Answers)[\s\S]*/i,'').trim();
   if(val)options.push({key:matches[i][1],text:val});
  }
  if(stem&&options.length>=2)qs.push({num,stem,options,correct:[]});
 }
 // Prefer first occurrence of each question number (the later detailed answer section is not parsed as MCQ).
 const unique=new Map();qs.forEach(q=>{if(!unique.has(q.num))unique.set(q.num,q);});
 qs=[...unique.values()].sort((a,b)=>a.num-b.num);
 const keyMap=parseAnswerKey(text);
 qs.forEach(q=>{q.correct=keyMap[q.num]||[];});
 return qs;
}
function parseAnswerKey(text){
 const map={};
 // Quick-key table pattern: question number followed by answer letter, including comma/slash multi-answer.
 const keySection=(text.split(/Detailed Answers with Reasons/i)[0]||text);
 const rows=keySection.match(/(?:Quick key:)([\s\S]*)/i);
 if(rows){
  const pairs=[...rows[1].matchAll(/\b(\d{1,3})\s*([A-E](?:\s*[,/&+]\s*[A-E])*)\b/g)];
  pairs.forEach(m=>{map[+m[1]]= [...m[2].matchAll(/[A-E]/g)].map(x=>x[0]);});
 }
 // Detailed answers can fill missing keys.
 for(const m of text.matchAll(/\b(\d{1,3})\.\s*Correct answer:\s*([A-E](?:\s*[,/&+]\s*[A-E])*)/gi)){
  if(!map[+m[1]])map[+m[1]]=[...m[2].toUpperCase().matchAll(/[A-E]/g)].map(x=>x[0]);
 }
 return map;
}
function buildReview(){
 const root=$('reviewList');root.innerHTML='';
 questions.forEach((q,i)=>{
  const card=document.createElement('div');card.className='qcard';
  card.innerHTML=`<strong>Question ${q.num}</strong><label>Question text</label><textarea data-stem="${i}"></textarea><div class="opts"></div><label>Correct answer(s) — tick all that apply</label><div class="key"></div>`;
  card.querySelector('textarea').value=q.stem;
  const opts=card.querySelector('.opts'),key=card.querySelector('.key');
  q.options.forEach((o,j)=>{
   const row=document.createElement('div');row.className='optrow';
   row.innerHTML=`<strong>${o.key}</strong><input aria-label="Option ${o.key} text"><span></span>`;
   row.querySelector('input').value=o.text;opts.appendChild(row);
   const k=document.createElement('label');k.className='row';k.innerHTML=`<input type="checkbox" value="${o.key}"> ${o.key}`;if(q.correct.includes(o.key))k.querySelector('input').checked=true;key.appendChild(k);
  });
  root.appendChild(card);
 });
}
function saveReview(){
 document.querySelectorAll('.qcard').forEach((card,i)=>{
  questions[i].stem=card.querySelector('textarea').value.trim();
  card.querySelectorAll('.optrow input').forEach((input,j)=>questions[i].options[j].text=input.value.trim());
  questions[i].correct=[...card.querySelectorAll('.key input:checked')].map(x=>x.value);
 });
}
function renderQuestion(){
 const q=questions[current];$('qProgress').textContent=`Question ${current+1} / ${questions.length}`;
 $('scoreLive').textContent=`Answered: ${Object.keys(answers).length}`;
 $('progressBar').style.width=((current+1)/questions.length*100)+'%';
 $('questionText').textContent=`${q.num}. ${q.stem}`;$('options').innerHTML='';$('feedback').textContent='';
 const selected=answers[current]||[];
 q.options.forEach(o=>{
  const b=document.createElement('button');b.className='option';b.type='button';
  const multi=q.correct.length>1;
  b.innerHTML=`<input type="${multi?'checkbox':'radio'}" ${selected.includes(o.key)?'checked':''} aria-label="${o.key}"><span><b>${o.key}.</b> ${escapeHtml(o.text)}</span>`;
  if(locked[current]){if(q.correct.includes(o.key))b.classList.add('correct');else if(selected.includes(o.key))b.classList.add('wrong');}
  b.onclick=()=>{if(locked[current])return;let next=[...selected];if(multi){next=next.includes(o.key)?next.filter(x=>x!==o.key):[...next,o.key];}else next=[o.key];answers[current]=next;renderQuestion();};
  $('options').appendChild(b);
 });
 if(selected.length&&!locked[current]){
  const check=document.createElement('button');check.textContent='Check answer';check.onclick=checkAnswer;$('options').appendChild(check);
 }
 if(locked[current]){
  const right=equalSet(selected,q.correct);$('feedback').textContent=right?'Correct!':'Incorrect. Correct answer: '+q.correct.join(', ');$('feedback').className=right?'ok':'bad';
 }
 $('prevBtn').disabled=current===0;$('nextBtn').textContent=current===questions.length-1?'Finish':'Next';
}
function checkAnswer(){const q=questions[current];if(!answers[current]?.length)return;locked[current]=true;renderQuestion();}
function equalSet(a,b){return a.length===b.length&&a.every(x=>b.includes(x));}
function showResults(){
 let correct=0,answered=0;questions.forEach((q,i)=>{if((answers[i]||[]).length)answered++;if(equalSet(answers[i]||[],q.correct)&&q.correct.length)correct++;});
 const pct=questions.length?Math.round(correct/questions.length*100):0;
 $('resultText').innerHTML=`<p><strong>${correct} / ${questions.length}</strong> correct (${pct}%)</p><p>Answered: ${answered} · Unanswered: ${questions.length-answered} · Incorrect: ${answered-correct}</p><p class="hint">Questions without an extracted answer key must be corrected in Review before a reliable quiz can be taken.</p>`;
 show('resultPanel');
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));