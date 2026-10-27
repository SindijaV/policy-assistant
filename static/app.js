const FINAL_EVALUATION={"date":"2026-10-27","question_count":300,"breakdown":{"Direct":98,"Paraphrased":98,"Missing information":98,"Unrelated":6},"initial":{"rules":{"tests":300,"correct":141,"citations":156,"citation_tests":294,"unsupported":0,"missing_handled":0,"missing_tests":98,"unrelated_handled":6,"unrelated_tests":6,"mean_ms":0.681,"mean_llm_tokens":0,"mean_embedding_tokens":0},"llm":{"tests":300,"correct":298,"citations":294,"citation_tests":294,"unsupported":1,"missing_handled":98,"missing_tests":98,"unrelated_handled":6,"unrelated_tests":6,"mean_ms":1428.694,"mean_llm_tokens":3729.39,"mean_embedding_tokens":0},"vector":{"tests":300,"correct":300,"citations":294,"citation_tests":294,"unsupported":0,"missing_handled":98,"missing_tests":98,"unrelated_handled":6,"unrelated_tests":6,"mean_ms":1694.456,"mean_llm_tokens":361.51,"mean_embedding_tokens":11.44}},"rules_retest":{"tests":300,"correct":240,"citations":234,"citation_tests":294,"unsupported":0,"missing_handled":98,"missing_tests":98,"unrelated_handled":6,"unrelated_tests":6,"mean_ms":0.676,"mean_llm_tokens":0,"mean_embedding_tokens":0},"repeat_checks":[{"id":40,"method":"llm","correct":true},{"id":269,"method":"llm","correct":true}],"one_time_index":{"model":"text-embedding-3-small","creation_tokens":2589,"creation_ms":3670.67,"created_at":"2026-10-27T13:00:53.724939+00:00"},"source_sha256":"41ac5ad00591849a07e5cfa120c6186799af7045e2622b4a90f806a9f9c66ff1","previous_rules_retest":{"tests":300,"correct":239,"citations":233,"citation_tests":294,"unsupported":0,"missing_handled":98,"missing_tests":98,"unrelated_handled":6,"unrelated_tests":6,"mean_ms":0.669,"mean_llm_tokens":0,"mean_embedding_tokens":0},"rules_retest_code_sha256":"fd0cd834b8429c1b2555ea7972d89b41ee4644ab19145be610dfdb9374bb11b0","rules_retest_review":"299 responses unchanged; question 128 newly correct and locally checked against CSV."};
import {parseCSV,searchPolicies,queryDetails,clarificationChoices,tokenMatches,policyConditions,policyAnswer,isWordSearch} from './search.mjs';
const form=document.querySelector('#search-form'),input=document.querySelector('#question'),status=document.querySelector('#status'),results=document.querySelector('#results'),submit=document.querySelector('#submit');
let policies=[],tests=[];
function element(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function highlight(text,terms,conditions=false){
  const container=document.createDocumentFragment(),spans=conditions?policyConditions(text):[];
  const edges=new Set([0,text.length]);
  for(const m of text.matchAll(/[a-z0-9]+/gi)){edges.add(m.index);edges.add(m.index+m[0].length);}
  for(const span of spans){edges.add(span.start);edges.add(span.end);}
  const sorted=[...edges].sort((a,b)=>a-b);
  for(let i=0;i<sorted.length-1;i++){
    const start=sorted[i],end=sorted[i+1],part=text.slice(start,end),matched=tokenMatches(part,terms),condition=spans.some(s=>start>=s.start&&end<=s.end);
    const node=element(matched?'mark':condition?'strong':'span',part);
    if(condition)node.classList.add('condition');container.append(node);
  }
  return container;
}
function renderMatch(match,details){
  const {policy,titleMatched,bodyMatched}=match;
  const article=document.createElement('article'),heading=element('h2');heading.append(highlight(policy.title,details.terms));
  const wording=element('p',undefined,'policy');wording.append(highlight(policy.policy_text,details.terms,true));
  article.append(heading,element('div',`${policy.department} · ${policy.category}`,'meta'),wording);
  const explanation=[];
  for(const m of details.mappings.filter(m=>m.to.split(' ').some(t=>match.matched.includes(t))))explanation.push(`Mapped “${m.from}” to “${m.to}”`);
  if(titleMatched.length)explanation.push(`Title matches: ${titleMatched.join(', ')}`);
  if(bodyMatched.length)explanation.push(`Policy text matches: ${bodyMatched.join(', ')}`);
  article.append(element('p',explanation.join('. ')+'.','explanation'));
  const conditions=policyConditions(policy.policy_text);
  if(conditions.length)article.append(element('p','Conditions and limits from the policy: '+conditions.map(c=>`“${c.text}”`).join('; ')+'.','condition-note'));
  return article;
}
function renderRules(question,target,selectedTitle=null){
  const results=target.body,status=target.status;
  if(!policies.length)return;
  const start=performance.now(),details=queryDetails(question,policies),choices=selectedTitle?[]:clarificationChoices(question,policies);
  let matches=searchPolicies(question,policies);
  if(selectedTitle)matches=searchPolicies(selectedTitle,policies).filter(m=>m.policy.title===selectedTitle);
  const elapsed=performance.now()-start;results.replaceChildren();
  status.textContent=`${choices.length?'Clarification needed':`${matches.length} matching ${matches.length===1?'policy':'policies'}`} · Search time: ${elapsed.toFixed(2)} ms · LLM tokens: 0`;
  if(details.corrections.length)results.append(element('p','Spelling correction: '+details.corrections.map(c=>`“${c.from}” → “${c.to}”`).join(', ')+'.','muted'));
  if(choices.length){
    results.append(element('h2','Which remote-work topic do you mean?'),element('p','Choose a topic to see its policy.'));
    const buttons=element('div',undefined,'choices');
    for(const choice of choices){const b=element('button',choice.label);b.type='button';b.addEventListener('click',()=>renderRules(question,target,choice.title));buttons.append(b);}
    results.append(buttons);return {answer:'Clarification requested: choose a remote-work topic.',sources:[],response_ms:elapsed,tokens:{total:0},embedding_tokens:0};
  }
  if(!matches.length){results.append(element('h2','No suitable policy match found.'),element('p','Try using a policy topic such as vacation, travel, or passwords. The database may not contain the information you need.'));return {answer:'No suitable policy match found.',sources:[],response_ms:elapsed,tokens:{total:0},embedding_tokens:0};}
  if(!selectedTitle&&matches.length>1&&isWordSearch(question,policies)){
    const message=matches.length>1?'Several policies match. Add more detail to narrow your search.':'One policy matches your search text. Read its original text below.';
    const panel=element('article',undefined,'answer-panel');
    panel.append(element('h2','Policy search results'),element('p',message));results.append(panel);
    const citations=element('section',undefined,'answer-sources');
    citations.append(element('h3','Matching policies','sources-heading'));
    for(const {policy} of matches){
      const source=element('div',undefined,'source-citation'),quote=element('blockquote');
      quote.textContent=policy.policy_text;
      source.append(element('h4',policy.title),element('div',`${policy.department} · ${policy.category}`,'meta'),quote,element('p','Original policy text · company_policies.csv','source-origin'));
      citations.append(source);
    }
    results.append(citations);
    return {answer:message,sources:matches.map(m=>m.policy),response_ms:elapsed,tokens:{total:0},embedding_tokens:0};
  }
  if(selectedTitle)results.append(element('p',`Selected topic: ${selectedTitle}.`,'muted'));

  const main=matches[0],policy=main.policy,ruleAnswer=policyAnswer(question,policy);
  const answerPanel=element('article',undefined,'answer-panel');
  answerPanel.append(element('h2','Policy answer'),element('p',ruleAnswer.answer,'ai-answer'),element('p','Original policy wording · Rules-based search','ai-note'));
  results.append(answerPanel);
  const citations=element('section',undefined,'answer-sources');citations.setAttribute('aria-label','Source of this answer');
  citations.append(element('h3','Source of this answer','sources-heading'));
  const source=element('div',undefined,'source-citation'),quote=element('blockquote');
  quote.textContent=policy.policy_text;
  source.append(element('h4',policy.title),element('div',`${policy.department} · ${policy.category}`,'meta'),quote,element('p','Original policy text · company_policies.csv','source-origin'));
  citations.append(source);results.append(citations);
  const selection=[];
  for(const mapping of details.mappings.filter(m=>m.to.split(' ').some(t=>main.matched.includes(t))))selection.push(`Mapped “${mapping.from}” to “${mapping.to}”`);
  if(main.titleMatched.length)selection.push('Title matches: '+main.titleMatched.join(', '));
  if(main.bodyMatched.length)selection.push('Policy text matches: '+main.bodyMatched.join(', '));
  addMethodOptions(results,{
    notes:ruleAnswer.missing_information|| (matches.length>1&&matches[0].score===matches[1].score?'Several policies have the same match score. Check the sources or add more detail to your question.':'This method quotes the top matching policy. It does not determine whether every requested detail is answered.'),
    selection:'Explicit word and phrase rules rank the policies. '+selection.join('. ')+'.',
    considered:matches.map(m=>({policy:m.policy,detail:'Word-match score: '+m.score})),
    context:'Top matching policies returned by the rules. Scores are not probabilities.'
  });
  return {answer:ruleAnswer.answer,missing_information:ruleAnswer.missing_information,sources:[policy],response_ms:elapsed,tokens:{total:0},embedding_tokens:0};
}
form.addEventListener('submit',event=>run(event));
document.querySelectorAll('.examples button').forEach(b=>b.addEventListener('click',()=>{input.value=b.textContent;run();}));
const testButton=document.querySelector('#run-tests'),testStatus=document.querySelector('#test-status'),testResults=document.querySelector('#test-results');
testButton.addEventListener('click',()=>{
  testResults.replaceChildren();let first=0,any=0,clarify=0;
  const table=element('table'),thead=element('thead'),head=element('tr');
  for(const title of ['Question / expected answer','Expected policy','Retrieved policies','Policy retrieval check','Time (ms)'])head.append(element('th',title));
  thead.append(head);table.append(thead);const body=element('tbody');
  for(const test of tests){
    const start=performance.now(),matches=searchPolicies(test.Question,policies),choices=clarificationChoices(test.Question,policies),elapsed=performance.now()-start;
    const found=matches.some(m=>m.policy.title===test['Supporting policy']),top=matches[0]?.policy.title===test['Supporting policy'];
    if(choices.length)clarify++;else{if(top)first++;if(found)any++;}
    const tr=element('tr'),q=element('td');q.append(element('strong',`${test['No.']}. ${test.Question}`),element('p',test['Expected answer']));
    const retrieved=element('td');
    if(choices.length)retrieved.textContent='Clarification requested';
    else if(!matches.length)retrieved.textContent='No match';
    else for(const m of matches)retrieved.append(element('strong',m.policy.title),element('p',m.policy.policy_text));
    tr.append(q,element('td',test['Supporting policy']),retrieved,element('td',choices.length?'Needs clarification':top?'Expected policy first':found?'Expected policy in results':'Expected policy not found'),element('td',elapsed.toFixed(2)));
    body.append(tr);
  }
  table.append(body);testResults.append(table);
  testStatus.textContent=`Rules-based search: expected policy first for ${first}/${tests.length}; included in results for ${any}/${tests.length}; clarification requested for ${clarify}/${tests.length}. LLM tokens: 0. This live table checks rules-based retrieval only. The completed three-method evaluation is shown in the recorded performance section. These checks measure retrieval, not unsupported-answer rates.`;
});
try{
  const response=await fetch('./company_policies.csv');if(!response.ok)throw new Error(`HTTP ${response.status}`);
  policies=parseCSV(await response.text());if(!policies.length)throw new Error('No policy records found');
  status.textContent=`${policies.length} policies ready. Enter a question to begin.`;submit.disabled=false;
  try{const r=await fetch('./policy_test_questions.csv', {cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);tests=parseCSV(await r.text(),false);if(!tests.length||!['Question','Expected answer','Supporting policy'].every(k=>k in tests[0]))throw new Error('Missing test columns');testButton.disabled=false;testStatus.textContent=`${tests.length} prepared questions ready — three per policy plus six unrelated questions. Run the checks to inspect policy retrieval.`;}
  catch(error){testStatus.textContent=`Could not load testing sheet: ${error.message}`;}
}catch(error){status.textContent=`Could not load policy data. Run this project through the local server described in README.md. (${error.message})`;}

let aiBusy=false;
async function runLLM(question,answerMethod,target){
  const results=target.body,status=target.status;
  status.textContent=answerMethod==='vector'?'Retrieving relevant policies…':'Reading all 98 policies…';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),75000);
  try{
    const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,method:answerMethod}),signal:controller.signal});
    if(r.status===501||r.status===404)throw Error('The backend is unavailable. Locally, start it with python3 app.py --port 8000 and open http://127.0.0.1:8000.');
    const data=await r.json();if(!r.ok)throw Error(data.error||'The AI request failed.');
    const count=v=>v===null||v===undefined?'not reported':v;
    status.textContent=`Response time: ${(data.response_ms/1000).toFixed(2)} s · LLM tokens: ${count(data.tokens.total)} · Input: ${count(data.tokens.input)} · Output: ${count(data.tokens.output)} · Thinking: ${count(data.tokens.thinking)} · Question embedding tokens: ${count(data.embedding_tokens)}`;
    const article=element('article',undefined,'answer-panel');article.append(element('h2','Policy answer'),element('p',data.answer,'ai-answer'));

    article.append(element('p',`${data.model} · ${data.policy_count} policies supplied · ${data.method}`,'ai-note'));
    results.append(article);
    if(!data.sources.length){const emptySource=element('section',undefined,'answer-sources');emptySource.setAttribute('aria-label','Source of this answer');emptySource.append(element('h3','Source of this answer','sources-heading'));const box=element('div',undefined,'source-citation source-empty');box.append(element('h4','No supporting policy identified'),element('p','The answer does not cite a policy from the supplied records.','muted'));emptySource.append(box);results.append(emptySource);}
    if(data.sources.length){
      const citations=element('section',undefined,'answer-sources');citations.setAttribute('aria-label','Sources of this answer');
      citations.append(element('h3','Source of this answer','sources-heading'));
      for(const source of data.sources){
        const sourceBox=element('div',undefined,'source-citation');
        sourceBox.append(element('h4',source.title),element('div',`${source.department} · ${source.category}`,'meta'),element('blockquote',source.policy_text),element('p','Original policy text · company_policies.csv','source-origin'));
        citations.append(sourceBox);
      }
      results.append(citations);
    }
    addMethodOptions(results,{
      notes:data.missing_information||'The model did not report missing information. Check the source text to verify the answer.',
      selection:answerMethod==='vector'?'The question is embedded and compared with the saved policy vectors. The three closest policies are supplied to the LLM. Retrieval time: '+data.retrieval_ms.toFixed(0)+' ms, including question embedding.':'All '+data.policy_count+' policies are supplied to the LLM. No search or vector filtering is applied before generation.',
      considered:answerMethod==='vector'?data.retrieved.map(r=>({policy:r.policy,detail:'Cosine similarity: '+r.similarity.toFixed(3)})):policies.map(policy=>({policy})),
      context:answerMethod==='vector'?'These policies were supplied to the LLM. Similarity is not answer confidence.':'The full policy dataset supplied to the LLM. These records are context, not all cited sources.'
    });
    return data;
  }catch(error){status.textContent='AI answer unavailable.';results.append(element('p',error.name==='AbortError'?'The request timed out. Please try again.':error.message,'notice'));}
  finally{clearTimeout(timer);}
}


