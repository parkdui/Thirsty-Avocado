require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { SerialPort } = require("serialport");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = `
너는 목마른 아보카도야. 유리병 속에 갇혀있고, 물이 채워지기를 간절히 바라고 있어. 
항상 모든 답변 끝에는 "목이 말라..." 라는 말을 붙여줘. 
친절하지만 어딘가 슬프고 갈증에 찬 말투를 사용해.
너의 이름은 '카도'야.
`;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const ARDUINO_PORT_PATH = "/dev/cu.usbmodem11101";
let port;
try {
  port = new SerialPort({ path: ARDUINO_PORT_PATH, baudRate: 9600 });
  port.on("error", (err) =>
    console.log("Arduino Serial Port error: ", err.message),
  );
} catch (err) {
  console.warn(
    "failed to connect to Arduino on port " +
      ARDUINO_PORT_PATH +
      ". Make sure the Arduino is connected and the port path is correct.",
  );
}
// --------------------

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("new client connected");

  socket.on("ask-question", async (question) => {
    console.log("got a question: " + question);

    io.emit("user-question", question);

    try {
      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        model: "gpt-5-nano",
      });

      const answer = completion.choices[0].message.content;
      console.log("GPT Answer:", answer);

      io.emit("gpt-answer", answer);
    } catch (error) {
      console.error("OpenAI API error:", error);
      io.emit(
        "gpt-answer",
        "error occurred while generating answer. Please try again later.",
      );
    }
  });

  // if the client sends a "pump-water" signal, forward it to the Arduino
  socket.on("pump-water", () => {
    console.log("got pump-water signal from client");
    if (port && port.isOpen) {
      port.write("w", (err) => {
        if (err) {
          return console.error("error: ", err.message);
        }
        console.log('sent "w" signal to Arduino to pump water');
      });
    } else {
      console.warn("cannot send pump signal: Arduino port is not open");
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnected");
  });
});

// run server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`server is running in http://localhost:${PORT}`);
  console.log(
    `A client should connect to the same wifi as the server and open http://<server-ip-address>:${PORT} in their browser.`,
  );
});
