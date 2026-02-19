import { Application } from "@splinetool/runtime";

async function main() {
  const canvas = document.getElementById("canvas3d");
  const chatContainer = document.getElementById("chat-container");

  const app = new Application(canvas);

  await app.load(
    "https://prod.spline.design/Ga94JCdQb7bsbPcU/scene.splinecode",
  );
  console.log("Spline scene has been loaded.");

  const camObj = app.findObjectByName("Camera");
  const pourObj = app.findObjectByName("pour");
  const particleObj = app.findObjectByName("Particle Emitter");

  console.log({ camObj, pourObj, particleObj });
  if (!camObj || !pourObj || !particleObj) {
    console.error(
      "오브젝트 중 일부를 찾을 수 없습니다. Spline에서의 오브젝트 이름을 다시 확인해주세요.",
    );
  }

  function triggerEvents() {
    console.log("Attempting to trigger Spline events...");
    if (camObj) camObj.emitEvent("keyDown");
    if (pourObj) pourObj.emitEvent("keyDown");
    if (particleObj) particleObj.emitEvent("keyDown");
    console.log("Spline events triggered.");
  }

  const socket = io();

  function createBubble(text, type) {
    const bubble = document.createElement("div");
    bubble.classList.add("chat-bubble");
    bubble.classList.add(type === "user" ? "user-bubble" : "gpt-bubble");
    bubble.textContent = text;
    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  socket.on("user-question", (question) => {
    createBubble(question, "user");
    triggerEvents();
  });

  socket.on("gpt-answer", (answer) => {
    createBubble(answer, "gpt");
  });
}

main();