const methodNames={rules:'Rules-based search',llm:'LLM without a vector index',vector:'LLM with a vector index'};
let history=[];
try{history=JSON.parse(localStorage.getItem('policy-comparisons-v1')||'[]');if(!Array.isArray(history))history=[];}catch{}
function saveHistory(){try{localStorage.setItem('policy-comparisons-v1',JSON.stringify(history));}catch{}}
function showHistory(){
 const area=document.querySelector('#comparison-history');area.replaceChildren();
 renderFinalEvaluation(area);
 area.append(element('h3','Your browser’s recorded usage'));
 if(!history.length){area.append(element('p','No comparisons recorded yet. Compare questions to collect results for all three methods.'));return;}
 const table=element('table'),head=element('tr');
 for(const text of ['Method','Completed requests','Distinct questions','Average response time (s)','Average LLM tokens / request','Average embedding tokens / request'])head.append(element('th',text));
 table.append(head);
 for(const [method,label] of Object.entries(methodNames)){
  const rows=history.filter(r=>r.method===method),reviewed=rows.filter(r=>r.correct!=='Not reviewed'),support=rows.filter(r=>r.unsupported!=='Not reviewed');
  const mean=key=>{const values=rows.map(r=>r[key]).filter(v=>typeof v==='number');return values.length?(values.reduce((a,b)=>a+b,0)/values.length).toFixed(key==='seconds'?3:1):'Not reported';};
  const tr=element('tr');for(const text of [label,String(rows.length),String(new Set(rows.map(r=>r.question.trim().toLowerCase())).size),mean('seconds'),mean('tokens'),mean('embedding')])tr.append(element('td',text));table.append(tr);
 }
 area.append(table);
 area.append(element('p','The browser history above measures exploratory usage; it is separate from the reviewed prepared-question evaluation.','muted'));
}
function record(question,method,data){
 if(!data)return;
 history.push({question,method,answer:data.answer,policies:data.sources.map(s=>s.title),seconds:data.response_ms/1000,tokens:data.tokens.total,embedding:data.embedding_tokens,correct:'Not reviewed',unsupported:'Not reviewed'});
 history=history.slice(-300);saveHistory();showHistory();
}
async function run(event){
 event?.preventDefault();if(aiBusy||!policies.length)return;
 const question=input.value.trim();if(!question){input.focus();return;}
 document.body.classList.add('has-results');
 const selected=document.querySelector('#run-mode').value;
 updateResultHeading(selected);
 const methods=selected==='all'?['rules','llm','vector']:[selected];
 document.querySelector('#run-mode').disabled=true;
 aiBusy=true;submit.disabled=true;input.disabled=true;
 const examples=[...document.querySelectorAll('.examples button')];examples.forEach(b=>b.disabled=true);
 results.replaceChildren();results.classList.toggle('single-method',selected!=='all');status.textContent=selected==='all'?'Comparing the same question across all three methods…':`Running ${methodNames[selected]}…`;
 const panels={};
 for(const key of methods){
  const label=methodNames[key];
  const panel=element('section',undefined,'method-result');panel.setAttribute('aria-label',label);
  const title=element('h3',label),info=element('p',key==='rules'?'Searching…':'Waiting…','method-status'),body=element('div');
  info.setAttribute('role','status');panel.append(title,info,body);results.append(panel);panels[key]={status:info,body};
 }
 try{
  if(methods.includes('rules')){const data=renderRules(question,panels.rules);record(question,'rules',data);}
  // Sequential provider calls preserve the backend's one-request-at-a-time limit.
  for(const method of methods.filter(m=>m!=='rules')){const data=await runLLM(question,method,panels[method]);record(question,method,data);}
  alignAnswerPanels();
  status.textContent=selected==='all'?'Comparison finished. Each method’s result or error is shown below.':'Finished. The selected method’s result or error is shown below.';
 }finally{aiBusy=false;submit.disabled=false;input.disabled=false;document.querySelector('#run-mode').disabled=false;examples.forEach(b=>b.disabled=false);}
}
showHistory();

