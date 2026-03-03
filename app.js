const promptEl = document.getElementById("prompt");
const minutesEl = document.getElementById("minutes");
const sceneSecondsEl = document.getElementById("sceneSeconds");
const voiceRateEl = document.getElementById("voiceRate");
const resolutionEl = document.getElementById("resolution");
const generateBtn = document.getElementById("generateBtn");
const statusText = document.getElementById("statusText");
const progress = document.getElementById("progress");
const downloadLink = document.getElementById("downloadLink");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function setStatus(message, pct = null) {
  statusText.textContent = message;
  if (pct !== null) progress.value = pct;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizePrompt(value) {
  return value.replace(/\s+/g, " ").trim();
}

function splitIntoScenes(basePrompt, totalScenes) {
  const motifs = [
    "cinematic wide shot",
    "close-up details",
    "dynamic motion",
    "emotional storytelling",
    "highly detailed lighting",
    "professional composition",
    "atmospheric color grading",
    "documentary realism"
  ];
  return Array.from({ length: totalScenes }, (_, i) => {
    const motif = motifs[i % motifs.length];
    return {
      index: i + 1,
      imagePrompt: `${basePrompt}, scene ${i + 1}, ${motif}`,
      narration: `Scene ${i + 1}. ${basePrompt}. Focus on ${motif}.`
    };
  });
}

async function generateImage(prompt, width, height) {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 999999);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;
  const img = new Image();
  img.crossOrigin = "anonymous";
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image generation failed."));
    img.src = url;
  });
}

async function speak(text, rate) {
  if (!("speechSynthesis" in window)) {
    await sleep(2000);
    return;
  }
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.onend = resolve;
    utterance.onerror = resolve;
    speechSynthesis.speak(utterance);
  });
}

function drawScene(img, caption) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;
  ctx.drawImage(img, x, y, w, h);

  const gradient = ctx.createLinearGradient(0, canvas.height - 200, 0, canvas.height);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.8)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, canvas.height - 200, canvas.width, 200);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText(caption, 40, canvas.height - 60);
}

async function buildVideo() {
  const rawPrompt = sanitizePrompt(promptEl.value);
  const minutes = Number(minutesEl.value);
  const sceneSeconds = Number(sceneSecondsEl.value);
  const voiceRate = Number(voiceRateEl.value);
  const [w, h] = resolutionEl.value.split("x").map(Number);

  if (!rawPrompt) {
    alert("Please enter a plain-English command.");
    return;
  }
  if (minutes < 5) {
    alert("For this app, target duration must be at least 5 minutes.");
    return;
  }

  canvas.width = w;
  canvas.height = h;
  downloadLink.classList.add("hidden");
  progress.value = 0;

  const totalDurationSeconds = minutes * 60;
  const totalScenes = Math.ceil(totalDurationSeconds / sceneSeconds);
  const scenes = splitIntoScenes(rawPrompt, totalScenes);

  setStatus(`Preparing recorder for ${minutes} minute video with ${totalScenes} scenes...`, 2);

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
  const chunks = [];
  recorder.ondataavailable = (e) => e.data?.size && chunks.push(e.data);

  recorder.start(1000);

  const startTime = performance.now();

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    setStatus(`Generating image ${i + 1}/${scenes.length}...`, Math.round((i / scenes.length) * 90));

    let img;
    try {
      img = await generateImage(scene.imagePrompt, w, h);
    } catch {
      // fallback placeholder if remote AI image API fails
      img = await new Promise((resolve) => {
        const fallback = document.createElement("canvas");
        fallback.width = w;
        fallback.height = h;
        const fctx = fallback.getContext("2d");
        fctx.fillStyle = "#111827";
        fctx.fillRect(0, 0, w, h);
        fctx.fillStyle = "#38bdf8";
        fctx.font = "bold 48px sans-serif";
        fctx.fillText(`Scene ${scene.index}`, 60, h / 2);
        const image = new Image();
        image.onload = () => resolve(image);
        image.src = fallback.toDataURL("image/png");
      });
    }

    drawScene(img, `Scene ${scene.index}`);

    const sceneStart = performance.now();
    speak(scene.narration, voiceRate);

    // Keep each scene on screen at least sceneSeconds.
    const elapsed = (performance.now() - sceneStart) / 1000;
    if (elapsed < sceneSeconds) {
      await sleep((sceneSeconds - elapsed) * 1000);
    }
  }

  const producedSeconds = (performance.now() - startTime) / 1000;
  if (producedSeconds < totalDurationSeconds) {
    setStatus("Padding ending scene to match exact target duration...", 95);
    await sleep((totalDurationSeconds - producedSeconds) * 1000);
  }

  recorder.stop();
  await new Promise((resolve) => (recorder.onstop = resolve));

  const blob = new Blob(chunks, { type: "video/webm" });
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.classList.remove("hidden");
  downloadLink.textContent = `Download ${minutes}+ Minute AI Video`;

  setStatus("Done! Your long-form AI video is ready.", 100);
}

generateBtn.addEventListener("click", async () => {
  generateBtn.disabled = true;
  try {
    await buildVideo();
  } catch (err) {
    console.error(err);
    setStatus(`Failed: ${err.message}`);
    alert(`Generation failed: ${err.message}`);
  } finally {
    generateBtn.disabled = false;
  }
});
