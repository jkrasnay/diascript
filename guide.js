
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function toNode(x) {
  if (typeof(x) === 'string') {
    return document.createTextNode(x);
  } else {
    let [tag, attrs, ...children] = x;
    const el = document.createElement(tag);
    if (Array.isArray(attrs)) {
      el.appendChild(toNode(attrs));
    } else {
      for (let k in attrs) {
        el.setAttribute(k, attrs[k]);
      }
    }
    children.forEach(child => { el.appendChild(toNode(child)); });
    return el;
  }
}

function $(id) {
  return document.getElementById(id);
}

function toggleCode(i) {
  const current = $('c' + i).style.display;
  if (current === 'none') {
    $('c' + i).style.display = 'block';
  } else {
    $('c' + i).style.display = 'none';
  }
}

function decorateExample(el, i) {

  const script = el.getElementsByTagName('script')[0].outerHTML;
  const code = toNode(
    ['div', { class: 'code-container' },
    ['span',
      ['input', { type: 'checkbox', onClick: 'toggleCode(' + i + ')' }],
      'View Code'],
    ['pre', { id: 'c' + i, style: 'display:none' },script]]);

  el.parentNode.insertBefore(code, el.nextSibling);

}

console.log('guide.js')
var examples = document.getElementsByClassName('example');
for (let i = 0; i < examples.length; i++) {
  decorateExample(examples[i], i);
}
