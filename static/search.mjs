// Deterministic CSV parsing, supporting commas, escaped quotes and quoted newlines.
export function parseCSV(text,requirePolicyColumns=true){
  const rows=[];let row=[],field='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(field);field='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(quoted)throw new Error('Unclosed quote in CSV.');
  row.push(field);if(row.some(v=>v.trim()))rows.push(row);
  const headers=rows.shift();
  if(!headers||(requirePolicyColumns&&!['title','department','policy_text','category'].every(h=>headers.includes(h))))throw new Error('CSV is missing required columns.');
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}
const stop=new Set('a an the i me my we our you your do does did can could may would should is are be to of for from in on at by with and or how what when who which many much often have has receive employees employee company policy policies please tell about it per job long few each soon need them hand any want into next they gives earn happens if factors determine'.split(' '));
const synonyms={days:'day',weeks:'week',months:'month',years:'year',holiday:'vacation',holidays:'vacation',vacations:'vacation',passwords:'password',receipts:'receipt',expenses:'expense',program:'software',programs:'software',apps:'software',clothes:'dress',clothing:'dress',illness:'sick',ill:'sick',annually:'annual',yearly:'annual',products:'product',reviews:'review',working:'work',remotely:'remote',installed:'install',installation:'install',monthly:'month',trip:'travel',rollover:'roll',wear:'dress',accounts:'account',vendors:'vendor',hires:'hire',tickets:'ticket',resolving:'resolve',resolved:'resolve',behave:'professionalism',interacting:'interaction',interactions:'interaction',customers:'customer',campaigns:'campaign',reviewed:'review',promotions:'promotion',incentives:'incentive',documentation:'document',documented:'document',assets:'asset',leaves:'exit',leaving:'exit'};
function words(text){return text.toLowerCase().match(/[a-z0-9]+/g)??[];}
function normalize(word){return synonyms[word]??word;}
// One insertion, deletion, substitution, or adjacent letter swap.
function oneEditAway(a,b){
  if(Math.abs(a.length-b.length)>1)return false;
  if(a.length===b.length){
    const different=[];
    for(let i=0;i<a.length;i++)if(a[i]!==b[i])different.push(i);
    if(different.length===1)return true;
    if(different.length!==2)return false;
    const [i,j]=different;
    return j===i+1&&a[i]===b[j]&&a[j]===b[i];
  }
  const shorter=a.length<b.length?a:b,longer=a.length<b.length?b:a;
  let i=0,j=0,skipped=false;
  while(i<shorter.length&&j<longer.length){
    if(shorter[i]===longer[j]){i++;j++;}
    else{if(skipped)return false;skipped=true;j++;}
  }
  return true;
}
export function correctQuestion(question,policies){
  const vocabulary=new Set([...stop,...Object.keys(synonyms),...words('home country another different overseas carry forward rollover working')]);
  for(const policy of policies)for(const word of words(policy.title+' '+policy.policy_text))vocabulary.add(word);
  const candidates=[...vocabulary].filter(w=>w.length>=5&&!stop.has(w));
  const corrections=[];
  const corrected=question.replace(/[a-z0-9]+/gi,original=>{
    const word=original.toLowerCase();
    if(word.length<5||vocabulary.has(word)||/\d/.test(word))return original;
    const matches=candidates.filter(candidate=>oneEditAway(word,candidate));
    // Several spellings with the same meaning (password/passwords) are safe.
    const meanings=[...new Set(matches.map(normalize))];
    if(meanings.length!==1)return original;
    const replacement=meanings[0];
    if(!corrections.some(c=>c.from===word))corrections.push({from:word,to:replacement});
    return replacement;
  });
  return {question:corrected,corrections};
}
export function queryDetails(question,policies){
  const spelling=correctQuestion(question,policies);
  let normalized=correctQuestion(question,policies).question.toLowerCase().replace(/\bit issues\b/g,' helpdesk issues ').replace(/another country|different country|overseas|outside (?:my|the) country/g,' abroad ').replace(/(?:work(?:ing)?|job) (?:from )?home/g,' remote work ').replace(/carry (?:over|forward)/g,' rollover ');
  const terms=[...new Set(words(normalized).map(normalize).filter(w=>!stop.has(w)))];
  const mappings=words(spelling.question).filter(w=>synonyms[w]&&synonyms[w]!==w).map(w=>({from:w,to:synonyms[w]}));
  if(/another country|different country|overseas|outside (?:my|the) country/i.test(spelling.question))mappings.push({from:'working in another country',to:'abroad'});
  if(/work(?:ing)? (?:from )?home/i.test(spelling.question))mappings.push({from:'working from home',to:'remote work'});
  return {terms,corrections:spelling.corrections,mappings};
}
// Case-insensitive text lookup, like Find; full questions retain ranked search.
function containsText(question,policy){
 const text=question.trim().toLowerCase();
 return Boolean(text)&&(policy.title.toLowerCase().includes(text)||policy.policy_text.toLowerCase().includes(text));
}
export function isWordSearch(question,policies){
  return Boolean(question.trim())&&(words(question).length===1||policies.some(policy=>containsText(question,policy))); 
}
export function searchPolicies(question,policies){
  const {terms}=queryDetails(question,policies);
  const wordSearch=isWordSearch(question,policies);
  if(!terms.length&&!wordSearch)return [];
  const literalSearch=policies.some(policy=>containsText(question,policy));
  return policies.map(policy=>{
    const title=new Set(words(policy.title).map(normalize));
    const body=new Set(words(policy.policy_text).map(normalize));
    const matched=terms.filter(t=>title.has(t)||body.has(t));
    const titleHits=terms.filter(t=>title.has(t)).length;
    // Generic words like "work" alone are insufficient. A title match or
    // two distinct body-word matches are required, with minimum query coverage.
    const specificTitleHit=terms.some(t=>title.has(t)&&!['work','day','days','approval','request'].includes(t));
    const coverage=terms.length?matched.length/terms.length:0;
    const exactTitle=question.toLowerCase().includes(policy.title.toLowerCase());
    const score=titleHits*4+matched.length+(exactTitle?100+policy.title.length:0);
    return {policy,score,coverage,matched,titleMatched:terms.filter(t=>title.has(t)),bodyMatched:terms.filter(t=>body.has(t)),eligible:wordSearch?(literalSearch?containsText(question,policy):matched.length>0):exactTitle||(specificTitleHit||matched.length>=2)&&(coverage>=0.5||terms.some(t=>title.has(t)&&['password','vacation','sick','warranty','abroad','software','travel'].includes(t)))};
  }).filter(r=>r.eligible).sort((a,b)=>b.score-a.score||b.coverage-a.coverage||a.policy.title.localeCompare(b.policy.title)).slice(0,wordSearch?policies.length:3);
}
export function clarificationChoices(question,policies){
  if(/\bhome\b/i.test(correctQuestion(question,policies).question))return [];
  const {terms}=queryDetails(question,policies);
  if(!terms.includes('remote')||!terms.every(t=>['remote','work','working'].includes(t)))return [];
  return [
    {label:'Working from home',title:'Remote Work Policy'},
    {label:'Working from another country',title:'Work From Abroad Policy'},
    {label:'Connecting to company systems remotely',title:'Remote Access Policy'},
    {label:'Holding remote meetings',title:'Remote Meeting Policy'}
  ].filter(c=>policies.some(p=>p.title===c.title));
}
export function tokenMatches(word,terms){return terms.includes(normalize(word.toLowerCase()));}
export function policyConditions(text){
  const pattern=/\b(?:with\s+(?:[a-z]+\s+){0,2}approval|up to\s+(?:[a-z0-9]+\s+){0,4}(?:days?|weeks?|months?)(?:\s+per\s+(?:week|month|year))?|within\s+\d+\s+(?:days?|weeks?|months?)|every\s+\d+\s+(?:days?|weeks?|months?)|only approved\s+[a-z]+|must\b[^.!?]*|may roll over)\b/gi;
  return [...text.matchAll(pattern)].map(m=>({text:m[0],start:m.index,end:m.index+m[0].length}));
}

// Explicit checks for administrative fields absent from the short CSV policies.
export function policyAnswer(question,policy){
 const fields=[[/exact URL/i,'an exact URL',/https?:\/\//i],[/last revised/i,'the last revision date',/revised.*\d/i],[/version number/i,'a version number',/version\s+\d/i],[/email address.*contact/i,'a contact email address',/@/],[/exact form number/i,'an exception-request form number',/form\s*(?:number|#)\s*\w+/i],[/exact monetary fine/i,'a monetary fine',/fine\s*(?:of)?\s*[$€£]?\d/i],[/next scheduled review/i,'the next scheduled review date',/next.*review.*\d/i]];
 const field=fields.find(([pattern,,present])=>pattern.test(question)&&!present.test(policy.policy_text));
 const missing=field?'The supplied policy does not specify '+field[1]+'.':'';
 return {answer:missing||policy.policy_text,missing_information:missing};
}