document.querySelector('#run-mode').addEventListener('change',event=>{
 submit.textContent=event.target.value==='all'?'Compare all three methods':'Run selected method';
 updateResultHeading(event.target.value);
 results.replaceChildren();
 results.classList.toggle('single-method',event.target.value!=='all');
 const empty=element('div',undefined,'empty-state');
 empty.append(element('h3',event.target.value==='all'?'Your comparison will appear here.':'Your answer will appear here.'),element('p','Enter a question or choose an example to get started.'));
 results.append(empty);
 status.textContent=event.target.value==='all'?'Ready to compare all three methods.':`Ready to answer using ${methodNames[event.target.value]}.`;
});

function updateResultHeading(mode){
 document.querySelector('.results-heading').textContent=mode==='all'?'Method comparison':methodNames[mode]+' answer';
}
updateResultHeading(document.querySelector('#run-mode').value);

function alignAnswerPanels(){
 const panels=[...results.querySelectorAll('.answer-panel')];
 panels.forEach(p=>p.style.minHeight='');
 if(results.classList.contains('single-method')||panels.length<2)return;
 const height=Math.max(...panels.map(p=>p.getBoundingClientRect().height));
 panels.forEach(p=>p.style.minHeight=height+'px');
}
window.addEventListener('resize',alignAnswerPanels);

