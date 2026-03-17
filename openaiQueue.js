const queue = [];
let active = false;
let delay = 800;

function enqueue(task) {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    run();
  });
}

async function run() {
  if (active || queue.length === 0) return;
  active = true;

  const { task, resolve, reject } = queue.shift();

  try {
    const result = await task();
    delay = 800; // reset delay after success
    resolve(result);
  } catch (err) {
    if (err && err.status === 429) {
      console.log("OpenAI rate limit hit. Increasing delay.");
      delay = Math.min(delay * 2, 10000);
      queue.unshift({ task, resolve, reject });
    } else {
      reject(err);
    }
  }

  await new Promise((r) => setTimeout(r, delay));

  active = false;
  run();
}

module.exports = { enqueue };
