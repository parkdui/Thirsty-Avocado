require("dotenv").config();

// 1. 필요한 부품들을 가져옵니다.
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { SerialPort } = require("serialport"); // 아두이노 통신을 위한 부품
const OpenAI = require("openai"); // OpenAI 라이브러리 추가

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = `
너는 목마른 아보카도야. 유리병 속에 갇혀있고, 물이 채워지기를 간절히 바라고 있어. 
항상 모든 답변 끝에는 "목이 말라..." 라는 말을 붙여줘. 
친절하지만 어딘가 슬프고 갈증에 찬 말투를 사용해.
너의 이름은 '카도'야.
`;

// 2. 서버 기본 설정
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- 아두이노 설정 ---
// 아두이노가 어떤 USB 포트에 연결되었는지 확인하고 바꿔주세요.
// 보통 윈도우는 'COM3', 'COM4' 등, 맥은 '/dev/tty.usbmodem...' 형태입니다.
// 아두이노 IDE에서 포트를 확인하면 가장 정확합니다.
const ARDUINO_PORT_PATH = "/dev/cu.usbmodem11101"; // !!!!!!!!!!!!! 본인 PC에 맞게 수정 !!!!!!!!!!!!!
let port;
// [수정] 아두이노가 연결되지 않아도 서버가 실행되도록 try-catch로 감쌉니다.
try {
  port = new SerialPort({ path: ARDUINO_PORT_PATH, baudRate: 9600 });
  port.on("error", (err) =>
    console.log("아두이노 시리얼포트 에러: ", err.message)
  );
} catch (err) {
  console.warn(
    "아두이노 포트 연결에 실패했습니다. 펌프 기능은 작동하지 않습니다."
  );
}
// --------------------

// 'public' 폴더에 있는 파일들을 웹에서 접근할 수 있도록 해줍니다.
app.use(express.static("public"));

// 3. 서버에 누가 접속했을 때의 규칙 정의
io.on("connection", (socket) => {
  console.log("새로운 사용자가 접속했습니다.");

  // 'ask-question' 신호 (질문)을 받았을 때의 처리
  socket.on("ask-question", async (question) => {
    console.log("질문 받음: " + question);

    // 먼저 관람객이 보낸 질문을 모든 클라이언트(태블릿 포함)에게 전달
    io.emit("user-question", question);

    try {
      // OpenAI API에 질문을 보내고 답변을 기다립니다.
      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        model: "gpt-5-nano", // 혹은 'gpt-4' 등 원하는 모델
      });

      const answer = completion.choices[0].message.content;
      console.log("GPT 답변:", answer);

      // 받은 답변을 모든 클라이언트(태블릿)에게 'gpt-answer' 신호로 보냅니다.
      io.emit("gpt-answer", answer);
    } catch (error) {
      console.error("OpenAI API 호출 중 에러 발생:", error);
      io.emit(
        "gpt-answer",
        "죄송합니다. 답변을 생성하는 중 오류가 발생했습니다."
      );
    }
  });

  // [수정] 'pump-water' 신호를 받도록 새롭게 추가했습니다.
  socket.on("pump-water", () => {
    console.log("물 채우기 신호 받음");
    // 아두이노 포트가 정상적으로 열려 있을 때만 신호를 보냅니다.
    if (port && port.isOpen) {
      port.write("w", (err) => {
        if (err) {
          return console.error("아두이노에 데이터 쓰기 에러: ", err.message);
        }
        console.log('아두이노로 "w" 신호를 보냈습니다.');
      });
    } else {
      console.warn('아두이노가 연결되지 않아 "w" 신호를 보낼 수 없습니다.');
    }
  });

  // 사용자가 접속을 끊었을 때
  socket.on("disconnect", () => {
    console.log("사용자가 접속을 끊었습니다.");
  });
});

// 4. 서버 실행
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 주소에서 실행 중입니다.`);
  console.log(
    `관람객은 같은 와이파이에 접속한 뒤, PC의 IP주소로 접속해야 합니다.`
  );
});
