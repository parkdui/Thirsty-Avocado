// [수정] Spline 런타임 라이브러리를 가져옵니다. (경로는 importmap을 사용하므로 그대로 둡니다)
import { Application } from "@splinetool/runtime";

// [수정] 모든 로직을 async main 함수로 감싸서 로딩 순서를 보장합니다.
async function main() {
  // HTML 요소들을 가져옵니다.
  const canvas = document.getElementById("canvas3d");
  const chatContainer = document.getElementById("chat-container");

  // Spline 애플리케이션을 초기화합니다.
  const app = new Application(canvas);

  // [수정] .load()가 완료될 때까지 기다리도록 await를 추가합니다.
  await app.load(
    "https://prod.spline.design/Ga94JCdQb7bsbPcU/scene.splinecode"
  );
  console.log("Spline scene has been loaded.");

  // 씬 로딩이 완료된 후에 오브젝트를 찾습니다.
  const camObj = app.findObjectByName("Camera");
  const pourObj = app.findObjectByName("pour");
  const particleObj = app.findObjectByName("Particle Emitter");

  // 오브젝트를 제대로 찾았는지 콘솔에서 확인합니다.
  console.log({ camObj, pourObj, particleObj });
  if (!camObj || !pourObj || !particleObj) {
    console.error(
      "오브젝트 중 일부를 찾을 수 없습니다. Spline에서의 오브젝트 이름을 다시 확인해주세요."
    );
  }

  // Spline 이벤트를 동시에 실행하는 함수
  function triggerEvents() {
    console.log("Attempting to trigger Spline events...");
    if (camObj) camObj.emitEvent("keyDown");
    if (pourObj) pourObj.emitEvent("keyDown");
    if (particleObj) particleObj.emitEvent("keyDown");
    console.log("Spline events triggered.");
  }

  // [수정] Socket.IO 관련 로직을 tablet.js 안으로 가져옵니다.
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
    // 이제 triggerEvents 함수를 정상적으로 호출할 수 있습니다.
    triggerEvents();
  });

  socket.on("gpt-answer", (answer) => {
    createBubble(answer, "gpt");
  });
}

// [수정] 메인 함수를 실행하여 모든 로직을 시작합니다.
main();
