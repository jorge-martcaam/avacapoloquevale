async function run() {
  const res = await fetch('https://enablebanking.com/docs/api/reference/');
  const text = await res.text();
  const index = text.indexOf('id="partyidentification"');
  if (index !== -1) {
     console.log(text.substring(index, index + 1500).replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n'));
  }
}
run();
