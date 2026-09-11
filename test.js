async function run() {
  const res = await fetch('https://enablebanking.com/docs/api/reference/');
  const text = await res.text();
  const index = text.indexOf('id="access"');
  if(index !== -1) {
     const properties = text.substring(index, index + 3500);
     console.log(properties.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n'));
  }
}
run();