function addMethodOptions(target,{notes,selection,considered,context}){
 const group=element('div',undefined,'method-options');
 for(const [label,text] of [['Answer notes',notes],['How policies were selected',selection]]){
  const item=element('details');item.append(element('summary',label),element('p',text,'ai-note'));group.append(item);
 }
 const evidence=element('details');evidence.append(element('summary','Policies considered'),element('p',context,'ai-note'));
 for(const item of considered){const box=element('div',undefined,'considered-policy');box.append(element('h4',item.policy.title),element('p',item.policy.policy_text));if(item.detail)box.append(element('p',item.detail,'meta'));evidence.append(box);}
 group.append(evidence);target.append(group);
}

function renderFinalEvaluation(area){
 area.append(element('h3','Prepared-question evaluation · 300 questions'));
 area.append(element('p','98 direct, 98 paraphrased, 98 missing-detail and 6 unrelated questions. The current rules-based retest and original LLM runs are shown below; answers were checked locally against the policy CSV. Both LLM methods are unchanged. Earlier results are preserved in the testing files.'));
 const table=element('table'),header=element('tr');
 for(const label of ['Method','Correct answers','Expected policy cited','Unsupported answers','Missing details handled','Average time (s)','Average LLM tokens','Average embedding tokens'])header.append(element('th',label));
 table.append(header);
 for(const [method,data] of Object.entries({...FINAL_EVALUATION.initial,rules:FINAL_EVALUATION.rules_retest})){
  const row=element('tr');
  const percentage=(n,d)=>(100*n/d).toFixed(1)+'%';
  for(const text of [methodNames[method],`${data.correct}/300 (${percentage(data.correct,300)})`,`${data.citations}/294`,`${data.unsupported}/300 (${percentage(data.unsupported,300)})`,`${data.missing_handled}/98`,(data.mean_ms/1000).toFixed(3),data.mean_llm_tokens.toFixed(1),data.mean_embedding_tokens.toFixed(1)])row.append(element('td',text));
  table.append(row);
 }
 area.append(table);
 area.append(element('p',`Current rules-based retest: ${FINAL_EVALUATION.rules_retest.correct}/300 correct; ${FINAL_EVALUATION.rules_retest.citations}/294 expected policies cited; 98/98 missing details acknowledged. Earlier rules scores were 141/300 initially and 239/300 after the first fixes. The latest word-search changes corrected one additional probation question. This test set informed earlier fixes, so the retest is a development-set result. The two full-dataset LLM errors answered correctly on repeats; their initial failures remain in the table.`));
 area.append(element('p',`One-time index creation: ${FINAL_EVALUATION.one_time_index.creation_tokens} embedding tokens, ${(FINAL_EVALUATION.one_time_index.creation_ms/1000).toFixed(2)} seconds. Excluded from per-question averages.`, 'muted'));
 area.append(element('p','Limits: one initial run per question; four concurrent backend workers; times include retrieval and provider calls but exclude browser rendering and queue wait. Rules timing uses Node.js. Missing-detail questions cover seven repeated administrative categories. Scores are locally reviewed observations, not guaranteed future accuracy. Detailed answers, review notes and retests are saved in testing/.','muted'));
}
