const STOPWORDS = new Set(
  'a,an,the,and,or,but,for,with,of,to,in,on,at,by,is,are,was,were,be,been,as,that,this,it,from,we,you,your,our,will,have,has,had,they,their,i,he,she,them,not,so,than,then,into,about,across,over,under,per,including,etc'.split(',')
);

function tokenize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9+.# ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function resumeToText(data) {
  const p = data.personal || {};
  const chunks = [p.jobTitle, p.summary];
  (data.experience || []).forEach((e) => chunks.push(e.role, e.company, e.bullets));
  (data.education || []).forEach((e) => chunks.push(e.degree, e.field, e.school));
  (data.skills || []).forEach((s) => chunks.push(s.name));
  (data.certifications || []).forEach((c) => chunks.push(c.name, c.issuer));
  (data.projects || []).forEach((pr) => chunks.push(pr.name, pr.description));
  return chunks.filter(Boolean).join(' ');
}

function computeAts(resumeData, jobDescription) {
  const resumeText = resumeToText(resumeData);
  const jdTokens = tokenize(jobDescription);
  const resumeSet = new Set(tokenize(resumeText));
  const freq = {};
  jdTokens.forEach((w) => (freq[w] = (freq[w] || 0) + 1));
  const uniqueJd = Object.keys(freq);
  const matched = uniqueJd.filter((w) => resumeSet.has(w));
  const missing = uniqueJd
    .filter((w) => !resumeSet.has(w))
    .sort((a, b) => freq[b] - freq[a])
    .slice(0, 15);
  const score = uniqueJd.length ? Math.round((matched.length / uniqueJd.length) * 100) : 0;
  return {
    score,
    matched: matched.sort((a, b) => freq[b] - freq[a]).slice(0, 15),
    missing,
  };
}

module.exports = { computeAts };